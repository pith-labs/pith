use anyhow::{bail, Context, Result};
use clap::{Parser, Subcommand};
use pith_core::{compile_conversation_ir_v2, compile_conversation_ir_v2_stream, evaluate_records, FeedbackRecord, Mode, OptimizeOptions, PithEngine, StableOptimizeOptions};
use std::fs;
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

#[derive(Parser)]
#[command(name = "pith", version, about = "Pith CLI (Rust, RTK-like)")]
struct Cli {
    #[arg(long, global = true)]
    plain: bool,
    #[arg(long, global = true)]
    json: bool,
    #[arg(long, global = true)]
    stats: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Debug, Clone, Copy)]
struct RenderOpts {
    plain: bool,
    json: bool,
    stats: bool,
}

#[derive(Subcommand)]
enum Commands {
    #[command(alias = "q")]
    Prompt { text: Option<String> },
    #[command(alias = "p")]
    Opt { text: Option<String> },
    #[command(alias = "log")]
    Dev { text: Option<String> },
    #[command(alias = "s")]
    Shrink { text: Option<String> },
    #[command(alias = "r")]
    Run { cmd: String, args: Vec<String> },
    #[command(alias = "x")]
    Exec { cmd: String, args: Vec<String> },
    #[command(alias = "c")]
    Compress { text: Option<String> },
    #[command(alias = "v")]
    Chat { text: Option<String> },
    Convo {
        text: Option<String>,
        #[arg(long)]
        wire: bool,
        #[arg(long)]
        trace: bool,
        #[arg(long)]
        stream: bool,
        #[arg(long, default_value_t = 6)]
        window: usize,
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
    Feedback {
        #[command(subcommand)]
        command: FeedbackCommands,
    },
}

#[derive(Subcommand)]
enum FeedbackCommands {
    Record {
        #[arg(long)]
        input: String,
        #[arg(long)]
        contains: String,
        #[arg(long)]
        mode: Option<String>,
        #[arg(long, default_value = "feedback/records.jsonl")]
        out: PathBuf,
    },
    Eval {
        #[arg(long, default_value = "feedback/records.jsonl")]
        input: PathBuf,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let render = RenderOpts {
        plain: cli.plain,
        json: cli.json,
        stats: cli.stats,
    };
    let engine = PithEngine::new();

    match cli.command {
        Commands::Prompt { text } | Commands::Opt { text } => {
            let input = read_text_arg_or_stdin(text)?;
            render_text_mode(&engine, &input, Mode::Auto, &render)?;
        }
        Commands::Compress { text } => {
            let input = read_text_arg_or_stdin(text)?;
            render_text_mode(&engine, &input, Mode::Compress, &render)?;
        }
        Commands::Chat { text } => {
            let input = read_text_arg_or_stdin(text)?;
            render_text_mode(&engine, &input, Mode::Conversational, &render)?;
        }
        Commands::Convo {
            text,
            wire,
            trace,
            stream,
            window,
        } => {
            let input = read_text_arg_or_stdin(text)?;
            let ir = if stream {
                compile_conversation_ir_v2_stream(&input, window)
            } else {
                compile_conversation_ir_v2(&input)
            };
            if render.json || trace {
                println!("{}", serde_json::to_string(&ir)?);
            } else if wire || render.plain {
                println!("{}", ir.wire);
            } else {
                println!("{}", ir.wire);
                eprintln!("tip: use --trace or --json for full graph");
            }
        }
        Commands::Dev { text } | Commands::Shrink { text } => {
            let input = read_text_arg_or_stdin(text)?;
            let result = engine.optimize_dev_output(&input, None);
            println!("{}", result.output);
            if render.stats {
                eprintln!("noise_removed={}", result.noise_removed);
            }
        }
        Commands::Run { cmd, args } | Commands::Exec { cmd, args } => {
            let output = Command::new(&cmd)
                .args(args)
                .output()
                .with_context(|| format!("failed to execute: {cmd}"))?;
            let mut text = String::new();
            text.push_str(&String::from_utf8_lossy(&output.stdout));
            text.push_str(&String::from_utf8_lossy(&output.stderr));
            let result = engine.optimize_dev_output(&text, None);
            println!("{}", result.output);
            if render.stats {
                eprintln!("noise_removed={}", result.noise_removed);
            }
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
        Commands::Feedback { command } => match command {
            FeedbackCommands::Record {
                input,
                contains,
                mode,
                out,
            } => {
                record_feedback(input, contains, mode, out)?;
            }
            FeedbackCommands::Eval { input } => {
                eval_feedback(&engine, input)?;
            }
        },
    }

    Ok(())
}

fn render_text_mode(engine: &PithEngine, input: &str, mode: Mode, render: &RenderOpts) -> Result<()> {
    let stable = engine.optimize_stable(
        input,
        StableOptimizeOptions {
            mode: Some(mode),
            ultra_compact: Some(true),
            explain: render.stats,
        },
    );

    if render.json {
        println!("{}", serde_json::to_string(&stable)?);
        return Ok(());
    }

    let out = if render.plain {
        if let Some((_, rest)) = stable.output.split_once("::") {
            rest.to_string()
        } else {
            stable.output.clone()
        }
    } else {
        stable.output.clone()
    };
    println!("{}", out);

    if render.stats {
        eprintln!(
            "mode={:?} input_kind={} noise_removed={} elapsed_ms={}",
            stable.mode, stable.input_kind, stable.noise_removed, stable.meta.elapsed_ms
        );
    }

    Ok(())
}

fn record_feedback(input: String, contains: String, mode: Option<String>, out: PathBuf) -> Result<()> {
    let record = FeedbackRecord {
        input,
        expected_contains: contains.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect(),
        mode,
    };
    if let Some(parent) = out.parent() {
        fs::create_dir_all(parent)?;
    }
    let line = serde_json::to_string(&record)?;
    use std::io::Write;
    let mut f = fs::OpenOptions::new().create(true).append(true).open(&out)?;
    writeln!(f, "{line}")?;
    println!("recorded feedback into {}", out.display());
    Ok(())
}

fn eval_feedback(engine: &PithEngine, input: PathBuf) -> Result<()> {
    let content = fs::read_to_string(&input).with_context(|| format!("cannot read {}", input.display()))?;
    let mut records = Vec::new();
    for (idx, line) in content.lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        let rec: FeedbackRecord = serde_json::from_str(line)
            .with_context(|| format!("invalid JSONL at line {}", idx + 1))?;
        records.push(rec);
    }
    let report = evaluate_records(engine, &records);
    println!(
        "total={} passed_contains={} contains_score={:.3} avg_compression_ratio={:.3}",
        report.total, report.passed_contains, report.contains_score, report.avg_compression_ratio
    );
    for (kind, k) in &report.by_kind {
        println!(
            "kind={} total={} passed_contains={} contains_score={:.3}",
            kind, k.total, k.passed_contains, k.contains_score
        );
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
