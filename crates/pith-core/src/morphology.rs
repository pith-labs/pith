use crate::constants::{is_adjective_suffix, is_verb_infinitive};

pub fn is_romance_infinitive_shape(lower: &str) -> bool {
    if lower.len() < 2 || lower.len() > 24 || is_adjective_suffix(lower) {
        return false;
    }
    if lower.len() > 3 && lower.ends_with("ver") {
        return false;
    }
    if lower.ends_with("ar") || lower.ends_with("ir") {
        return true;
    }
    if !lower.ends_with("er") {
        return false;
    }
    if lower.len() <= 4 {
        return true;
    }
    if lower.len() <= 18 && lower.chars().next().is_some_and(|c| "bcdfghjklmnpqrstvwxz".contains(c)) {
        return true;
    }
    false
}

pub fn is_infinitive_candidate(word: &str) -> bool {
    let lower = word.to_lowercase();
    word.len() >= 3
        && word.len() <= 24
        && !word.starts_with('~')
        && !word.chars().any(|c| c.is_ascii_digit())
        && !is_adjective_suffix(&lower)
        && is_verb_infinitive(&lower)
        && is_romance_infinitive_shape(&lower)
}

pub fn is_gerund_candidate(word: &str) -> bool {
    let lower = word.to_lowercase();
    word.len() >= 5
        && word.len() <= 24
        && !word.starts_with('~')
        && !word.chars().any(|c| c.is_ascii_digit())
        && !word.chars().next().is_some_and(|c| c.is_uppercase())
        && !is_adjective_suffix(&lower)
        && (lower.ends_with("ando") || lower.ends_with("endo") || lower.ends_with("indo"))
}

pub fn is_nominal_likely_shape(lower: &str) -> bool {
    if lower.len() < 4 {
        return false;
    }
    let suffixes = [
        "ção", "ções", "dade", "idade", "ismo", "ismos", "mento", "mentos", "ncia", "ncias", "ência", "ências",
        "agem", "agens", "eza", "ezas", "ura", "uras", "ice", "ices", "ise", "ises", "oma", "omas", "ema", "emas",
    ];
    if suffixes.iter().any(|s| lower.ends_with(s)) {
        return true;
    }
    if lower.len() >= 5 && (lower.ends_with("ão") || lower.ends_with("ões")) {
        return true;
    }
    if lower.len() >= 6 && (lower.ends_with("os") || lower.ends_with("as")) && !(lower.ends_with("ando") || lower.ends_with("endo") || lower.ends_with("indo")) {
        return true;
    }
    false
}

pub fn is_finite_verb_surface_candidate(word: &str) -> bool {
    let lower = word.to_lowercase();
    if word.len() < 5 || word.len() > 24 {
        return false;
    }
    if word.starts_with('~') || word.chars().any(|c| c.is_ascii_digit()) || word.chars().next().is_some_and(|c| c.is_uppercase()) {
        return false;
    }
    if is_adjective_suffix(&lower) || is_nominal_likely_shape(&lower) {
        return false;
    }
    ["iam", "ria", "aria", "ariam", "eria", "eriam", "iria", "iriam"].iter().any(|s| lower.ends_with(s))
}
