// Golden tests for the six-stage pipeline on the FAKE fixture KB (kb/fixtures). Expected scores were worked out by hand
// from config/defaults/scoring.json before the code was run; the arithmetic is in the comments.
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../normalise/canonical-json';
import { createBundleReader } from '../kb-bundle/reader';
import type { KBReader } from '../ports';
import { emptyUsageInputs, type UsageInputs } from '../schemas/usage';
import { CLOCK_EXPIRED, CLOCK_FRESH, DEFAULTS, FIXTURE_BUNDLE, FIXTURE_KB, OPT } from '../test/fixture-kb';
import { fakeKb, profile } from '../test/helpers';
import type { ContextProfile } from '../schemas/context';
import type { Clock } from '../ports';
import type { Verdict } from '../schemas/verdict';
import { runPipeline, runPipelineDetailed, type PipelineRun } from './run-pipeline';

type P = Partial<ContextProfile>;
const usage = (metrics: Record<string, number> = {}, over: Partial<UsageInputs> = {}): UsageInputs => ({
  ...emptyUsageInputs(),
  metrics,
  ...over,
});

function run(
  p: P,
  u: UsageInputs = emptyUsageInputs(),
  opts: { kb?: KBReader; clock?: Clock; decisionType?: string; blindSpots?: string[] } = {},
): PipelineRun {
  return runPipelineDetailed(
    {
      decisionType: opts.decisionType ?? 'vector-store',
      componentId: 'vector',
      profile: profile(p),
      usage: u,
      ...(opts.blindSpots ? { blindSpots: opts.blindSpots } : {}),
    },
    opts.kb ?? FIXTURE_KB,
    DEFAULTS,
    opts.clock ?? CLOCK_FRESH,
  );
}
function verdict(r: PipelineRun): Verdict {
  if (r.outcome.outcome !== 'verdict') throw new Error(`expected a verdict, got ${r.outcome.outcome}`);
  return r.outcome.verdict;
}
const totals = (v: Verdict): Record<string, number | null> =>
  Object.fromEntries(v.scores.map((s) => [s.optionId, s.total]));
const teamNeutral = { team: { size: 'small', experience: 'intermediate' } } as const;

describe('outcomes that are not verdicts', () => {
  it('needs_context asks the single next question when a required chip is unknown', () => {
    const r = run({});
    expect(r.outcome).toEqual({
      outcome: 'needs_context',
      decisionType: 'vector-store',
      missing: ['usersNow', 'budget'],
      nextQuestion: { field: 'usersNow', question: 'About how many users do you have now?' },
    });
    expect(r.trace.inputsHash).toBeNull();
  });

  it('asks the next question once the first is answered, one at a time', () => {
    const r = run({ usersNow: 500 });
    expect(r.outcome).toMatchObject({
      outcome: 'needs_context',
      missing: ['budget'],
      nextQuestion: { field: 'budget' },
    });
  });

  it('a list field (existing stack) is never "missing": an empty list is a valid answer', () => {
    const r = run({ usersNow: 500, budget: 'small' });
    expect(r.outcome.outcome).toBe('verdict');
  });

  it('kb_gap names the decision type: unknown decision type, and a decision type with no options', () => {
    expect(run({ usersNow: 1, budget: 'small' }, emptyUsageInputs(), { decisionType: 'queue' }).outcome).toMatchObject({
      outcome: 'kb_gap',
      decisionType: 'queue',
    });
    const emptyKb = fakeKb([], [{ ...FIXTURE_BUNDLE.decisionTypes[0]!, required_context: [] }]);
    const gap = run({}, emptyUsageInputs(), { kb: emptyKb }).outcome;
    expect(gap).toMatchObject({ outcome: 'kb_gap', decisionType: 'vector-store' });
    if (gap.outcome === 'kb_gap') expect(gap.reason).toMatch(/no options/);
  });

  it('an option whose applicability is definitely false is not a candidate; with none left the outcome is kb_gap', () => {
    const only = FIXTURE_BUNDLE.records
      .filter((r) => r.type === 'option' && r.id === OPT.a)
      .map((r) => ({
        ...r,
        body: { ...(r as { body: object }).body, applies_when: [{ field: 'budget', op: 'eq', value: 'flexible' }] },
      })) as never[];
    const kb = fakeKb(only, [{ ...FIXTURE_BUNDLE.decisionTypes[0]!, required_context: [] }]);
    expect(run({ budget: 'small' }, emptyUsageInputs(), { kb }).outcome.outcome).toBe('kb_gap');
    expect(run({ budget: 'flexible' }, emptyUsageInputs(), { kb }).outcome.outcome).toBe('verdict');
    expect(run({}, emptyUsageInputs(), { kb }).outcome.outcome).toBe('verdict'); // budget unknown: not ruled out (P9)
  });
});

