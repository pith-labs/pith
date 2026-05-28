use crate::weights::load_weights;
use std::sync::OnceLock;

static WEIGHTS: OnceLock<crate::weights::Weights> = OnceLock::new();

fn w() -> &'static crate::weights::Weights {
    WEIGHTS.get_or_init(load_weights)
}

pub fn query_threshold() -> i32 {
    w().thresholds.query
}

pub fn compress_threshold() -> i32 {
    w().thresholds.compress
}

pub fn max_query_niches() -> usize {
    w().thresholds.max_query_niches
}

pub fn negation_words() -> Vec<String> {
    w().morphology.negation_words.clone()
}

pub fn is_adjective_suffix(lower: &str) -> bool {
    w().morphology.adjective_suffixes.iter().any(|s| lower.ends_with(s))
}

pub fn is_verb_infinitive(lower: &str) -> bool {
    lower.ends_with("ar") || lower.ends_with("er") || lower.ends_with("ir")
}

pub fn is_verb_conjugated(lower: &str) -> bool {
    w().morphology.verb_conjugated_suffixes.iter().any(|s| lower.ends_with(s))
}

pub fn abbrev(word: &str) -> Option<String> {
    w().abbreviations.get(word).cloned()
}

pub fn domain_weights() -> &'static std::collections::HashMap<String, std::collections::HashMap<String, f32>> {
    &w().domain_weights
}
