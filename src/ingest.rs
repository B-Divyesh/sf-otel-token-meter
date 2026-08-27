use crate::model::{Dimensions, Metrics, Store};
use opentelemetry_proto::tonic::{
    collector::trace::v1::ExportTraceServiceRequest,
    common::v1::{any_value::Value, AnyValue, KeyValue},
    trace::v1::Span,
};
use prost::Message;
use std::collections::HashMap;

pub const PROTO_CONTENT_TYPE: &str = "application/x-protobuf";

pub fn decode(body: &[u8], content_type: &str) -> Result<ExportTraceServiceRequest, String> {
    if content_type.split(';').next().unwrap_or("").trim() == PROTO_CONTENT_TYPE {
        ExportTraceServiceRequest::decode(body).map_err(|e| format!("invalid OTLP protobuf: {e}"))
    } else {
        serde_json::from_slice(body).map_err(|e| format!("invalid OTLP JSON: {e}"))
    }
}

pub fn aggregate(request: &ExportTraceServiceRequest, store: &mut Store) -> u64 {
    let mut accepted = 0;
    for resource_spans in &request.resource_spans {
        let resource = attrs(
            resource_spans
                .resource
                .as_ref()
                .map(|r| r.attributes.as_slice())
                .unwrap_or_default(),
        );
        for scope_spans in &resource_spans.scope_spans {
            for span in &scope_spans.spans {
                if let Some((dims, metrics)) = span_metrics(span, &resource) {
                    store.record(&dims, &metrics);
                    accepted += 1;
                }
            }
        }
    }
    accepted
}

fn span_metrics(span: &Span, resource: &HashMap<&str, &AnyValue>) -> Option<(Dimensions, Metrics)> {
    let values = attrs(&span.attributes);
    let input_tokens = first_u64(
        &values,
        &[
            "gen_ai.usage.input_tokens",
            "llm.usage.prompt_tokens",
            "ai.prompt_tokens",
        ],
    );
    let output_tokens = first_u64(
        &values,
        &[
            "gen_ai.usage.output_tokens",
            "llm.usage.completion_tokens",
            "ai.completion_tokens",
        ],
    );
    let cache_read_tokens = first_u64(
        &values,
        &[
            "gen_ai.usage.cache_read.input_tokens",
            "gen_ai.usage.cached_input_tokens",
        ],
    );
    let cache_write_tokens = first_u64(
        &values,
        &[
            "gen_ai.usage.cache_creation.input_tokens",
            "gen_ai.usage.cache_write_tokens",
        ],
    );
    let model = first_string(
        &values,
        &[
            "gen_ai.response.model",
            "gen_ai.request.model",
            "llm.model_name",
        ],
    );
    let is_gen_ai = input_tokens > 0
        || output_tokens > 0
        || cache_read_tokens > 0
        || cache_write_tokens > 0
        || model.is_some()
        || values.keys().any(|k| k.starts_with("gen_ai."));
    if !is_gen_ai {
        return None;
    }

    let project = first_string(
        resource,
        &[
            "service.namespace",
            "project.id",
            "deployment.environment.name",
        ],
    )
    .unwrap_or_else(|| "unknown".to_string());
    let tool = first_string(&values, &["gen_ai.operation.name"])
        .or_else(|| first_string(resource, &["service.name"]))
        .unwrap_or_else(|| "unknown".to_string());
    let duration_ns = span
        .end_time_unix_nano
        .saturating_sub(span.start_time_unix_nano);
    let error =
        span.status.as_ref().is_some_and(|s| s.code == 2) || values.contains_key("error.type");

    Some((
        Dimensions {
            project,
            model: model.unwrap_or_else(|| "unknown".to_string()),
            tool,
        },
        Metrics {
            requests: 1,
            input_tokens,
            output_tokens,
            cache_read_tokens,
            cache_write_tokens,
            duration_ms: duration_ns as f64 / 1_000_000.0,
            errors: u64::from(error),
            cost_usd: first_f64(&values, &["gen_ai.usage.cost", "llm.usage.total_cost"]),
        },
    ))
}

fn attrs(values: &[KeyValue]) -> HashMap<&str, &AnyValue> {
    values
        .iter()
        .filter_map(|kv| kv.value.as_ref().map(|v| (kv.key.as_str(), v)))
        .collect()
}

fn first_u64(values: &HashMap<&str, &AnyValue>, keys: &[&str]) -> u64 {
    keys.iter()
        .find_map(|key| values.get(key).and_then(as_u64))
        .unwrap_or(0)
}

fn first_f64(values: &HashMap<&str, &AnyValue>, keys: &[&str]) -> f64 {
    keys.iter()
        .find_map(|key| values.get(key).and_then(as_f64))
        .unwrap_or(0.0)
}

fn first_string(values: &HashMap<&str, &AnyValue>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .find_map(|key| values.get(key).and_then(as_string))
}

fn as_u64(value: &&AnyValue) -> Option<u64> {
    match value.value.as_ref()? {
        Value::IntValue(n) => (*n).try_into().ok(),
        Value::DoubleValue(n) if *n >= 0.0 => Some(*n as u64),
        Value::StringValue(n) => n.parse().ok(),
        _ => None,
    }
}

fn as_f64(value: &&AnyValue) -> Option<f64> {
    match value.value.as_ref()? {
        Value::IntValue(n) => Some(*n as f64),
        Value::DoubleValue(n) => Some(*n),
        Value::StringValue(n) => n.parse().ok(),
        _ => None,
    }
}

fn as_string(value: &&AnyValue) -> Option<String> {
    match value.value.as_ref()? {
        Value::StringValue(s) if !s.trim().is_empty() => Some(s.clone()),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ingests_json_and_discards_bodies() {
        let body = br#"{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"kiro"}},{"key":"service.namespace","value":{"stringValue":"checkout"}}]},"scopeSpans":[{"spans":[{"name":"chat","startTimeUnixNano":"1000000","endTimeUnixNano":"61000000","attributes":[{"key":"gen_ai.request.model","value":{"stringValue":"model-a"}},{"key":"gen_ai.usage.input_tokens","value":{"intValue":"100"}},{"key":"gen_ai.usage.output_tokens","value":{"intValue":"25"}},{"key":"gen_ai.prompt","value":{"stringValue":"SECRET"}}],"status":{"code":1}}]}]}]}"#;
        let request = decode(body, "application/json").unwrap();
        let mut store = Store::default();
        assert_eq!(aggregate(&request, &mut store), 1);
        let totals = store.totals();
        assert_eq!(totals.total_tokens(), 125);
        assert_eq!(totals.duration_ms, 60.0);
        assert!(!serde_json::to_string(&store).unwrap().contains("SECRET"));
    }

    #[test]
    fn ignores_unrelated_spans() {
        let request: ExportTraceServiceRequest = serde_json::from_str(
            r#"{"resourceSpans":[{"scopeSpans":[{"spans":[{"name":"http"}]}]}]}"#,
        )
        .unwrap();
        assert_eq!(aggregate(&request, &mut Store::default()), 0);
    }
}
