use crate::domain::{build_domain_plan, serialize_domain_plan};
use crate::types::IntentIR;

fn normalize_machine_token(raw: &str) -> String {
    raw.to_lowercase()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
        .take(24)
        .collect()
}

pub fn isa_crc(base_without_crc: &str) -> String {
    let mut hash: u32 = 2166136261;
    for b in base_without_crc.as_bytes() {
        hash ^= *b as u32;
        hash = hash.wrapping_mul(16777619);
    }
    format!("{hash:08X}")
}

pub fn compute_flags(original_text: &str) -> Vec<String> {
    let mut flags = Vec::new();
    let code_like = original_text.contains("```")
        || original_text.matches('{').count() + original_text.matches('}').count() >= 3
        || original_text.contains("=>");
    if code_like {
        flags.push("NE".to_string());
    }
    let has_list = original_text.lines().any(|l| {
        let t = l.trim_start();
        t.starts_with("- ") || t.starts_with("* ") || (t.chars().next().is_some_and(|c| c.is_ascii_digit()) && t.contains(". "))
    });
    if has_list {
        flags.push("BL".to_string());
    }
    let words = original_text.split_whitespace().count();
    if words < 15 && flags.is_empty() {
        flags.push("DT".to_string());
    }
    flags
}

fn compact_opcode(full: &str) -> String {
    let map = [
        ("M", "m"), ("IO", "i"), ("TAG", "t"), ("S", "s"), ("ACT", "a"), ("GOAL", "g"), ("CSTR", "c"),
        ("PROTO", "r"), ("N", "n"), ("E", "e"), ("A", "x"), ("P", "p"), ("F", "f"), ("CRC", "k"),
    ];

    full.split(' ')
        .map(|part| {
            let mut it = part.splitn(2, '=');
            let key = it.next().unwrap_or_default();
            let value = it.next().unwrap_or_default();
            let out_key = map.iter().find_map(|(k, v)| if *k == key { Some(*v) } else { None }).unwrap_or(key);
            format!("{out_key}:{value}")
        })
        .collect::<Vec<_>>()
        .join("|")
}

pub fn build_opcode(
    mode: &str,
    action: &str,
    goal: &str,
    cstr: &str,
    proto: &str,
    niches: &[String],
    entities: &[String],
    attrs: &[String],
    payload: &str,
    flags: &[String],
    ultra_compact: bool,
) -> String {
    let empty = "_";
    let ordered = vec![
        format!("M={mode}"),
        "IO=A2H".to_string(),
        "TAG=_".to_string(),
        "S=_".to_string(),
        format!("ACT={}", normalize_machine_token(action.trim_start_matches('!'))),
        format!("GOAL={}", if goal.is_empty() { empty } else { goal }),
        format!("CSTR={}", if cstr.is_empty() { empty } else { cstr }),
        format!("PROTO={}", if proto.is_empty() { empty } else { proto }),
        format!("N={}", if niches.is_empty() { empty.to_string() } else { niches.iter().map(|n| normalize_machine_token(n.trim_start_matches('#'))).collect::<Vec<_>>().join(",") }),
        format!("E={}", if entities.is_empty() { empty.to_string() } else { entities.iter().map(|e| normalize_machine_token(e.trim_start_matches('@'))).collect::<Vec<_>>().join(",") }),
        format!("A={}", if attrs.is_empty() { empty.to_string() } else { attrs.iter().map(|a| normalize_machine_token(a.trim_start_matches('?'))).collect::<Vec<_>>().join(",") }),
        format!("P={}", if payload.is_empty() { empty } else { payload }),
        format!("F={}", if flags.is_empty() { empty.to_string() } else { flags.join(",") }),
    ];
    let base = ordered.join(" ");
    let full = format!("{base} CRC={}", isa_crc(&base));
    if ultra_compact {
        compact_opcode(&full)
    } else {
        full
    }
}

pub fn generate_opcode_from_ir(ir: &IntentIR, original_text: &str, ultra_compact: bool) -> String {
    let mode = if ir.signals.has_question { "Q" } else if ir.signals.has_code { "C" } else { "Q" };
    let mut attrs = Vec::new();
    if let Some(max) = ir.constraints.max_length {
        attrs.push(format!("max{max}"));
    }
    attrs.extend(ir.slots.quality.iter().cloned());

    let plan = build_domain_plan(ir);
    let mut payload_parts = vec![format!("pl:{}", serialize_domain_plan(&plan))];
    if !ir.slots.runtime.is_empty() { payload_parts.push(format!("rt:{}", ir.slots.runtime.join(","))); }
    if !ir.slots.transport.is_empty() { payload_parts.push(format!("tr:{}", ir.slots.transport.join(","))); }
    if !ir.slots.storage.is_empty() { payload_parts.push(format!("db:{}", ir.slots.storage.join(","))); }
    if !ir.constraints.must_include.is_empty() { payload_parts.push(format!("in:{}", ir.constraints.must_include.join(","))); }
    if !ir.constraints.must_avoid.is_empty() { payload_parts.push(format!("out:{}", ir.constraints.must_avoid.join(","))); }

    let mut flags = compute_flags(original_text);
    if ir.constraints.preserve_negation {
        flags.push("NEG".to_string());
    }

    build_opcode(
        mode,
        &ir.intent.action,
        &ir.constraints.output_format,
        if ir.constraints.preserve_negation { "keep-negation" } else { "_" },
        &ir.signals.language_hint,
        &ir.intent.domain.iter().map(|d| format!("#{d}")).collect::<Vec<_>>(),
        &ir.intent.entities.iter().map(|e| format!("@{e}")).collect::<Vec<_>>(),
        &attrs.iter().map(|a| format!("?{a}")).collect::<Vec<_>>(),
        &payload_parts.join("|"),
        &flags,
        ultra_compact,
    )
}
