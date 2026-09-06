mod ingest;
mod model;
mod output;
mod pricing;
mod web;

use clap::{Parser, Subcommand};
use model::Store;
use output::GroupBy;
use std::{
    fs,
    net::SocketAddr,
    path::{Path, PathBuf},
    process::ExitCode,
    time::{SystemTime, UNIX_EPOCH},
};

const DEMO_TRACES: &[u8] = include_bytes!("../examples/demo-traces.json");
const DEMO_PRICES: &[u8] = include_bytes!("../examples/demo-prices.json");

/// Local, aggregate-only token and latency accounting for OTLP traces.
#[derive(Parser, Debug)]
#[command(name = "otel-token-meter", version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    /// Run the bundled sample in an isolated directory and print its report.
    Demo {
        /// Directory for the sample, aggregate ledger, and CSV. Defaults to a new temporary directory.
        #[arg(long)]
        output: Option<PathBuf>,
        /// Emit a machine-readable receipt and report.
        #[arg(long)]
        json: bool,
    },
    /// Collect OTLP/HTTP traces and serve the private dashboard.
    Serve {
        /// Address for both /v1/traces and the dashboard.
        #[arg(long, default_value = "127.0.0.1:4318")]
        listen: SocketAddr,
        /// Aggregate-only JSON data file.
        #[arg(long, default_value = "token-meter.json")]
        data: PathBuf,
        /// Optional per-model USD price book (per million tokens).
        #[arg(long)]
        prices: Option<PathBuf>,
    },
    /// Print aggregated usage as a table or stable JSON.
    Report {
        #[arg(long, default_value = "token-meter.json")]
        data: PathBuf,
        #[arg(long, value_enum, default_value = "project")]
        group_by: GroupBy,
        /// Emit machine-readable JSON instead of a table.
        #[arg(long)]
        json: bool,
    },
    /// Export aggregated usage as RFC 4180-compatible CSV.
    Export {
        #[arg(long, default_value = "token-meter.json")]
        data: PathBuf,
        #[arg(long, value_enum, default_value = "project")]
        group_by: GroupBy,
        /// Destination CSV file, or - for stdout.
        #[arg(short, long, default_value = "-")]
        output: PathBuf,
    },
    /// Import a captured OTLP JSON or protobuf request.
    Ingest {
        /// ExportTraceServiceRequest file.
        input: PathBuf,
        #[arg(long, default_value = "token-meter.json")]
        data: PathBuf,
        /// Optional per-model USD price book (per million tokens).
        #[arg(long)]
        prices: Option<PathBuf>,
        /// Emit a JSON receipt.
        #[arg(long)]
        json: bool,
    },
}

#[tokio::main]
async fn main() -> ExitCode {
    match run().await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("otel-token-meter: {error}");
            ExitCode::FAILURE
        }
    }
}

async fn run() -> Result<(), Box<dyn std::error::Error>> {
    match Cli::parse().command {
        Command::Demo { output, json } => run_demo(output.as_deref(), json)?,
        Command::Serve {
            listen,
            data,
            prices,
        } => web::serve(listen, data, pricing::PriceBook::load(prices.as_deref())?).await?,
        Command::Report {
            data,
            group_by,
            json,
        } => {
            let report = output::report(&Store::load(&data)?, group_by);
            if json {
                println!("{}", serde_json::to_string_pretty(&report)?);
            } else {
                print!("{}", output::table(&report));
            }
        }
        Command::Export {
            data,
            group_by,
            output: destination,
        } => {
            let csv = output::csv(&output::report(&Store::load(&data)?, group_by));
            if destination.as_os_str() == "-" {
                print!("{csv}");
            } else {
                fs::write(destination, csv)?;
            }
        }
        Command::Ingest {
            input,
            data,
            prices,
            json,
        } => {
            let bytes = fs::read(&input)?;
            let is_json = input.extension().is_some_and(|ext| ext == "json")
                || bytes.iter().find(|b| !b.is_ascii_whitespace()) == Some(&b'{');
            let request = ingest::decode(
                &bytes,
                if is_json {
                    "application/json"
                } else {
                    ingest::PROTO_CONTENT_TYPE
                },
            )
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
            let mut store = Store::load(&data)?;
            let price_book = pricing::PriceBook::load(prices.as_deref())?;
            let accepted = ingest::aggregate(&request, &mut store, &price_book);
            store.save(&data)?;
            if json {
                println!(
                    "{}",
                    serde_json::json!({"accepted_spans":accepted,"data":data,"privacy":"aggregate-only"})
                );
            } else {
                println!(
                    "Accepted {accepted} GenAI span(s). Aggregate ledger: {}",
                    data.display()
                );
            }
        }
    }
    Ok(())
}

fn run_demo(output_dir: Option<&Path>, json: bool) -> Result<(), Box<dyn std::error::Error>> {
    let output_dir = output_dir.map(Path::to_path_buf).unwrap_or_else(|| {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        std::env::temp_dir().join(format!(
            "otel-token-meter-demo-{}-{nonce}",
            std::process::id()
        ))
    });
    fs::create_dir_all(&output_dir)?;

    let traces_path = output_dir.join("sample-traces.json");
    let prices_path = output_dir.join("prices.json");
    let ledger_path = output_dir.join("aggregate-ledger.json");
    let csv_path = output_dir.join("usage-by-project.csv");
    fs::write(&traces_path, DEMO_TRACES)?;
    fs::write(&prices_path, DEMO_PRICES)?;

    let request = ingest::decode(DEMO_TRACES, "application/json")
        .map_err(|error| std::io::Error::new(std::io::ErrorKind::InvalidData, error))?;
    let prices = pricing::PriceBook::load(Some(&prices_path))?;
    let mut store = Store::default();
    let accepted = ingest::aggregate(&request, &mut store, &prices);
    store.save(&ledger_path)?;
    let report = output::report(&store, GroupBy::Project);
    fs::write(&csv_path, output::csv(&report))?;

    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(&serde_json::json!({
                "accepted_spans": accepted,
                "privacy": "aggregate-only",
                "sample": traces_path,
                "ledger": ledger_path,
                "csv": csv_path,
                "report": report,
            }))?
        );
    } else {
        println!("Demo — bundled sample, isolated from your data.");
        println!("Accepted {accepted} GenAI spans.\n");
        print!("{}", output::table(&report));
        println!("\nSample files: {}", output_dir.display());
        println!("CSV report: {}", csv_path.display());
    }
    Ok(())
}
