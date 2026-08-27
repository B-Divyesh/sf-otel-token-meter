use crate::model::{Dimensions, Metrics, Store};
use clap::ValueEnum;
use serde::Serialize;
use std::collections::BTreeMap;

#[derive(Debug, Clone, Copy, ValueEnum)]
pub enum GroupBy {
    Project,
    Model,
    Tool,
}

impl GroupBy {
    pub fn label(self) -> &'static str {
        match self {
            Self::Project => "project",
            Self::Model => "model",
            Self::Tool => "tool",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Row {
    pub name: String,
    #[serde(flatten)]
    pub metrics: Metrics,
    pub total_tokens: u64,
    pub avg_latency_ms: f64,
}

#[derive(Debug, Serialize)]
pub struct Report {
    pub group_by: &'static str,
    pub updated_at_ms: u64,
    pub totals: Metrics,
    pub rows: Vec<Row>,
}

pub fn report(store: &Store, group_by: GroupBy) -> Report {
    let mut groups: BTreeMap<String, Metrics> = BTreeMap::new();
    for (key, metrics) in &store.aggregates {
        let dims = Dimensions::from_key(key);
        let name = match group_by {
            GroupBy::Project => dims.project,
            GroupBy::Model => dims.model,
            GroupBy::Tool => dims.tool,
        };
        groups.entry(name).or_default().add(metrics);
    }
    let mut rows: Vec<Row> = groups
        .into_iter()
        .map(|(name, metrics)| Row {
            total_tokens: metrics.total_tokens(),
            avg_latency_ms: metrics.avg_latency_ms(),
            name,
            metrics,
        })
        .collect();
    rows.sort_by(|a, b| {
        b.total_tokens
            .cmp(&a.total_tokens)
            .then_with(|| a.name.cmp(&b.name))
    });
    Report {
        group_by: group_by.label(),
        updated_at_ms: store.updated_at_ms,
        totals: store.totals(),
        rows,
    }
}

pub fn table(report: &Report) -> String {
    if report.rows.is_empty() {
        return "No GenAI usage recorded yet. Start `otel-token-meter serve`, then point an OTLP/HTTP exporter at http://127.0.0.1:4318.\n".into();
    }
    let width = report
        .rows
        .iter()
        .map(|r| r.name.len())
        .max()
        .unwrap_or(7)
        .clamp(7, 32);
    let mut out = format!(
        "{:<width$}  {:>8}  {:>11}  {:>11}  {:>10}  {:>9}  {:>6}  {:>9}\n",
        report.group_by,
        "requests",
        "input",
        "output",
        "cache",
        "avg ms",
        "errors",
        "cost USD",
        width = width
    );
    out.push_str(&format!("{}\n", "─".repeat(width + 86)));
    for row in &report.rows {
        out.push_str(&format!(
            "{:<width$}  {:>8}  {:>11}  {:>11}  {:>10}  {:>9.1}  {:>6}  {:>9.4}\n",
            truncate(&row.name, width),
            row.metrics.requests,
            row.metrics.input_tokens,
            row.metrics.output_tokens,
            row.metrics.cache_read_tokens,
            row.avg_latency_ms,
            row.metrics.errors,
            row.metrics.cost_usd,
            width = width
        ));
    }
    out
}

pub fn csv(report: &Report) -> String {
    let mut out = format!("{},requests,input_tokens,output_tokens,total_tokens,cache_read_tokens,cache_write_tokens,avg_latency_ms,errors,cost_usd\n", report.group_by);
    for row in &report.rows {
        out.push_str(
            &format!(
                "{},,{},{},{},{},{},{:.3},{},{:.6}\n",
                csv_field(&row.name),
                row.metrics.input_tokens,
                row.metrics.output_tokens,
                row.total_tokens,
                row.metrics.cache_read_tokens,
                row.metrics.cache_write_tokens,
                row.avg_latency_ms,
                row.metrics.errors,
                row.metrics.cost_usd
            )
            .replacen(",,", &format!(",{},", row.metrics.requests), 1),
        );
    }
    out
}

fn csv_field(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}
fn truncate(value: &str, width: usize) -> String {
    if value.chars().count() <= width {
        value.into()
    } else {
        format!("{}…", value.chars().take(width - 1).collect::<String>())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn csv_escapes_and_groups() {
        let mut store = Store::default();
        store.record(
            &Dimensions {
                project: "a, \"team\"".into(),
                model: "m".into(),
                tool: "t".into(),
            },
            &Metrics {
                requests: 1,
                input_tokens: 4,
                output_tokens: 2,
                ..Default::default()
            },
        );
        let value = csv(&report(&store, GroupBy::Project));
        assert!(value.contains("\"a, \"\"team\"\"\",1,4,2,6"));
    }
}
