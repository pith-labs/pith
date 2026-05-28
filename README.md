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
- `optimizeStable(text, options)` for a versioned response contract (now with semantic IR + machine prompt).
- `optimizeDevOutput(text, options)` for terminal/test-log distillation.
- `parseIntentIR(text)` to extract structured intent representation.
- `generateMachinePrompt(ir)` to produce compact machine-oriented directives.
- `generateOpcodeFromIR(ir, originalText)` for deterministic opcode generation from semantic IR.

## Quick Start

```bash
npm install
npm run -w @pith/core test
npm run -w @pith/core benchmark
npm run -w @pith/cli build
```

## Install (Terminal-First)

`npm` (global):

```bash
npm i -g "git+https://github.com/AngeloCastro9/Pith.git#main"
```

`curl` installer:

```bash
curl -fsSL https://raw.githubusercontent.com/AngeloCastro9/Pith/main/scripts/install.sh | bash
```

`brew` (tap formula):

```bash
brew tap AngeloCastro9/tap
brew install pith
```

`cargo`:

```bash
cargo install --git https://github.com/AngeloCastro9/Pith pith
```

`cargo` notes:
- installs a Rust wrapper binary
- requires Node.js in `PATH` to run the bundled Pith CLI engine

Basic usage:

```ts
import { PithEngine } from '@pith/core';

const engine = new PithEngine();
const result = engine.optimizeStable('How do I make this worker idempotent?', { explain: true });
console.log(result.output, result.ir, result.machinePrompt);
```

CLI usage:

```bash
pith prompt "Please help me rewrite this long prompt into objective technical instructions"
echo "npm test output..." | pith dev
pith --help
```

## Repository Layout

- `packages/core`: engine and test suites.
- `packages/cli`: developer-facing CLI built on top of the core engine.

## Open Source Workflow

- Start with issues labeled for onboarding.
- Open focused pull requests with tests.
- Use semantic commits when possible.
- Keep changes backward-compatible for `optimizeStable`.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
