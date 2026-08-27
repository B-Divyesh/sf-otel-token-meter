use std::{
    fs,
    io::{Read, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    path::Path,
    process::{Command, Stdio},
    thread,
    time::Duration,
};

const BIN: &str = env!("CARGO_BIN_EXE_otel-token-meter");

fn fixture() -> &'static str {
    r#"{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"agent-cli"}},{"key":"service.namespace","value":{"stringValue":"checkout"}}]},"scopeSpans":[{"spans":[{"name":"chat","startTimeUnixNano":"1000000","endTimeUnixNano":"101000000","attributes":[{"key":"gen_ai.request.model","value":{"stringValue":"model-a"}},{"key":"gen_ai.usage.input_tokens","value":{"intValue":"100"}},{"key":"gen_ai.usage.output_tokens","value":{"intValue":"25"}},{"key":"gen_ai.prompt","value":{"stringValue":"TOP SECRET"}}],"status":{"code":1}}]}]}]}"#
}

fn price_book(path: &Path) {
    fs::write(
        path,
        r#"{"model-a":{"input_per_million":2,"output_per_million":8}}"#,
    )
    .unwrap();
}

#[test]
fn documented_ingest_report_and_export_workflow() {
    let dir = tempfile::tempdir().unwrap();
    let input = dir.path().join("traces.json");
    let data = dir.path().join("meter.json");
    let prices = dir.path().join("prices.json");
    fs::write(&input, fixture()).unwrap();
    price_book(&prices);

    let receipt = Command::new(BIN)
        .args([
            "ingest",
            input.to_str().unwrap(),
            "--data",
            data.to_str().unwrap(),
            "--prices",
            prices.to_str().unwrap(),
            "--json",
        ])
        .output()
        .unwrap();
    assert!(
        receipt.status.success(),
        "{}",
        String::from_utf8_lossy(&receipt.stderr)
    );
    assert!(String::from_utf8_lossy(&receipt.stdout).contains("\"accepted_spans\":1"));
    assert!(!fs::read_to_string(&data).unwrap().contains("TOP SECRET"));

    let report = Command::new(BIN)
        .args([
            "report",
            "--data",
            data.to_str().unwrap(),
            "--group-by",
            "model",
            "--json",
        ])
        .output()
        .unwrap();
    assert!(report.status.success());
    let report: serde_json::Value = serde_json::from_slice(&report.stdout).unwrap();
    assert_eq!(report["rows"][0]["name"], "model-a");
    assert_eq!(report["rows"][0]["total_tokens"], 125);
    assert!((report["rows"][0]["cost_usd"].as_f64().unwrap() - 0.0004).abs() < 0.000001);

    let export = Command::new(BIN)
        .args([
            "export",
            "--data",
            data.to_str().unwrap(),
            "--group-by",
            "project",
        ])
        .output()
        .unwrap();
    assert!(export.status.success());
    assert!(String::from_utf8_lossy(&export.stdout).contains("\"checkout\",1,100,25,125"));
}

#[test]
fn http_collector_serves_dashboard_and_reports_errors() {
    let dir = tempfile::tempdir().unwrap();
    let data = dir.path().join("meter.json");
    let probe = TcpListener::bind("127.0.0.1:0").unwrap();
    let addr: SocketAddr = probe.local_addr().unwrap();
    drop(probe);
    let mut child = Command::new(BIN)
        .args([
            "serve",
            "--listen",
            &addr.to_string(),
            "--data",
            data.to_str().unwrap(),
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .unwrap();

    for _ in 0..50 {
        if TcpStream::connect(addr).is_ok() {
            break;
        }
        thread::sleep(Duration::from_millis(20));
    }

    let home = request(
        addr,
        "GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n",
    );
    assert!(home.starts_with("HTTP/1.1 200"));
    assert!(home.contains("Your traces, reduced to evidence."));

    let body = fixture();
    let response = request(addr, &format!("POST /v1/traces HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", body.len(), body));
    assert!(response.starts_with("HTTP/1.1 200"), "{response}");
    assert!(response.ends_with("{}"), "{response}");

    let bad = request(addr, "POST /v1/traces HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 1\r\nConnection: close\r\n\r\n{");
    assert!(bad.starts_with("HTTP/1.1 400"));
    assert!(bad.contains("next"));
    assert!(data.exists());

    child.kill().unwrap();
    child.wait().unwrap();
}

fn request(addr: SocketAddr, request: &str) -> String {
    let mut stream = TcpStream::connect(addr).unwrap();
    stream.write_all(request.as_bytes()).unwrap();
    let mut response = String::new();
    stream.read_to_string(&mut response).unwrap();
    response
}
