use crate::types::{ConversationIRV2, EdgeV2, SegmentV2, SemanticGraphV2};
use regex::Regex;
use std::collections::{BTreeSet, HashSet};

fn fold(s: &str) -> String {
    s.chars()
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

fn lang_hint(text: &str) -> String {
    let f = fold(text);
    if f.contains(" nao ")
        || f.contains(" contexto")
        || f.contains(" objetivo")
        || f.starts_with("contexto")
        || f.starts_with("objetivo")
    {
        "pt".to_string()
    } else if f.contains(" the ") || f.contains(" with ") {
        "en".to_string()
    } else if f.contains(" con ") || f.contains(" objetivo") {
        "es".to_string()
    } else {
        "unknown".to_string()
    }
}

fn role_of_heading(line: &str) -> Option<&'static str> {
    let f = fold(line.trim());
    let table = [
        ("context", vec!["context", "contexto", "contexte"]),
        ("goal", vec!["goal", "objetivo", "objectif"]),
        ("scope", vec!["scope", "escopo", "alcance"]),
        ("expected", vec!["expected result", "resultado esperado", "resultat attendu"]),
        ("constraint", vec!["constraint", "restricao", "restrição"]),
        ("decision", vec!["decision", "decisao", "decisão"]),
    ];
    for (role, keys) in table {
        if keys.iter().any(|k| f == *k) {
            return Some(role);
        }
    }
    None
}

fn split_sentences(text: &str) -> Vec<String> {
    Regex::new(r"(?m)([^.!?\n]+[.!?]?)")
        .expect("valid regex")
        .captures_iter(text)
        .filter_map(|c| c.get(1).map(|m| m.as_str().trim().to_string()))
        .filter(|s| !s.is_empty())
        .collect()
}

fn stopwords() -> HashSet<&'static str> {
    [
        "a", "o", "e", "de", "da", "do", "para", "com", "sem", "em", "um", "uma", "the", "and", "of", "to", "with",
        "for", "in", "on", "is", "are", "that", "this", "como", "que", "por", "it", "as",
    ]
    .into_iter()
    .collect()
}

fn tokens(text: &str) -> Vec<String> {
    let sw = stopwords();
    fold(text)
        .split(|c: char| !(c.is_alphanumeric() || c == '-' || c == '_'))
        .filter(|t| t.len() >= 3)
        .filter(|t| !sw.contains(*t))
        .map(|t| t.to_string())
        .collect()
}

fn top_keywords(text: &str) -> Vec<String> {
    let mut freq: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for t in tokens(text) {
        *freq.entry(t).or_insert(0) += 1;
    }
    let mut items: Vec<(String, usize)> = freq.into_iter().collect();
    items.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    items.into_iter().map(|x| x.0).take(8).collect()
}

fn similarity(a: &[String], b: &[String]) -> f32 {
    let sa: HashSet<&str> = a.iter().map(String::as_str).collect();
    let sb: HashSet<&str> = b.iter().map(String::as_str).collect();
    if sa.is_empty() || sb.is_empty() {
        return 0.0;
    }
    let inter = sa.intersection(&sb).count() as f32;
    let uni = sa.union(&sb).count() as f32;
    inter / uni
}

fn infer_intent(text: &str) -> String {
    let f = fold(text);
    let table = [
        ("refactor", vec!["refactor", "refatore"]),
        ("implement", vec!["implement", "implementar", "aplicar", "ajustar", "alterar"]),
        ("fix", vec!["fix", "corrigir", "consertar"]),
        ("analyze", vec!["analyze", "analise", "analisar"]),
        ("optimize", vec!["optimize", "otimizar", "compress"]),
    ];
    for (intent, hints) in table {
        if hints.iter().any(|h| f.contains(h)) {
            return intent.to_string();
        }
    }
    "implement".to_string()
}

