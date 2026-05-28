use regex::Regex;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputKind {
    Prompt,
    Spec,
    Code,
    Logs,
    Diff,
    Chat,
    Generic,
}

impl InputKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            InputKind::Prompt => "prompt",
            InputKind::Spec => "spec",
            InputKind::Code => "code",
            InputKind::Logs => "logs",
            InputKind::Diff => "diff",
            InputKind::Chat => "chat",
            InputKind::Generic => "generic",
        }
    }
}

pub fn detect_input_kind(text: &str) -> InputKind {
    let lines = text.lines().collect::<Vec<_>>();
    let non_empty = lines.iter().filter(|l| !l.trim().is_empty()).count();
    let lower = text.to_lowercase();

    let has_diff_markers = Regex::new(r"(?m)^(diff --git|@@|\+[^+]|-[^-])")
        .expect("valid regex")
        .is_match(text);
    if has_diff_markers {
        return InputKind::Diff;
    }

    let has_code_fence = text.contains("```");
    let has_code_signature = Regex::new(r"(?m)\b(fn|function|class|interface|impl|struct|enum|const|let|pub)\b")
        .expect("valid regex")
        .is_match(text);
    let symbol_density = text.chars().filter(|c| "{}();[]=><".contains(*c)).count() as f32 / text.len().max(1) as f32;
    if has_code_fence || (has_code_signature && symbol_density > 0.01) {
        return InputKind::Code;
    }

    let log_like_lines = lines
        .iter()
        .filter(|l| {
            let t = l.trim();
            t.starts_with("ERROR")
                || t.starts_with("WARN")
                || t.starts_with("INFO")
                || t.contains("Exception")
                || t.contains("Traceback")
                || Regex::new(r"\d{2}:\d{2}:\d{2}").expect("valid regex").is_match(t)
        })
        .count();
    if non_empty >= 4 && log_like_lines * 2 >= non_empty {
        return InputKind::Logs;
    }

    let has_sections = Regex::new(r"(?im)^\s*(contexto|objetivo|escopo|resultado esperado|critérios? de aceite|context|goal|scope|acceptance criteria)\s*$")
        .expect("valid regex")
        .find_iter(text)
        .count();
    if has_sections >= 2 {
        return InputKind::Spec;
    }

    let q_count = text.matches('?').count();
    if q_count >= 2 || lower.contains("you:") || lower.contains("assistant:") {
        return InputKind::Chat;
    }

    if q_count >= 1 || non_empty <= 4 {
        return InputKind::Prompt;
    }

    InputKind::Generic
}
