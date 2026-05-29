use crate::input_router::InputKind;
use crate::types::IntentIR;

pub fn build_ai_language_frame(kind: InputKind, ir: &IntentIR, original: &str) -> String {
    let mut parts = Vec::new();
    parts.push("AIF/1".to_string());
    parts.push(format!("k={}", kind.as_str()));
    parts.push(format!("act={}", ir.intent.action));
    if !ir.intent.domain.is_empty() {
        parts.push(format!("dom={}", ir.intent.domain.join(",")));
    }
    parts.push(format!("fmt={}", ir.constraints.output_format));
    if ir.constraints.preserve_negation {
        parts.push("neg=1".to_string());
    }
    if let Some(max) = ir.constraints.max_length {
        parts.push(format!("max={max}"));
    }
    if !ir.slots.quality.is_empty() {
        parts.push(format!("q={}", ir.slots.quality.join(",")));
    }
    if !ir.slots.transport.is_empty() {
        parts.push(format!("tr={}", ir.slots.transport.join(",")));
    }
    if !ir.slots.storage.is_empty() {
        parts.push(format!("db={}", ir.slots.storage.join(",")));
    }
    if !ir.constraints.must_include.is_empty() {
        parts.push(format!("must+{}", ir.constraints.must_include.join(",")));
    }
    if !ir.constraints.must_avoid.is_empty() {
        parts.push(format!("must-{}", ir.constraints.must_avoid.join(",")));
    }
    parts.push(format!("conf={:.2}", ir.intent.confidence));

    let lines = original.lines().filter(|l| !l.trim().is_empty()).count();
    let symbols = original.chars().filter(|c| "{}[]()<>:=+-|".contains(*c)).count();
    parts.push(format!("sig=l{lines}:s{symbols}"));

    parts.join("|")
}
