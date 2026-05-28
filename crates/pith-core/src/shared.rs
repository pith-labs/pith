use crate::constants::{is_adjective_suffix, is_verb_conjugated, negation_words};
use crate::morphology::{is_finite_verb_surface_candidate, is_gerund_candidate, is_infinitive_candidate, is_nominal_likely_shape, is_romance_infinitive_shape};
use crate::text_layers::{is_header, is_pattern_symbol_token};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone)]
pub struct ScoredWord {
    pub word: String,
    pub score: i32,
    pub orig_idx: usize,
}

pub fn build_freq_map(text: &str) -> HashMap<String, usize> {
    let mut freq = HashMap::new();
    for w in text.to_lowercase().split_whitespace() {
        let clean = w.chars().filter(|c| c.is_alphabetic()).collect::<String>();
        if !clean.is_empty() {
            *freq.entry(clean).or_insert(0) += 1;
        }
    }
    freq
}

pub fn score_word(word: &str, freq: &HashMap<String, usize>, total_words: usize, is_first_in_line: bool, is_sentence_start: bool, is_question: bool) -> i32 {
    if word.chars().any(|c| c.is_ascii_digit()) {
        return 100;
    }
    let clean = word.chars().filter(|c| c.is_alphabetic() || *c == '-').collect::<String>();
    if clean.is_empty() {
        return 0;
    }
    let mut score = clean.len().min(8) as i32;
    let st = clean.to_lowercase();

    if is_romance_infinitive_shape(&st) && (st.ends_with("ar") || st.ends_with("er") || st.ends_with("ir")) {
        score += 6;
    }
    if (st.ends_with("ando") || st.ends_with("endo") || st.ends_with("indo")) && st.len() >= 5 {
        score += 5;
    }
    if is_question && ["iam", "ria", "aria", "ariam", "eria", "eriam", "iria", "iriam"].iter().any(|s| st.ends_with(s)) {
        score += 4;
    }
    if clean.len() == 3 {
        if !clean.chars().any(|c| "aeiouà-úAEIOUÀ-Ú".contains(c)) {
            score += 3;
        }
        if is_question { score += 2; }
    }

    if clean.chars().all(|c| c.is_uppercase() || c.is_ascii_digit()) && clean.chars().next().is_some_and(|c| c.is_uppercase()) {
        score += 8;
    } else if clean.chars().next().is_some_and(|c| c.is_uppercase()) && !is_sentence_start {
        score += 5;
    }

    if total_words > 30 {
        let ratio = (*freq.get(&st).unwrap_or(&0) as f32) / total_words as f32;
        if ratio > 0.02 && !(is_sentence_start && is_first_in_line && clean.len() <= 5) {
            score -= ((ratio * 60.0).floor() as i32).min(6);
        }
    }

    if clean.len() >= 5 && is_verb_conjugated(&st) {
        score -= 3;
    }
    if is_first_in_line && !is_sentence_start { score += 2; }
    if is_sentence_start && is_first_in_line && (2..=6).contains(&clean.len()) { score += 2; }
    score
}

pub fn pick_verbal_action(fused: &[ScoredWord], freq: &HashMap<String, usize>, total_words: usize) -> (String, HashSet<String>) {
    let mut merged: Vec<ScoredWord> = fused
        .iter()
        .filter(|x| is_infinitive_candidate(&x.word) || is_gerund_candidate(&x.word) || is_finite_verb_surface_candidate(&x.word))
        .map(|item| {
            let key = item.word.to_lowercase();
            let tf = *freq.get(&key).unwrap_or(&0) as f64;
            let idf = (1.0 + (total_words as f64 / (tf + 1.0))).ln();
            let pos = (1.0 - item.orig_idx as f64 / total_words.max(1) as f64).max(0.0);
            ScoredWord {
                word: item.word.clone(),
                score: (item.score as f64 * (1.0 + 0.35 * idf) + pos * 1.5) as i32,
                orig_idx: item.orig_idx,
            }
        })
        .collect();

    merged.sort_by(|a, b| b.score.cmp(&a.score));
    let mut seen = HashSet::new();
    merged.retain(|x| seen.insert(x.word.to_lowercase()));
    if let Some(top) = merged.first() {
        let key = top.word.to_lowercase();
        return (format!("!{}", top.word), HashSet::from([key]));
    }

    let mut sorted = fused.to_vec();
    sorted.sort_by(|a, b| b.score.cmp(&a.score));
    for item in sorted {
        let k = item.word.to_lowercase();
        if item.word.starts_with('~') || item.word.chars().any(|c| c.is_ascii_digit()) || item.word.chars().next().is_some_and(|c| c.is_uppercase()) {
            continue;
        }
        if is_adjective_suffix(&k) || is_nominal_likely_shape(&k) {
            continue;
        }
        return (format!("!{}", item.word), HashSet::from([k]));
    }
    (String::new(), HashSet::new())
}

