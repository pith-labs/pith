pub fn run(text: &str, ultra_compact: bool) -> (String, usize) {
    // Logs are high-noise and benefit from aggressive compression.
    super::as_compress(text, ultra_compact)
}
