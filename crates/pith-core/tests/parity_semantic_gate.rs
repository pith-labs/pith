use pith_core::{generate_opcode_from_ir, parse_intent_ir};

struct GateCase<'a> {
    input: &'a str,
    action: &'a str,
    must_have_domains: &'a [&'a str],
    format: Option<&'a str>,
}

#[test]
fn semantic_gate_cases() {
    let cases = vec![
        GateCase {
            input: "Refactor the backend API route and keep idempotency for retries in worker queue.",
            action: "refactor",
            must_have_domains: &["backend", "async-processing"],
            format: None,
        },
        GateCase {
            input: "Explain how to reduce LLM token usage and output JSON with max 120 tokens.",
            action: "explain",
            must_have_domains: &["llm"],
            format: Some("json"),
        },
        GateCase {
            input: "Generate Typescript code for retryable/non-retryable classification.",
            action: "generate",
            must_have_domains: &[],
            format: Some("code"),
        },
        GateCase {
            input: "Fix flaky tests in vitest and improve coverage.",
            action: "fix",
            must_have_domains: &["testing"],
            format: None,
        },
        GateCase {
            input: "Implement postgres migration and avoid markdown.",
            action: "implement",
            must_have_domains: &["data"],
            format: None,
        },
    ];

    for case in cases {
        let ir = parse_intent_ir(case.input);
        assert_eq!(ir.intent.action, case.action, "action mismatch for {}", case.input);
        for d in case.must_have_domains {
            assert!(ir.intent.domain.iter().any(|x| x == d), "missing domain {d} for {}", case.input);
        }
        if let Some(fmt) = case.format {
            assert_eq!(ir.constraints.output_format, fmt, "format mismatch for {}", case.input);
        }

        let op = generate_opcode_from_ir(&ir, case.input, true);
        assert!(op.len() > 12);
        assert!(op.contains("a:") || op.contains("ACT="));
        assert!(op.contains("pl:") || op.contains("P=pl:"));
    }
}

#[test]
fn opcode_domain_snapshot_like() {
    let fixtures = vec![
        (
            "Refactor backend API worker retry and DLQ flow with idempotency and output JSON.",
            "async-processing",
            vec!["pl:be@v1", "pl:wk@v1"],
        ),
        (
            "Explain how to reduce prompt token usage for OpenAI and keep semantic fidelity.",
            "llm",
            vec!["pl:lm@v1"],
        ),
        (
            "Implement postgres migration with rollback plan and avoid markdown.",
            "data",
            vec!["pl:db@v1"],
        ),
    ];

    for (input, must_domain, opcode_contains_any) in fixtures {
        let ir = parse_intent_ir(input);
        let opcode = generate_opcode_from_ir(&ir, input, true);

        assert!(ir.intent.domain.iter().any(|d| d == must_domain), "domain mismatch: {:?}", ir.intent.domain);
        assert!(
            opcode_contains_any.iter().any(|needle| opcode.contains(needle)),
            "opcode mismatch: {opcode}"
        );
    }
}
