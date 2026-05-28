pub fn run(text: &str, ultra_compact: bool) -> (String, usize) {
    // Spec inputs are mostly intent-rich and benefit from semantic query shaping.
    super::as_query(text, ultra_compact)
}