pub fn fuse_proper_nouns(items: &[ScoredWord]) -> Vec<ScoredWord> {
    let mut result = Vec::new();
    let mut i = 0usize;
    while i < items.len() {
        if items[i].word.chars().next().is_some_and(|c| c.is_uppercase()) {
            let mut fused = items[i].word.clone();
            let mut max_score = items[i].score;
            let mut last = items[i].orig_idx;
            let mut j = i + 1;
            while j < items.len()
                && items[j].word.chars().next().is_some_and(|c| c.is_uppercase())
                && items[j].orig_idx == last + 1
                && !is_infinitive_candidate(&items[i].word)
                && !is_infinitive_candidate(&items[j].word)
            {
                fused.push_str(&items[j].word);
                max_score = max_score.max(items[j].score);
                last = items[j].orig_idx;
                j += 1;
            }
            result.push(ScoredWord { word: fused, score: max_score, orig_idx: items[i].orig_idx });
            i = j;
        } else {
            result.push(items[i].clone());
            i += 1;
        }
    }
    result
}

pub fn score_filter_lines(text: &str, freq: &HashMap<String, usize>, total_words: usize, threshold: i32) -> String {
    let mut result: Vec<String> = Vec::new();

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            if result.last().is_some_and(|x| !x.is_empty()) {
                result.push(String::new());
            }
            continue;
        }
        if is_header(trimmed) {
            result.push(trimmed.to_string());
            continue;
        }

        let is_question = trimmed.ends_with('?');
        let (marker, content) = if let Some(c) = regex::Regex::new(r"^([-•–]\s+|\d+\.\s+)(.*)").expect("valid regex").captures(trimmed) {
            (c.get(1).map(|m| m.as_str()).unwrap_or(""), c.get(2).map(|m| m.as_str()).unwrap_or(""))
        } else {
            ("", trimmed)
        };

        let words = content.split_whitespace().collect::<Vec<_>>();
        let mut starts = HashSet::from([0usize]);
        for (i, w) in words.iter().enumerate() {
            if [".", "!", "?"].iter().any(|p| w.ends_with(p)) && i + 1 < words.len() {
                starts.insert(i + 1);
            }
        }

        let mut kept = Vec::new();
        let mut negate_next = false;
        for (i, w) in words.iter().enumerate() {
            if w.contains('\0') {
                kept.push(if negate_next { format!("~{w}") } else { (*w).to_string() });
                negate_next = false;
                continue;
            }
            let clean = w.chars().filter(|c| c.is_alphanumeric() || *c == '-').collect::<String>();
            if clean.is_empty() {
                if is_pattern_symbol_token(w) {
                    kept.push((*w).to_string());
                    negate_next = false;
                }
                continue;
            }
            if negation_words().iter().any(|n| clean.eq_ignore_ascii_case(n)) {
                negate_next = !negate_next;
                continue;
            }
            let score = score_word(w, freq, total_words, i == 0 && marker.is_empty(), starts.contains(&i), is_question);
            if score >= threshold {
                kept.push(if negate_next { format!("~{w}") } else { (*w).to_string() });
                negate_next = false;
            }
        }
        let compressed = kept.join(" ").split_whitespace().collect::<Vec<_>>().join(" ");
        if !compressed.is_empty() {
            result.push(format!("{marker}{compressed}"));
        }
    }

    result.join("\n")
}
