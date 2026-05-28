use crate::constants::abbrev;
use regex::Regex;
use std::collections::HashMap;

pub fn is_pattern_symbol_token(w: &str) -> bool {
    let t = w.trim();
    !t.is_empty() && !t.contains('\0') && Regex::new(r"^[+\-|=<>→]+$").expect("valid regex").is_match(t)
}

pub fn human_noise_layer(text: &str) -> String {
    let mut r = text.to_string();
    let replacements = [
        (r"(?im)^(Hi|Hello|Hey|Greetings)[,!]?\s+", ""),
        (r"(?im)^(Of course|Sure|Certainly|Absolutely|Gladly)[,!.]?\s*", ""),
        (r"(?i)\balém disso\b[,]?\s*", "+ "),
        (r"(?i)\b(no entanto|porém|todavia|contudo|entretanto)\b[,]?\s*", "| "),
        (r"(?i)\b(portanto|logo|por isso|dessa forma|assim sendo|então|assim)\b[,]?\s*", "→ "),
        (r"(?i)\b(the|an)\s+", ""),
        (r"(?i)\bum(a|ns|as)?\s+", ""),
    ];
    for (pat, rep) in replacements {
        r = Regex::new(pat).expect("valid regex").replace_all(&r, rep).to_string();
    }
    r
}

pub fn preserve_layer(text: &str) -> (String, HashMap<String, String>) {
    let mut map = HashMap::new();
    let mut counter = 0usize;
    let mut r = text.to_string();

    let pats = [
        r"```[\s\S]*?```",
        r"https?://\S+",
        r"\b[\w.-]+(?:/[\w.-]+)+\.[\w]+\b",
        r"\[[^\]]+\]",
        r"\{\{.*?\}\}",
        r"\$[A-Za-z_]\w*",
    ];

    for p in pats {
        let re = Regex::new(p).expect("valid regex");
        while let Some(m) = re.find(&r) {
            let key = format!("\0P{counter}\0");
            counter += 1;
            map.insert(key.clone(), m.as_str().to_string());
            r.replace_range(m.range(), &key);
        }
    }

    (r, map)
}

pub fn pattern_layer(text: &str) -> String {
    let mut r = text.to_string();
    let reps = [
        (r"(?i)\band\b", "+"),
        (r"(?i)\bor\b", "|"),
        (r"(?i)\be\b", "+"),
        (r"(?i)\bou\b", "|"),
        (r"(?i)\bbefore\b", "<"),
        (r"(?i)\bafter\b", ">"),
        (r"(?i)\bantes( de)?\b", "<"),
        (r"(?i)\bdepois( de)?\b", ">"),
        (r"(?i)\bapós\b", ">"),
        (r"(?i)\b(is|are|was|were|é|são|está|estão|era|eram)\b", "="),
    ];
    for (pat, rep) in reps {
        r = Regex::new(pat).expect("valid regex").replace_all(&r, rep).to_string();
    }
    r
}

pub fn abbreviate(text: &str) -> String {
    let re = Regex::new(r"\b[a-zA-ZÀ-ÿ]{7,}\b").expect("valid regex");
    re.replace_all(text, |caps: &regex::Captures| {
        let w = caps.get(0).map(|m| m.as_str()).unwrap_or_default();
        abbrev(&w.to_lowercase()).unwrap_or_else(|| w.to_string())
    })
    .to_string()
}

pub fn restore_and_clean(text: &str, map: &HashMap<String, String>) -> String {
    let mut r = text.to_string();
    for (k, v) in map {
        r = r.replace(k, v);
    }
    r = Regex::new(r"[ \t]{2,}").expect("valid regex").replace_all(&r, " ").to_string();
    r = Regex::new(r"\n{3,}").expect("valid regex").replace_all(&r, "\n\n").to_string();
    r.lines().map(str::trim_end).collect::<Vec<_>>().join("\n").trim().to_string()
}

pub fn is_header(line: &str) -> bool {
    Regex::new(r"^#{1,6}\s").expect("valid regex").is_match(line)
        || Regex::new(r"^\d+\.\s+[A-ZÀ-Ý]").expect("valid regex").is_match(line)
        || (Regex::new(r"^[A-ZÀ-Ý][A-ZÀ-Ýa-zà-ÿ\s,–\-&]+$").expect("valid regex").is_match(line) && line.len() < 80)
}
