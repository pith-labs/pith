use pith_core::compile_conversation_ir_v2;

#[test]
fn conversation_ir_v2_should_segment_and_emit_wire() {
    let input = r#"
Contexto
Precisamos melhorar integração entre worker e fila.

Objetivo
Aplicar ajuste de idempotency e retry com dlq.

Escopo
validar impacto
ajustar fluxo

Resultado esperado
Sem perda de contexto e menos tokens.
"#;

    let ir = compile_conversation_ir_v2(input);
    assert_eq!(ir.version, "2.0.0");
    assert!(!ir.wire.is_empty());
    assert!(ir.graph.nodes.len() >= 3);
    assert!(ir.entities.iter().any(|e| e == "retry" || e == "idempotency" || e == "dlq"));
    assert!(ir.intent == "implement" || ir.intent == "optimize");
}
