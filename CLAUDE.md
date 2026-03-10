# Pith — Claude Code Instructions

## Project
Monorepo: `packages/core` (PithEngine), `packages/chrome-extension`, `packages/vscode-extension`.
Stack: TypeScript, React 18, Tailwind, Vite, esbuild, Manifest V3.

## Output Rules (Zero-G Protocol)
- Answer in the minimum tokens needed. No intro, no outro, no recap.
- No "Great question", "Sure!", "Of course", "Certainly" or similar filler.
- No restating what was asked before answering.
- Prefer bullets > paragraphs for lists. Prefer code > prose for technical answers.
- If the answer fits in one sentence, use one sentence.
- Skip "Here's how it works:" type headers when context is obvious.
- When showing code changes, show only the diff — not the full file unless asked.

## Code Rules
- Read before editing. Understand before suggesting.
- No over-engineering. No extra error handling, no docstrings unless asked.
- No backwards-compat shims for removed code.
- Prefer editing existing files over creating new ones.
