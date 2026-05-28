use crate::constants::{is_adjective_suffix, COMPRESS_THRESHOLD, MAX_QUERY_NICHES, QUERY_THRESHOLD};
use crate::morphology::{is_infinitive_candidate, is_nominal_likely_shape};
use crate::opcode::{build_opcode, compute_flags};
use crate::shared::{build_freq_map, fuse_proper_nouns, pick_verbal_action, score_filter_lines, score_word, ScoredWord};
use crate::text_layers::{abbreviate, human_noise_layer, pattern_layer, preserve_layer, restore_and_clean};
use regex::Regex;
use std::collections::HashSet;

pub fn compress_pipeline(text: &str, ultra_compact: bool) -> (String, usize) {
    let cleaned = human_noise_layer(text);
    let original_word_count = cleaned.split_whitespace().count();
    let (preserved, preserve_map) = preserve_layer(&cleaned);
    let patterned = pattern_layer(&preserved);
    let freq = build_freq_map(&patterned);
    let total_words = patterned.split_whitespace().count();
    let filtered = score_filter_lines(&patterned, &freq, total_words, COMPRESS_THRESHOLD);
    let abbreviated = abbreviate(&filtered);
    let final_text = restore_and_clean(&abbreviated, &preserve_map).trim().to_string();

    if final_text.is_empty() {
        return (text.to_string(), 0);
    }

    let flags = compute_flags(text);
    let final_output = build_opcode("C", "compress", "_", "_", "_", &[], &[], &[], &final_text, &flags, ultra_compact);
    let output_word_count = final_text.split_whitespace().count();
    let noise = if original_word_count > 0 {
        ((original_word_count.saturating_sub(output_word_count)) * 100) / original_word_count
    } else {
        0
    };
    (final_output, noise)
}

pub fn conversational_pipeline(text: &str, ultra_compact: bool) -> (String, usize) {
    let q_count = text.matches('?').count();
    let neg_count = Regex::new(r"(?i)\b(não|nao|not|never|sem|without|nem)\b|n't\b").expect("valid regex").find_iter(text).count();
    let _stance = if neg_count > 0 && q_count > 0 { "[~?]" } else if neg_count > 0 { "[~]" } else if q_count >= 1 { "[?]" } else { "" };

    let cleaned = human_noise_layer(text);
    let original_word_count = cleaned.split_whitespace().count();
    let work_text = cleaned
        .trim_end_matches(['?', '!', '.', '…'])
        .replace(Regex::new(r"([a-zA-ZÀ-ÿ0-9])([,;])([a-zA-ZÀ-ÿ0-9])").expect("valid regex").as_str(), "$1 $3")
        .replace(Regex::new(r"([a-zA-ZÀ-ÿ0-9])/([a-zA-ZÀ-ÿ0-9])").expect("valid regex").as_str(), "$1 $2");

    let freq = build_freq_map(&work_text);
    let total_words = work_text.split_whitespace().count();
    let words = work_text.split_whitespace().collect::<Vec<_>>();
    let conv_threshold = 5;

    let mut sentence_starts = HashSet::from([0usize]);
    for (i, w) in words.iter().enumerate() {
        if [".", "!", "?"].iter().any(|p| w.ends_with(p)) && i + 1 < words.len() {
            sentence_starts.insert(i + 1);
        }
    }

    let mut survivors = Vec::new();
    let mut seen = HashSet::new();
    for (i, w) in words.iter().enumerate() {
        let clean = w.chars().filter(|c| c.is_alphanumeric() || *c == '-').collect::<String>();
        if clean.is_empty() { continue; }
        let lower = clean.to_lowercase();
        if ["não", "nao", "not", "never", "sem", "without", "nem"].contains(&lower.as_str()) || w.ends_with("n't") {
            continue;
        }
        if !seen.insert(lower) { continue; }
        let score = score_word(w, &freq, total_words, i == 0, sentence_starts.contains(&i), false);
        if score >= conv_threshold {
            survivors.push(ScoredWord { word: clean, score, orig_idx: i });
        }
    }

    let fused = fuse_proper_nouns(&survivors);
    let (mut action, action_keys) = pick_verbal_action(&fused, &freq, total_words);
    let mut niches = Vec::new();
    let mut entities = Vec::new();
    let mut attrs = Vec::new();
    let mut used = HashSet::new();

    for item in fused {
        let key = item.word.to_lowercase();
        if !used.insert(key.clone()) { continue; }
        if item.word.chars().any(|c| c.is_ascii_digit()) { attrs.push(format!("?{}", item.word)); continue; }
        if is_adjective_suffix(&key) && item.word.len() >= 8 && !key.ends_with("mente") { attrs.push(format!("?{key}")); continue; }
        if item.word.chars().next().is_some_and(|c| c.is_uppercase()) && item.word.len() >= 3 && !is_infinitive_candidate(&item.word) {
            entities.push(format!("@{}", item.word));
            continue;
        }
        if action_keys.contains(&key) { continue; }
        if action.is_empty() {
            if !is_nominal_likely_shape(&key) { action = format!("!{}", item.word); }
            else { niches.push((format!("#{}", item.word), item.score)); }
        } else {
            niches.push((format!("#{}", item.word), item.score));
        }
    }

    niches.sort_by(|a, b| b.1.cmp(&a.1));
    let top_niches = niches.into_iter().take(MAX_QUERY_NICHES).map(|x| x.0).collect::<Vec<_>>();
    let flags = compute_flags(text);
    let final_output = build_opcode("V", action.trim_start_matches('!'), "_", "_", "_", &top_niches, &entities, &attrs[..attrs.len().min(3)], "_", &flags, ultra_compact);

    let output_word_count = final_output.split_whitespace().count();
    let noise = if original_word_count > 0 {
        ((original_word_count.saturating_sub(output_word_count)) * 100) / original_word_count
    } else { 0 };
    (final_output, noise)
}

