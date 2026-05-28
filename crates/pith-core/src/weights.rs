use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize)]
pub struct Thresholds {
    pub query: i32,
    pub compress: i32,
    pub max_query_niches: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Morphology {
    pub adjective_suffixes: Vec<String>,
    pub verb_conjugated_suffixes: Vec<String>,
    pub negation_words: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Weights {
    pub thresholds: Thresholds,
    pub morphology: Morphology,
    pub abbreviations: HashMap<String, String>,
    pub domain_weights: HashMap<String, HashMap<String, f32>>,
}

pub fn load_weights() -> Weights {
    let embedded = include_str!("../config/default_weights.json");
    serde_json::from_str::<Weights>(embedded).expect("invalid embedded default_weights.json")
}
