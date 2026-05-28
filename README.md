# Pith Engine

Pith is an open-source prompt distillation engine designed to reduce token waste while preserving intent.  
The project is now engine-first: `@pith/core` is the primary product, while web and extension surfaces are integration layers.

## Why Pith

- No giant banned-word dictionaries.
- Heuristic scoring with context-aware preservation.
- Stable output contract for app integrations.
- Plugin-ready architecture for iterative community contributions.

## Core Package

`packages/core` contains the prompt engine used by all clients.

Key APIs:

- `optimize(text, options)` for default optimization flow.
- `optimizeStable(text, options)` for a versioned response contract.
- `optimizeDevOutput(text, options)` for terminal/test-log distillation.

## Quick Start

```bash
npm install
npm run -w @pith/core test
npm run -w @pith/core benchmark
```

Basic usage:

```ts
import { PithEngine } from '@pith/core';

const engine = new PithEngine();
const result = engine.optimizeStable('How do I make this worker idempotent?', { explain: true });
console.log(result.output, result.meta.explain);
```

## Repository Layout

- `packages/core`: engine and tests.
- `packages/api`: HTTP API wrappers and routes.
- `packages/chrome-extension`: browser integration.
- `packages/vscode-extension`: editor integration.
- `apps/web`: hosted product interface.

## Open Source Workflow

- Start with issues labeled for onboarding.
- Open focused pull requests with tests.
- Use semantic commits when possible.
- Keep changes backward-compatible for `optimizeStable`.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
