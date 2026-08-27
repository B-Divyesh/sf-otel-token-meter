use crate::{
    ingest,
    model::Store,
    output::{self, GroupBy},
};
use axum::{
    body::Bytes,
    extract::{DefaultBodyLimit, State},
    http::{header, HeaderMap, StatusCode, Uri},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use opentelemetry_proto::tonic::collector::trace::v1::ExportTraceServiceResponse;
use prost::Message;
use serde::Serialize;
use std::{net::SocketAddr, path::PathBuf, sync::Arc};
use tokio::sync::RwLock;

#[derive(Clone)]
struct AppState {
    store: Arc<RwLock<Store>>,
    data_path: PathBuf,
}

#[derive(Serialize)]
struct Ingested {
    accepted_spans: u64,
    message: &'static str,
}

pub async fn serve(addr: SocketAddr, data_path: PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let store = Store::load(&data_path)?;
    let state = AppState {
        store: Arc::new(RwLock::new(store)),
        data_path,
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
    let request = match ingest::decode(&body, content_type) {
        Ok(value) => value,
        Err(message) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":message,"next":"Send an OTLP ExportTraceServiceRequest as protobuf or JSON."}))).into_response(),
    };
    let mut store = state.store.write().await;
    let accepted = ingest::aggregate(&request, &mut store);
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
            Json(Ingested {
                accepted_spans: accepted,
                message: "Aggregates updated; trace bodies were discarded.",
            }),
        )
            .into_response()
    }
}
