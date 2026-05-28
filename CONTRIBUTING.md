# Contributing to Pith

Thanks for helping improve Pith.

## Ground Rules

- Keep pull requests focused and small.
- Add or update tests for behavior changes.
- Prefer backwards-compatible changes in `@pith/core`.
- Use clear commit messages.

## Local Setup

```bash
npm install
npm run -w @pith/core test
npm run -w @pith/core benchmark
```

## Pull Request Checklist

- Explain what changed and why.
- Link the related issue.
- Include before/after behavior notes.
- Confirm tests pass locally.
- Keep PR scope focused (avoid mixing refactor + feature + release changes).
- Highlight any impact on `optimizeStable` schema/behavior.

## Engine Guidelines

- Preserve semantic intent over aggressive compression.
- Avoid destructive transformations on code blocks, URLs, and identifiers.
- Treat `optimizeStable` as a public contract.

## Branch Protection (Recommended)

Enable on `main`:

- Require pull request before merging.
- Require approvals (minimum 1).
- Require status checks:
  - `core-and-cli`
- Dismiss stale approvals on new commits.
