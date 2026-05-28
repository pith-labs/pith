pub fn run(text: &str, ultra_compact: bool) -> (String, usize) {
    // Diffs are structural; compress line noise but keep patch shape.
    super::as_compress(text, ultra_compact)
}
