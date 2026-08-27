use serde::Deserialize;
use std::{collections::BTreeMap, fs, io, path::Path};

#[derive(Debug, Clone, Default, Deserialize)]
pub struct PriceBook(BTreeMap<String, Price>);

#[derive(Debug, Clone, Deserialize)]
pub struct Price {
    pub input_per_million: f64,
    pub output_per_million: f64,
    #[serde(default)]
    pub cache_read_per_million: f64,
    #[serde(default)]
    pub cache_write_per_million: f64,
}

impl PriceBook {
    pub fn load(path: Option<&Path>) -> io::Result<Self> {
        let Some(path) = path else {
            return Ok(Self::default());
        };
        let bytes = fs::read(path)?;
        serde_json::from_slice(&bytes).map_err(|error| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("invalid price book: {error}"),
            )
        })
    }

    pub fn estimate(
        &self,
        model: &str,
        input: u64,
        output: u64,
        cache_read: u64,
        cache_write: u64,
    ) -> f64 {
        let Some(price) = self.0.get(model).or_else(|| self.0.get("*")) else {
            return 0.0;
        };
        let uncached_input = input.saturating_sub(cache_read);
        (uncached_input as f64 * price.input_per_million
            + output as f64 * price.output_per_million
            + cache_read as f64 * price.cache_read_per_million
            + cache_write as f64 * price.cache_write_per_million)
            / 1_000_000.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn estimates_cached_tokens_without_double_charge() {
        let book: PriceBook = serde_json::from_str(r#"{"m":{"input_per_million":2,"output_per_million":8,"cache_read_per_million":0.2,"cache_write_per_million":2.5}}"#).unwrap();
        assert!(
            (book.estimate("m", 1_000_000, 100_000, 500_000, 10_000) - 1.925).abs() < 0.000_001
        );
    }
}