describe('golden 1: little is known, so the verdict is uncertain and says why (P9)', () => {
  // usersNow 500, users in 12 months 1000, budget small, no ceiling, no usage figures. Cost and scale cannot be scored
  // (no ceiling, no metrics) -> unknown, excluded. Latency has no must-have -> not applicable.
  // Scored: operational simplicity, ecosystem fit (no stack: 0.4 each), reversibility. Weights renormalise to 1/3 each.
  //   existing-db-extension: ops 1.0 x 0.9 (deployment "both") = 0.9; rev low = 1.0  -> (0.9 + 0.4 + 1.0) / 3 = 0.766667
  //   managed-service-a:     ops 1.0 x 1.0 = 1.0;                rev medium = 0.6 -> (1.0 + 0.4 + 0.6) / 3 = 0.666667
  //   managed-service-b:     identical to a                                          -> 0.666667 (tie broken by id)
  //   self-hosted-c:         ops 0.2 x 0.7 = 0.14;               rev high = 0.2   -> (0.14 + 0.4 + 0.2) / 3 = 0.246667
  const r = run({ usersNow: 500, usersIn12Months: 1000, budget: 'small', ...teamNeutral });
  const v = verdict(r);

  it('ranks the deferral option first, then a before b by id, and keeps the exact scores', () => {
    expect(v.pick).toEqual({ optionId: OPT.existing, params: {} });
    expect(v.runnerUp).toEqual({ optionId: OPT.a, params: {} });
    expect(r.trace.ranking.map((x) => x.optionId)).toEqual([OPT.existing, OPT.a, OPT.b, OPT.c]);
    const t = totals(v);
    expect(t[OPT.existing]).toBeCloseTo(0.766667, 5);
    expect(t[OPT.a]).toBeCloseTo(0.666667, 5);
    expect(t[OPT.b]).toBeCloseTo(0.666667, 5);
    expect(t[OPT.c]).toBeCloseTo(0.246667, 5);
    expect(t[OPT.a]).toBe(t[OPT.b]); // an exact tie, resolved deterministically
  });

  it('is uncertain (not clear), because unscored dimensions carry an uncertain flag, even though the margin is 0.1', () => {
    expect(r.trace.margin).toBeCloseTo(0.1, 5);
    expect(v.confidence).toBe('uncertain');
  });

  it('stores the per-dimension breakdown: unknown dimensions are excluded and the score is flagged partial', () => {
    const e = v.scores.find((s) => s.optionId === OPT.existing)!;
    expect(e.partial).toBe(true);
    expect(e.uncertain).toBe(true);
    const byDim = Object.fromEntries(e.dimensions.map((d) => [d.dimension, d]));
    expect(byDim['cost_fit']).toMatchObject({ state: 'unknown', value: null, weight: 0, uncertain: true });
    expect(byDim['scale_fit']).toMatchObject({ state: 'unknown', value: null, weight: 0 });
    expect(byDim['latency_fit']).toMatchObject({ state: 'not_applicable', value: null, weight: 0, uncertain: false });
    expect(byDim['operational_simplicity']).toMatchObject({ state: 'scored', value: 0.9 });
    expect(byDim['reversibility']).toMatchObject({ state: 'scored', value: 1 });
    expect(e.dimensions.reduce((s, d) => s + d.weight, 0)).toBeCloseTo(1, 10); // renormalised over the scored dimensions
  });

  it('puts every default it used for an unknown value into the plain-language assumptions', () => {
    expect(v.assumptions).toContain(
      'No deploy target was given, so whether options run on your platform was not checked.',
    );
    expect(v.assumptions).toContain(
      'No usage figures were given, so free-tier and scale limits could not be compared with your usage.',
    );
    expect(v.assumptions.some((a) => /not enough current data to score .* on cost, scale/.test(a))).toBe(true);
  });

  it('offers three finalists for a debate: the top two plus a third within theta_clear (0.15) of the first', () => {
    expect(r.trace.finalists.map((f) => f.optionId)).toEqual([OPT.existing, OPT.a, OPT.b]);
  });

  it('the pick carries curated reasons and the verdict records versions, with the rules pick preserved', () => {
    expect(v.pickOrigin).toBe('rules');
    expect(v.rulesPick).toEqual(v.pick);
    expect(v.versions).toEqual({ kb: 'kb-dev', rules: 'rules-0.1.0', prompts: null });
    expect(v.debateId).toBeNull();
    expect(v.reversalCost).toBe('low');
    expect(v.eliminated).toEqual([]);
    expect(v.stale).toBe(false);
    // "You already run a database ... " needs the existing stack; "For a small corpus ..." needs usersNow <= 1000.
    expect(v.why.map((x) => x.text)).toContain(
      'For a small corpus this is usually enough, and it avoids a second service.',
    );
    expect(v.why.every((x) => x.kind === 'fact' && x.citedRecordIds.length > 0)).toBe(true);
  });
});

