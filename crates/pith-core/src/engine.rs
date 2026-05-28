use crate::dev_output::{dev_output_pipeline, DevOutputOptions};
use crate::ir::{generate_machine_prompt, parse_intent_ir};
use crate::opcode::{compute_flags, generate_opcode_from_ir};
use crate::types::{Mode, OptimizeOptions, OptimizeResult, PithMeta, PithResultV1, StableOptimizeOptions};
use regex::Regex;
use std::collections::HashMap;
use std::time::Instant;

#[derive(Debug, Default)]
pub struct PithEngine;

impl PithEngine {
    pub fn new() -> Self {
        Self
    }

    pub fn optimize(&self, text: &str, options: OptimizeOptions) -> OptimizeResult {
        let trimmed = text.trim();
        if trimmed.is_empty() {
            return OptimizeResult {
                output: "[PITH: No meaningful data found]".to_string(),
                noise_removed: 0,
                is_query: false,
            };
        }

        let mode = if options.mode == Mode::Auto {
            self.detect_mode(trimmed)
        } else {
            options.mode
        };

        let output = match mode {
            Mode::Compress => self.compress_pipeline(trimmed, options.ultra_compact),
            Mode::Conversational => self.conversational_pipeline(trimmed, options.ultra_compact),
            Mode::Query | Mode::Auto => self.query_pipeline(trimmed, options.ultra_compact),
        };

        OptimizeResult {
            noise_removed: text.len().saturating_sub(output.len()),
            output,
            is_query: mode != Mode::Compress,
        }
    }

    pub fn optimize_stable(&self, text: &str, options: StableOptimizeOptions) -> PithResultV1 {
        let started = Instant::now();
        let mode = options.mode.unwrap_or_else(|| self.detect_mode(text));
        let legacy = self.optimize(
            text,
            OptimizeOptions {
                ultra_compact: options.ultra_compact.unwrap_or(true),
                mode,
            },
        );
        let ir = parse_intent_ir(text);
        let machine_prompt = generate_machine_prompt(&ir);
        let ir_opcode = generate_opcode_from_ir(&ir, text, options.ultra_compact.unwrap_or(true));

        let mut explain = Vec::new();
        if options.explain {
            explain.push(format!("mode={mode:?}"));
            explain.push(format!("isQuery={}", legacy.is_query));
            explain.push(format!("noiseRemoved={}", legacy.noise_removed));
            explain.push(format!("ir.action={}", ir.intent.action));
            explain.push(format!("ir.format={}", ir.constraints.output_format));
        }

        PithResultV1 {
            schema_version: "1.1.0".to_string(),
            mode,
            output: legacy.output,
            noise_removed: legacy.noise_removed,
            is_query: legacy.is_query,
            ir,
            machine_prompt,
            ir_opcode,
            meta: PithMeta {
                elapsed_ms: started.elapsed().as_millis(),
                explain,
            },
        }
    }

    pub fn optimize_dev_output(&self, text: &str, options: Option<DevOutputOptions>) -> crate::types::DevOutputResult {
        dev_output_pipeline(text, options)
    }

    fn detect_mode(&self, text: &str) -> Mode {
        let words = text.split_whitespace().count();
        let non_empty_lines = text.lines().filter(|l| !l.trim().is_empty()).count();
        let q_count = text.matches('?').count();
        let has_question = q_count > 0;
        let has_code_fence = text.contains("```");
        let has_numbered_list = Regex::new(r"(?m)^\s*\d+\.\s").expect("valid regex").is_match(text);
        let has_bullet_list = Regex::new(r"(?m)^\s*[-•–]\s").expect("valid regex").is_match(text);
        let looks_like_spec = self.looks_like_spec_brief(text);
        let looks_technical_query = Regex::new(r"(?i)\b(llm|token|tokens|prompt|output|input|api|backend|worker|sqs|dlq|retry|idempot[eê]ncia)\b")
            .expect("valid regex")
            .is_match(text);

        let strong_compress = self.has_strong_compress_evidence(text, words, non_empty_lines, has_question, looks_like_spec);

        let query_score = (if has_question { 4 } else { 0 })
            + (if looks_like_spec { 5 } else { 0 })
            + (if !has_code_fence && !has_numbered_list && !has_bullet_list { 1 } else { 0 })
            + (if looks_technical_query { 2 } else { 0 });

        let conversational_score = (if q_count >= 2 { 6 } else { 0 })
            + (if q_count >= 2 && non_empty_lines <= 4 { 1 } else { 0 })
            + (if !looks_technical_query { 1 } else { -3 });

        let compress_score = (if words > 40 { 3 } else { 0 })
            + (if non_empty_lines > 3 { 2 } else { 0 })
            + (if has_code_fence { 5 } else { 0 })
            + (if has_numbered_list { 3 } else { 0 })
            + (if has_bullet_list { 3 } else { 0 })
            + (if !has_question && !looks_like_spec { 1 } else { 0 });

        let mut ranked = vec![
            (Mode::Query, query_score),
            (Mode::Conversational, conversational_score),
            (Mode::Compress, compress_score),
        ];
        ranked.sort_by(|a, b| b.1.cmp(&a.1));
        let (top_mode, top_score) = ranked[0];
        let second_score = ranked[1].1;
        let confidence = if top_score <= 0 { 0.0 } else { (top_score - second_score) as f32 / top_score as f32 };
        let uncertain = confidence < 0.22;

        if top_mode == Mode::Compress && !strong_compress {
            return Mode::Query;
        }
        if uncertain && top_mode == Mode::Compress {
            return Mode::Query;
        }
        if uncertain && top_mode == Mode::Conversational && q_count < 2 {
            return Mode::Query;
        }

        top_mode
    }

