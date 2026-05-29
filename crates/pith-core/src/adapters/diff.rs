use regex::Regex;

pub fn run(text: &str, ultra_compact: bool) -> (String, usize) {
    let semantic = summarize_diff(text);
    let out = if semantic.trim().is_empty() {
        text.to_string()
    } else {
        semantic
    };
    super::as_compress(&out, ultra_compact)
}

fn summarize_diff(text: &str) -> String {
    let diff_header = Regex::new(r"^diff --git a/(.+?) b/(.+)$").expect("valid regex");
    let assign = Regex::new(r"^\s*(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*;?\s*$")
        .expect("valid regex");
    let call = Regex::new(r"([A-Za-z_][A-Za-z0-9_]*)\s*\(").expect("valid regex");
    let mut out = vec!["kind:diff".to_string()];
    let mut pending_removed: Vec<(String, String)> = Vec::new();

    for raw in text.lines() {
        if let Some(cap) = diff_header.captures(raw) {
            let a = cap.get(1).map(|m| m.as_str()).unwrap_or_default();
            let b = cap.get(2).map(|m| m.as_str()).unwrap_or_default();
            out.push(format!("file:{a}->{b}"));
            continue;
        }
        if raw.starts_with("@@") {
            out.push("hunk:update".to_string());
            continue;
        }
        if raw.starts_with("---") || raw.starts_with("+++") {
            continue;
        }
        if let Some(line) = raw.strip_prefix('-') {
            let clean = line.trim();
            if clean.is_empty() {
                continue;
            }
            if let Some(cap) = assign.captures(clean) {
                let k = cap.get(1).map(|m| m.as_str()).unwrap_or_default().to_string();
                let v = cap.get(2).map(|m| sanitize_value(m.as_str())).unwrap_or_default();
                pending_removed.push((k, v));
            } else {
                out.push(format!("remove:{}", summarize_code_line(clean, &call)));
            }
            continue;
        }
        if let Some(line) = raw.strip_prefix('+') {
            let clean = line.trim();
            if clean.is_empty() {
                continue;
            }
            if let Some(cap) = assign.captures(clean) {
                let k = cap.get(1).map(|m| m.as_str()).unwrap_or_default().to_string();
                let v = cap.get(2).map(|m| sanitize_value(m.as_str())).unwrap_or_default();
                if let Some(idx) = pending_removed.iter().position(|(rk, _)| rk == &k) {
                    let (_, old_v) = pending_removed.remove(idx);
                    out.push(format!("change:{k}:{old_v}->{v}"));
                } else {
                    out.push(format!("add:{k}={v}"));
                }
            } else {
                out.push(format!("add:{}", summarize_code_line(clean, &call)));
            }
            continue;
        }
    }

    for (k, v) in pending_removed {
        out.push(format!("remove:{k}={v}"));
    }

    out.join("\n")
}

fn summarize_code_line(line: &str, call_re: &Regex) -> String {
    if let Some(cap) = call_re.captures(line) {
        let func = cap.get(1).map(|m| m.as_str()).unwrap_or_default();
        return format!("call:{func}");
    }
    let compact = line
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-' || *c == ':')
        .collect::<String>();
    if compact.is_empty() {
        "line".to_string()
    } else {
        compact
    }
}

fn sanitize_value(value: &str) -> String {
    value
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '"' && *c != '\'')
        .collect::<String>()
}

#[cfg(test)]
mod tests {
    use super::summarize_diff;

    #[test]
    fn summarize_diff_extracts_assignment_change_and_calls() {
        let input = "diff --git a/retry.ts b/retry.ts\n@@ -1,5 +1,6 @@\n-const retries = 2\n+const retries = 5\n+const jitter = true\n-throw err\n+pushToDlq(err)\n";
        let out = summarize_diff(input);
        assert!(out.contains("file:retry.ts->retry.ts"));
        assert!(out.contains("change:retries:2->5"));
        assert!(out.contains("add:jitter=true"));
        assert!(out.contains("remove:throwerr"));
        assert!(out.contains("add:call:pushToDlq"));
    }
}
