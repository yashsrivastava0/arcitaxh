# PHASE 1 BUILD BRIEF: Canvas Core ("Decision-Native Architecture Canvas")

You are the lead engineer for a solo founder. This brief is your complete instruction set for **spec Phase 1: the canvas core**. It builds the main product surface (the canvas, context chips, adaptive interview, typed palette, decision drawer, blind-spot view, rules at launch breadth, about 15 decision types) plus the accounts and persistence needed to save work. Read it fully before touching anything. Where it says STOP AND ASK, stop and ask the founder.

This brief is a continuation of the Phase 0 brief. Nothing here overrides it. Where the two seem to disagree, stop and report the conflict (Section 2.4).

---

## 1. Mission, scope, definition of done

### 1.1 What you build (in the spec's order of work, spec 16.3)
1. **Week-one canvas spike** that must pass five exit criteria before anything else.
2. **Vertical slice**: one decision type end to end (records → rules → pipeline → verdict → drawer receipt) on the canvas.
3. **Context chips and the adaptive interview** (Start screen).
4. **Typed palette, Mode B guidance badges, ghost suggestions, wiring rules, command palette, full keyboard path.**
5. **Blind-spot view and the remaining rules.**
6. **Remaining decision types**, one at a time, content-first (about 15 total).
7. **Accounts and saved designs** with versions and autosave (Better Auth, GitHub sign-in).

Plus, from the spec's v1 scope and Phase 1 table, scheduled after the spine: **Mode A "design it for me"** (deterministic, from archetypes), a **minimal worker** (KB import, expiry sweep, purge jobs), optional **Mermaid import**, optional **Compare view**, **staging deployment**, **accessibility, performance and security hardening**.

### 1.2 Definition of done for Phase 1
Every milestone in Section 15 meets its acceptance criteria; CI is green (including the new end-to-end and accessibility stages); the spike report is committed and shows PASS; **receipts render with sources and verified-on dates for every launch decision type**; `docs/05-phases/phase-1/status.md` says so. (Spec 16.1 exit criteria.)

### 1.3 Explicitly NOT in this phase (do not build, do not add dependencies for)
Numbers strip UI and 1x/10x/100x slider UI (Phase 2; reserve the layout region only); debate theater, SSE streaming, `debate_events`, pg-boss debate jobs, "Second opinion" button (hidden, no UI); credit ledger, plans, merchant-of-record integration, usage billing; exports (PDF, MADR, Mermaid, Structurizr, D2); re-check alerts and digests; MCP server; GitHub App; team features, sharing links, roles beyond single owner; real-time editing (Yjs/Liveblocks); break-it mode; marketing/comparison/reference-architecture pages (Phase 2); PostHog adapter (port and taxonomy only); Langfuse/Sentry integration; BYOK; elkjs (dagre only unless a measured need appears).
If you are tempted to build one of these, re-read this list.

---

## 2. Preconditions, the gate, reconciliation with Phase 0

### 2.1 The gate (spec rule 4; blueprint Section 14)
Phase 1 may start only when ONE of these is true:
- **(a)** Phase 0's results report (`docs/07-validation/phase-0/results/`) shows the engine arms beat the single-model arm on the pre-registered rule **and** the waitlist threshold was met. Record the result in `docs/05-phases/phase-1/gate-decision.md`.
- **(b)** The founder explicitly instructs you in writing to start anyway. Record the instruction (quote, date) and the risk in `gate-decision.md`, then proceed.

If the gate failed and there is no override: STOP. Per spec 17.6 the next step is to change the KB and the rules (not the prompts) and re-run the test. Phase 1 does not start.

**The gate is about the canvas, not about debate.** If the engine beats a single model but debate adds nothing, the canvas is still built; debate becomes an opt-in extra in Phase 2. Phase 1 does not depend on debate either way.

### 2.2 Reconcile with what Phase 0 actually built (milestone P1-M0)
Phase 0 may have deviated from its brief. Before planning, read and summarise:
`docs/05-phases/phase-0/{status,conflicts,parking-lot,questions,spec-change-proposals}.md`; all ADRs (note the highest number; continue from it); `config/defaults/*.json` and `config/phase0.json` (tuned defaults from the results: apply any founder-approved changes to thresholds and weights via config only, with a changelog line); `kb/CHANGELOG.md` and the current KB release; the curation hours CSV (H4); the cost-per-debate result; the Layer 2 model choice; the packages' public APIs.
Where Phase 0's reality differs from this brief, follow the reality and log it in `docs/05-phases/phase-1/conflicts.md`. Specifically check:
- Does the KB DB import (`kb_releases`/`kb_records` rows) exist, or only the bundle? (Section 10.1 covers both.)
- Is the web app Vite + React Router (ADR-030) as recommended?
- Which test runner, linter, dependency-analysis tool and id generator were chosen?
- Is the in-house rate limiter in place? (Section 8.4.)

### 2.3 Source documents and precedence
`docs/01-source/` holds the blueprint, research report and specification. Precedence: blueprint Decisions > specification > research report. Conflicts go to `conflicts.md`; never resolve silently. This brief calls out known conflicts in Section 17.

### 2.4 Stop-and-ask triggers (carry-forward)
Unclear licence; unverifiable fact; document conflict; anything tagged Assumption or Open you would otherwise guess; any change that adds cost; any divergence between this brief, the Phase 0 brief and the spec.

---

## 3. Carry-forward rules (restate in CLAUDE.md, update its "current phase")

### 3.1 Tags
Verified / Decision / Recommendation / Assumption / Default / Open (definitions as in the spec, Section 0).

### 3.2 Hard rules
1. **Do not invent** prices, limits, rate tiers, model names or IDs, library versions, licences, competitor features. Read versions from the registry/lockfile; read vendor facts from vendor pages and record the source.
2. **No model supplies a price, limit or capability.** Models never write KB records.
3. **`packages/core` performs no I/O** (no fs, network, clock, randomness, env, database). It takes `Clock` and `IdGenerator` through inputs. Browser and server import the same code.
4. **No dependency without a licence entry** in `docs/03-specs/licence-register.md`. Closed-source commercial use must be permitted. Verify from the package itself.
5. **Defaults live in `config/defaults/*.json`**, not in code.
6. **P9: missing data never silently decides.** Missing or expired record: option survives, confidence becomes `uncertain`. A rule with missing data returns `unknown`, never pass.
7. **Never write real KB facts from memory.** Facts reach `kb/records/` only through the proposals flow reviewed by the founder.
8. **No real LLM calls** unless `ALLOW_REAL_LLM=1` and a spend cap is configured. Tests, local dev and CI use the fake client.
9. **No secrets in the repo.**
10. **Positions never affect semantics.** Moving a box never changes a verdict or a hash.

### 3.3 Principles P1-P9 (spec 3.4)
P1 deterministic core; P2 every fact has source and date; P3 the canvas is a view of the design model; P4 stream, don't block (not used this phase); P5 one deployable; **P6 quiet guidance: badges and small notices, never a pop-up in the middle of a drag**; P7 reproducible verdicts; P8 spend metered from day one; P9 missing data never silently decides.

### 3.4 Working method
Plan first (`docs/05-phases/phase-1/plan.md`); milestone by milestone; small Conventional Commits; tests first for core; ADR for every decision you make; update `status.md` at the end of every session; park anything out of scope in `parking-lot.md`; log spec changes you need as proposals in `docs/05-phases/phase-1/spec-change-proposals.md` (never edit the spec yourself).

---

## 4. Repository structure for Phase 1

Phase 0's tree stays. This section shows what Phase 1 adds or fills. New or changed paths are marked `+` (new) or `~` (existing, extended). **Conventions from Phase 0 are unchanged**: `src/modules/<feature>/{routes,service,types}.ts` in the API; `src/features/<feature>/` in the web app; each package exposes only `src/index.ts`; each folder gets a short README or nested `CLAUDE.md`.

