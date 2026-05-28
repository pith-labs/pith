use regex::Regex;

pub fn run(text: &str, ultra_compact: bool) -> (String, usize) {
    // Keep high-signal log lines: errors/failures/trace causes.
    let important = Regex::new(r"(?i)\b(error|fatal|panic|exception|traceback|failed|timeout|assert|refused)\b").expect("valid regex");
    let lines: Vec<&str> = text.lines().collect();

    let mut kept = Vec::new();
    for (i, line) in lines.iter().enumerate() {
        if important.is_match(line) {
            if i > 0 {
                kept.push(lines[i - 1]);
            }
            kept.push(line);
            if i + 1 < lines.len() {
                kept.push(lines[i + 1]);
            }
        }
    }

    let out = if kept.is_empty() {
        text.to_string()
    } else {
        kept.join("\n")
    };
    super::as_compress(&out, ultra_compact)
}
