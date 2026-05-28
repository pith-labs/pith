use regex::Regex;

pub fn run(text: &str, ultra_compact: bool) -> (String, usize) {
    // Preserve patch anchors and changed lines.
    let keep = Regex::new(r"^(diff --git|@@|\+[^+]|-[^-])").expect("valid regex");
    let mut selected = Vec::new();
    for line in text.lines() {
        if keep.is_match(line) {
            selected.push(line);
        }
    }
    let out = if selected.is_empty() { text.to_string() } else { selected.join("\n") };
    super::as_compress(&out, ultra_compact)
}