```text
.
├─ CLAUDE.md                                  ~ phase → 1; add Phase 1 rules (Section 14)
├─ .claude/
│  ├─ rules/                                  + frontend-canvas.md, accessibility.md, api-modules.md,
│  │                                            db-migrations.md, derived-state.md
│  ├─ commands/                               + /new-feature-module, /perf-check, /a11y-check,
│  │                                            /spike-report, /add-rule, /add-archetype
│  ├─ agents/                                 + a11y-reviewer, canvas-perf-reviewer, security-reviewer,
│  │                                            store-discipline-reviewer
│  └─ skills/                                 + canvas-interaction-model/SKILL.md, kb-decision-type-onboarding/SKILL.md
├─ config/defaults/                           + ui.json, limits.json, blindspots.json   ~ scoring.json (better-fit threshold)
├─ docs/
│  ├─ 03-specs/                               + canvas-interaction-model.md, frontend-architecture.md,
│  │                                            api-reference.md (generated), analytics-taxonomy.md,
│  │                                            kb-content-guide.md, privacy-inventory.md (extend)
│  ├─ 04-decisions/                           + ADRs from the next free number
│  ├─ 05-phases/phase-1/                      + brief.md, plan.md, status.md, conflicts.md, parking-lot.md,
│  │                                            questions.md, gate-decision.md, spike-report.md,
│  │                                            spec-change-proposals.md, decision-type-tracker.md
│  ├─ 06-runbooks/                            ~ fill: broken-kb-release.md, deletion-request.md,
│  │                                            stuck-job.md (stubs from Phase 0 become real)
│  └─ 07-validation/phase-1/                  + perf-baselines/, a11y-reports/, e2e-notes.md
├─ kb/
│  ├─ archetypes/                             + one YAML per archetype (Mode A)
│  ├─ decision-types/                         ~ about 15 total (Section 7)
│  ├─ options/ records/ proposals/ snapshots/ ~ grows per decision type
│  └─ schema/                                 ~ regenerated (option interfaces, archetypes)
├─ packages/
│  ├─ core/src/
│  │  ├─ commands/                            + pure command definitions: apply, inverse, compound
│  │  ├─ palette/                             + palette registry v1 (static), palette↔decision-type map
│  │  ├─ inference/                           + onRequestPath, public-API detection from edges
│  │  ├─ wiring/                              + ghost insertion and edge-attachment rules (spec 6.10)
│  │  ├─ blindspots/                          + blind-spot evaluators → checklist items
│  │  ├─ interview/                           + pure state machine: next question given a profile
│  │  ├─ archetypes/                          + archetype selection + draft assembly (types/logic only)
│  │  ├─ analysis/                            + analyzeDesign(): findings, per-component verdicts, blind spots, calc results
│  │  ├─ badges/                              + badge derivation (close/uncertain/better-fit)
│  │  ├─ contract/                            + Zod request/response schemas shared by api and web
│  │  ├─ rules/                               ~ R-08, R-10, R-11, R-12, R-13, R-14 added
│  │  └─ test/parity/                         ~ fixtures extended (commands, wiring, analysis, interview)
│  ├─ kb/                                     ~ archetype schema + loader; option `interfaces` field
│  ├─ db/src/
│  │  ├─ schema/                              ~ + designs, design_versions, decisions, idempotency_keys, kb_active, auth tables
│  │  └─ migrations/                          ~ forward-only; expand-and-contract (Section 9)
│  └─ llm/                                    ~ unchanged except Layer 2 wiring for drawer "Explain"
├─ apps/
│  ├─ web/                                    ~ full structure in Section 5.1
│  ├─ api/                                    ~ full structure in Section 8.1
│  └─ worker/                                 ~ full structure in Section 10.1 (was placeholder)
├─ tools/
│  ├─ perf/                                   + synthetic-graph generator, canvas perf traces
│  ├─ hosting-probe/                          + SSE/LISTEN/disconnect/15-minute probe (Section 13.3)
│  └─ e2e-fixtures/                           + seeded users and designs for Playwright
├─ infra/
│  ├─ Dockerfile                              + one image, two entry points (api, worker)
│  ├─ docker-compose.yml                      ~ + worker service for local runs
│  └─ staging/ production/                    + env docs only (no secrets); provider files after ADR-029
└─ e2e/ (or apps/web/e2e/)                    + Playwright specs (Section 12)
```

### 4.1 Dependency-direction rules (unchanged, now enforce more)
`core` imports nothing from other packages/apps. `kb` and `llm` and `db` follow Phase 0. `web` imports `core` only (plus `core/contract` types); it never imports `db`, `llm`, provider SDKs or server-only code. `worker` imports `core`, `kb`, `llm`, `db`. **New:** `apps/web/src/features/*` may import each other only through each feature's `index.ts`; add this to the import-restriction lint rule.

---

## 5. Frontend architecture (the main product surface)

The canvas is the centre of the screen. Guidance sits beside the drawing, never on top of it (blueprint Section 9). Desktop first; at least 1280 px width (Default) or the app shows the read-only receipt view.

### 5.1 `apps/web` target structure

```text
apps/web/
├─ index.html
├─ vite.config.ts  tsconfig.json  tailwind/postcss config
├─ public/                                   static assets; /kb/<version>.json bundles (Section 5.9)
├─ e2e/                                      Playwright specs (Section 12)
└─ src/
   ├─ main.tsx
   ├─ app/
   │  ├─ router.tsx                          route table
   │  ├─ providers/                          QueryProvider(server-state), KbProvider, SessionProvider,
   │  │                                       ErrorBoundary, LiveRegionProvider, FlagsProvider
   │  ├─ layouts/                            AppShell, ReadOnlyLayout, PublicLayout
   │  └─ guards/                             RequireSession, DesktopWidthGate (<1280px → receipt view)
   ├─ routes/                                thin route components that compose features
   │  ├─ start.tsx  canvas.tsx  compare.tsx  receipt.tsx  designs.tsx  account.tsx  sign-in.tsx
   │  ├─ (Phase 0, kept) landing  calculator  verdict  rate/:token  terms  refund  privacy
   │  └─ lab/spike.tsx                       dev-only; excluded from production builds
   ├─ features/
   │  ├─ canvas/
   │  │  ├─ index.ts
   │  │  ├─ components/   CanvasPanel  ComponentNode  GhostNode  DependencyEdge  CanvasControls  MiniMapPanel
   │  │  ├─ adapter/      graph-to-flow.ts  flow-events-to-commands.ts  node-types.ts  edge-types.ts
   │  │  ├─ hooks/        useCanvasHandlers  useCanvasKeyboard  useAutoLayout  useFitView
   │  │  ├─ layout/       dagre-layout.ts  (left-to-right; pure function graph→positions)
   │  │  └─ styles/       node-states.css  edge-states.css
   │  ├─ drawer/
   │  │  ├─ index.ts
   │  │  ├─ DecisionDrawer.tsx
   │  │  ├─ sections/     Recommended  Alternatives  WhyNot  FlipConditions  Sources  Assumptions
   │  │  │                Confidence  ReversalCost  BlindSpotsForComponent  Swap  Traits  WiringLog  FreshnessNote
   │  │  ├─ explain/      ExplainPanel (question kinds: why / why not X / what would change it / plain language)
   │  │  └─ hooks/        useSelectedVerdict  useDrawerFocus
   │  ├─ palette/         PalettePanel  PaletteItem (drag source)  palette-keyboard.ts
   │  ├─ context-chips/   ContextChips  ChipEditor  (one editor per chip)
   │  ├─ interview/       InterviewFlow  QuestionCard  FollowUp  ArchetypePicker  DraftReview (Mode A)
   │  ├─ blind-spots/     BlindSpotPanel  BlindSpotItem
   │  ├─ findings/        FindingsList  FindingBadge
   │  ├─ command-palette/ CommandPalette  commands-registry.ts
   │  ├─ designs/         DesignsList  SaveVersionDialog  VersionsPanel  AutosaveIndicator  ConflictBanner
   │  ├─ receipt/         ReceiptView  SourceList  (also used by the narrow-width fallback)
   │  ├─ compare/         CompareView                       (optional milestone)
   │  ├─ import/          MermaidImportDialog  UnclassifiedList   (optional milestone)
   │  ├─ kb/              kb-reader-browser.ts  useKbRelease  version-check.ts
   │  ├─ auth/            SignInButton  useSession
   │  └─ a11y/            LiveRegion  announce.ts (batched)  focus-return.ts  useReducedMotion
   ├─ stores/
   │  ├─ design-document.store.ts            Zustand; ONLY commands write (via core/commands)
   │  ├─ ui.store.ts                         selection, drawer open, palette open, panel sizes
   │  └─ derived-results.store.ts            Layer 1 outputs + verdicts, keyed by inputs hash
   ├─ api-client/                            typed fetch client built on core/contract schemas;
   │                                          problem-details mapping; Idempotency-Key helper; 409 handling
   ├─ lib/                                   analytics port wrapper (no-op adapter), logger, perf marks, env
   ├─ ui/                                    shadcn components copied into the repo (owned code)
   ├─ styles/                                tokens.css (semantic state tokens), tailwind entry
   └─ test/                                  setup, render-counter utilities, graph fixtures
```

