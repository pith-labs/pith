# Homebrew Core Submission Pack

This is the final package to submit `pith` to `Homebrew/homebrew-core`.

## 1. Candidate Formula

Create `Formula/p/pith.rb` in your `homebrew-core` fork with:

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

## 2. Local Validation Checklist

From your `homebrew-core` local clone:

```bash
# format + style checks for new formula
brew style Formula/p/pith.rb

# strict audit for a new formula
brew audit --strict --new --formula Formula/p/pith.rb

# build/install from source from local formula file
brew install --build-from-source Formula/p/pith.rb

# run formula test block
brew test pith
```

## 3. PR Checklist (`Homebrew/homebrew-core`)

- Formula file added at `Formula/p/pith.rb`
- `brew style` passes
- `brew audit --strict --new --formula` passes
- `brew install --build-from-source` passes
- `brew test pith` passes
- Short PR description explaining what `pith` does and why it is useful

## 4. Notability Note

`homebrew-core` can reject formulas that do not meet project popularity/notability expectations.
If rejected, keep official installation via tap:

```bash
brew tap pith-labs/tap
brew install pith-labs/tap/pith
```
