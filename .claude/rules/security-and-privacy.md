# Security and privacy

Applies everywhere.

- Untrusted text: user labels and notes, pasted text, vendor-page content and **all model output**. Length-limit it, pass it to models only as labelled data blocks, render it only as escaped text, and render Markdown without raw HTML.
- Models get no tools. Nothing a model writes triggers an action.
- Secrets: redact obvious key patterns (`sk-`, `AKIA`, `ghp_` and the like, defined in `core/security`) before any text goes to a model or a log. Rule R-09 blocks model calls when a design contains them.
- Never commit secrets or `.env` files; `.env.example` has names only. One provider key per environment; spend caps are also set in the provider console (founder task).
- Logs carry provider request ids, not prompt or response bodies.
- Rater tokens: store the hash only; a token sees only its own assignments (test cross-token access). No names or emails in rating data.
- Waitlist emails and rater data are PII: keep the retention and deletion path documented. No cookies and no fingerprinting; `anon_id` is random per page load.
- Strict CSP (own-origin scripts, no inline handlers), CORS locked to the app origin.
- Do not give legal advice. Mark counsel items (EU representative, transfer mechanism, logo licences) as Open.
