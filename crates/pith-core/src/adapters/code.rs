pub fn run(text: &str, ultra_compact: bool) -> (String, usize) {
    // Code adapter prefers query shaping but reinforces code intent.
    let enriched = if text.to_lowercase().contains("code") {
        text.to_string()
    } else {
        format!("{text}\n\n[keep-code-structure]")
    };
    super::as_query(&enriched, ultra_compact)
}
