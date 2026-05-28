use crate::types::{Constraints, DomainScore, Intent, IntentIR, Signals, Slots, Source};
use regex::Regex;
use std::collections::{BTreeSet, HashMap};

fn slug_token(raw: &str) -> String {
    raw.to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' { c } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .chars()
        .take(32)
        .collect()
}

fn detect_language_hint(text: &str) -> String {
    let lower = text.to_lowercase();
    if lower.contains(" não") || lower.contains("ção") || lower.contains(" como ") {
        return "pt".to_string();
    }
    if lower.contains(" the ") || lower.contains(" with ") || lower.contains(" how ") {
        return "en".to_string();
    }
    "unknown".to_string()
}

fn detect_output_format(text: &str) -> String {
    if Regex::new(r"\bjson\b").expect("valid regex").is_match(text) {
        return "json".to_string();
    }
    if text.contains("```") || Regex::new(r"\b(code|typescript|javascript|python|rust)\b").expect("valid regex").is_match(text) {
        return "code".to_string();
    }
    if Regex::new(r"(?m)^\s*[-*]\s").expect("valid regex").is_match(text)
        || Regex::new(r"(?m)^\s*\d+\.\s").expect("valid regex").is_match(text)
    {
        return "list".to_string();
    }
    "text".to_string()
}

fn pick_action(text: &str) -> String {
    let patterns = [
        (r"\b(refactor|refatore|refatorar)\b", "refactor"),
        (r"\b(fix|corrigir|corrija|consertar)\b", "fix"),
        (r"\b(explain|explicar|explique)\b", "explain"),
        (r"\b(implement|implementar|implemente)\b", "implement"),
        (r"\b(generate|gerar|criar|create)\b", "generate"),
        (r"\b(optimi[sz]e|otimizar|otimize|compress)\b", "optimize"),
        (r"\b(analy[sz]e|analisar|analise|review)\b", "analyze"),
    ];

    for (re, action) in patterns {
        if Regex::new(re).expect("valid regex").is_match(text) {
            return action.to_string();
        }
    }

    if text.contains('?') {
        "explain".to_string()
    } else {
        "optimize".to_string()
    }
}

fn score_domains(text: &str) -> Vec<DomainScore> {
    let patterns = [
        (r"\b(api|backend|endpoint|route|http)\b", "backend", 3),
        (r"\b(frontend|react|vite|ui|ux)\b", "frontend", 0),
        (r"\b(worker|queue|sqs|cron|job|retry|dlq)\b", "async-processing", 4),
        (r"\b(test|vitest|jest|pytest|coverage)\b", "testing", 0),
        (r"\b(sql|postgres|database|db|migration)\b", "data", 0),
        (r"\b(llm|prompt|tokens?|openai|claude)\b", "llm", 3),
    ];

    let lower = text.to_lowercase();
    let mut out = Vec::new();
    for (re, domain, bonus) in patterns {
        if Regex::new(re).expect("valid regex").is_match(text) {
            let mut score = 5 + bonus;
            if lower.contains(domain) {
                score += 1;
            }
            out.push(DomainScore {
                name: domain.to_string(),
                score,
            });
        }
    }
    out.sort_by(|a, b| b.score.cmp(&a.score));
    out
}

fn pick_entities(text: &str) -> Vec<String> {
    let re = Regex::new(r"\b[A-Z][A-Za-z0-9_-]{2,}\b").expect("valid regex");
    let mut set = BTreeSet::new();
    for m in re.find_iter(text) {
        let t = slug_token(m.as_str());
        if !t.is_empty() {
            set.insert(t);
        }
    }
    set.into_iter().take(8).collect()
}

fn pick_by_directive(text: &str, pattern: &str) -> Vec<String> {
    let re = Regex::new(pattern).expect("valid regex");
    let mut set = BTreeSet::new();
    for cap in re.captures_iter(text) {
        if let Some(m) = cap.get(2) {
            let t = slug_token(m.as_str());
            if !t.is_empty() {
                set.insert(t);
            }
        }
    }
    set.into_iter().collect()
}

fn pick_max_length(text: &str) -> Option<usize> {
    let re = Regex::new(r"\b(max(?:imum)?|até|up to)\s+(\d{1,4})\s*(tokens?|chars?|characters?)\b").expect("valid regex");
    let caps = re.captures(text)?;
    caps.get(2)?.as_str().parse::<usize>().ok()
}