describe('golden 2: complete data gives a close call with every dimension scored', () => {
  // usersNow 500 -> 5000 (growth 10, which also doubles... multiplies scale fit by 1.5), budget small, ceiling 30 USD,
  // usage 20,000 stored vectors today = 200,000 at 12 months. Weights: scale 1.5, others 1 (sum 6.5).
  //   existing: cost: no free tier, price 0 USD <= 30 -> 0.6; scale: capacity 5,000,000 covers 10x of 200,000 -> 1.0;
  //             ops 0.9, eco 0.4, rev 1.0                       -> (0.6 + 1.5 + 0.9 + 0.4 + 1.0) / 5.5 = 0.800000
  //   a:        cost: free 50,000 exceeded, paid 25 <= 30 -> 0.6; scale: paid capacity 5,000,000 -> 1.0; ops 1.0, eco 0.4, rev 0.6
  //                                                             -> (0.6 + 1.5 + 1.0 + 0.4 + 0.6) / 5.5 = 0.745455
  //   b:        cost: free 1,000,000 covers 200,000 -> 1.0; scale: 10x = 2,000,000 > 1,000,000, 1x ok -> 0.5; ops 1.0, eco 0.4, rev 0.6
  //                                                             -> (1.0 + 0.75 + 1.0 + 0.4 + 0.6) / 5.5 = 0.681818
  //   c:        cost: price 40 > 30 and no free tier -> 0.2; scale: 100,000,000 -> 1.0; ops 0.14, eco 0.4, rev 0.2
  //                                                             -> (0.2 + 1.5 + 0.14 + 0.4 + 0.2) / 5.5 = 0.443636
  const r = run(
    { usersNow: 500, usersIn12Months: 5000, budget: 'small', monthlyCeilingUsd: 30, ...teamNeutral },
    usage({ stored_vectors: 20_000 }),
  );
  const v = verdict(r);

  it('matches the hand-computed scores', () => {
    const t = totals(v);
    expect(t[OPT.existing]).toBeCloseTo(0.8, 5);
    expect(t[OPT.a]).toBeCloseTo(0.745455, 5);
    expect(t[OPT.b]).toBeCloseTo(0.681818, 5);
    expect(t[OPT.c]).toBeCloseTo(0.443636, 5);
  });

  it('every dimension that applies is scored, nothing is partial or uncertain, so the 0.055 margin is "close"', () => {
    expect(v.scores.every((s) => !s.partial && !s.uncertain)).toBe(true);
    expect(r.trace.margin).toBeCloseTo(0.054545, 5);
    expect(v.confidence).toBe('close');
  });

  it('the scale multiplier fired: growth is exactly the configured ratio (10)', () => {
    const w = r.trace.constraints!.weights;
    expect(w.scale_fit).toBeCloseTo(1.5 / 6.5, 10);
    expect(w.cost_fit).toBeCloseTo(1 / 6.5, 10);
    expect(Object.values(w).reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10);
  });

  it('computes a flip condition from the free-tier breakpoint, citing the limit record and the calculator output', () => {
    const viaA = verdict(
      run(
        {
          usersNow: 500,
          usersIn12Months: 5000,
          budget: 'small',
          monthlyCeilingUsd: 30,
          existingStack: [],
          mustHaves: [{ kind: 'avoid_vendor', optionId: OPT.existing }],
          ...teamNeutral,
        },
        usage({ stored_vectors: 20_000 }),
      ),
    );
    // With the deferral option avoided, managed-service-a is the top option; its free tier is 50,000 vectors against 20,000 today: 2.5 times.
    expect(viaA.pick?.optionId).toBe(OPT.a);
    const f = viaA.flipConditions.find((x) => x.refersTo.includes('calc.free_tier_breakpoint'));
    expect(f).toEqual({
      text: "Its free tier (stored_vectors) is reached at about 2.5 times today's usage.",
      citedRecordIds: ['limit.managed-service-a.free-tier.2026-10'],
      refersTo: ['calc.free_tier_breakpoint'],
    });
  });

  it('curated flip conditions for the pick are included with their citation', () => {
    expect(v.flipConditions[0]).toEqual({
      text: 'Switch to a dedicated service when your user count grows past the point where the shared database becomes the bottleneck.',
      citedRecordIds: ['flip.existing-db-extension.scale.2026-10'],
      refersTo: ['usersIn12Months'],
    });
  });
});

