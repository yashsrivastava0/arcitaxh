# apps/web

Purpose: Vite + React + React Router, plain accessible desktop-first pages (ADR-030 is a Recommendation pending the founder). Phase 0 pages: `/` waitlist with the price, `/calculator` (offline Layer 1), `/verdict` form and decision receipt, `/rate/:token` blind rating, `/terms` `/refund` `/privacy` placeholders.

- May import: `core` only (plus its own code). Never `db`, provider SDKs or server-only modules.
- Layout: `src/features/<feature>/`. **No canvas, no React Flow**; do not install it.
- Render model and user text as escaped text only; Markdown without raw HTML. No inline scripts or handlers (strict CSP).
- The calculator runs Layer 1 in the browser from the KB bundle; no model call. It must never show fixture data in a production build, and shows "no data" gracefully.
- The waitlist price is read from `config/phase0.json`; when `null`, show a clear "PRICE NOT SET" banner and disable the form. Never invent a price.
- Accessibility target WCAG 2.2 AA: keyboard navigable, focus management, reduced motion respected. English only. Show currency as in the KB record; no conversion.
- No cookies, no fingerprinting: `anon_id` is random per page load.
- Test: smoke test of the pages with the fake client; keyboard-only pass of the rating page.
