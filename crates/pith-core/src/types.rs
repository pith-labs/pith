use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Auto,
    Compress,
    Query,
    Conversational,
}

#[derive(Debug, Clone, Copy)]
pub struct OptimizeOptions {
    pub ultra_compact: bool,
    pub mode: Mode,
}

impl Default for OptimizeOptions {
    fn default() -> Self {
        Self {
            ultra_compact: true,
            mode: Mode::Auto,
        }
    }
}

#[derive(Debug, Clone)]
pub struct OptimizeResult {
    pub output: String,
    pub noise_removed: usize,
    pub is_query: bool,
}

#[derive(Debug, Clone)]
pub struct DevOutputResult {
    pub output: String,
    pub noise_removed: usize,
}

#[derive(Debug, Clone, Default)]
pub struct StableOptimizeOptions {
    pub ultra_compact: Option<bool>,
    pub mode: Option<Mode>,
    pub explain: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PithResultV1 {
    pub schema_version: String,
    pub mode: Mode,
    pub output: String,
    pub noise_removed: usize,
    pub is_query: bool,
    pub ir: IntentIR,
    pub machine_prompt: String,
    pub ir_opcode: String,
    pub ai_language: String,
    pub input_kind: String,
    pub meta: PithMeta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PithMeta {
    pub elapsed_ms: u128,
    pub explain: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentIR {
    pub version: String,
    pub intent: Intent,
    pub slots: Slots,
    pub constraints: Constraints,
    pub signals: Signals,
    pub source: Source,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Intent {
    pub action: String,
    pub domain: Vec<String>,
    pub domain_scores: Vec<DomainScore>,
    pub entities: Vec<String>,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainScore {
    pub name: String,
    pub score: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Slots {
    pub runtime: Vec<String>,
    pub transport: Vec<String>,
    pub storage: Vec<String>,
    pub quality: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Constraints {
    pub preserve_negation: bool,
    pub output_format: String,
    pub max_length: Option<usize>,
    pub must_include: Vec<String>,
    pub must_avoid: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Signals {
    pub has_code: bool,
    pub has_question: bool,
    pub language_hint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Source {
    pub original_length: usize,
    pub non_empty_lines: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainPlan {
    pub track: String,
    pub weights_version: String,
    pub focus: Vec<String>,
    pub checks: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentV2 {
    pub id: String,
    pub role: String,
    pub text: String,
    pub keywords: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeV2 {
    pub from: String,
    pub to: String,
    pub relation: String,
    pub score: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemanticGraphV2 {
    pub nodes: Vec<SegmentV2>,
    pub edges: Vec<EdgeV2>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationIRV2 {
    pub version: String,
    pub language: String,
    pub intent: String,
    pub entities: Vec<String>,
    pub actions: Vec<String>,
    pub constraints: Vec<String>,
    pub decisions: Vec<String>,
    pub pending: Vec<String>,
    pub graph: SemanticGraphV2,
    pub memory: Vec<MemoryLayerV2>,
    pub global_summary: String,
    pub wire: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryLayerV2 {
    pub layer: String,
    pub unit: String,
    pub summary: String,
    pub entities: Vec<String>,
    pub actions: Vec<String>,
}