describe('golden 3: elimination families, each citing the record that proved the failure', () => {
  it('E-1 required capability, E-2 residency, E-5 avoided vendor leave one survivor, which is clear', () => {
    // Must-haves: hybrid search, EU residency, avoid the deferral option. a fails E-2 (EU: no), b fails E-1 (hybrid: no),
    // existing fails E-5. Only self-hosted-c survives. Its dimensions all score (ceiling 50 USD >= 40), so a lone, fully
    // scored survivor is clear.
    const r = run(
      {
        usersNow: 500,
        usersIn12Months: 600,
        budget: 'small',
        monthlyCeilingUsd: 50,
        ...teamNeutral,
        mustHaves: [
          { kind: 'requires_capability', id: 'hybrid_search' },
          { kind: 'eu_data_residency' },
          { kind: 'avoid_vendor', optionId: OPT.existing },
        ],
      },
      usage({ stored_vectors: 20_000 }),
    );
    const v = verdict(r);
    expect(v.pick?.optionId).toBe(OPT.c);
    expect(v.confidence).toBe('clear');
    expect(v.runnerUp).toBeNull();
    expect(r.trace.finalists).toEqual([{ optionId: OPT.c, params: {} }]);
    expect(v.eliminated).toEqual([
      { optionId: OPT.existing, ruleId: 'E-5', recordId: null },
      { optionId: OPT.a, ruleId: 'E-2', recordId: 'cap.managed-service-a.eu-data-residency.2026-10' },
      { optionId: OPT.b, ruleId: 'E-1', recordId: 'cap.managed-service-b.hybrid-search.2026-10' },
    ]);
    const whyNot = Object.fromEntries(v.alternatives.map((a) => [a.optionId, a.whyNot]));
    expect(whyNot[OPT.a]?.[0]).toEqual({
      kind: 'fact',
      text: 'Managed Service A (fake) does not support EU data residency, according to a current record.',
      citedRecordIds: ['cap.managed-service-a.eu-data-residency.2026-10'],
    });
    expect(whyNot[OPT.existing]?.[0]).toEqual({
      kind: 'judgement',
      text: 'You asked to avoid this vendor.',
      citedRecordIds: [],
    });
    // total = (0.6 + 1.0 + 0.14 + 0.4 + 0.2) / 5 = 0.468
    expect(totals(v)[OPT.c]).toBeCloseTo(0.468, 5);
  });

  it('E-3 deploy target: a current record that says "no" eliminates; a missing record only raises doubt', () => {
    const r = run({ usersNow: 1, budget: 'small', deployTarget: 'platform.fake-edge', ...teamNeutral });
    const v = verdict(r);
    expect(v.eliminated).toEqual([
      {
        optionId: OPT.existing,
        ruleId: 'E-3',
        recordId: 'cap.existing-db-extension.deploy-target-platform-fake-edge.2026-10',
      },
    ]);
    expect(v.assumptions).toContain(
      'No record shows whether Managed Service B (fake) supports running on platform.fake-edge, so it was kept as a candidate.',
    );
    expect(r.trace.survivorIds).toEqual([OPT.a, OPT.b, OPT.c]);
  });

  it('E-4 free-tiers-only: eliminates the option whose free tier your usage passes, using the calculator', () => {
    // 20,000 vectors today, growth 10 -> 200,000 at 12 months. a: 50,000 -> eliminated. b: 1,000,000 -> covers.
    // existing and c have no free-tier record, so they stay with a doubt rather than being removed (P9).
    const r = run(
      { usersNow: 500, usersIn12Months: 5000, budget: 'free_only', ...teamNeutral },
      usage({ stored_vectors: 20_000 }),
    );
    const v = verdict(r);
    expect(v.eliminated).toEqual([
      { optionId: OPT.a, ruleId: 'E-4', recordId: 'limit.managed-service-a.free-tier.2026-10' },
    ]);
    expect(v.alternatives.find((a) => a.optionId === OPT.a)?.whyNot[0]).toEqual({
      kind: 'fact',
      text: 'Its free tier allows 50000 stored_vectors, which your usage (200000) passes.',
      citedRecordIds: ['limit.managed-service-a.free-tier.2026-10'],
    });
    expect(v.assumptions).toContain(
      'No free-tier record exists for Existing-database extension (fake), so whether it fits a free-tiers-only budget could not be checked.',
    );
    // Options with an unchecked doubt are uncertain, and an option with unscored dimensions is not penalised for them.
    expect(v.confidence).toBe('uncertain');
    expect(r.trace.survivorIds).toEqual([OPT.existing, OPT.b, OPT.c]);
    // weights: free-only doubles cost (2), growth 10 raises scale (1.5): raw 2, 1.5, 1, 1, 1, 1; latency is not applicable, so it is excluded.
    //   b: cost 1.0, scale 0.5 (cap 1,000,000: 10x of 200,000 does not fit), ops 1.0, eco 0.4, rev 0.6 -> (2 + 0.75 + 1 + 0.4 + 0.6) / 6.5 = 0.730769
    expect(totals(v)[OPT.b]).toBeCloseTo(0.730769, 5);
    // existing: cost unknown (excluded), so (1.5 + 0.9 + 0.4 + 1.0) / 4.5 = 0.844444
    expect(totals(v)[OPT.existing]).toBeCloseTo(0.844444, 5);
  });

  it('E-6 latency: eliminates options whose own best p95 alone exceeds the limit; scores the rest', () => {
    // limit 50 ms: existing 60 and b 55 exceed it; a 40 and c 45 do not. Neither is at or under half the limit (25), so both "fit": 0.6.
    const r = run({
      usersNow: 500,
      usersIn12Months: 600,
      budget: 'small',
      mustHaves: [{ kind: 'max_p95_latency_ms', value: 50 }],
      ...teamNeutral,
    });
    const v = verdict(r);
    expect(v.eliminated.map((e) => [e.optionId, e.ruleId])).toEqual([
      [OPT.existing, 'E-6'],
      [OPT.b, 'E-6'],
    ]);
    expect(v.alternatives.find((a) => a.optionId === OPT.b)?.whyNot[0]?.text).toBe(
      'Its own response time alone (55 ms at the 95th percentile) exceeds your limit of 50 ms.',
    );
    expect(r.trace.survivorIds).toEqual([OPT.a, OPT.c]);
    const aLatency = v.scores.find((s) => s.optionId === OPT.a)!.dimensions.find((d) => d.dimension === 'latency_fit')!;
    expect(aLatency).toMatchObject({ state: 'scored', value: 0.6 });
  });

  it('when every option is eliminated, the verdict has no pick and says so', () => {
    const r = run({
      usersNow: 1,
      budget: 'small',
      mustHaves: [{ kind: 'max_p95_latency_ms', value: 5 }],
      ...teamNeutral,
    });
    const v = verdict(r);
    expect(v.pick).toBeNull();
    expect(v.runnerUp).toBeNull();
    expect(v.rulesPick).toBeNull();
    expect(v.eliminated).toHaveLength(4);
    expect(v.why).toEqual([
      { kind: 'judgement', text: 'No option satisfies every hard constraint in your context.', citedRecordIds: [] },
    ]);
    expect(r.trace.finalists).toEqual([]);
  });
});

