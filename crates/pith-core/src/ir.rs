use crate::types::{Constraints, DomainScore, Intent, IntentIR, Signals, Slots, Source};
use crate::constants::domain_weights;
use regex::Regex;
use std::collections::{BTreeSet, HashMap};

fn fold_diacritics(input: &str) -> String {
    input
        .chars()
        .map(|c| match c {
            'á' | 'à' | 'ã' | 'â' | 'ä' | 'Á' | 'À' | 'Ã' | 'Â' | 'Ä' => 'a',
            'é' | 'è' | 'ê' | 'ë' | 'É' | 'È' | 'Ê' | 'Ë' => 'e',
            'í' | 'ì' | 'î' | 'ï' | 'Í' | 'Ì' | 'Î' | 'Ï' => 'i',
            'ó' | 'ò' | 'õ' | 'ô' | 'ö' | 'Ó' | 'Ò' | 'Õ' | 'Ô' | 'Ö' => 'o',
            'ú' | 'ù' | 'û' | 'ü' | 'Ú' | 'Ù' | 'Û' | 'Ü' => 'u',
            'ç' | 'Ç' => 'c',
            'ñ' | 'Ñ' => 'n',
            _ => c.to_ascii_lowercase(),
        })
        .collect()
}

fn slug_token(raw: &str) -> String {
    fold_diacritics(raw)
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' { c } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .chars()
        .take(32)
        .collect()
}

fn detect_language_hint(text: &str) -> String {
    let lower = fold_diacritics(text);
    if lower.contains(" nao") || lower.contains(" como ") || lower.contains(" contexto ") {
        return "pt".to_string();
    }
    if lower.contains(" the ") || lower.contains(" with ") || lower.contains(" how ") {
        return "en".to_string();
    }
    if lower.contains(" el ") || lower.contains(" con ") || lower.contains(" objetivo ") {
        return "es".to_string();
    }
    if lower.contains(" le ") || lower.contains(" avec ") || lower.contains(" objectif ") {
        return "fr".to_string();
    }
    "unknown".to_string()
}