Names match the spec's component tree (4.5): `AppShell`, `ContextChips`, `PalettePanel`, `CanvasPanel`, `ComponentNode`, `GhostNode`, `DependencyEdge`, `CanvasControls`, `DecisionDrawer`, `CommandPalette`. `TimeSlider` and `NumbersStrip` are **not built**; `AppShell` reserves an empty bottom region with a clear "Phase 2" marker in dev builds only.

### 5.2 The canvas screen (spec 4.1; keep this layout)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Context chips: purpose · users · budget · deploy target · stack · team   │
├──────────────┬──────────────────────────────────────┬────────────────────┤
│ Typed palette│ Canvas (React Flow)                  │ Decision drawer    │
│              │                                      │ (selected comp.)   │
├──────────────┴──────────────────────────────────────┴────────────────────┤
│ [reserved region: numbers strip arrives in Phase 2]                      │
└──────────────────────────────────────────────────────────────────────────┘
```
Panels use react-resizable-panels; sizes persist in the UI store (and `localStorage` for UI preferences only, never design data).

### 5.3 State architecture (spec 4.6: one writer per store)

| Store | Holds | Only writer | Persistence |
|---|---|---|---|
| Design document | components, edges, context profile, `revision`, undo stack | user commands (`core/commands`) | working copy autosaved; versions are explicit snapshots; undo stack in memory only |
| UI | selection, drawer open/closed, palette open, panel sizes | UI events | none (panel sizes may use localStorage) |
| Derived results | Layer 1 findings, calc outputs, verdicts, each keyed by inputs hash | computation (browser for Layer 1, server for saved verdicts) | saved verdicts live on the server with their hash |
| Server state | designs list, versions, KB records, session | API responses | refetched; not persisted in the browser |

(The "debate stream" store is Phase 2; do not create it.)

**Rules.** Only commands change the design document. Derived results never write back. A verdict stores the hash of its inputs; if the hash no longer matches the design, the drawer shows the verdict as stale and recomputes. Selection never enters the design document.
**Server-state library:** Open question #13. Choose at build time (a small, popular, permissively licensed option; verify licence), record an ADR. Do not hand-roll caching if a vetted library fits.
**Store discipline review:** the `store-discipline-reviewer` subagent checks every PR for writes outside commands and for stores subscribing too broadly.

### 5.4 React Flow integration rules (spec 4.7; non-negotiable)
1. The canvas holds a **projection** of the design document via the adapter; it is not the document.
2. Node components are **memoized**; props limited to `id`, `type`, `label`, `status`, badge flags. **Verdict text never goes into node data.**
3. The drawer selects **only the selected component**. It must not subscribe to the whole graph.
4. Edges carry `mode` (sync/async). Styling and rules both read it.
5. Positions are stored in the design document but excluded from the inputs hash and every rule.
6. Use the library's built-in parts first (node toolbar, minimap, controls, panel, groups/sub-flows, keyboard handling). Custom code only where they fall short.
7. React Flow Pro examples/templates are **reference only unless bought** (Appendix B). Do not copy Pro code into the repo.
Also: `nodeTypes`/`edgeTypes` are module-level constants (stable references); handlers are stable (`useCallback`/refs); selection and drag state are not stored in the design document; use library selectors, not whole-store subscriptions.

### 5.5 Commands, undo, autosave, conflicts (spec 4.8)
- Every user change is a **command** `{ payload, apply, inverse }` defined as pure functions in `core/commands` (so the server can validate invariants after `apply`). **Compound commands** (one undo step): swap, paste, import, auto-layout, ghost acceptance, automatic wiring change, restore-version.
- Drag: coalesce into one `moveComponent` command at drag end. Typing in a label: coalesce per field edit (commit on blur or pause).
- Undo stack lives in memory and clears on reload. No third-party undo library (a short command stack is simpler to own; spec 4.8).
- **Autosave** after 1.5 s without a change (Default, `config/defaults/ui.json`), carrying `baseRevision`. Server increments `revision`. A stale `baseRevision` returns 409 and the client shows "This design changed in another tab. Reload?". Single writer per design in v1.
- **Save version** creates an immutable `DesignVersion` with an optional label.
- **Network loss:** no offline mode; edits stay in memory and the client retries the save with backoff; `AutosaveIndicator` shows saved / saving / retrying / conflict.

### 5.6 Interaction model (spec 4.3)

| Interaction | Behaviour | Rule |
|---|---|---|
| Drop or connect a component | Layer 1 runs in the browser within 200 ms; badges update; **no pop-up** | P6 |
| Select a component | Drawer shows verdict from the derived store (never computed in render) | derived store |
| Badge click | Opens drawer on that component | badges only when close/uncertain or a better fit exists |
| Ghost suggestion | Faded node for a blind spot; one click turns it into a decided node with the recommended option | wiring rules (Section 6.4) |
| Swap | Choose another option for the same component; **id stays**; edges stay where endpoints still exist; an edge whose required interface changed is **kept but marked "check this connection"**; one undo step | Section 7.3 |
| Review design | Layer 1 over the whole design; fills blind-spot view; Layer 2 loads on demand | |
| Time slider / second opinion | **Not in this phase** | |

**Layer 1 scheduling.** After each design change, schedule `analyzeDesign` 150 ms after the last edit (Default); target total under 200 ms on a 50-component design. Run on the main thread first. If measurements exceed budget, move it into a Web Worker (core is pure and portable); decide from spike/perf data and record an ADR.

**"Better fit exists" badge** (spec gap, Section 17): badge when the chosen option is eliminated, or ranks below the pick by at least `better_fit_margin` (Default = `theta_uncertain`, in `scoring.json`); a "close" badge when the chosen option is first but confidence is `close`; "uncertain" badge when confidence is `uncertain`. Badge reasons appear in tooltip and drawer text.

### 5.7 Visual language (spec 4.4; colour is never the only signal)

| Visual | Meaning | Non-colour cue |
|---|---|---|
| Solid border | Decided component with a chosen option | label shows the option name |
| Dashed border | Suggested (ghost), not yet accepted | label reads "suggested" |
| Hollow (no fill) | Undecided component | label reads "undecided" |
| Badge (small dot + icon) | Better fit exists, or verdict close/uncertain | tooltip and drawer give the reason |
| Accent ring | Component open in the drawer | focus outline also set |
| Warning marker on an edge | Connection needs checking after a swap, or sync chain over budget | text in edge label on hover and in drawer |

Define semantic tokens in `styles/tokens.css` (state colours, borders, spacing, radii, type scale, focus ring). Ship one light theme; tokens must make dark mode possible later (do not build it unless asked). Icons: lucide-react only; **no vendor logos** (Appendix B: legal review pending).

### 5.8 The decision drawer and receipt
Sections in order: recommended option (or "keep it simple for now" for a deferral/`pick: null`); confidence in words (clear/close/uncertain, never a percentage); **why** (each `fact` reason shows its source link and verified-on date; `judgement` reasons are labelled as judgement); alternatives with **why not** (curated text; eliminated vs outscored reason; per-dimension score breakdown available behind a disclosure); **flip conditions** (curated + computed, each citing its record); assumptions (defaults used for unknown chips, in plain language); reversal cost; blind spots for this component; **sources and dates** list; KB release and rules version; stale/expired notices ("price last verified on X; expired"); swap control; traits editor; wiring log (automatic changes made for this component); Explain panel.
The **receipt route** (`/receipt/:decisionId`) renders the same sections read-only for a stored decision, authenticated owner only (sharing links are Phase 3). This is also the fallback view under 1280 px.
Drawer: focus trapped while open, focus returns to the trigger on close, Escape closes, open in under 100 ms without re-rendering the canvas.
**Explain (Layer 2):** UI built in the vertical slice against a port; enabled for real in M9 once decisions are stored. Failed validation → curated template text, never the failed model text (spec G7). A "Second opinion" control is not rendered.

### 5.9 KB in the browser
The browser runs Layer 1 with the same `core` as the server, so it needs the KB. Serve the Phase 0 release bundle as a versioned static asset `/kb/<version>.json` (cache-friendly; version pointer from `GET /v1/kb/version`). Implement `KBReader` over the bundle in `features/kb`. Measure bundle size; if it hurts the initial-load budget, split per decision type (`/kb/<version>/<decision-type>.json`) and lazy-load by the decision types present in the design plus palette needs. Record the choice in an ADR. Fixture records are never served in production builds (Phase 0 test must still pass). Show the KB version and date in the UI (spec 9.3).

### 5.10 Start screen, context chips, adaptive interview (spec 4.2, 5.2, 6.10)
- **Start**: one text box plus the context chips, or "skip to a blank canvas". The text box captures the design name and a note; it is **not** sent to a model and does not drive the engine (see gap in Section 17; if the blueprint's Section 5 specifies otherwise, follow the blueprint and log).
- **Interview**: 6-8 tappable, skippable cards: purpose; users now and in 12 months; budget (+ monthly ceiling if the user gives a number); deploy target; existing stack (multi-select from KB options); team size and experience; must-haves (EU residency, max p95 latency, compliance id, required capability, avoid vendor). A skipped chip becomes `unknown`; verdicts then state the assumption they made. Any answer can open a follow-up (spec example: using a free database tier → ask which other free tiers they rely on, because limits interact). Follow-up rules are **data** in `core/interview` (pure state machine `nextQuestion(profile, answeredIds)`), versioned with `rulesVersion`.
- **Chips bar**: each chip shows its value or "unknown" and opens `ChipEditor`; editing a chip is a command. The typed `ContextProfile` (spec 5.2) is what the engine sees.
- **Archetype picker** (Mode A entry): a card list ("retrieval app", "agent app", "chat app with memory", "batch pipeline", other) chosen by the user.

### 5.11 Palette (spec 5.4, v1 proposed)
Entries: database, cache, queue, agent runtime, vector store, model provider (gateway or direct), embedding model, object storage, API, client, authentication, observability, custom. The blueprint's first six (database, cache, queue, agent runtime, vector store, custom box) stay the first six. `core/palette` is the static registry with `paletteVersion`, icon id, default traits, and the palette-type → decision-type mapping (one or more). Palette items are drag sources **and** keyboard-activatable (Enter adds at a default position; arrow-key nudging via a command). Custom component: `classification: 'unclassified'` until the user confirms.

### 5.12 Command palette and keyboard path (required, not optional; spec 4.3)
`Ctrl/Cmd+K` opens the palette (cmdk). Arrow keys move selection; Enter opens the drawer; Escape closes it; `Ctrl/Cmd+Z` / `Shift+Ctrl/Cmd+Z` undo and redo. Keys are configurable (tinykeys or the library's keyboard handling as the base). Palette commands: add component by type; jump to component; open drawer; review design; save version; undo/redo; fit view; toggle minimap; go to Start; sign out. **The keyboard-only path must be able to create a node, connect it, open the drawer and swap an option** (e2e-tested).

### 5.13 Accessibility (WCAG 2.2 AA target)
Focus trap in drawer and command palette; focus returns to trigger; verdict changes announced in a polite live region, **batched** so fast edits don't flood a screen reader (`a11y/announce.ts`); `prefers-reduced-motion` respected (motion library calls guarded); every state has a text label or icon; minimum target sizes; visible focus ring; no keyboard traps in the canvas; Escape always exits a mode. English only; currency as the KB record gives, **never converted**.

### 5.14 Performance budgets (spec 4.12)
Frame time during pan/zoom with 50 nodes within one 16 ms frame (target; verify in spike); drawer open under 100 ms; Layer 1 after an edit under 200 ms (checks start 150 ms after the last edit); initial JS for the canvas route: set **after the spike** from a measured baseline (Open #21) and committed to `config/defaults/ui.json`, then enforced in CI as a budget. Route-level code splitting: the canvas route is lazy; `lab/spike` excluded from production.

### 5.15 Frontend dependencies (all Recommendation; verify licence and version from the registry; register each)
`@xyflow/react` (12.x), `@dagrejs/dagre`, `zustand` (5), `cmdk`, `sonner`, `motion`, `react-resizable-panels`, `tinykeys`, `lucide-react`, `radix-ui` + shadcn components (copied source), Tailwind 4, React Flow UI components (copied into repo; MIT per site footer, verify), `@statelyai/graph` + `mermaid` (only for the optional import milestone), a server-state library (Open #13). Test-only candidates: Playwright (already present), an accessibility rule engine such as axe-core (verify licence; dev-only; record the obligation), a React render-counting approach via React's `Profiler`. **React Flow attribution:** the MIT build renders an attribution. Do not hide it. Whether to buy one month of Pro to remove it is the founder's decision (Section 16); also pending: a one-line email to xyflow about the undefined "directly competes" clause in the Pro licence (Open #19).

---

## 6. Core extensions (`packages/core`; pure, shared by browser and server)

### 6.1 `commands/`
`Command = { id, kind, payload, apply(graph, ctx): {graph, ctx}, inverse(...) }`. Kinds: `addComponent`, `removeComponent`, `renameComponent`, `setTraits`, `moveComponent`, `connect`, `disconnect`, `setEdgeMode`, `setEdgeFields`, `setContext` (chip edits), `swapOption`, `acceptGhost`, `applyDraft` (Mode A), `autoLayout`, `importGraph`, `restoreVersion`, plus a `compound([...])` constructor. After `apply`, invariants I1-I8 are re-checked; a violating command is rejected (never silently fixed). Property tests: `inverse(apply(x)) = x` for every kind on generated graphs; compound inverses reverse in order; positions never affect the hash.

### 6.2 `swapOption` semantics (spec 4.3)
Id stays; `choice` replaced; for each edge touching the component: keep it if its endpoints still exist; compare the old and new option's `interfaces` (Section 7.2); if the required interface set changed, keep the edge and set `note` flag `check_connection: true` (stored in the edge, excluded from the hash? **No: it is semantic; include it**). Returns the compound command; the drawer lists "connections to check".

### 6.3 `inference/`
`onRequestPath`: reachable from a `client` component along sync edges (user-declared trait overrides inference). `isPublicApi`: an `API` component with an incoming edge from a `client` component. No schema change needed.

### 6.4 `wiring/` (spec 6.10; each rule is one undo step and is listed in the drawer)
A suggested cache or queue for an existing edge is inserted between the edge's endpoints and the original edge is replaced by two edges. A suggested component with no existing edge attaches to the component it relates to via a new **sync** edge by default. Pure function `planGhostAcceptance(graph, ghost) → Command`.

### 6.5 `blindspots/` (spec 6.8) and rules
Blind spots are checks on design shape, each linking to the decision that addresses it; each is a **versioned rule**. Existing: R-02 no fallback model, R-05 no cache on read-heavy path, R-08 sync call without failure handling, R-10 long-running work on a sync path. **New rules to add (IDs are a Recommendation; log in spec-change proposals):** R-12 no observability component; R-13 data store without a recorded backup/recovery decision; R-14 public API without an authentication component. Also implement **R-11 embedding dimension mismatch** (severity `block`). Each new rule: ≥ 2 fixtures (fires/doesn't fire), missing-data behaviour = `unknown` finding. `config/defaults/blindspots.json` holds thresholds. The blind-spot panel is a quiet checklist (never a pop-up), each item with a "Add" action that creates a ghost.

### 6.6 `analysis/analyzeDesign`
`analyzeDesign(graph, ctx, kb, clock, config) → { findings, blindSpots, componentResults: Record<componentId, Outcome>, calc: {costPerRequest?, latency?, breakpoints?}, badges, inputsHashByComponent, versions }`. Pure, deterministic, byte-identical in Node and browser (parity-tested). The numbers strip UI is Phase 2, but its data is computed here because rules R-06 and R-07 consume it.

### 6.7 `badges/`, `interview/`, `archetypes/`, `palette/`, `contract/`
Badge derivation (Section 5.6). Interview state machine (Section 5.10). Archetype draft assembly (Mode A, Section 7.4). Palette registry (Section 5.11). `contract/`: Zod schemas for every request/response in Section 8.3, used by the API for validation and by the web client for types, plus **contract snapshot tests**.

### 6.8 Config additions
`config/defaults/ui.json`: `autosave_ms 1500`, `layer1_debounce_ms 150`, `layer1_target_ms 200`, `drawer_open_target_ms 100`, `min_canvas_width_px 1280`, `initial_js_budget_kb null` (set after spike; build fails the budget check while null in CI? **No**: warn until set, then enforce).
`config/defaults/limits.json`: `max_components 200`, `max_label_chars 80`, `max_working_copy_bytes null` (founder/ADR sets from measured sizes), `explain_daily_per_user null` (null → Explain disabled; founder sets), `export_*` not used.
`config/defaults/blindspots.json`: thresholds per rule.
`scoring.json`: add `better_fit_margin` (Default: equals `theta_uncertain`).
All carry `_status` and `_source`.

---

## 7. Knowledge base in Phase 1

### 7.1 Decision-type expansion (about 15; Open question #7 → founder decides; Recommendation list)
Phase 0 delivered five (proposed: vector-store, database, cache, queue, model-access). Phase 1 adds about ten. **Proposed set (Recommendation; founder confirms):** embedding-model, agent-runtime (orchestration), object-storage, authentication, observability, hosting-platform (deploy target), and four more the founder chooses (suggestions: rate-limiting, secrets-management, document-ingestion/parsing, guardrails/moderation). Track in `docs/05-phases/phase-1/decision-type-tracker.md`: id, status (not started / structure done / records proposed / records promoted / shipped), curation hours spent (H4 data), owner.

### 7.2 KB schema extension (spec-change proposal; expand-only)
Add `interfaces` to the option body: `provides: InterfaceId[]`, `requires: InterfaceId[]` (typed ids from a curated list per decision-type family; no free text). Needed for swap's "check this connection". Add a regenerated JSON Schema; existing records remain valid (field optional; missing → swap marks connections `unknown`, never "ok", per P9). Add the curated **interface vocabulary** under `kb/` (e.g. `kb/interfaces.yaml`; structure only; no vendor facts invented).

### 7.3 The per-type content-first loop (Definition of Ready / Done)
For each decision type, in order, and **not shipped until its records pass release checks** (spec 16.3 step 6):
1. **Structure (you):** `decision-types/<id>.yaml` (applicability, required chips, rules list, deferral option, palette mapping), option stubs, `interfaces`, elimination rules, scoring inputs needed.
2. **Proposals (you, via `tools/kb-propose`):** fetch each vendor's *own* page, save the snapshot, draft records with exact quote, URL, retrieval date; `status: proposed`, `verified_by: null`.
3. **Review (founder):** checks quotes against live pages, promotes to `kb/records/`, sets `verified_by`, `last_verified`, `valid_until`. Log hours in the curation CSV.
4. **Rules and fixtures (you):** type-specific rule list, golden design, expected verdicts.
5. **Ship:** `kb:check` green (schema, placeholders, quote in snapshot, no expired launch records, citations resolve), receipt renders with sources and dates for the type, e2e covers at least one component of the type.
You never write directly into `kb/records/` and never write real prices, limits or capabilities from memory.

### 7.4 Archetypes (Mode A; spec 6.10; location is a spec gap)
`kb/archetypes/<id>.yaml`: `id`, `title`, `components` (palette types and decision types it usually needs, with default sync/async edges and default traits), `required_chips`. Structure only; no prices, limits or product claims. Draft assembly (pure, in `core/archetypes`): interview answers → archetype → for each component run Stages 1-6 for its decision type → place components with a reason (the verdict's why line) → deterministic edges → user accepts, edits or discards (`applyDraft` compound command; **hand edits keep guidance**). Dagre lays out the result in the web app (left to right), never the server. **No LLM emits the graph in this phase** (spec 6.10 is deterministic; the research report's "LLM emits typed JSON" variant conflicts, see Section 17).

### 7.5 KB delivery to the database and the active-release pointer
Decisions reference `kb_releases(version)`, so releases must exist in Postgres. If Phase 0 did not implement DB import, implement it now (worker job `kb.import`, Section 10; also callable as a CLI). Add `kb_active` (single active release pointer with history), so the runbook "roll back the release pointer" is real; `KB_RELEASE_PIN` may override for debugging. Readiness requires an active release.

---

## 8. Backend (`apps/api`; Hono on Node; long-running container assumption)

### 8.1 Target structure

```text
apps/api/src/
├─ main.ts                     process entry (env validation → app → listen; graceful shutdown)
├─ app.ts                      Hono app factory (used by tests)
├─ config/env.ts               Zod-validated env; missing required var stops the process
├─ middleware/
│  ├─ request-id.ts  logger.ts  error-handler.ts (problem-details)  security-headers.ts (CSP etc.)
│  ├─ session.ts  csrf.ts  rate-limit.ts (rate classes)  idempotency.ts  body-limit.ts
├─ modules/
│  ├─ auth/        Better Auth mount, GitHub provider, session helpers
│  ├─ me/          GET /v1/me
│  ├─ designs/     routes, service, authorization (ownership), schemas
│  ├─ versions/    save/list/get immutable versions
│  ├─ decisions/   run stages server-side, store, parity check
│  ├─ explain/     Layer 2 service, per-user daily cap, cache by inputs hash
│  ├─ kb/          read endpoints (Phase 0) + bundle pointer
│  ├─ analyze/ verdict/ waitlist/ phase0/ health/      (Phase 0, kept)
├─ adapters/       wiring for ports: clock, uuidv7 id generator, no-op mailer/object store/analytics/tracer
└─ test/           app-level helpers, seeded users, cross-account matrix
```
Layering unchanged: **routes → services → core (pure) → ports → adapters.** Routes never touch the database directly. Authorization on the object is in the **service layer**, not only the route, so every entry point has it.

### 8.2 Request lifecycle (spec 9.2)
Request id (header + logs) → session from HTTP-only cookie (anonymous only for public calculator/pages) → Zod validation (400 problem-details) → object authorization (service layer) → service → stable response shape; errors in problem-details format. Structured JSON logs (request id, route, status, duration, pseudonymous user id; **no bodies**).

### 8.3 Endpoint catalogue added in Phase 1 (all under `/v1`; session cookie unless noted)

| Method and path | Purpose | Notes |
|---|---|---|
| `GET /me` | Current user, plan (`free`; static in Phase 1), credit balance (`null`; credits are Phase 2) | |
| `GET /designs` | List designs | cursor pagination; excludes soft-deleted |
| `POST /designs` | Create a design | `Idempotency-Key` header required |
| `GET /designs/{id}` | Working copy and `revision` | |
| `PATCH /designs/{id}` | Autosave working copy | requires `baseRevision`; conditional update; **409** on conflict; server revalidates schema + invariants I1-I8 + size limits |
| `DELETE /designs/{id}` | Soft delete | purged after 30 days (Default; `design.purge` job) |
| `POST /designs/{id}/versions` | Save immutable version | optional label; triggers server-side decision computation (below) |
| `GET /designs/{id}/versions` | List versions | |
| `GET /designs/{id}/versions/{versionId}` | One version | |
| `POST /designs/{id}/decisions` | Run Stages 1-6 for one or more components; store decisions | returns verdict / `needs_context` / `kb_gap` |
| `GET /decisions/{id}` | One stored decision | |
| `POST /decisions/{id}/explain` | Layer 2 explanation | metered via `usage_events`; cached by inputs hash; disabled when `explain_daily_per_user` is null; interim per-user daily cap (no credits yet) |
| `/api/auth/*` | Better Auth routes | strict rate class |

Phase 0 endpoints remain (`/kb/*`, `/analyze`, `/verdict`, `/waitlist`, `/events`, `/phase0/*`, health). `/analyze` is now also used for server-side parity checks.
**When decisions are stored (spec gap):** the client computes Layer 1 live; on **Save version** the server recomputes Stages 1-6 for every decided component and stores `decisions` rows linked to `design_version_id` with `kb_record_ids`, versions and `produced_by = 'rules'`. If the server's verdict hash differs from the client's, log a parity event and trust the server. `produced_by = 'small_model'` is used only for stored Layer 2 explanations. `kb_record_ids` is populated so Phase 2 alerts can match changed records (GIN index).

### 8.4 Cross-cutting API rules
- **Auth:** Better Auth (MIT), GitHub sign-in first (founder supplies the OAuth app credentials). Email sign-in is an Assumption pending the founder's choice. Sessions: HTTP-only, secure cookies, `SameSite=Lax`, rotation on sign-in, expiry from config.
- **CSRF** on every state-changing route (library token or origin checks).
- **Rate classes:** auth (strict), write (moderate), read (generous). Extend the Phase 0 in-house limiter to classes and per-IP/per-user keys; it remains single-instance only (note in an ADR; revisit before horizontal scaling). Use Better Auth's rate limiting for `/api/auth/*`.
- **Idempotency:** `idempotency_keys` table (user, key, request hash, stored response, expiry); same key + same request replays the response; same key + different request → 422.
- **Roles:** single owner in v1. Every design/version/decision is checked against its owner in the service layer.
- **Security headers:** CSP (scripts from own origin only, no inline handlers), `X-Content-Type-Options`, frame protections, referrer policy; CORS locked to the app origin.
- **Untrusted text:** labels/notes length-limited; passed to any model only as labelled data blocks; secret redaction and R-09 apply before any Layer 2 call.
- **Account deletion** cascade (implement and test now because designs hold user content): deletes designs, versions, decisions, alerts (none yet), sessions, accounts; anonymises `usage_events` per retention; document external deletions (analytics, email) in `docs/06-runbooks/deletion-request.md`. `GET /v1/me/export` is Phase 2.

---

## 9. Database (`packages/db`; Drizzle; forward-only migrations)

Conventions unchanged (UUIDv7 from the app, `timestamptz` UTC, micro-USD `bigint`, snake_case plural tables, JSONB validated on write, expand-and-contract; an applied migration is never edited).

Migrations for Phase 1, in this order (each separate, each reversible by a *new* migration only):
1. **Auth tables** generated for Better Auth (`user`, `session`, `account`, `verification`, plus any plugin tables used). Review the generated schema; do not hand-edit tables the library owns.
2. **`designs`**, **`design_versions`** (immutable: no update path; add a test that proves no code path updates a version), **`decisions`** (GIN index on `kb_record_ids`), exactly per spec 10.3.
3. **Contract step for Phase 0 adaptations:** add the foreign keys that Phase 0 left off (`usage_events.user_id → "user"(id)`, `debates.user_id → "user"(id)`), after back-filling or nulling any Phase 0 test rows; keep `user_id` nullable where Phase 0 data (rater/waitlist era) still needs it. Document the expand→backfill→switch→contract steps in the ADR.
4. **`idempotency_keys`** and **`kb_active`** (spec gaps; Recommendation).
5. Indexes per spec 10.3: `designs_owner_updated_idx`, `design_versions_design_idx`, `decisions_component_idx`, `decisions_records_idx`.
Soft-deleted designs: `deleted_at`; purge job after 30 days. Retention table (`docs/03-specs/privacy-inventory.md`) updated.
Integration tests on real Postgres: migrations apply from empty and from the Phase 0 state; conditional update returns zero rows on stale revision; version immutability; ownership scoping in every repo query; GIN query for "decisions citing record X"; cascade delete leaves no orphans.

---

## 10. Worker (`apps/worker`; same image as the API, different entry point)

### 10.1 Structure

```text
apps/worker/src/
├─ main.ts                  boots pg-boss on DATABASE_DIRECT_URL; registers jobs and schedules; graceful shutdown
├─ jobs/
│  ├─ kb-import.job.ts      loads dist/kb/<version>.json into kb_releases/kb_records; sets kb_active
│  ├─ expiry-sweep.job.ts   daily; lists due/expired records; writes nothing but a report/log (no data changes)
│  ├─ cache-purge.job.ts    weekly; removes verdict_cache entries per the retention rule
│  └─ design-purge.job.ts   daily; hard-deletes designs soft-deleted more than 30 days ago
└─ lib/                     job helpers: idempotency keys, timeouts, structured logging
```
Job settings (spec 9.4; Defaults): `kb.import` concurrency 1, retries 3, timeout 5 min, idempotency key = release version; `expiry.sweep` daily, 1 / 3 / 5 min, key = date; `cache.purge` weekly, 1 / 0 / 5 min, key = week; `design.purge` (new; same shape as `expiry.sweep`, key = date). Debate, export, alert, billing and latency jobs are **Phase 2+** and exist only as a README list.
pg-boss (MIT; verify version and licence) needs the **direct** (non-pooled) connection. Handlers get an `AbortSignal`; honour it.

### 10.2 KB operations (reduced scope; spec vs research-report conflict, Section 17)
Required: `kb.import`, `expiry.sweep`. **Optional, ask the founder first:** changedetection.io (self-hosted, Apache-2.0) webhook → `kb.candidate.check` that only creates a *proposal*, never a publish, with the Phase 0 quote-verification validator. Enable only if Phase 0's curation hours show manual freshness checking will not scale to ~15 types.

---

## 11. Analytics and observability (ports only)
Define the `Analytics` port events (taxonomy in `docs/03-specs/analytics-taxonomy.md`): `design_created`, `interview_completed`, `interview_skipped`, `component_added`, `first_verdict`, `drawer_opened`, `swap_done`, `ghost_accepted`, `blind_spot_item_added`, `version_saved`, `explain_requested`, `autosave_conflict`. No design content, labels or free text in events. Ship a no-op and a console adapter; the PostHog EU adapter is Phase 2 (research report). Observability: structured JSON logs with request id; client perf marks (`layer1_ms`, `drawer_open_ms`) logged in dev and sent as events (numbers only) in production. Tracing service region is Open #16; keep the `Tracer` port no-op until decided.

---

## 12. Testing matrix (new and extended; all block release unless noted)

| Layer | What |
|---|---|
| Unit (core) | every command and its inverse; swap semantics incl. interface changes and unknown interfaces; wiring rules; inference; blind-spot rules R-02/05/08/10/11/12/13/14 with fixtures; badge derivation; interview state machine incl. follow-ups and skip; archetype assembly; `analyzeDesign` golden outputs |
| Property | `inverse(apply(c)) = c`; compound undo order; positions never change hash; adding a sync hop never lowers latency (extended to designs from commands); interview always terminates |
| Golden | 15-20 reference designs (Phase 0 set extended) with expected findings, confidence, number ranges; one design per launch decision type |
| Parity | Node vs browser, byte-identical, extended to commands, wiring, `analyzeDesign`, interview |
| KB | schema incl. `interfaces`, archetypes; placeholders; quotes in snapshots; expiry; citation resolution; per-type release gate |
| Component (web) | render-counter tests: opening the drawer does **not** re-render `CanvasPanel`; selecting a node re-renders only that node; typing in a label does not re-render unrelated nodes; node props limited to the allowed set |
| Integration (API + Postgres) | migrations from empty and from Phase 0 state; autosave 409; idempotency replay and mismatch; version immutability; decisions stored with `kb_record_ids`; account deletion cascade; parity-mismatch logging |
| Security | **cross-account access attempts on every endpoint** (add a meta-test that enumerates registered routes and fails if a non-public route lacks an ownership test); CSRF; cookie flags; rate-limit tests; injection suite on Layer 2 (hidden instructions in labels/notes; pick outside candidate set; markup that could leak) |
| Contract | API schema snapshots from `core/contract` |
| End-to-end (Playwright, headless; **new and blocking**) | Mode A draft (interview → archetype → draft → accept/edit/discard); Mode B (drop → badge → click → drawer); drawer content (sources and dates); swap and single-step undo; ghost acceptance and wiring log; keyboard-only path (create, connect, open drawer, swap); autosave and 409 banner; save version; narrow-width fallback shows the receipt; sign-in with a seeded session |
| Accessibility | automated checks on each route in CI (blocks) + a keyboard-only script per main flow (run each release); live-region batching test |
| Performance | `tools/perf`: 50-node and 200-node synthetic graphs; pan/zoom frame times, Layer 1 time, drawer open time; baselines committed to `docs/07-validation/phase-1/perf-baselines/`; informational until the post-spike budgets are set, **then blocking** |
| Smoke (staging) | health, sign-in, design round trip, version save, receipt render |

Definition of done per feature (spec 15.2): tests pass; analytics events and log fields defined; spec/docs updated with a proposal entry; new dependencies in the register; keyboard and screen-reader behaviour checked for new interactive elements; features that cost money sit behind a flag (Explain is flagged by `explain_daily_per_user`).

---

## 13. CI/CD, staging, hosting probe

### 13.1 CI stages (extend Phase 0's)
Install → typecheck/lint/boundaries (incl. feature-import rule) → unit → property + golden → parity → KB checks → integration (Postgres service container) → **component render-counter tests** → **end-to-end (Playwright)** → **accessibility checks** → security + licence → docs check → build (with bundle-size report) → *(after hosting is chosen)* deploy to staging (image built once and promoted; **migrations run first**) → smoke → production promotion (manual founder approval).

### 13.2 Image and environments
`infra/Dockerfile`: one image, two entry points (`api`, `worker`). Env names for this phase (values never in the repo): `APP_ENV, APP_BASE_URL, DATABASE_URL, DATABASE_DIRECT_URL, AUTH_SECRET, AUTH_BASE_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, LLM_GATEWAY, LLM_GATEWAY_KEY, MODEL_ROSTER_FILE, KB_RELEASE_PIN (optional)`. Staging uses real provider keys with spend caps and synthetic designs only; local uses the fake client. Graceful shutdown: stop accepting work, finish or hand off in-flight jobs, drain window 30 s (Default). Forward-only migrations; rollback redeploys the previous image.

### 13.3 Hosting probe (prerequisite for Phase 2; ADR-029 is Open → ask the founder)
Hosting is a founder decision (candidates in the spec: Railway Amsterdam, Render Frankfurt; serverless functions are unsuitable for streamed debates). Phase 1 stays hosting-agnostic. Build `tools/hosting-probe/` so the founder can run spec 14.1's one-week test on both candidates: an SSE stream with keepalives; a `LISTEN` connection through the host's direct database string; a forced disconnect and resume with `Last-Event-ID`; a 15-minute stream. Output a pass/fail report to `docs/02-research/infrastructure-and-hosting/`. Do not build debate streaming itself.

---

## 14. Documentation and agent-configuration updates (do these in P1-M0 and keep current)
- `CLAUDE.md`: current phase = 1; add the Section 1.3 out-of-scope list; add the five React Flow rules in one line each; "only commands write the design document"; "positions never affect semantics"; "derived results never write back"; link to `docs/03-specs/canvas-interaction-model.md`. Keep it under 200 lines; move detail to `.claude/rules/`.
- Nested `CLAUDE.md`: `apps/web/src/features/canvas/`, `…/drawer/`, `apps/api/src/modules/`, `packages/core/src/commands/` (10-15 lines each).
- New `.claude/rules/` files listed in Section 4; new commands, subagents and skills listed in Section 4 (match current Claude Code file schemas by checking the official docs first; do not rely on memory).
- Living specs under `docs/03-specs/` (`canvas-interaction-model.md`, `frontend-architecture.md`, `kb-content-guide.md`, generated `api-reference.md`). Every new doc has frontmatter; run `pnpm docs:check` and `pnpm docs:index`.
- ADRs: at minimum server-state library; Layer 1 on main thread vs Web Worker; KB bundle delivery (single vs split); structural-component handling; badge thresholds; idempotency and `kb_active` tables; limiter strategy; test/a11y tooling; the spike result.

---

## 15. Milestones and acceptance criteria (execute in order)

**P1-M0: Preflight and reconcile**
Gate check and `gate-decision.md`; read Phase 0 outputs (Section 2.2); save this brief to `docs/05-phases/phase-1/brief.md`; write `plan.md`; update CLAUDE.md and `.claude/` files; create Phase 1 docs folders; post blocking questions (Section 16).
*Accept:* gate recorded; `conflicts.md` lists every Phase 0 divergence found; docs check passes.

**P1-M1: Week-one canvas spike** (`routes/lab/spike.tsx`, dev-only)
Build against the real adapter/store architecture if feasible; otherwise throw the spike code away after the report.
*Exit criteria (all five; spec 4.7):* (1) **50 memoized custom nodes** render and pan smoothly on a current laptop; (2) **opening the drawer does not re-render the canvas** (React Profiler/render-counter evidence); (3) **a swap is one undo step**; (4) **dagre lays out 3-4 real AI architectures left to right without overlaps** (use Phase 0 golden designs); (5) the **keyboard-only path** can create a node and open the drawer.
*Deliverable:* `docs/05-phases/phase-1/spike-report.md`: method, hardware, measured frame times and Layer 1/drawer timings, profiler evidence, PASS/FAIL per criterion, initial JS baseline, recommendation.
*If any criterion fails:* STOP. Report to the founder. The canvas library is reconsidered (alternatives and licences are in the research report and licence register: Excalidraw MIT, AntV X6, Rete, maxGraph; tldraw/GoJS/JointJS are paid). Do not continue to M2 without a founder decision.
*Accept:* all five PASS with evidence; initial JS budget proposed; ADR written.

**P1-M2: Shell, design-document foundation, core commands**
`AppShell`, regions, tokens, UI kit (shadcn copied), router, providers, the three stores, `core/commands` with property tests, `core/palette`, `core/inference`, adapter (`graph-to-flow`, `flow-events-to-commands`), `analyzeDesign` skeleton, KB provider (browser), API client skeleton, live region, width gate. Design-document store is **persistence-ready** (serialisable, `revision`) so M9 is wiring, not refactor.
*Accept:* command/inverse property tests pass; render-counter tests pass; boundaries and feature-import rules enforced; width gate shows the receipt fallback under 1280 px.

**P1-M3: Vertical slice, one decision type end to end**
Use `vector-store` (its Phase 0 records exist, or fixtures if founder promotion is pending). Typed node → Layer 1 in the browser → derived store → drawer verdict with sources, dates, flip conditions, why-not → stale handling on edit → swap as one undo step → KB version display → receipt component (route wired in M9). Explain panel built against a port.
*Accept:* e2e: add vector-store component, open drawer, see sourced reasons with dates, swap, undo once and see the original restored; drawer open < 100 ms and no canvas re-render; Layer 1 < 200 ms on a 50-component design; parity green; spec 5.5 rules enforced (fact reasons cite records).

**P1-M4: Context chips and adaptive interview**
Chips bar + editors; interview state machine and UI; skip → `unknown` with stated assumptions; follow-up example from the spec implemented as data.
*Accept:* unit + e2e: complete, skip all, skip partially; verdicts list the assumptions; chip edit is one undo step; interview always terminates (property test).

**P1-M5: Typed palette, Mode B badges, ghosts, wiring, command palette, keyboard**
Palette registry UI (drag + keyboard); `FindingBadge` and badge derivation; ghost suggestions and acceptance with wiring rules; wiring log in drawer; command palette; undo/redo for all commands; live-region announcements batched.
*Accept:* e2e Mode B flow; keyboard-only script (create, connect, open drawer, swap); every automatic wiring change is one undo step; badges only for close/uncertain/better-fit; no pop-ups during drag.

**P1-M6: Blind-spot view and remaining rules; traits and edge editing**
R-08, R-10, R-11, R-12, R-13, R-14 with fixtures; blind-spot panel (quiet checklist with "Add" → ghost); traits editor; edge editor (mode, timeout, retries).
*Accept:* every blind spot in spec 6.8 is covered by a versioned rule with fixtures; missing data yields `unknown`; golden designs updated; a11y automated checks pass on the panel.

**P1-M7: Decision-type expansion loop (about 15 types)**
Run the Section 7.3 loop per type; update `decision-type-tracker.md` after each; sync with the founder after each type for record promotion.
*Accept (per type, and at phase exit for all launch types):* `kb:check` green; receipt renders with sources and verified-on dates; golden design + e2e cover it; hours logged. If the founder's time cannot support ~15 types, STOP AND ASK about reducing the launch count (spec risk mitigation: few decision types at launch).

**P1-M8: Mode A, and optional Mermaid import / Compare**
Archetypes, `applyDraft`, draft review UI, dagre layout in the web app. *Optional (ask; both placements are Recommendation):* Mermaid flowchart import via `@statelyai/graph` + `mermaid` (classification on import: label matches a palette type → typed; otherwise `custom` + `unclassified`; the dialog lists what it could not interpret; **resolve Open #15** by testing whether the architecture diagram type parses and recording the result); Compare view (2-3 options side by side from verdicts and calculator outputs only).
*Accept:* e2e Mode A: interview → draft with a reason per component → accept/edit/discard; hand edits keep guidance; import (if built) never guesses silently.

**P1-M9: Accounts, persistence, saved decisions, Explain**
Better Auth + GitHub sign-in; designs CRUD; autosave with `baseRevision`/409 banner; idempotency; versions; server-side decision computation on Save version with parity logging; receipts route (`/receipt/:decisionId`); `GET /me`; Explain endpoint with interim cap and exact-hash cache; account deletion cascade; migrations in Section 9; rate classes; CSRF; security headers.
*Accept:* integration + security suites green (cross-account matrix covers every route, enforced by the meta-test); e2e: sign in → draw → autosave → reload → restored; conflict banner on stale revision; Save version → receipts render from stored decisions; Explain disabled when cap is null, validated and cached when enabled (fake client in CI).

**P1-M10: Worker and KB operations**
pg-boss worker; `kb.import`, `expiry.sweep`, `cache.purge`, `design.purge`; `kb_active` pointer; runbook "broken KB release" tested end to end (roll back the pointer); optional changedetection proposal hook only if approved.
*Accept:* integration tests for job idempotency and abort-signal handling; readiness fails without an active release; rollback restores the previous release in a test.

**P1-M11: Hardening: accessibility, performance, privacy**
Keyboard-only scripts for every main flow; automated a11y on all routes; focus return and trap verified; reduced-motion verified; set and enforce the **initial JS budget** from the spike baseline; perf baselines committed; privacy inventory and deletion runbook updated; security review (CSP, cookies, injection suite on Layer 2).
*Accept:* all blocking checks green; perf thresholds enforced; reports in `docs/07-validation/phase-1/`.

**P1-M12: Staging deployment and hosting probe** (needs the founder's ADR-029 decision; STOP AND ASK if undecided)
Dockerfile, deploy stages, smoke test; `tools/hosting-probe`.
*Accept:* staging serves the app with real GitHub OAuth callback; smoke green; probe report produced on at least one candidate host if the founder runs it.

**P1-M13: Handoff and Phase 2 readiness**
Final `status.md`; spec-change proposals consolidated; ADRs complete; living specs generated; list of Open items blocking Phase 2 (hosting, gateway, billing provider/founder location, MCP SDK, retention periods, load-test targets, tracing region); notices regenerated.
*Accept:* full `pnpm ci` green; founder checklist delivered (how to run locally, what the founder must supply, which decision types are shipped, what Phase 2 starts with).

---

## 16. Questions for the founder (post at the start; do not guess)

**BLOCKING**
1. **Gate result or written override** (Section 2.1).
2. **Which ~15 decision types**, in what order? (Proposed in Section 7.1.) Given H4 curation hours from Phase 0, is ~15 realistic, or reduce the launch count? Needed before M7.
3. **GitHub OAuth app** created and credentials supplied; is email sign-in wanted? (Assumption: GitHub only.) Needed before M9.
4. **Hosting and database provider** (ADR-029: Railway Amsterdam vs Render Frankfurt; run the hosting probe?). Needed before M12 only.

**NON-BLOCKING (use the default and log it)**
5. **React Flow attribution:** keep the MIT attribution visible (default) or buy one month of Pro? Send the one-line "directly competes" clarification email to xyflow? (Open #19.)
6. Server-state library (default: choose at build time and record an ADR).
7. Explain daily cap per user (default: `null`, feature disabled until set).
8. Structural components (client, API, custom): confirm handling (Section 17, gap 1).
9. Include the optional Mermaid import and Compare view? (default: skip unless time remains after M7.)
10. Enable the changedetection.io proposal hook? (default: no.)
11. Light theme only (default) or plan dark mode later?
12. Product name (default: working name; packages stay `@product/*`).

---

## 17. Known gaps and conflicts to log, not silently resolve
Record each in `conflicts.md` / `spec-change-proposals.md` with your chosen handling (Recommendation unless the founder says otherwise):

1. **Structural components.** Spec 5.4 invariant I3 says a decided component has a `choice`, but `client` (and possibly `API`, `custom`) have no decision type. *Handling:* mark palette entries `structural: true` (client; API maps to the `hosting-platform` decision type if the founder agrees); structural nodes may be `decided` with `choice: null`; render them with a solid thin border and the label "no decision needed". Needs a spec change to I3.
2. **Swap and "required interface."** The spec's option body has no interface field. *Handling:* the optional `interfaces` field in Section 7.2; missing → `unknown`, never "ok".
3. **"Better fit exists" threshold** is undefined. *Handling:* Section 5.6, Default = `theta_uncertain`.
4. **Blind-spot rule IDs.** Spec 6.8 lists observability, backup, and public-API-auth blind spots without IDs. *Handling:* R-12, R-13, R-14.
5. **Archetype storage** is unspecified. *Handling:* `kb/archetypes/` as curated structure (no prices/limits/claims).
6. **New tables/jobs not in the spec's lists:** `idempotency_keys`, `kb_active`, `design.purge`.
7. **Research report vs spec.** The report's Phase 1 row lists pg-boss, changedetection.io and a KB pipeline with human approval, and an LLM-emits-JSON "design it for me". The **spec governs**: Mode A is deterministic (archetypes); the worker is reduced to KB import and sweeps; changedetection is optional.
8. **Phase placement** of the Compare screen and Mermaid import is unspecified (spec 4.2/4.10 describe them; Open #15 is "needed by Phase 1"). *Handling:* optional late milestone (M8), ask the founder.
9. **When decisions are stored** is unspecified. *Handling:* on Save version, server-recomputed (Section 8.3).
10. **Layer 2 metering before credits.** Spec says metered; credits are Phase 2. *Handling:* every call writes `usage_events`; interim per-user daily cap from config; disabled when null.
11. **Start screen text box** purpose is unspecified in the spec. *Handling:* name + note only; check the blueprint's Section 5 first.
12. **Restore version** behaviour is unspecified. *Handling:* open a version read-only; "Restore as working copy" is one compound, undoable command.
13. **KB delivery to the browser** is unspecified. *Handling:* Section 5.9.

---

## 18. Final reminders
- The spike gates everything. If it fails, stop and report.
- The canvas is a view; the design document is the truth; only commands write it; positions never matter.
- The drawer reads the derived store for the selected component only; opening it never re-renders the canvas.
- Quiet guidance: badges and small notices, never pop-ups mid-drag.
- Facts come from `kb/` records with source, quote, verified date and expiry. Missing or stale data makes a verdict `uncertain`; it never quietly removes an option.
- Debate, credits, exports, alerts, MCP, numbers strip and slider are Phase 2. Do not build them.
- Update `status.md` before you stop. Leave the repo green.