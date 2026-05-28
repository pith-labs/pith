use anyhow::{bail, Context, Result};
use clap::{Parser, Subcommand};
use pith_core::{Mode, OptimizeOptions, PithEngine};
use std::fs;
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

#[derive(Parser)]
#[command(name = "pith", version, about = "Pith CLI (Rust)")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Prompt {
        text: Option<String>,
    },
    Opt {
        text: Option<String>,
    },
    Dev {
        text: Option<String>,
    },
    Shrink {
        text: Option<String>,
    },
    Run {
        cmd: String,
        args: Vec<String>,
    },
    Exec {
        cmd: String,
        args: Vec<String>,
    },
    Brain {
        root: Option<PathBuf>,
        #[arg(short, long, default_value = "pith-brain.md")]
        out: PathBuf,
        #[arg(long, default_value_t = 393216)]
        max_file_bytes: usize,
        #[arg(long, default_value = ".md,.mdc,.txt")]
        ext: String,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let engine = PithEngine::new();

    match cli.command {
        Commands::Prompt { text } | Commands::Opt { text } => {
            let input = read_text_arg_or_stdin(text)?;
            let result = engine.optimize(&input, OptimizeOptions::default());
            println!("{}", result.output);
        }
        Commands::Dev { text } | Commands::Shrink { text } => {
            let input = read_text_arg_or_stdin(text)?;
            let result = engine.optimize_dev_output(&input);
            println!("{}", result.output);
        }
        Commands::Run { cmd, args } | Commands::Exec { cmd, args } => {
            let output = Command::new(&cmd)
                .args(args)
                .output()
                .with_context(|| format!("failed to execute: {cmd}"))?;
            let mut text = String::new();
            text.push_str(&String::from_utf8_lossy(&output.stdout));
            text.push_str(&String::from_utf8_lossy(&output.stderr));
            let result = engine.optimize_dev_output(&text);
            println!("{}", result.output);
            if !output.status.success() {
                std::process::exit(output.status.code().unwrap_or(1));
            }
        }
        Commands::Brain {
            root,
            out,
            max_file_bytes,
            ext,
        } => {
            run_brain(&engine, root.unwrap_or_else(|| PathBuf::from(".")), out, max_file_bytes, &ext)?;
        }
    }

    Ok(())
}

fn read_text_arg_or_stdin(text: Option<String>) -> Result<String> {
    if let Some(t) = text {
        if t.trim().is_empty() {
            bail!("empty text")
        }
        return Ok(t);
    }

    let mut buf = String::new();
    io::stdin().read_to_string(&mut buf)?;
    if buf.trim().is_empty() {
        bail!("expected text arg or stdin")
    }
    Ok(buf)
}

fn run_brain(engine: &PithEngine, root: PathBuf, out: PathBuf, max_file_bytes: usize, exts_csv: &str) -> Result<()> {
    if !root.is_dir() {
        bail!("root must be directory: {}", root.display());
    }

    let exts: Vec<String> = exts_csv
        .split(',')
        .map(|s| {
            let s = s.trim().to_lowercase();
            if s.starts_with('.') { s } else { format!(".{s}") }
        })
        .collect();

    let mut files = Vec::new();
    for entry in WalkDir::new(&root).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if path.components().any(|c| {
            let c = c.as_os_str().to_string_lossy();
            ["node_modules", ".git", "dist", "build", "coverage", "target"].contains(&c.as_ref())
        }) {
            continue;
        }

        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e.to_lowercase()))
            .unwrap_or_default();

        if exts.contains(&ext) {
            files.push(path.to_path_buf());
        }
    }

    files.sort();
    if files.is_empty() {
        bail!("no files found for extensions: {}", exts.join(", "));
    }

    let mut body = String::new();
    body.push_str("# Pith brain\n\n");
    body.push_str(&format!("- **source:** `{}`\n", root.display()));
    body.push_str(&format!("- **files:** {}\n", files.len()));
    body.push_str(&format!("- **generated:** {}\n\n", chrono::Utc::now().to_rfc3339()));
    body.push_str("---\n\n");

    for file in &files {
        let text = read_file_head(file, max_file_bytes)?;
        let normalized = strip_yaml_frontmatter(&text);
        if normalized.trim().is_empty() {
            continue;
        }

        let result = engine.optimize(
            &normalized,
            OptimizeOptions {
                ultra_compact: true,
                mode: Mode::Compress,
            },
        );

        if result.output.contains("No meaningful data") {
            continue;
        }

        let rel = file.strip_prefix(&root).unwrap_or(file.as_path());
        body.push_str(&format!("## {}\n\n", rel.to_string_lossy().replace('\\', "/")));
        body.push_str(&result.output);
        body.push_str("\n\n---\n\n");
    }

    if let Some(parent) = out.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&out, body)?;
    eprintln!("pith brain: wrote {}", out.display());

    Ok(())
}

fn read_file_head(path: &Path, max_bytes: usize) -> Result<String> {
    let bytes = fs::read(path)?;
    let slice = if bytes.len() > max_bytes {
        &bytes[..max_bytes]
    } else {
        &bytes
    };
    Ok(String::from_utf8_lossy(slice).to_string())
}

fn strip_yaml_frontmatter(input: &str) -> String {
    if !input.starts_with("---\n") {
        return input.to_string();
    }

    if let Some(end) = input[4..].find("\n---\n") {
        let idx = 4 + end + 5;
        return input[idx..].to_string();
    }

    input.to_string()
}
