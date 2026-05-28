#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    Auto,
    Compress,
    Query,
    Conversational,
}

#[derive(Debug, Clone, Copy)]
pub struct OptimizeOptions {
    pub ultra_compact: bool,
    pub mode: Mode,
}

impl Default for OptimizeOptions {
    fn default() -> Self {
        Self {
            ultra_compact: true,
            mode: Mode::Auto,
        }
    }
}

#[derive(Debug, Clone)]
pub struct OptimizeResult {
    pub output: String,
    pub noise_removed: usize,
    pub is_query: bool,
}

#[derive(Debug, Clone)]
pub struct DevOutputResult {
    pub output: String,
    pub noise_removed: usize,
}

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

        let mode = match options.mode {
            Mode::Auto => self.detect_mode(trimmed),
            other => other,
        };

        let output = match mode {
            Mode::Compress => self.compress_text(trimmed, options.ultra_compact),
            Mode::Query => self.extract_query(trimmed),
            Mode::Conversational => self.extract_conversation(trimmed),
            Mode::Auto => unreachable!(),
        };

        let noise_removed = text.len().saturating_sub(output.len());
        OptimizeResult {
            output,
            noise_removed,
            is_query: mode != Mode::Compress,
        }
    }

    pub fn optimize_dev_output(&self, text: &str) -> DevOutputResult {
        let mut lines: Vec<&str> = text
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty())
            .filter(|line| {
                let lower = line.to_ascii_lowercase();
                !(lower.starts_with("debug")
                    || lower.contains("npm notice")
                    || lower.contains("deprecated"))
            })
            .collect();

        if lines.len() > 120 {
            lines = lines.split_off(lines.len() - 120);
        }

        let output = lines.join("\n");
        DevOutputResult {
            noise_removed: text.len().saturating_sub(output.len()),
            output,
        }
    }

    fn detect_mode(&self, text: &str) -> Mode {
        let q_count = text.matches('?').count();
        let has_code_fence = text.contains("```");
        let has_list = text.lines().any(|line| {
            let l = line.trim_start();
            l.starts_with("- ")
                || l.starts_with("* ")
                || l.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false)
                    && l.contains(". ")
        });
        let words = text.split_whitespace().count();

        if q_count >= 2 {
            return Mode::Conversational;
        }
        if q_count >= 1 {
            return Mode::Query;
        }
        if has_code_fence || has_list || words > 40 {
            return Mode::Compress;
        }

        Mode::Query
    }

    fn compress_text(&self, text: &str, ultra_compact: bool) -> String {
        let mut output = text
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty())
            .collect::<Vec<&str>>()
            .join(" ");

        output = output
            .replace("  ", " ")
            .replace("please", "")
            .replace("Please", "")
            .trim()
            .to_string();

        if ultra_compact && output.len() > 360 {
            output.truncate(360);
            output.push_str("...");
        }

        output
    }

    fn extract_query(&self, text: &str) -> String {
        text.lines()
            .map(str::trim)
            .find(|line| line.contains('?'))
            .unwrap_or(text)
            .to_string()
    }

    fn extract_conversation(&self, text: &str) -> String {
        let lines: Vec<&str> = text
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty())
            .collect();

        lines.into_iter().take(6).collect::<Vec<&str>>().join(" ")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input_returns_guard() {
        let engine = PithEngine::new();
        let out = engine.optimize("   ", OptimizeOptions::default());
        assert_eq!(out.output, "[PITH: No meaningful data found]");
    }

    #[test]
    fn query_mode_detects_question() {
        let engine = PithEngine::new();
        let out = engine.optimize("How can I reduce tokens in prompts?", OptimizeOptions::default());
        assert!(out.is_query);
        assert!(out.output.contains('?'));
    }

    #[test]
    fn dev_output_compacts_noise() {
        let engine = PithEngine::new();
        let out = engine.optimize_dev_output("DEBUG x\nreal line\nnpm notice y\n");
        assert_eq!(out.output, "real line");
    }
}
