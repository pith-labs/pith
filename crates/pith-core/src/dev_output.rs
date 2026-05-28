use crate::types::DevOutputResult;
use regex::Regex;

#[derive(Debug, Clone)]
pub struct DevOutputOptions {
    pub max_total_lines: usize,
    pub head_lines: usize,
    pub tail_lines: usize,
    pub max_line_length: usize,
    pub test_aware: bool,
}

impl Default for DevOutputOptions {
    fn default() -> Self {
        Self {
            max_total_lines: 4000,
            head_lines: 400,
            tail_lines: 400,
            max_line_length: 480,
            test_aware: true,
        }
    }
}

fn strip_ansi(text: &str) -> String {
    let re = Regex::new(r"\x1b\[[0-?]*[ -/]*[@-~]").expect("valid regex");
    re.replace_all(text, "").replace("\r\n", "\n").replace('\r', "\n")
}

fn clamp_line(line: &str, max_len: usize) -> String {
    if line.len() <= max_len {
        return line.to_string();
    }
    let keep = max_len.saturating_sub(20);
    format!("{} … [+{} chars]", &line[..keep], line.len().saturating_sub(keep))
}

fn collapse_duplicate_runs(lines: Vec<String>) -> Vec<String> {
    if lines.is_empty() {
        return lines;
    }
    let mut out = Vec::new();
    let mut prev = &lines[0];
    let mut count = 1usize;
    for line in lines.iter().skip(1) {
        if line == prev {
            count += 1;
            continue;
        }
        out.push(if count > 1 { format!("{prev} (×{count})") } else { prev.clone() });
        prev = line;
        count = 1;
    }
    out.push(if count > 1 { format!("{prev} (×{count})") } else { prev.clone() });
    out
}

fn looks_like_test_output(text: &str) -> bool {
    let head = &text[..text.len().min(12000)];
    Regex::new(r"(?i)running\s+\d+\s+tests?|test\s+result:|^\s*FAIL\s+|failures?:\s*$")
        .expect("valid regex")
        .is_match(head)
}

fn shrink_test_lines(lines: Vec<String>) -> Vec<String> {
    let important = Regex::new(r"(?i)FAIL|failed|error\[E|ERROR|Error:|AssertionError|panicked at|test\s+result|failures?:|expected|Received|Diff|panic")
        .expect("valid regex");
    let mut kept = Vec::new();
    for (idx, line) in lines.iter().enumerate() {
        if idx < 24 || idx + 20 >= lines.len() || important.is_match(line) || line.trim_start().starts_with("at ") {
            kept.push(line.clone());
        }
    }
    if kept.len() > 450 {
        let drop = kept.len() - 449;
        let mut trimmed = kept[..449].to_vec();
        trimmed.push(format!("... [+{drop} linhas omitidas]"));
        return trimmed;
    }
    kept
}

fn truncate_middle(lines: Vec<String>, head: usize, tail: usize) -> Vec<String> {
    if lines.len() <= head + tail + 8 {
        return lines;
    }
    let omitted = lines.len() - head - tail;
    [
        lines[..head].to_vec(),
        vec![format!("… [{omitted} linhas omitidas] …")],
        lines[lines.len() - tail..].to_vec(),
    ]
    .concat()
}

pub fn dev_output_pipeline(text: &str, options: Option<DevOutputOptions>) -> DevOutputResult {
    let o = options.unwrap_or_default();
    let raw = text.len();
    let mut s = strip_ansi(text);
    if s.trim().is_empty() {
        return DevOutputResult { output: String::new(), noise_removed: 0 };
    }

    let mut lines = s.lines().map(str::to_string).collect::<Vec<_>>();
    if o.test_aware && looks_like_test_output(&s) {
        lines = shrink_test_lines(lines);
    }
    lines = lines.into_iter().map(|l| clamp_line(&l, o.max_line_length)).collect();
    lines = collapse_duplicate_runs(lines);
    if lines.len() > o.max_total_lines {
        lines = truncate_middle(lines, o.head_lines, o.tail_lines);
    }

    s = lines.join("\n").trim_end().to_string();
    let noise_removed = if raw > 0 {
        ((raw.saturating_sub(s.len())) * 100) / raw
    } else {
        0
    };
    DevOutputResult { output: s, noise_removed }
}