pub fn compile_conversation_ir_v2(text: &str) -> ConversationIRV2 {
    let mut segments = Vec::new();
    let mut current_role = "generic".to_string();
    let mut current = Vec::new();

    for line in text.lines() {
        if let Some(role) = role_of_heading(line) {
            if !current.is_empty() {
                let body = current.join(" ").trim().to_string();
                if !body.is_empty() {
                    let id = format!("s{}", segments.len() + 1);
                    segments.push(SegmentV2 {
                        id,
                        role: current_role.clone(),
                        keywords: top_keywords(&body),
                        text: body,
                    });
                }
                current.clear();
            }
            current_role = role.to_string();
            continue;
        }
        let t = line.trim();
        if !t.is_empty() {
            current.push(t.to_string());
        }
    }
    if !current.is_empty() {
        let body = current.join(" ").trim().to_string();
        if !body.is_empty() {
            let id = format!("s{}", segments.len() + 1);
            segments.push(SegmentV2 {
                id,
                role: current_role.clone(),
                keywords: top_keywords(&body),
                text: body,
            });
        }
    }
    if segments.is_empty() {
        for s in split_sentences(text) {
            let id = format!("s{}", segments.len() + 1);
            segments.push(SegmentV2 {
                id,
                role: "generic".to_string(),
                keywords: top_keywords(&s),
                text: s,
            });
        }
    }

    let mut edges = Vec::new();
    for i in 0..segments.len() {
        for j in (i + 1)..segments.len() {
            let sim = similarity(&segments[i].keywords, &segments[j].keywords);
            if sim >= 0.22 {
                edges.push(EdgeV2 {
                    from: segments[i].id.clone(),
                    to: segments[j].id.clone(),
                    relation: "semantic-overlap".to_string(),
                    score: (sim * 100.0).round() / 100.0,
                });
            }
        }
    }

    let mut entities = BTreeSet::new();
    let mut constraints = BTreeSet::new();
    let mut actions = BTreeSet::new();
    let mut decisions = Vec::new();
    let mut pending = Vec::new();

    for s in &segments {
        for k in &s.keywords {
            if ["retry", "idempotency", "dlq", "queue", "gupy", "integracao", "integration", "latency", "parametro", "cultural", "impacto"].contains(&k.as_str()) {
                entities.insert(k.clone());
            }
            if ["must", "required", "obrigatorio", "evitar", "avoid", "without"].contains(&k.as_str()) {
                constraints.insert(k.clone());
            }
            if ["implement", "aplicar", "ajustar", "refactor", "validar", "validate", "analyze"].contains(&k.as_str()) {
                actions.insert(k.clone());
            }
        }
        if s.role == "decision" {
            decisions.push(s.text.clone());
        }
        if s.role == "scope" || s.role == "goal" {
            pending.push(s.text.clone());
        }
    }

    let intent = infer_intent(text);
    if entities.is_empty() {
        for s in &segments {
            for k in s.keywords.iter().take(2) {
                if k.len() >= 4 {
                    entities.insert(k.clone());
                }
            }
        }
    }
    if actions.is_empty() {
        actions.insert(intent.clone());
    }

    let wire = format!(
        "PITH/2|intent={}|lang={}|seg={}|ent={}|act={}|cst={}|edge={}|pending={}",
        intent,
        lang_hint(text),
        segments.len(),
        entities.iter().take(8).cloned().collect::<Vec<_>>().join(","),
        actions.iter().take(8).cloned().collect::<Vec<_>>().join(","),
        constraints.iter().take(8).cloned().collect::<Vec<_>>().join(","),
        edges.len(),
        pending.len()
    );

    ConversationIRV2 {
        version: "2.0.0".to_string(),
        language: lang_hint(text),
        intent,
        entities: entities.into_iter().collect(),
        actions: actions.into_iter().collect(),
        constraints: constraints.into_iter().collect(),
        decisions,
        pending,
        graph: SemanticGraphV2 { nodes: segments, edges },
        wire,
    }
}
