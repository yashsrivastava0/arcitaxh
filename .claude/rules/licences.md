---
paths:
  - "**/package.json"
  - "pnpm-lock.yaml"
  - "pnpm-workspace.yaml"
  - "docs/03-specs/licence-register.md"
---

# Licences

- No dependency without a row in `docs/03-specs/licence-register.md` (section 2). Check the licence from the package itself (its `license` field and its LICENSE file), not from memory, and record the date and where you read it.
- Closed-source commercial use must be permitted. Allow-list: MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0. Dual licences are handled explicitly in the register.
- GPL, AGPL, SSPL, BUSL, Elastic and UNLICENSED in a production dependency are a hard fail. If a licence is unclear, STOP AND ASK.
- Items marked Check in the register (promptfoo, Label Studio, Typst, Vite, Next.js) are verified from the package before use. Promptfoo, Label Studio, Typst and Next.js are not used in Phase 0.
- A dependency's build script must be approved by name (`pnpm approve-builds <pkg>`), never with `--all`.
- `pnpm licences:check` runs in CI. `/licence-check <package>` does the verification and updates the register.
