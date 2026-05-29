# AI Coding Skills (Anti-Hallucination)

Use this protocol for any AI-assisted coding in `pith`.

## 1) Source-of-Truth First

- Never invent APIs, files, env vars, or commands.
- Before coding, verify references in-repo with `rg`/file reads.
- If something is unknown, mark it as unknown and verify before changing behavior.

## 2) Change Contract

- Every non-trivial change must include:
  - targeted tests (unit/integration), and
  - one terminal validation command that proves runtime behavior.
- Prefer small PRs with one intent each (`feature/...` or `bugfix/...`).

## 3) No-Guessing Policy

- Do not claim a fix works without running tests/build.
- Do not claim external integrations are configured unless validated.
- Do not backfill missing facts from memory when repo evidence is available.

## 4) Context Preservation Checks (Pith-Specific)

- For engine/adapter changes, always validate:
  - `cargo test -p pith-core`
  - `cargo run -p pith -- feedback eval --input feedback/adapter-balanced-v1.jsonl`
- If any adapter score regresses, block merge until explained or fixed.

## 5) PR Quality Gate

Before opening PR:

- [ ] Implementation is minimal and focused.
- [ ] Tests/build executed and results captured in PR.
- [ ] No placeholder/mocked logic in production path.
- [ ] README/docs updated when behavior changes.
- [ ] Risks and known limitations documented.

## 6) Commit Discipline

- Version every change with explicit commits.
- Commit message format:
  - `feat(core): ...`
  - `fix(core): ...`
  - `docs: ...`
  - `test(core): ...`
