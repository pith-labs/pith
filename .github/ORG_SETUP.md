# Org Setup Checklist (pith-labs)

Use this checklist in `pith-labs/pith` after repository transfer.

## 1) Branch Protection (`main`)

- Require a pull request before merging.
- Require at least 1 approval.
- Require status checks to pass:
  - `core-and-cli`
- Require conversation resolution before merge.
- Dismiss stale approvals when new commits are pushed.

## 2) Repository Security

- Enable Dependabot security updates.
- Enable secret scanning (if available).
- Enable push protection for secrets (if available).

## 3) Maintainer Hygiene

- Keep `CODEOWNERS` up to date.
- Use issue templates for bug/feature intake.
- Use release workflows (`Release Core`, `Release CLI`).

## 4) Labels

Create labels listed in `.github/LABELS.md` for consistent triage.
