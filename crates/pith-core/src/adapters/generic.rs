pub fn run(text: &str, ultra_compact: bool) -> (String, usize) {
    // Generic fallback prefers semantic extraction over destructive compression.
    super::as_query(text, ultra_compact)
}
