use crate::types::{ConversationIRV2, EdgeV2, MemoryLayerV2, SegmentV2, SemanticGraphV2};
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
    if f.contains(" nao ") || f.contains(" contexto") || f.contains(" objetivo") || f.starts_with("contexto") {
        "pt".to_string()
    } else if f.contains(" the ") || f.contains(" with ") || f.contains(" objective") {
        "en".to_string()
    } else if f.contains(" con ") || f.contains(" objetivo") {
        "es".to_string()
    } else if f.contains(" avec ") || f.contains(" objectif") {
        "fr".to_string()
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
        "for", "in", "on", "is", "are", "that", "this", "como", "que", "por", "it", "as", "uma", "como", "entre",
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

fn build_segments(text: &str) -> Vec<SegmentV2> {
    let mut segments = Vec::new();
    let mut current_role = "generic".to_string();
    let mut current = Vec::new();

    for line in text.lines() {
        if let Some(role) = role_of_heading(line) {
            if !current.is_empty() {
                let body = current.join(" ").trim().to_string();
                if !body.is_empty() {
                    let id = format!("s{}", segments.len() + 1);
                    segments.push(SegmentV2 { id, role: current_role.clone(), keywords: top_keywords(&body), text: body });
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
            segments.push(SegmentV2 { id, role: current_role, keywords: top_keywords(&body), text: body });
        }
    }

    if segments.is_empty() {
        for s in split_sentences(text) {
            let id = format!("s{}", segments.len() + 1);
            segments.push(SegmentV2 { id, role: "generic".to_string(), keywords: top_keywords(&s), text: s });
        }
    }
    segments
}

fn causal_hint(line: &str) -> bool {
    let f = fold(line);
    ["because", "therefore", "so that", "impact", "depends", "dependencia", "impacto", "para", "devido", "causa"].iter().any(|k| f.contains(k))
}

fn build_edges(segments: &[SegmentV2]) -> Vec<EdgeV2> {
    let mut edges = Vec::new();
    for i in 0..segments.len() {
        for j in (i + 1)..segments.len() {
            let sim = similarity(&segments[i].keywords, &segments[j].keywords);
            if sim >= 0.20 {
                edges.push(EdgeV2 {
                    from: segments[i].id.clone(),
                    to: segments[j].id.clone(),
                    relation: "semantic-overlap".to_string(),
                    score: (sim * 100.0).round() / 100.0,
                });
            }
            if causal_hint(&segments[i].text) || causal_hint(&segments[j].text) {
                edges.push(EdgeV2 {
                    from: segments[i].id.clone(),
                    to: segments[j].id.clone(),
                    relation: "causal-dependency".to_string(),
                    score: 0.51,
                });
            }
            if segments[i].role == "goal" && (segments[j].role == "scope" || segments[j].role == "expected") {
                edges.push(EdgeV2 {
                    from: segments[i].id.clone(),
                    to: segments[j].id.clone(),
                    relation: "goal-dependency".to_string(),
                    score: 0.67,
                });
            }
        }
    }
    edges
}

fn summarize_chunk(chunk: &str) -> String {
    let kw = top_keywords(chunk);
    if kw.is_empty() {
        "_".to_string()
    } else {
        kw.into_iter().take(5).collect::<Vec<_>>().join(",")
    }
}

fn compute_fields(segments: &[SegmentV2]) -> (Vec<String>, Vec<String>, Vec<String>, Vec<String>, Vec<String>) {
    let mut entities = BTreeSet::new();
    let mut constraints = BTreeSet::new();
    let mut actions = BTreeSet::new();
    let mut decisions = Vec::new();
    let mut pending = Vec::new();

    for s in segments {
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

    if entities.is_empty() {
        for s in segments {
            for k in s.keywords.iter().take(2) {
                if k.len() >= 4 {
                    entities.insert(k.clone());
                }
            }
        }
    }

    (
        entities.into_iter().collect(),
        actions.into_iter().collect(),
        constraints.into_iter().collect(),
        decisions,
        pending,
    )
}

pub fn compile_conversation_ir_v2(text: &str) -> ConversationIRV2 {
    let segments = build_segments(text);
    let edges = build_edges(&segments);
    let (entities, mut actions, constraints, decisions, pending) = compute_fields(&segments);
    let intent = infer_intent(text);
    if actions.is_empty() {
        actions.push(intent.clone());
    }

    let wire = format!(
        "PITH/2|intent={}|lang={}|seg={}|ent={}|act={}|cst={}|edge={}|pending={}|mem=0",
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
        entities,
        actions,
        constraints,
        decisions,
        pending,
        graph: SemanticGraphV2 { nodes: segments, edges },
        memory: Vec::new(),
        global_summary: summarize_chunk(text),
        wire,
    }
}

pub fn compile_conversation_ir_v2_stream(text: &str, window_sentences: usize) -> ConversationIRV2 {
    let sentences = split_sentences(text);
    if sentences.is_empty() {
        return compile_conversation_ir_v2(text);
    }

    let mut memory = Vec::new();
    let mut all_nodes = Vec::new();
    let mut all_edges = Vec::new();
    let mut entities = BTreeSet::new();
    let mut actions = BTreeSet::new();
    let mut constraints = BTreeSet::new();
    let mut decisions = Vec::new();
    let mut pending = Vec::new();
    let mut summaries = Vec::new();

    let chunk_size = window_sentences.max(1);
    let mut idx = 0usize;
    while idx < sentences.len() {
        let end = (idx + chunk_size).min(sentences.len());
        let chunk_text = sentences[idx..end].join(" ");
        let chunk_ir = compile_conversation_ir_v2(&chunk_text);
        let unit = format!("chunk-{}", memory.len() + 1);
        summaries.push(chunk_ir.global_summary.clone());

        memory.push(MemoryLayerV2 {
            layer: "local".to_string(),
            unit,
            summary: chunk_ir.global_summary.clone(),
            entities: chunk_ir.entities.clone(),
            actions: chunk_ir.actions.clone(),
        });

        let prefix = format!("c{}", memory.len());
        for mut n in chunk_ir.graph.nodes {
            n.id = format!("{}:{}", prefix, n.id);
            all_nodes.push(n);
        }
        for mut e in chunk_ir.graph.edges {
            e.from = format!("{}:{}", prefix, e.from);
            e.to = format!("{}:{}", prefix, e.to);
            all_edges.push(e);
        }

        for e in chunk_ir.entities {
            entities.insert(e);
        }
        for a in chunk_ir.actions {
            actions.insert(a);
        }
        for c in chunk_ir.constraints {
            constraints.insert(c);
        }
        decisions.extend(chunk_ir.decisions);
        pending.extend(chunk_ir.pending);
        idx = end;
    }

    for i in 0..memory.len().saturating_sub(1) {
        all_edges.push(EdgeV2 {
            from: format!("c{}:s1", i + 1),
            to: format!("c{}:s1", i + 2),
            relation: "memory-transition".to_string(),
            score: 0.55,
        });
    }

    let global_summary = summaries.join(" | ");
    memory.push(MemoryLayerV2 {
        layer: "global".to_string(),
        unit: "conversation".to_string(),
        summary: global_summary.clone(),
        entities: entities.iter().take(12).cloned().collect(),
        actions: actions.iter().take(12).cloned().collect(),
    });

    let intent = infer_intent(text);
    if actions.is_empty() {
        actions.insert(intent.clone());
    }

    let wire = format!(
        "PITH/2|intent={}|lang={}|seg={}|ent={}|act={}|cst={}|edge={}|pending={}|mem={}",
        intent,
        lang_hint(text),
        all_nodes.len(),
        entities.iter().take(8).cloned().collect::<Vec<_>>().join(","),
        actions.iter().take(8).cloned().collect::<Vec<_>>().join(","),
        constraints.iter().take(8).cloned().collect::<Vec<_>>().join(","),
        all_edges.len(),
        pending.len(),
        memory.len()
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
        graph: SemanticGraphV2 {
            nodes: all_nodes,
            edges: all_edges,
        },
        memory,
        global_summary,
        wire,
    }
}
