use pith_core::{compile_conversation_ir_v2, compile_conversation_ir_v2_stream};

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

#[test]
fn conversation_ir_v2_stream_should_emit_memory_layers() {
    let input = "Contexto. Precisamos de ajuste na integração. Objetivo. Aplicar parâmetro. Escopo. validar impacto e dependências. Resultado esperado. Sem perda.";
    let ir = compile_conversation_ir_v2_stream(input, 2);
    assert!(ir.memory.len() >= 2);
    assert!(ir.wire.contains("mem="));
    assert!(ir.graph.edges.iter().any(|e| e.relation == "memory-transition"));
}

#[test]
fn conversation_ir_v2_should_emit_causal_or_goal_edges() {
    let input = "Goal\nImplement retry policy.\nScope\nValidate impact because queue latency is high.\nExpected result\nLower failures.";
    let ir = compile_conversation_ir_v2(input);
    assert!(ir.graph.edges.iter().any(|e| e.relation == "causal-dependency" || e.relation == "goal-dependency"));
}
