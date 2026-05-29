use pith_core::{generate_machine_prompt, parse_intent_ir, PithEngine, StableOptimizeOptions};

#[test]
fn stable_contract_shape() {
    let engine = PithEngine::new();
    let stable = engine.optimize_stable(
        "Como implementar retry com idempotência no worker?",
        StableOptimizeOptions {
            explain: true,
            ..Default::default()
        },
    );

    assert_eq!(stable.schema_version, "1.1.0");
    assert!(!stable.output.is_empty());
    assert!(stable.meta.elapsed_ms <= 10_000);
    assert!(!stable.meta.explain.is_empty());
    assert!(!stable.ir.intent.action.is_empty());
    assert!(stable.machine_prompt.contains("act="));
    assert!(stable.machine_prompt.contains("conf="));
    assert!(!stable.ir_opcode.is_empty());
    assert!(stable.ir_opcode.contains("m:") || stable.ir_opcode.contains("M="));
}

#[test]
fn ir_semantic_expectations() {
    let c1 = parse_intent_ir("Do not remove negation. Refactor backend API worker retry and DLQ flow. Output JSON.");
    assert_eq!(c1.intent.action, "refactor");
    assert!(c1.intent.domain.iter().any(|d| d == "backend"));
    assert!(c1.intent.domain.iter().any(|d| d == "async-processing"));
    assert_eq!(c1.constraints.output_format, "json");
    assert!(c1.constraints.preserve_negation);
    assert!(c1.intent.confidence >= 0.5);
    assert!(c1.slots.quality.iter().any(|s| s == "retry") || c1.slots.quality.iter().any(|s| s == "dlq"));

    let c2 = parse_intent_ir("Inclua idempotency e evitar markdown.");
    assert!(c2.constraints.must_include.iter().any(|x| x == "idempotency"));
    assert!(c2.constraints.must_avoid.iter().any(|x| x == "markdown"));

    let c3 = parse_intent_ir("Generate Typescript code with max 120 tokens");
    assert_eq!(c3.constraints.output_format, "code");
    assert_eq!(c3.constraints.max_length, Some(120));

    let prompt = generate_machine_prompt(&c1);
    assert!(prompt.contains("act=refactor"));
    assert!(prompt.contains("dom="));
    assert!(prompt.contains("conf="));
    assert!(prompt.contains("fmt=json"));
    assert!(prompt.contains("keep-negation"));
}

#[test]
fn structured_multilingual_context_should_keep_business_signal() {
    let input = r#"
Contexto
Dentro da frente de integração entre Gupy e ARA, existe uma necessidade específica ligada à feat cultural.

Objetivo
Aplicar a alteração do parâmetro necessária para a feat cultural dentro da integração.

Escopo
identificar o parâmetro alterado no fluxo
ajustar comportamento da integração
validar impacto nos pontos dependentes

Resultado esperado
A feat cultural considera corretamente a alteração do parâmetro na integração.
"#;

    let ir = parse_intent_ir(input);
    let entities = ir.intent.entities.join(",");
    assert!(entities.contains("integracao") || entities.contains("gupy"));
    assert!(entities.contains("parametro") || entities.contains("cultural"));
}