describe('golden 4: principle P9, missing or expired data never decides', () => {
  const musts: P = {
    usersNow: 500,
    usersIn12Months: 600,
    budget: 'small',
    ...teamNeutral,
    mustHaves: [{ kind: 'requires_capability', id: 'hybrid_search' }, { kind: 'eu_data_residency' }],
  };

  it('with fresh records the same must-haves eliminate a and b', () => {
    expect(verdict(run(musts)).eliminated.map((e) => e.optionId)).toEqual([OPT.a, OPT.b]);
  });

  it('with every record expired, nothing is eliminated; each option survives as uncertain and the verdict is stale', () => {
    const r = run(musts, emptyUsageInputs(), { clock: CLOCK_EXPIRED });
    const v = verdict(r);
    expect(v.eliminated).toEqual([]);
    expect(r.trace.survivorIds).toHaveLength(4);
    expect(v.confidence).toBe('uncertain');
    expect(v.stale).toBe(true);
    expect(v.assumptions).toContain(
      'The record on whether Managed Service A (fake) supports EU data residency has expired and was not used, so it was kept as a candidate.',
    );
    expect(v.assumptions).toContain(
      'The record on whether Managed Service B (fake) supports hybrid search has expired and was not used, so it was kept as a candidate.',
    );
  });

  it('expired option records contribute no operations or reversibility score; only ecosystem fit remains', () => {
    const v = verdict(run(musts, emptyUsageInputs(), { clock: CLOCK_EXPIRED }));
    for (const s of v.scores) {
      const states = Object.fromEntries(s.dimensions.map((d) => [d.dimension, d.state]));
      expect(states['operational_simplicity']).toBe('unknown');
      expect(states['reversibility']).toBe('unknown');
      expect(states['ecosystem_fit']).toBe('scored');
    }
  });

  it('an expired price is shown but cannot decide: cost scores 0.5 with an uncertain flag (specification 6.5)', () => {
    // Clock just after the 30-day price/limit records expire (2026-11-17) but before the 90-day option and capability records.
    const clock: Clock = { now: () => '2026-11-20T08:00:00.000Z' };
    const r = run(
      { usersNow: 500, usersIn12Months: 600, budget: 'small', monthlyCeilingUsd: 30, ...teamNeutral },
      emptyUsageInputs(),
      { clock },
    );
    const a = verdict(r).scores.find((s) => s.optionId === OPT.a)!;
    expect(a.dimensions.find((d) => d.dimension === 'cost_fit')).toMatchObject({
      state: 'scored',
      value: 0.5,
      uncertain: true,
    });
    expect(a.uncertain).toBe(true);
  });

  it('a zero margin between the top two is uncertain, not arbitrarily clear', () => {
    const r = run(musts, emptyUsageInputs(), { clock: CLOCK_EXPIRED });
    expect(r.trace.margin).toBe(0);
    expect(verdict(r).confidence).toBe('uncertain');
  });
});

