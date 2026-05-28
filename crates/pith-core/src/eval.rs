use crate::{Mode, OptimizeOptions, PithEngine};
use crate::input_router::detect_input_kind;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

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
    pub by_kind: BTreeMap<String, KindEval>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KindEval {
    pub total: usize,
    pub passed_contains: usize,
    pub contains_score: f32,
}

pub fn evaluate_records(engine: &PithEngine, records: &[FeedbackRecord]) -> EvalReport {
    if records.is_empty() {
        return EvalReport {
            total: 0,
            passed_contains: 0,
            contains_score: 0.0,
            avg_compression_ratio: 0.0,
            by_kind: BTreeMap::new(),
        };
    }

    let mut passed = 0usize;
    let mut compression_acc = 0.0f32;
    let mut by_kind_tmp: BTreeMap<String, (usize, usize)> = BTreeMap::new();

    for r in records {
        let out = if matches!(r.mode.as_deref(), Some("dev") | Some("shrink")) {
            let d = engine.optimize_dev_output(&r.input, None);
            crate::types::OptimizeResult {
                output: d.output,
                noise_removed: d.noise_removed,
                is_query: false,
            }
        } else {
            let mode = match r.mode.as_deref() {
                Some("compress") => Mode::Compress,
                Some("conversational") => Mode::Conversational,
                Some("query") => Mode::Query,
                _ => Mode::Auto,
            };
            engine.optimize(
                &r.input,
                OptimizeOptions {
                    ultra_compact: true,
                    mode,
                },
            )
        };

        let lower = out.output.to_lowercase();
        let ok = r.expected_contains.iter().all(|x| lower.contains(&x.to_lowercase()));
        if ok {
            passed += 1;
        }
        let kind = detect_input_kind(&r.input).as_str().to_string();
        let entry = by_kind_tmp.entry(kind).or_insert((0, 0));
        entry.0 += 1;
        if ok {
            entry.1 += 1;
        }

        let in_len = r.input.len().max(1) as f32;
        let out_len = out.output.len() as f32;
        compression_acc += (1.0 - (out_len / in_len)).max(0.0);
    }

    let by_kind = by_kind_tmp
        .into_iter()
        .map(|(k, (total, passed_contains))| {
            let score = if total == 0 { 0.0 } else { passed_contains as f32 / total as f32 };
            (
                k,
                KindEval {
                    total,
                    passed_contains,
                    contains_score: score,
                },
            )
        })
        .collect::<BTreeMap<_, _>>();

    EvalReport {
        total: records.len(),
        passed_contains: passed,
        contains_score: passed as f32 / records.len() as f32,
        avg_compression_ratio: compression_acc / records.len() as f32,
        by_kind,
    }
}
