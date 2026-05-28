pub const QUERY_THRESHOLD: i32 = 5;
pub const COMPRESS_THRESHOLD: i32 = 4;
pub const MAX_QUERY_NICHES: usize = 4;

pub const NEGATION_WORDS: &[&str] = &["não", "nao", "not", "never", "nem"];

pub fn is_adjective_suffix(lower: &str) -> bool {
    const SUFFIXES: &[&str] = &[
        "ário", "ária", "oso", "osa", "ivo", "iva", "ável", "ível", "inho", "inha", "ante", "ente", "udo", "uda",
        "ary", "ous", "ive", "able", "ible", "ful", "less", "ical", "ial", "ular", "ural", "olar", "lear", "quer",
        "quier", "ico", "ica",
    ];
    SUFFIXES.iter().any(|s| lower.ends_with(s))
}

pub fn is_verb_infinitive(lower: &str) -> bool {
    lower.ends_with("ar") || lower.ends_with("er") || lower.ends_with("ir")
}

pub fn is_verb_conjugated(lower: &str) -> bool {
    ["ando", "endo", "indo", "aram", "avam", "eve", "rá", "rão", "sse", "mos", "reis"]
        .iter()
        .any(|s| lower.ends_with(s))
}

pub fn abbrev(word: &str) -> Option<&'static str> {
    match word {
        "categorias" | "categories" => Some("cats"),
        "produtos" | "products" => Some("prods"),
        "configuração" | "configuracao" | "configuration" => Some("config"),
        "desenvolvimento" | "development" => Some("dev"),
        "documentação" | "documentacao" | "documentation" => Some("docs"),
        "aplicação" | "aplicacao" | "application" => Some("app"),
        "implementação" | "implementacao" | "implementation" => Some("impl"),
        "gerenciamento" | "management" => Some("mgmt"),
        "informação" | "informacao" | "information" => Some("info"),
        "autenticação" | "autenticacao" | "authentication" => Some("auth"),
        "ambiente" | "environment" => Some("env"),
        "repositório" | "repositorio" | "repository" => Some("repo"),
        "permissão" | "permission" => Some("perm"),
        "descrição" | "description" => Some("desc"),
        "responsável" | "responsible" => Some("resp"),
        "disponível" | "available" => Some("avail"),
        _ => None,
    }
}