fn detect_output_format(text: &str) -> String {
    if Regex::new(r"(?i)\bjson\b").expect("valid regex").is_match(text) {
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
        (r"(?i)\b(refactor|refatore|refatorar)\b", "refactor"),
        (r"(?i)\b(fix|corrigir|corrija|consertar)\b", "fix"),
        (r"(?i)\b(explain|explicar|explique)\b", "explain"),
        (r"(?i)\b(implement|implementar|implemente|aplicar|ajustar|alterar)\b", "implement"),
        (r"(?i)\b(generate|gerar|criar|create)\b", "generate"),
        (r"(?i)\b(optimi[sz]e|otimizar|otimize|compress)\b", "optimize"),
        (r"(?i)\b(analy[sz]e|analisar|analise|review)\b", "analyze"),
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
    let lower = fold_diacritics(text);
    let tokens = lower
        .split(|c: char| !(c.is_alphanumeric() || c == '-' || c == '_'))
        .filter(|t| !t.is_empty())
        .collect::<Vec<_>>();

    let mut out = Vec::new();
    for (domain, weights) in domain_weights() {
        let mut score = 0.0f32;
        for token in &tokens {
            if let Some(w) = weights.get(*token) {
                score += *w;
            }
        }
        if domain == "backend" && (lower.contains("api") || lower.contains("http")) {
            score += 1.0;
        }
        if domain == "async-processing" && (lower.contains("retry") || lower.contains("dlq")) {
            score += 1.2;
        }
        if domain == "llm" && (lower.contains("token") || lower.contains("prompt")) {
            score += 1.0;
        }
        if score > 0.6 {
            out.push(DomainScore {
                name: domain.clone(),
                score: (score * 4.0).round() as i32 + 3,
            });
        }
    }
    out.sort_by(|a, b| b.score.cmp(&a.score));
    out
}

fn pick_entities(text: &str) -> Vec<String> {
    let mut score: HashMap<String, i32> = HashMap::new();
    let section_weights = extract_semantic_sections(text);
    let stopwords = stopwords_set();

    for (section, body) in section_weights {
        let boost = match section.as_str() {
            "goal" => 5,
            "scope" => 4,
            "expected" => 4,
            "context" => 2,
            _ => 1,
        };
        for token in tokenize_words(&body) {
            if token.len() < 4 || stopwords.contains(token.as_str()) {
                continue;
            }
            *score.entry(token).or_insert(0) += boost;
        }
    }

    let cap_re = Regex::new(r"\b[A-Z][A-Za-z0-9_-]{2,}\b").expect("valid regex");
    for m in cap_re.find_iter(text) {
        let t = slug_token(m.as_str());
        if t.len() >= 3 {
            *score.entry(t).or_insert(0) += 3;
        }
    }

    let mut ranked = score.into_iter().collect::<Vec<_>>();
    ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    ranked.into_iter().map(|(k, _)| k).take(8).collect()
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

    let source = fold_diacritics(text);
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

fn tokenize_words(text: &str) -> Vec<String> {
    let folded = fold_diacritics(text);
    folded
        .split(|c: char| !(c.is_alphanumeric() || c == '-' || c == '_'))
        .filter(|t| !t.is_empty())
        .map(slug_token)
        .filter(|t| !t.is_empty())
        .collect()
}

fn stopwords_set() -> BTreeSet<&'static str> {
    [
        "a", "as", "o", "os", "um", "uma", "de", "do", "da", "dos", "das", "e", "em", "no", "na",
        "nos", "nas", "com", "sem", "para", "por", "que", "como", "dentro", "essa", "esse", "isso",
        "objetivo", "escopo", "contexto", "resultado", "esperado",
        "the", "a", "an", "and", "or", "with", "without", "for", "from", "into", "this", "that",
        "goal", "scope", "context", "expected", "result",
        "el", "la", "los", "las", "con", "sin", "para", "como", "objetivo", "alcance", "resultado",
        "le", "les", "avec", "sans", "pour", "comme", "objectif", "contexte", "resultat",
    ]
    .into_iter()
    .collect()
}

fn extract_semantic_sections(text: &str) -> Vec<(String, String)> {
    let folded = fold_diacritics(text);
    let mut out: Vec<(String, String)> = Vec::new();
    let mut current = "generic".to_string();
    let mut buffer = Vec::new();

    let heading_kind = |line: &str| -> Option<&'static str> {
        let t = line.trim();
        if t.is_empty() {
            return None;
        }
        let is_context = Regex::new(r"^(context|contexto|contexte)$").expect("valid regex").is_match(t);
        let is_goal = Regex::new(r"^(goal|objetivo|objectif)$").expect("valid regex").is_match(t);
        let is_scope = Regex::new(r"^(scope|escopo|alcance)$").expect("valid regex").is_match(t);
        let is_expected =
            Regex::new(r"^(resultado esperado|expected result|resultat attendu)$").expect("valid regex").is_match(t);
        if is_context {
            return Some("context");
        }
        if is_goal {
            return Some("goal");
        }
        if is_scope {
            return Some("scope");
        }
        if is_expected {
            return Some("expected");
        }
        None
    };

    for line in folded.lines() {
        if let Some(kind) = heading_kind(line) {
            if !buffer.is_empty() {
                out.push((current.clone(), buffer.join(" ")));
                buffer.clear();
            }
            current = kind.to_string();
            continue;
        }
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            buffer.push(trimmed.to_string());
        }
    }
    if !buffer.is_empty() {
        out.push((current, buffer.join(" ")));
    }
    if out.is_empty() {
        out.push(("generic".to_string(), folded));
    }
    out
}

pub fn parse_intent_ir(text: &str) -> IntentIR {
    let trimmed = text.trim();
    let action = pick_action(trimmed);
    let domain_scores = score_domains(trimmed);
    let domains = domain_scores.iter().map(|d| d.name.clone()).collect::<Vec<_>>();
    let entities = pick_entities(trimmed);
    let must_include = pick_by_directive(trimmed, r"(?i)\b(must include|include|incluir|inclua)\s+([a-z0-9_\-/]+)");
    let must_avoid = pick_by_directive(trimmed, r"(?i)\b(without|avoid|sem|evitar)\s+([a-z0-9_\-/]+)");
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