    fn has_strong_compress_evidence(
        &self,
        text: &str,
        words: usize,
        non_empty_lines: usize,
        has_question: bool,
        looks_like_spec: bool,
    ) -> bool {
        let has_code_fence = text.contains("```");
        let has_list = Regex::new(r"(?m)^\s*[-•–]\s").expect("valid regex").is_match(text)
            || Regex::new(r"(?m)^\s*\d+\.\s").expect("valid regex").is_match(text);
        if has_question || looks_like_spec {
            return false;
        }
        has_code_fence || (has_list && non_empty_lines >= 3) || non_empty_lines >= 4 || words >= 45
    }

    fn looks_like_spec_brief(&self, text: &str) -> bool {
        let section_patterns = [
            r"(?im)(^|\n)\s*contexto\s*$",
            r"(?im)(^|\n)\s*objetivo\s*$",
            r"(?im)(^|\n)\s*escopo\s*$",
            r"(?im)(^|\n)\s*resultado esperado\s*$",
            r"(?im)(^|\n)\s*critérios? de aceite\s*$",
            r"(?im)(^|\n)\s*scope\s*$",
            r"(?im)(^|\n)\s*goal\s*$",
            r"(?im)(^|\n)\s*acceptance criteria\s*$",
        ];
        let sections = section_patterns
            .iter()
            .filter(|re| Regex::new(re).expect("valid regex").is_match(text))
            .count();

        let tech_signals = [
            r"(?i)(?:^|\s)(app|src|packages)/[^\s]+",
            r"(?i)\b[a-z_]+\.(?:py|ts|js|rs)\b",
            r"(?i)\b(send_[a-z_]+)\b",
            r"(?i)\b(?:idempot[eê]ncia|idempotency|retry|reprocessamentos?)\b",
            r"(?i)\b(?:eventos?|transiç(?:ão|oes)|transition|notifier|orquestraç(?:ão|oes))\b",
            r"(?i)\b(?:dependency|dependencies|provider|providers|repository|repositories|service|services|factory|factories|depends)\b",
        ]
        .iter()
        .filter(|re| Regex::new(re).expect("valid regex").is_match(text))
        .count();

        sections >= 2 && tech_signals >= 1
    }

    fn compress_pipeline(&self, text: &str, ultra_compact: bool) -> String {
        let cleaned = text.lines().map(str::trim).filter(|l| !l.is_empty()).collect::<Vec<_>>().join(" ");
        let flags = compute_flags(text);
        crate::opcode::build_opcode("C", "compress", "_", "_", "_", &[], &[], &[], &cleaned, &flags, ultra_compact)
    }

    fn query_pipeline(&self, text: &str, ultra_compact: bool) -> String {
        let freq = self.freq_map(text);
        let mut words: Vec<(String, i32)> = Vec::new();
        for tok in text.split_whitespace() {
            let clean = tok.trim_matches(|c: char| !c.is_alphanumeric() && c != '-' && c != '_');
            if clean.is_empty() {
                continue;
            }
            let score = self.score_word(clean, &freq, text.contains('?'));
            if score >= 5 {
                words.push((clean.to_string(), score));
            }
        }

        let mut entities = Vec::new();
        let mut niches = Vec::new();
        let mut attrs = Vec::new();
        let mut action = "optimize".to_string();

        for (w, s) in words {
            if w.chars().any(|c| c.is_ascii_digit()) {
                attrs.push(format!("?{w}"));
                continue;
            }
            if w.chars().next().is_some_and(|c| c.is_uppercase()) && w.len() >= 3 {
                entities.push(format!("@{w}"));
                continue;
            }
            if s >= 9 && action == "optimize" {
                action = w.to_lowercase();
            } else {
                niches.push(format!("#{w}"));
            }
        }

        niches.truncate(8);
        attrs.truncate(3);
        let flags = compute_flags(text);
        crate::opcode::build_opcode("Q", &action, "_", "_", "_", &niches, &entities, &attrs, "_", &flags, ultra_compact)
    }

    fn conversational_pipeline(&self, text: &str, ultra_compact: bool) -> String {
        let flags = compute_flags(text);
        let action = if text.contains('?') { "explain" } else { "discuss" };
        let niches = text
            .split_whitespace()
            .map(|w| w.trim_matches(|c: char| !c.is_alphanumeric() && c != '-'))
            .filter(|w| w.len() >= 4)
            .map(|w| format!("#{w}"))
            .take(8)
            .collect::<Vec<_>>();
        crate::opcode::build_opcode("V", action, "_", "_", "_", &niches, &[], &[], "_", &flags, ultra_compact)
    }

    fn freq_map(&self, text: &str) -> HashMap<String, usize> {
        let mut map = HashMap::new();
        for t in text.split_whitespace() {
            let w = t.to_lowercase();
            *map.entry(w).or_insert(0) += 1;
        }
        map
    }

    fn score_word(&self, token: &str, freq: &HashMap<String, usize>, is_question: bool) -> i32 {
        let lower = token.to_lowercase();
        let mut score = 1i32;
        if token.len() >= 8 {
            score += 2;
        }
        if token.chars().next().is_some_and(|c| c.is_uppercase()) {
            score += 3;
        }
        if token.chars().any(|c| c.is_ascii_digit()) {
            score += 2;
        }
        if lower.ends_with("ar") || lower.ends_with("er") || lower.ends_with("ir") {
            score += 4;
        }
        if is_question {
            score += 1;
        }
        if freq.get(&lower).copied().unwrap_or(0) > 1 {
            score += 1;
        }
        score
    }
}
