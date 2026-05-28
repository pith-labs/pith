use crate::input_router::InputKind;
use crate::pipelines::{compress_pipeline, conversational_pipeline, query_pipeline};

mod chat;
mod code;
mod diff;
mod generic;
mod logs;
mod prompt;
mod spec;

pub fn run_adapter(kind: InputKind, text: &str, ultra_compact: bool) -> (String, usize) {
    match kind {
        InputKind::Prompt => prompt::run(text, ultra_compact),
        InputKind::Spec => spec::run(text, ultra_compact),
        InputKind::Code => code::run(text, ultra_compact),
        InputKind::Logs => logs::run(text, ultra_compact),
        InputKind::Diff => diff::run(text, ultra_compact),
        InputKind::Chat => chat::run(text, ultra_compact),
        InputKind::Generic => generic::run(text, ultra_compact),
    }
}

pub(crate) fn as_query(text: &str, ultra_compact: bool) -> (String, usize) {
    query_pipeline(text, ultra_compact)
}

pub(crate) fn as_compress(text: &str, ultra_compact: bool) -> (String, usize) {
    compress_pipeline(text, ultra_compact)
}

pub(crate) fn as_conversational(text: &str, ultra_compact: bool) -> (String, usize) {
    conversational_pipeline(text, ultra_compact)
}
