# Governance

## Maintainers

Current maintainers are responsible for roadmap direction, review quality, and release integrity.

- @angelocastro (owner)

## Decision Process

- Small changes: maintainer approval in a pull request.
- Breaking or architectural changes: open issue + design notes in PR description.
- Release changes: must pass CI and semantic gate before tag.

## Pull Request Policy

- At least 1 maintainer approval required.
- Required checks must pass:
  - Core tests
  - Semantic gate
  - Benchmark run
  - CLI build

## Security and Responsible Disclosure

See `SECURITY.md`.

## Versioning Policy

- SemVer for `@pith/core` and `@pith/cli`.
- `optimizeStable` is a public contract and must be migration-safe.