describe('determinism and reproducibility (P7)', () => {
  const p: P = { usersNow: 500, usersIn12Months: 5000, budget: 'small', monthlyCeilingUsd: 30, ...teamNeutral };
  const u = usage({ stored_vectors: 20_000 });

  it('the same inputs give a byte-identical outcome and the same hash', () => {
    const a = run(p, u);
    const b = run(p, u);
    expect(canonicalJson(a.outcome)).toBe(canonicalJson(b.outcome));
    expect(a.trace.inputsHash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.trace.inputsHash).toBe(b.trace.inputsHash);
  });

  it('the order a KB reader returns records in never changes the result', () => {
    const shuffled = createBundleReader({
      ...FIXTURE_BUNDLE,
      decisionTypes: [...FIXTURE_BUNDLE.decisionTypes].reverse(),
      records: [...FIXTURE_BUNDLE.records].reverse(),
    });
    const a = run(p, u);
    const b = run(p, u, { kb: shuffled });
    expect(canonicalJson(a.outcome)).toBe(canonicalJson(b.outcome));
    expect(a.trace.inputsHash).toBe(b.trace.inputsHash);
  });

  it('any change to a semantic input changes the hash: the context, a usage figure, the decision', () => {
    const base = run(p, u).trace.inputsHash;
    expect(run({ ...p, usersNow: 501 }, u).trace.inputsHash).not.toBe(base);
    expect(run(p, usage({ stored_vectors: 20_001 })).trace.inputsHash).not.toBe(base);
    expect(run({ ...p, monthlyCeilingUsd: 31 }, u).trace.inputsHash).not.toBe(base);
  });

  it('runPipeline returns just the outcome of runPipelineDetailed', () => {
    const outcome = runPipeline(
      { decisionType: 'vector-store', componentId: 'vector', profile: profile(p), usage: u },
      FIXTURE_KB,
      DEFAULTS,
      CLOCK_FRESH,
    );
    expect(canonicalJson(outcome)).toBe(canonicalJson(run(p, u).outcome));
  });

  it('carries blind spots found by the design rules into the verdict', () => {
    const v = verdict(run(p, u, { blindSpots: ['No observability component'] }));
    expect(v.blindSpots).toEqual(['No observability component']);
  });

  it('rejects malformed input instead of guessing', () => {
    expect(() => run({ usersNow: -5 })).toThrow();
    expect(() =>
      runPipeline(
        { decisionType: 'Vector Store', componentId: 'x', profile: profile() },
        FIXTURE_KB,
        DEFAULTS,
        CLOCK_FRESH,
      ),
    ).toThrow();
  });
});

