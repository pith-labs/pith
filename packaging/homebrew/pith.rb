class Pith < Formula
  desc "Pith CLI - prompt distillation engine for terminal workflows"
  homepage "https://github.com/AngeloCastro9/Pith"
  url "https://github.com/AngeloCastro9/Pith/archive/refs/tags/cli-v1.0.0.tar.gz"
  sha256 "REPLACE_WITH_RELEASE_TARBALL_SHA256"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", "--silent"
    system "npm", "run", "-w", "@pith/cli", "build"
    bin.install "packages/cli/dist/cli.js" => "pith"
  end

  test do
    assert_match "pith", shell_output("#{bin}/pith --help")
  end
end
