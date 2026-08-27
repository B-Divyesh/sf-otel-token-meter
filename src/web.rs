use crate::{
    ingest,
    model::Store,
    output::{self, GroupBy},
    pricing::PriceBook,
};
use axum::{
    body::Bytes,
    extract::{DefaultBodyLimit, State},
    http::{header, HeaderMap, StatusCode, Uri},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use flate2::read::GzDecoder;
use opentelemetry_proto::tonic::collector::trace::v1::ExportTraceServiceResponse;
use prost::Message;
use std::{io::Read, net::SocketAddr, path::PathBuf, sync::Arc};
use tokio::sync::RwLock;

#[derive(Clone)]
struct AppState {
    store: Arc<RwLock<Store>>,
    data_path: PathBuf,
    prices: PriceBook,
}

pub async fn serve(
    addr: SocketAddr,
    data_path: PathBuf,
    prices: PriceBook,
) -> Result<(), Box<dyn std::error::Error>> {
    let store = Store::load(&data_path)?;
    let state = AppState {
        store: Arc::new(RwLock::new(store)),
        data_path,
        prices,
    };
    let app = Router::new()
        .route("/", get(index))
        .route("/health", get(health))
        .route("/api/report", get(api_report))
        .route("/v1/traces", post(traces))
        .layer(DefaultBodyLimit::max(16 * 1024 * 1024))
        .with_state(state);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    eprintln!("OTel Token Meter collecting at http://{addr}/v1/traces");
    eprintln!("Private dashboard: http://{addr}/");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown())
        .await?;
    Ok(())
}

async fn shutdown() {
    let _ = tokio::signal::ctrl_c().await;
}

async fn index() -> Html<&'static str> {
    Html(include_str!("dashboard.html"))
}

async fn health() -> impl IntoResponse {
    (
        [(header::CACHE_CONTROL, "no-store")],
        Json(serde_json::json!({"status":"ok","privacy":"aggregate-only"})),
    )
}

async fn api_report(State(state): State<AppState>, uri: Uri) -> impl IntoResponse {
    let group = uri
        .query()
        .and_then(|q| q.split('&').find_map(|part| part.strip_prefix("group_by=")))
        .unwrap_or("project");
    let group = match group {
        "model" => GroupBy::Model,
        "tool" => GroupBy::Tool,
        _ => GroupBy::Project,
    };
    let store = state.store.read().await;
    (
        [(header::CACHE_CONTROL, "no-store")],
        Json(output::report(&store, group)),
    )
}

async fn traces(State(state): State<AppState>, headers: HeaderMap, body: Bytes) -> Response {
    let content_type = headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/x-protobuf");
    let encoding = headers
        .get(header::CONTENT_ENCODING)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("identity");
    let decoded = match decode_content(&body, encoding) {
        Ok(value) => value,
        Err((status, message)) => {
            return (status, Json(serde_json::json!({"error":message}))).into_response()
        }
    };
    let request = match ingest::decode(&decoded, content_type) {
        Ok(value) => value,
        Err(message) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":message,"next":"Send an OTLP ExportTraceServiceRequest as protobuf or JSON."}))).into_response(),
    };
    let mut store = state.store.write().await;
    ingest::aggregate(&request, &mut store, &state.prices);
    if let Err(error) = store.save(&state.data_path) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error":format!("could not persist aggregates: {error}")})),
        )
            .into_response();
    }
    if content_type.split(';').next().unwrap_or("").trim() == ingest::PROTO_CONTENT_TYPE {
        let bytes = ExportTraceServiceResponse {
            partial_success: None,
        }
        .encode_to_vec();
        (
            StatusCode::OK,
            [(header::CONTENT_TYPE, ingest::PROTO_CONTENT_TYPE)],
            bytes,
        )
            .into_response()
    } else {
        (
            StatusCode::OK,
            [(header::CONTENT_TYPE, "application/json")],
            "{}",
        )
            .into_response()
    }
}

fn decode_content(body: &[u8], encoding: &str) -> Result<Vec<u8>, (StatusCode, String)> {
    match encoding.trim().to_ascii_lowercase().as_str() {
        "" | "identity" => Ok(body.to_vec()),
        "gzip" => {
            let mut decoded = Vec::new();
            GzDecoder::new(body)
                .take(64 * 1024 * 1024 + 1)
                .read_to_end(&mut decoded)
                .map_err(|error| {
                    (
                        StatusCode::BAD_REQUEST,
                        format!("invalid gzip body: {error}"),
                    )
                })?;
            if decoded.len() > 64 * 1024 * 1024 {
                Err((
                    StatusCode::PAYLOAD_TOO_LARGE,
                    "decompressed OTLP payload exceeds 64 MiB".into(),
                ))
            } else {
                Ok(decoded)
            }
        }
        other => Err((
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            format!("unsupported content encoding: {other}; use identity or gzip"),
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::{write::GzEncoder, Compression};
    use std::io::Write;

    #[test]
    fn accepts_gzip_and_rejects_unknown_encoding() {
        let mut encoder = GzEncoder::new(Vec::new(), Compression::fast());
        encoder.write_all(b"{}").unwrap();
        let compressed = encoder.finish().unwrap();
        assert_eq!(decode_content(&compressed, "gzip").unwrap(), b"{}");
        assert_eq!(
            decode_content(b"{}", "br").unwrap_err().0,
            StatusCode::UNSUPPORTED_MEDIA_TYPE
        );
    }
}
