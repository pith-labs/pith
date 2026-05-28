mod dev_output;
mod domain;
mod engine;
mod ir;
mod opcode;
mod types;

pub use dev_output::DevOutputOptions;
pub use engine::PithEngine;
pub use ir::{generate_machine_prompt, parse_intent_ir};
pub use opcode::{compute_flags, generate_opcode_from_ir, isa_crc};
pub use types::{
    DevOutputResult, DomainPlan, IntentIR, Mode, OptimizeOptions, OptimizeResult, PithMeta, PithResultV1,
    StableOptimizeOptions,
};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input_returns_guard() {
        let engine = PithEngine::new();
        let out = engine.optimize("   ", OptimizeOptions::default());
        assert_eq!(out.output, "[PITH: No meaningful data found]");
    }

    #[test]
    fn stable_contract_contains_ir_and_opcode() {
        let engine = PithEngine::new();
        let out = engine.optimize_stable(
            "Fix API retry idempotency and keep JSON format",
            StableOptimizeOptions {
                explain: true,
                ..Default::default()
            },
        );
        assert_eq!(out.schema_version, "1.1.0");
        assert!(!out.machine_prompt.is_empty());
        assert!(!out.ir_opcode.is_empty());
        assert!(out.meta.explain.iter().any(|e| e.starts_with("ir.action=")));
    }

    #[test]
    fn opcode_crc_works() {
        let base = "M=Q IO=A2H TAG=_ S=_ ACT=opt GOAL=_ CSTR=_ PROTO=_ N=_ E=_ A=_ P=_ F=_";
        let crc = isa_crc(base);
        assert_eq!(crc.len(), 8);
    }

    #[test]
    fn dev_output_compacts_noise() {
        let engine = PithEngine::new();
        let out = engine.optimize_dev_output("\u{001b}[31mDEBUG\u{001b}[0m\nreal line\nreal line\n", None);
        assert!(out.output.contains("real line"));
    }
}