pub fn query_pipeline(text: &str, ultra_compact: bool) -> (String, usize) {
    let cleaned = human_noise_layer(text);
    let original_word_count = cleaned.split_whitespace().count();
    let work_text = cleaned
        .trim_end_matches(['?', '!', '.', '…'])
        .replace(Regex::new(r"([a-zA-ZÀ-ÿ0-9])([,;])([a-zA-ZÀ-ÿ0-9])").expect("valid regex").as_str(), "$1 $3")
        .replace(Regex::new(r"([a-zA-ZÀ-ÿ0-9])/([a-zA-ZÀ-ÿ0-9])").expect("valid regex").as_str(), "$1 $2");

    let freq = build_freq_map(&work_text);
    let total_words = work_text.split_whitespace().count();
    let words = work_text.split_whitespace().collect::<Vec<_>>();

    let mut sentence_starts = HashSet::from([0usize]);
    for (i, w) in words.iter().enumerate() {
        if [".", "!", "?"].iter().any(|p| w.ends_with(p)) && i + 1 < words.len() {
            sentence_starts.insert(i + 1);
        }
    }

    let mut survivors = Vec::new();
    let mut negate_next = false;
    let is_question = text.contains('?');

    for (i, w) in words.iter().enumerate() {
        let clean = w.chars().filter(|c| c.is_alphanumeric() || *c == '-').collect::<String>();
        if clean.is_empty() { continue; }
        let lower = clean.to_lowercase();
        if ["não", "nao", "not", "never", "nem"].contains(&lower.as_str()) || w.ends_with("n't") {
            negate_next = !negate_next;
            continue;
        }

        let score = score_word(w, &freq, total_words, i == 0, sentence_starts.contains(&i), is_question);
        if score >= QUERY_THRESHOLD {
            let token = if negate_next { format!("~{clean}") } else { clean };
            survivors.push(ScoredWord { word: token, score, orig_idx: i });
            negate_next = false;
        }
    }

    let fused = fuse_proper_nouns(&survivors);
    let mut niches = Vec::new();
    let mut entities = Vec::new();
    let mut attrs = Vec::new();
    let mut seen = HashSet::new();

    let (mut action, action_keys) = pick_verbal_action(&fused, &freq, total_words);
    for item in fused {
        let key = item.word.to_lowercase();
        if !seen.insert(key.clone()) { continue; }
        if item.word.chars().any(|c| c.is_ascii_digit()) { attrs.push(format!("?{}", item.word)); continue; }
        if is_adjective_suffix(&key) && item.word.len() >= 8 && !key.ends_with("mente") { attrs.push(format!("?{key}")); continue; }
        if item.word.chars().next().is_some_and(|c| c.is_uppercase()) && item.word.len() >= 3 && !is_infinitive_candidate(&item.word) {
            entities.push(format!("@{}", item.word));
            continue;
        }
        if action_keys.contains(&key) { continue; }
        if action.is_empty() {
            if !is_nominal_likely_shape(&key) { action = format!("!{}", item.word); }
            else { niches.push((format!("#{}", item.word), item.score)); }
        } else {
            niches.push((format!("#{}", item.word), item.score));
        }
    }

    niches.sort_by(|a, b| b.1.cmp(&a.1));
    let top_niches = niches.into_iter().take(MAX_QUERY_NICHES).map(|x| x.0).collect::<Vec<_>>();
    let flags = compute_flags(text);
    let final_output = build_opcode("Q", action.trim_start_matches('!'), "_", "_", "_", &top_niches, &entities, &attrs, "_", &flags, ultra_compact);

    let output_word_count = final_output.split_whitespace().count();
    let noise = if original_word_count > 0 {
        ((original_word_count.saturating_sub(output_word_count)) * 100) / original_word_count
    } else { 0 };
    (final_output, noise)
}
