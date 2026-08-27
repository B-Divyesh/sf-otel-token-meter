use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs, io,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
pub struct Metrics {
    pub requests: u64,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_tokens: u64,
    pub cache_write_tokens: u64,
    pub duration_ms: f64,
    pub errors: u64,
    pub cost_usd: f64,
}

impl Metrics {
    pub fn add(&mut self, other: &Self) {
        self.requests += other.requests;
        self.input_tokens += other.input_tokens;
        self.output_tokens += other.output_tokens;
        self.cache_read_tokens += other.cache_read_tokens;
        self.cache_write_tokens += other.cache_write_tokens;
        self.duration_ms += other.duration_ms;
        self.errors += other.errors;
        self.cost_usd += other.cost_usd;
    }

    pub fn total_tokens(&self) -> u64 {
        self.input_tokens + self.output_tokens
    }
    pub fn avg_latency_ms(&self) -> f64 {
        if self.requests == 0 {
            0.0
        } else {
            self.duration_ms / self.requests as f64
        }
    }
}

#[derive(Debug, Clone, Ord, PartialOrd, Eq, PartialEq)]
pub struct Dimensions {
    pub project: String,
    pub model: String,
    pub tool: String,
}

impl Dimensions {
    pub fn key(&self) -> String {
        [
            self.project.as_str(),
            self.model.as_str(),
            self.tool.as_str(),
        ]
        .map(escape_key)
        .join("|")
    }

    pub fn from_key(key: &str) -> Self {
        let parts = split_key(key);
        Self {
            project: parts.first().cloned().unwrap_or_else(|| "unknown".into()),
            model: parts.get(1).cloned().unwrap_or_else(|| "unknown".into()),
            tool: parts.get(2).cloned().unwrap_or_else(|| "unknown".into()),
        }
    }
}

fn escape_key(value: &str) -> String {
    value.replace('\\', "\\\\").replace('|', "\\|")
}

fn split_key(key: &str) -> Vec<String> {
    let mut out = vec![String::new()];
    let mut escaped = false;
    for ch in key.chars() {
        if escaped {
            out.last_mut().unwrap().push(ch);
            escaped = false;
        } else if ch == '\\' {
            escaped = true;
        } else if ch == '|' {
            out.push(String::new());
        } else {
            out.last_mut().unwrap().push(ch);
        }
    }
    out
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Store {
    pub schema_version: u8,
    pub updated_at_ms: u64,
    pub aggregates: BTreeMap<String, Metrics>,
}

impl Default for Store {
    fn default() -> Self {
        Self {
            schema_version: 1,
            updated_at_ms: now_ms(),
            aggregates: BTreeMap::new(),
        }
    }
}

impl Store {
    pub fn load(path: &Path) -> io::Result<Self> {
        if !path.exists() {
            return Ok(Self::default());
        }
        let bytes = fs::read(path)?;
        let store: Self = serde_json::from_slice(&bytes).map_err(io::Error::other)?;
        if store.schema_version != 1 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!("unsupported data schema {}", store.schema_version),
            ));
        }
        Ok(store)
    }

    pub fn save(&mut self, path: &Path) -> io::Result<()> {
        self.updated_at_ms = now_ms();
        if let Some(parent) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
            fs::create_dir_all(parent)?;
        }
        let tmp = path.with_extension("tmp");
        let bytes = serde_json::to_vec_pretty(self).map_err(io::Error::other)?;
        fs::write(&tmp, bytes)?;
        fs::rename(tmp, path)
    }

    pub fn record(&mut self, dims: &Dimensions, metrics: &Metrics) {
        self.aggregates.entry(dims.key()).or_default().add(metrics);
    }

    pub fn totals(&self) -> Metrics {
        let mut totals = Metrics::default();
        for value in self.aggregates.values() {
            totals.add(value);
        }
        totals
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keys_round_trip_delimiters() {
        let d = Dimensions {
            project: "a|b".into(),
            model: "x\\y".into(),
            tool: "z".into(),
        };
        assert_eq!(Dimensions::from_key(&d.key()), d);
    }

    #[test]
    fn save_and_load_aggregate_only() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("meter.json");
        let mut store = Store::default();
        store.record(
            &Dimensions {
                project: "p".into(),
                model: "m".into(),
                tool: "t".into(),
            },
            &Metrics {
                input_tokens: 3,
                requests: 1,
                ..Default::default()
            },
        );
        store.save(&path).unwrap();
        let raw = fs::read_to_string(&path).unwrap();
        assert!(!raw.contains("prompt"));
        assert_eq!(Store::load(&path).unwrap().totals().input_tokens, 3);
    }
}
