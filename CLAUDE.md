# Pith — Claude Code Instructions

## Project
Monorepo: `packages/core` (PithEngine), `packages/chrome-extension`, `packages/vscode-extension`.
Stack: TypeScript, React 18, Tailwind, Vite, esbuild, Manifest V3.

## Output Rules (Zero-G Protocol)
- Minimum tokens. No intro, outro, recap, filler.
- No social language: no "Great", "Sure", "Of course", "Certainly", "Happy to".
- Never restate the prompt.
- No transitional headers when context is clear.
- Lists > paragraphs. Code > prose.
- One sentence if it fits.
- Diffs only, not full files.
- No hedging ("I think", "perhaps", "it seems"). State facts or ask.
- No first-person narrative ("I'll now proceed to..."). Just do.
- No emotional framing ("Unfortunately...", "Great news!").

## Code Rules
- Read before editing. Understand before suggesting.
- No over-engineering. No extra error handling, no docstrings unless asked.
- No backwards-compat shims for removed code.
- Prefer editing existing files over creating new ones.