fn pick_slots(text: &str) -> Slots {
    let mut slots = HashMap::from([
        ("runtime", vec![r"\b(node|nodejs|bun|deno|python|java|rust|go)\b"]),
        ("transport", vec![r"\b(http|grpc|kafka|sqs|queue|rabbitmq|websocket)\b"]),
        ("storage", vec![r"\b(postgres|mysql|redis|sqlite|mongodb|s3|dynamodb)\b"]),
        ("quality", vec![r"\b(idempotency|idempotencia|idempotência|retry|dlq|latency|p99|throughput|coverage)\b"]),
    ]);

    let source = text.to_lowercase();
    let mut out = Slots::default();
    for (k, patterns) in &mut slots {
        let mut set = BTreeSet::new();
        for p in patterns {
            let re = Regex::new(p).expect("valid regex");
            for m in re.find_iter(&source) {
                let t = slug_token(m.as_str());
                if !t.is_empty() {
                    set.insert(t);
                }
            }
        }
        let vals: Vec<String> = set.into_iter().take(8).collect();
        match *k {
            "runtime" => out.runtime = vals,
            "transport" => out.transport = vals,
            "storage" => out.storage = vals,
            "quality" => out.quality = vals,
            _ => {}
        }
    }
    out
}

pub fn parse_intent_ir(text: &str) -> IntentIR {
    let trimmed = text.trim();
    let action = pick_action(trimmed);
    let domain_scores = score_domains(trimmed);
    let domains = domain_scores.iter().map(|d| d.name.clone()).collect::<Vec<_>>();
    let entities = pick_entities(trimmed);
    let must_include = pick_by_directive(trimmed, r"\b(must include|include|incluir|inclua)\s+([a-z0-9_\-/]+)");
    let must_avoid = pick_by_directive(trimmed, r"\b(without|avoid|sem|evitar)\s+([a-z0-9_\-/]+)");
    let signal_score = usize::from(trimmed.contains('?'))
        + usize::from(!domain_scores.is_empty())
        + usize::from(!entities.is_empty())
        + usize::from(!must_include.is_empty() || !must_avoid.is_empty());

    let action_priorities = HashMap::from([
        ("refactor", 10.0f32),
        ("fix", 10.0),
        ("implement", 9.0),
        ("generate", 8.0),
        ("optimize", 7.0),
        ("analyze", 7.0),
        ("explain", 6.0),
    ]);
    let base = action_priorities.get(action.as_str()).copied().unwrap_or(5.0) / 12.0;
    let confidence = (base + signal_score as f32 * 0.08).clamp(0.15, 0.99);

    IntentIR {
        version: "0.1.0".to_string(),
        intent: Intent {
            action,
            domain: domains,
            domain_scores,
            entities,
            confidence: (confidence * 100.0).round() / 100.0,
        },
        slots: pick_slots(trimmed),
        constraints: Constraints {
            preserve_negation: Regex::new(r"\b(n[aã]o|not|never|sem)\b").expect("valid regex").is_match(trimmed),
            output_format: detect_output_format(trimmed),
            max_length: pick_max_length(trimmed),
            must_include,
            must_avoid,
        },
        signals: Signals {
            has_code: Regex::new(r"```|=>|function\s|const\s|class\s|\{\s*\n").expect("valid regex").is_match(trimmed),
            has_question: trimmed.contains('?'),
            language_hint: detect_language_hint(trimmed),
        },
        source: Source {
            original_length: trimmed.len(),
            non_empty_lines: trimmed.lines().filter(|l| !l.trim().is_empty()).count(),
        },
    }
}

pub fn generate_machine_prompt(ir: &IntentIR) -> String {
    let mut parts = vec![format!("act={}", ir.intent.action)];
    if !ir.intent.domain.is_empty() {
        parts.push(format!("dom={}", ir.intent.domain.join(",")));
    }
    if !ir.intent.entities.is_empty() {
        parts.push(format!("ent={}", ir.intent.entities.join(",")));
    }
    parts.push(format!("conf={:.2}", ir.intent.confidence));
    parts.push(format!("fmt={}", ir.constraints.output_format));
    if let Some(max) = ir.constraints.max_length {
        parts.push(format!("max={max}"));
    }
    if !ir.constraints.must_include.is_empty() {
        parts.push(format!("must+{}", ir.constraints.must_include.join(",")));
    }
    if !ir.constraints.must_avoid.is_empty() {
        parts.push(format!("must-{}", ir.constraints.must_avoid.join(",")));
    }
    if ir.constraints.preserve_negation {
        parts.push("keep-negation".to_string());
    }
    if ir.signals.has_code {
        parts.push("preserve-code".to_string());
    }
    parts.join(" | ")
}
