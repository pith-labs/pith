# Homebrew Core Submission

This document tracks the path from tap install (`brew tap pith-labs/tap`) to core install (`brew install pith`).

## Current Status (2026-05-29)

- Stable tag exists: `v2.0.0`
- Public source tarball exists: `https://github.com/pith-labs/pith/archive/refs/tags/v2.0.0.tar.gz`
- Public tap formula exists: `pith-labs/homebrew-tap`
- Formula name check: `Formula/p/pith.rb` does not currently exist in `Homebrew/homebrew-core` (HTTP 404 at check time)

## Important Acceptance Risk

Homebrew core has notability requirements for self-submitted projects (stars/forks/watchers thresholds).
At check time, `pith-labs/pith` had `0` stars, `0` watchers, and `0` forks, which is likely below acceptance thresholds.

Reference:
- https://docs.brew.sh/Acceptable-Formulae

## Formula Candidate (for homebrew/core)

```ruby
class Pith < Formula
  desc "AI-first input distillation engine and CLI"
  homepage "https://github.com/pith-labs/pith"
  url "https://github.com/pith-labs/pith/archive/refs/tags/v2.0.0.tar.gz"
  sha256 "b3435e376b065bae0ec9a481243897f9e8fd290ef1743eef3f6584d85e72b9db"
  license "MIT"

  depends_on "rust" => :build

  def install
    system "cargo", "install", *std_cargo_args(path: "crates/pith-cli")
  end

  test do
    output = shell_output("#{bin}/pith q 'Explain token optimization' --plain")
    assert_match "m:Q", output
  end
end
```

## Submission Steps

1. Ensure `pith-labs/pith` remains public and tag `v2.0.0` is available.
2. Fork `Homebrew/homebrew-core`.
3. Add `Formula/p/pith.rb` with the candidate formula above.
4. Run locally:
   - `brew audit --strict --new --formula pith`
   - `brew install --build-from-source ./Formula/p/pith.rb`
   - `brew test pith`
5. Open PR to `Homebrew/homebrew-core`.
6. If rejected for notability, keep official install in `pith-labs/homebrew-tap` and re-apply after community growth.

## Recommended Near-Term Plan

1. Keep `brew tap pith-labs/tap && brew install pith-labs/tap/pith` as official install.
2. Increase adoption signals (stars, forks, contributors, usage examples).
3. Re-submit to core after hitting stronger public metrics.
