import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createBundleReader } from '../kb-bundle/reader';
import { canonicalJson } from '../normalise/canonical-json';
import type { Clock } from '../ports';
import type { ContextProfile, MustHave } from '../schemas/context';
import { emptyUsageInputs, type UsageInputs } from '../schemas/usage';
import { outcomeSchema, type Outcome } from '../schemas/verdict';
import { CLOCK_FRESH, DEFAULTS, FIXTURE_BUNDLE, FIXTURE_KB, OPT } from '../test/fixture-kb';
import { profile } from '../test/helpers';
import { runPipelineDetailed } from './run-pipeline';

const num = (max: number) => fc.option(fc.integer({ min: 0, max }), { nil: null });
const profileArb: fc.Arbitrary<ContextProfile> = fc
  .record({
    purpose: fc.constantFrom('personal', 'startup', 'company', 'unknown'),
    usersNow: num(100_000),
    usersIn12Months: num(1_000_000),
    budget: fc.constantFrom('free_only', 'small', 'flexible', 'unknown'),
    monthlyCeilingUsd: num(100),
    deployTarget: fc.constantFrom(null, 'platform.fake-edge', 'platform.fake-db', 'platform.fake-cloud-a'),
    existingStack: fc
      .subarray([OPT.existing, OPT.a, OPT.b])
      .map((ids) => ids.map((optionId) => ({ optionId, params: {} }))),
    team: fc.record({
      size: fc.constantFrom('solo', 'small', 'large', 'unknown'),
      experience: fc.constantFrom('beginner', 'intermediate', 'expert', 'unknown'),
    }),
    mustHaves: fc.subarray([
      { kind: 'eu_data_residency' },
      { kind: 'requires_capability', id: 'hybrid_search' },
      { kind: 'max_p95_latency_ms', value: 50 },
      { kind: 'avoid_vendor', optionId: OPT.existing },
      { kind: 'compliance', id: 'hipaa' },
    ] as MustHave[]),
  })
  .map((p) => profile(p as Partial<ContextProfile>));

const usageArb: fc.Arbitrary<UsageInputs> = fc
  .option(fc.integer({ min: 0, max: 5_000_000 }), { nil: undefined })
  .map((v) => ({ ...emptyUsageInputs(), metrics: v === undefined ? {} : { stored_vectors: v } }));

/** A profile that has answered every required chip, so the pipeline reaches elimination. */
const answered = profileArb.map((p) => ({
  ...p,
  usersNow: p.usersNow ?? 100,
  budget: p.budget === 'unknown' ? ('small' as const) : p.budget,
}));

const run = (p: ContextProfile, u: UsageInputs, kb = FIXTURE_KB, clock: Clock = CLOCK_FRESH) =>
  runPipelineDetailed(
    { decisionType: 'vector-store', componentId: 'vector', profile: p, usage: u },
    kb,
    DEFAULTS,
    clock,
  );

const eliminatedIds = (o: Outcome): string[] =>
  o.outcome === 'verdict' ? o.verdict.eliminated.map((e) => e.optionId) : [];
const subset = (a: string[], b: string[]): boolean => a.every((x) => b.includes(x));

