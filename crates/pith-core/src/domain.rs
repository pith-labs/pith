use crate::types::{DomainPlan, IntentIR};
use std::collections::{BTreeSet, HashMap};

fn rank_by_weights(values: Vec<String>, weights: &HashMap<&'static str, i32>) -> Vec<String> {
    let mut uniq = BTreeSet::new();
    for v in values {
        if !v.is_empty() {
            uniq.insert(v);
        }
    }
    let mut out: Vec<String> = uniq.into_iter().collect();
    out.sort_by(|a, b| {
        let wa = *weights.get(a.as_str()).unwrap_or(&0);
        let wb = *weights.get(b.as_str()).unwrap_or(&0);
        wb.cmp(&wa).then_with(|| a.cmp(b))
    });
    out
}

pub fn build_domain_plan(ir: &IntentIR) -> DomainPlan {
    let top = ir.intent.domain.first().map(String::as_str).unwrap_or("generic");
    let track = match top {
        "backend" => "backend",
        "async-processing" => "worker",
        "llm" => "llm",
        "testing" => "testing",
        "data" => "data",
        _ => "generic",
    };

    let (focus_raw, checks_raw): (Vec<String>, Vec<String>) = match track {
        "backend" => (
            [
                ir.slots.transport.clone(),
                ir.slots.storage.clone(),
                ir.slots.quality.clone(),
                ir.constraints.must_include.clone(),
                if ir.constraints.preserve_negation { vec!["logic-guard".into()] } else { vec![] },
            ]
            .concat(),
            vec![
                "contract-stability".into(),
                if ir.slots.quality.iter().any(|f| f.contains("idempot")) { "idempotency".into() } else { "".into() },
                if ir.slots.quality.iter().any(|f| f.contains("retry") || f.contains("dlq")) { "failure-policy".into() } else { "".into() },
            ],
        ),
        "worker" => (
            [ir.slots.quality.clone(), ir.slots.transport.clone(), ir.constraints.must_include.clone()].concat(),
            vec!["retry-policy".into(), "dead-letter-routing".into(), "idempotency".into(), "requeue-safety".into()],
        ),
        "llm" => (
            [
                vec!["token-efficiency".into(), "semantic-fidelity".into(), format!("fmt-{}", ir.constraints.output_format)],
                ir.constraints.must_include.clone(),
            ]
            .concat(),
            vec!["no-negation-loss".into(), "output-shape".into(), "prompt-density".into()],
        ),
        "testing" => (
            [vec!["regression-suite".into()], ir.constraints.must_include.clone(), ir.slots.quality.clone()].concat(),
            vec!["semantic-gate".into(), "contract-tests".into(), "coverage-guard".into()],
        ),
        "data" => (
            [ir.slots.storage.clone(), ir.constraints.must_include.clone(), vec!["migration-safety".into()]].concat(),
            vec!["rollback-plan".into(), "schema-compat".into(), "data-integrity".into()],
        ),
        _ => (
            [ir.constraints.must_include.clone(), ir.intent.domain.clone()].concat(),
            vec!["intent-preservation".into(), "minimal-output".into()],
        ),
    };

    let focus_weights: HashMap<&'static str, i32> = HashMap::from([
        ("idempotency", 10), ("retry", 9), ("dlq", 8), ("token-efficiency", 10), ("semantic-fidelity", 9),
    ]);
    let check_weights: HashMap<&'static str, i32> = HashMap::from([
        ("contract-stability", 10), ("idempotency", 9), ("failure-policy", 8), ("semantic-gate", 10),
    ]);

    DomainPlan {
        track: track.to_string(),
        weights_version: "v1".to_string(),
        focus: rank_by_weights(focus_raw, &focus_weights),
        checks: rank_by_weights(checks_raw, &check_weights),
    }
}

pub fn serialize_domain_plan(plan: &DomainPlan) -> String {
    let prefix = match plan.track.as_str() {
        "backend" => "be",
        "worker" => "wk",
        "llm" => "lm",
        "testing" => "ts",
        "data" => "db",
        _ => "gn",
    };
    let focus = if plan.focus.is_empty() { "_".to_string() } else { plan.focus.iter().take(8).cloned().collect::<Vec<_>>().join(",") };
    let checks = if plan.checks.is_empty() { "_".to_string() } else { plan.checks.iter().take(8).cloned().collect::<Vec<_>>().join(",") };
    format!("{prefix}@{}:{focus};ck:{checks}", plan.weights_version)
}
