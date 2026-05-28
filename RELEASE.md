# Release Process

This repository ships two developer products:

- `@pith/core`
- `@pith/cli`

## Principles

- SemVer for both packages.
- Every release must pass CI.
- Release notes are generated from merged pull requests.

## Core Release

1. Run `Release Core` workflow.
2. Provide version (example: `1.1.0`).
3. Workflow updates `packages/core/package.json`, creates tag `core-vX.Y.Z`, and opens a GitHub release.

## CLI Release

1. Run `Release CLI` workflow.
2. Provide version (example: `1.1.0`).
3. Workflow updates `packages/cli/package.json`, creates tag `cli-vX.Y.Z`, and opens a GitHub release.

## Manual Validation Before Triggering

```bash
npm ci
npm run -w @pith/core test
npm run -w @pith/core benchmark
npm run -w @pith/cli build
```