describe('pipeline properties', () => {
  it('never throws for a valid context, and always returns an outcome that satisfies the schema', () => {
    fc.assert(
      fc.property(profileArb, usageArb, (p, u) => {
        const r = run(p, u);
        return outcomeSchema.safeParse(r.outcome).success;
      }),
      { numRuns: 150 },
    );
  });

  it('is deterministic: the same inputs give byte-identical outcomes and hashes', () => {
    fc.assert(
      fc.property(profileArb, usageArb, (p, u) => {
        const a = run(p, u);
        const b = run(p, u);
        return canonicalJson(a.outcome) === canonicalJson(b.outcome) && a.trace.inputsHash === b.trace.inputsHash;
      }),
      { numRuns: 100 },
    );
  });

  it('weights sum to 1, scores stay in [0,1], and a verdict is internally consistent', () => {
    fc.assert(
      fc.property(answered, usageArb, (p, u) => {
        const r = run(p, u);
        if (r.outcome.outcome !== 'verdict') return true;
        const v = r.outcome.verdict;
        const w = r.trace.constraints!.weights;
        const wsum = Object.values(w).reduce((s, x) => s + x, 0);
        const survivors = new Set(r.trace.survivorIds);
        const eliminated = new Set(v.eliminated.map((e) => e.optionId));
        return (
          Math.abs(wsum - 1) < 1e-9 &&
          v.scores.every(
            (s) =>
              (s.total === null || (s.total >= 0 && s.total <= 1)) &&
              Math.abs(s.dimensions.reduce((a, d) => a + d.weight, 0) - (s.total === null ? 0 : 1)) < 1e-9,
          ) &&
          (v.pick === null || (survivors.has(v.pick.optionId) && !eliminated.has(v.pick.optionId))) &&
          (v.runnerUp === null || v.runnerUp.optionId !== v.pick?.optionId) &&
          r.trace.finalists.every((f) => survivors.has(f.optionId)) &&
          r.trace.finalists.length <= 3 &&
          [...survivors].every((id) => !eliminated.has(id)) &&
          survivors.size + eliminated.size === r.trace.candidateIds.length
        );
      }),
      { numRuns: 150 },
    );
  });

  it('P9: removing any records can only REMOVE eliminations, never add them', () => {
    fc.assert(
      fc.property(
        answered,
        usageArb,
        fc.array(fc.boolean(), { minLength: FIXTURE_BUNDLE.records.length, maxLength: FIXTURE_BUNDLE.records.length }),
        (p, u, keep) => {
          const records = FIXTURE_BUNDLE.records.filter((r, i) => r.type === 'option' || keep[i]);
          const reduced = createBundleReader({ ...FIXTURE_BUNDLE, records });
          return subset(eliminatedIds(run(p, u, reduced).outcome), eliminatedIds(run(p, u).outcome));
        },
      ),
      { numRuns: 150 },
    );
  });

  it('P9: letting time pass can only remove eliminations: expired data never decides', () => {
    const dates = fc.constantFrom('2026-10-20', '2026-11-05', '2026-11-20', '2027-01-10', '2027-02-01', '2028-01-01');
    fc.assert(
      fc.property(answered, usageArb, dates, dates, (p, u, d1, d2) => {
        const [early, late] = d1 <= d2 ? [d1, d2] : [d2, d1];
        const at = (d: string): Clock => ({ now: () => `${d}T08:00:00.000Z` });
        return subset(
          eliminatedIds(run(p, u, FIXTURE_KB, at(late)).outcome),
          eliminatedIds(run(p, u, FIXTURE_KB, at(early)).outcome),
        );
      }),
      { numRuns: 150 },
    );
  });

  it('P9: every elimination cites a record that is CURRENT on the day of the verdict (or is an avoided vendor)', () => {
    const dates = fc.constantFrom(
      '2026-10-20',
      '2026-11-05',
      '2026-11-20',
      '2027-01-10',
      '2027-01-17',
      '2027-02-01',
      '2028-01-01',
    );
    fc.assert(
      fc.property(answered, usageArb, dates, (p, u, date) => {
        const clock: Clock = { now: () => `${date}T08:00:00.000Z` };
        const outcome = run(p, u, FIXTURE_KB, clock).outcome;
        if (outcome.outcome !== 'verdict') return true;
        return outcome.verdict.eliminated.every((e) => {
          if (e.recordId === null) return e.ruleId === 'E-5';
          const rec = FIXTURE_KB.record(e.recordId);
          return rec !== null && rec.verification.valid_until >= date;
        });
      }),
      { numRuns: 200 },
    );
  });

  it('a verdict is never "clear" while any top-two option has an unscored dimension that is uncertain', () => {
    fc.assert(
      fc.property(answered, usageArb, (p, u) => {
        const r = run(p, u);
        if (r.outcome.outcome !== 'verdict' || r.outcome.verdict.pick === null) return true;
        const top = r.outcome.verdict.scores.slice(0, 2);
        return r.outcome.verdict.confidence !== 'clear' || top.every((s) => !s.uncertain);
      }),
      { numRuns: 150 },
    );
  });

  it('more usage never turns an E-4 elimination back into a survivor (the free tier only gets worse)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3_000_000 }), fc.integer({ min: 0, max: 3_000_000 }), (lo, extra) => {
        const p = profile({ usersNow: 500, usersIn12Months: 1000, budget: 'free_only' });
        const a = eliminatedIds(run(p, { ...emptyUsageInputs(), metrics: { stored_vectors: lo } }).outcome);
        const b = eliminatedIds(run(p, { ...emptyUsageInputs(), metrics: { stored_vectors: lo + extra } }).outcome);
        return subset(a, b);
      }),
      { numRuns: 100 },
    );
  });

  it('with no usage, no ceiling and no must-haves the pipeline eliminates nothing and is uncertain (P9)', () => {
    const r = run(profile({ usersNow: 1, budget: 'small' }), emptyUsageInputs());
    expect(eliminatedIds(r.outcome)).toEqual([]);
    expect(r.outcome.outcome === 'verdict' && r.outcome.verdict.confidence).toBe('uncertain');
  });
});
