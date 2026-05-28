use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::{Command, ExitCode};

const BUNDLED_JS: &str = include_str!("../vendor/pith-cli.js");

fn cache_file() -> Result<PathBuf, String> {
    let base = env::var("XDG_CACHE_HOME")
        .map(PathBuf::from)
        .or_else(|_| env::var("HOME").map(|h| PathBuf::from(h).join(".cache")))
        .map_err(|_| "could not resolve cache directory (HOME/XDG_CACHE_HOME)".to_string())?;
    Ok(base.join("pith").join("pith-cli.js"))
}

fn ensure_bundle() -> Result<PathBuf, String> {
    let preferred = cache_file()?;
    let fallback = env::temp_dir().join("pith").join("pith-cli.js");
    let target = match preferred.parent() {
        Some(dir) if fs::create_dir_all(dir).is_ok() => preferred,
        _ => {
            if let Some(dir) = fallback.parent() {
                fs::create_dir_all(dir).map_err(|e| format!("failed to create fallback cache dir: {e}"))?;
            }
            fallback
        }
    };

    if let Some(dir) = target.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("failed to create cache dir: {e}"))?;
    }

    let write_needed = fs::read_to_string(&target).map(|s| s != BUNDLED_JS).unwrap_or(true);
    if write_needed {
        fs::write(&target, BUNDLED_JS).map_err(|e| format!("failed to write bundled cli: {e}"))?;
    }
    Ok(target)
}

fn main() -> ExitCode {
    let js_path = match ensure_bundle() {
        Ok(p) => p,
        Err(err) => {
            eprintln!("pith: {err}");
            return ExitCode::from(1);
        }
    };

    let mut cmd = Command::new("node");
    cmd.arg(js_path);
    for arg in env::args().skip(1) {
        cmd.arg(arg);
    }

    match cmd.status() {
        Ok(status) => {
            if let Some(code) = status.code() {
                ExitCode::from(code as u8)
            } else {
                ExitCode::from(1)
            }
        }
        Err(e) => {
            eprintln!("pith: failed to execute node. Ensure Node.js is installed. ({e})");
            ExitCode::from(1)
        }
    }
}
