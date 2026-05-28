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

## Engine Guidelines

- Preserve semantic intent over aggressive compression.
- Avoid destructive transformations on code blocks, URLs, and identifiers.
- Treat `optimizeStable` as a public contract.