describe('weights (specification 6.5)', () => {
  const weights = (p: P, u: UsageInputs = emptyUsageInputs()) =>
    run({ usersNow: 1, budget: 'small', ...p }, u).trace.constraints!.weights;
  const sum = (w: Record<string, number>) => Object.values(w).reduce((s, x) => s + x, 0);

  it('start equal and always sum to 1', () => {
    const w = weights(teamNeutral);
    for (const v of Object.values(w)) expect(v).toBeCloseTo(1 / 6, 10);
    expect(sum(w)).toBeCloseTo(1, 10);
  });

  it('a solo or beginner team doubles operational simplicity', () => {
    for (const team of [
      { size: 'solo', experience: 'expert' },
      { size: 'large', experience: 'beginner' },
    ] as const) {
      const w = weights({ team });
      expect(w.operational_simplicity).toBeCloseTo(2 / 7, 10);
      expect(w.cost_fit).toBeCloseTo(1 / 7, 10);
    }
  });

  it('a free-tiers-only budget doubles cost fit; a latency must-have doubles latency fit', () => {
    expect(weights({ ...teamNeutral, budget: 'free_only' }).cost_fit).toBeCloseTo(2 / 7, 10);
    expect(
      weights({ ...teamNeutral, mustHaves: [{ kind: 'max_p95_latency_ms', value: 100 }] }).latency_fit,
    ).toBeCloseTo(2 / 7, 10);
  });

  it('an existing platform multiplies ecosystem fit by 1.5; 10x growth multiplies scale fit by 1.5; factors stack', () => {
    const w = weights({ ...teamNeutral, existingStack: [{ optionId: OPT.a, params: {} }] });
    expect(w.ecosystem_fit).toBeCloseTo(1.5 / 6.5, 10);
    const grown = weights({ ...teamNeutral, usersNow: 100, usersIn12Months: 1000 });
    expect(grown.scale_fit).toBeCloseTo(1.5 / 6.5, 10);
    const all = weights({
      team: { size: 'solo', experience: 'beginner' },
      budget: 'free_only',
      usersNow: 100,
      usersIn12Months: 1000,
      deployTarget: 'platform.x',
      mustHaves: [{ kind: 'max_p95_latency_ms', value: 100 }],
    });
    // raw: cost 2, scale 1.5, latency 2, operations 2, ecosystem 1.5, reversibility 1 = 10
    expect(all.operational_simplicity).toBeCloseTo(0.2, 10);
    expect(all.ecosystem_fit).toBeCloseTo(0.15, 10);
    expect(all.reversibility).toBeCloseTo(0.1, 10);
    expect(sum(all)).toBeCloseTo(1, 10);
  });

  it('growth just below the ratio does not trigger the multiplier; unknown growth does not either', () => {
    expect(weights({ ...teamNeutral, usersNow: 100, usersIn12Months: 999 }).scale_fit).toBeCloseTo(1 / 6, 10);
    expect(weights({ ...teamNeutral, usersNow: 100 }).scale_fit).toBeCloseTo(1 / 6, 10);
  });
});
