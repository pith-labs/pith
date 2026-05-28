use crate::{Mode, OptimizeOptions, PithEngine};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedbackRecord {
    pub input: String,
    pub expected_contains: Vec<String>,
    pub mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvalReport {
    pub total: usize,
    pub passed_contains: usize,
    pub contains_score: f32,
    pub avg_compression_ratio: f32,
}

pub fn evaluate_records(engine: &PithEngine, records: &[FeedbackRecord]) -> EvalReport {
    if records.is_empty() {
        return EvalReport {
            total: 0,
            passed_contains: 0,
            contains_score: 0.0,
            avg_compression_ratio: 0.0,
        };
    }

    let mut passed = 0usize;
    let mut compression_acc = 0.0f32;

    for r in records {
        let mode = match r.mode.as_deref() {
            Some("compress") => Mode::Compress,
            Some("conversational") => Mode::Conversational,
            Some("query") => Mode::Query,
            _ => Mode::Auto,
        };
        let out = engine.optimize(
            &r.input,
            OptimizeOptions {
                ultra_compact: true,
                mode,
            },
        );

        let lower = out.output.to_lowercase();
        if r.expected_contains.iter().all(|x| lower.contains(&x.to_lowercase())) {
            passed += 1;
        }

        let in_len = r.input.len().max(1) as f32;
        let out_len = out.output.len() as f32;
        compression_acc += (1.0 - (out_len / in_len)).max(0.0);
    }

    EvalReport {
        total: records.len(),
        passed_contains: passed,
        contains_score: passed as f32 / records.len() as f32,
        avg_compression_ratio: compression_acc / records.len() as f32,
    }
}
