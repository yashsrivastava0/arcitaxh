import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../normalise/canonical-json';
import { emptyUsageInputs, type UsageInputs } from '../schemas/usage';
import { findingSchema, type Finding } from '../schemas/finding';
import { createDesignGraphSchema, type DesignGraph } from '../schemas/design';
import type { ContextProfile } from '../schemas/context';
import { RULES_VERSION } from '../versions';
import { clockAt, DEFAULTS, FIXTURE_KB, OPT } from '../test/fixture-kb';
import { designArb, LIMITS, profile } from '../test/helpers';
import { comp, decided, design, link } from './fixtures/builders';
import { hasBlockingFinding, RULES, ruleSignature, runRules, selectRules } from './registry';
import type { Rule, RuleFixture, RuleInput } from './types';

const FRESH = '2026-10-20';
const input = (
  g: DesignGraph,
  p: Partial<ContextProfile> = {},
  u: Partial<UsageInputs> = {},
  today = FRESH,
): RuleInput => ({
  graph: g,
  profile: profile(p),
  usage: { ...emptyUsageInputs(), ...u },
  kb: FIXTURE_KB,
  clock: clockAt(today),
  defaults: DEFAULTS,
});
const runFixture = (rule: Rule, f: RuleFixture): Finding[] =>
  rule.check(input(f.graph, f.profile, f.usage, f.today ?? FRESH));
const designSchema = createDesignGraphSchema(LIMITS);

describe('the rule contract (specification 7.1, brief 10.4)', () => {
  it('registers R-01 to R-07, R-09 (required) and R-08, R-10 (optional), each once, in id order', () => {
    expect(RULES.map((r) => r.id)).toEqual([
      'R-01',
      'R-02',
      'R-03',
      'R-04',
      'R-05',
      'R-06',
      'R-07',
      'R-08',
      'R-09',
      'R-10',
    ]);
  });

  it('locks the aggregate of rule versions: changing a rule must show up here, and RULES_VERSION must be bumped with it', () => {
    expect(ruleSignature()).toBe(
      'R-01@0.1.0;R-02@0.1.0;R-03@0.1.0;R-04@0.1.0;R-05@0.1.0;R-06@0.1.0;R-07@0.1.0;R-08@0.1.0;R-09@0.1.0;R-10@0.1.0',
    );
    expect(RULES_VERSION).toBe('rules-0.1.0');
  });

  for (const rule of RULES) {
    describe(`${rule.id} ${rule.title}`, () => {
      it('has semantic version, plain title, and applies to designs', () => {
        expect(rule.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(rule.title.length).toBeGreaterThan(5);
        expect(rule.appliesTo).toBe('design');
        expect(['info', 'warn', 'block']).toContain(rule.severity);
      });

      it('ships at least two fixtures: one that fires and one that does not', () => {
        expect(rule.fixtures.length).toBeGreaterThanOrEqual(2);
        expect(rule.fixtures.some((f) => f.expect.length > 0)).toBe(true);
        expect(rule.fixtures.some((f) => f.expect.length === 0)).toBe(true);
      });

      for (const f of rule.fixtures) {
        it(`fixture: ${f.name}`, () => {
          expect(designSchema.safeParse(f.graph).success).toBe(true);
          const found = runFixture(rule, f);
          expect(found).toHaveLength(f.expect.length);
          f.expect.forEach((want, i) => expect(found[i]).toMatchObject(want));
          for (const finding of found) {
            expect(findingSchema.safeParse(finding).success).toBe(true);
            expect(finding.ruleId).toBe(rule.id);
            expect(finding.ruleVersion).toBe(rule.version); // the rule's version is stored with every finding
            if (finding.kind === 'unknown') expect(finding.severity).toBe('info');
          }
        });
      }
    });
  }
});

describe('Appendix C.1 sample design', () => {
  // client -> API -> agent -> {vector store (read ratio 0.9, no cache), model provider (the only one)}; API -> database,
  // a synchronous call with no timeout. The other calls have a timeout and retries.
  const withPolicy = { timeoutMs: 3000, retries: 1 };
  const c1 = design(
    [
      comp('client', 'client'),
      comp('api', 'api'),
      comp('agent', 'agent_runtime'),
      comp('vector', 'vector_store', { traits: { readRatio: 0.9 } }),
      comp('model', 'model_provider'),
      comp('database', 'database', { traits: { readRatio: 0.3 } }),
    ],
    [
      link('e1', 'client', 'api', withPolicy),
      link('e2', 'api', 'agent', withPolicy),
      link('e3', 'agent', 'vector', withPolicy),
      link('e4', 'agent', 'model', withPolicy),
      link('e5', 'api', 'database', { retries: 1 }),
    ],
  );
  const found = runRules(input(c1));
  const ids = (rule: string) => found.filter((f) => f.ruleId === rule).map((f) => f.componentIds);

  it('R-01 agent on a synchronous path, R-02 only one model provider, R-05 read-heavy vector store, R-08 no timeout', () => {
    expect(ids('R-01')).toEqual([['agent']]);
    expect(ids('R-02')).toEqual([['model']]);
    expect(ids('R-05')).toEqual([['vector']]);
    expect(ids('R-08')).toEqual([['api', 'database']]);
  });

  it("R-04 differs from the specification's example by design (conflict C-020): the literal articulation points, API and agent, not the leaf database", () => {
    expect(ids('R-04')).toEqual([['agent'], ['api']]);
  });

  it('no secret, no latency limit, no free tier in this design: nothing else fires, and no rule is silent about missing data it needed', () => {
    expect(found.filter((f) => ['R-03', 'R-06', 'R-07', 'R-09', 'R-10'].includes(f.ruleId))).toEqual([]);
    // database has a read ratio of 0.3 and the vector store 0.9, so R-05 has what it needs for both: no unknown finding.
    expect(found.some((f) => f.kind === 'unknown')).toBe(false);
  });

  it('all findings are valid and sorted by rule', () => {
    for (const f of found) expect(findingSchema.safeParse(f).success).toBe(true);
    expect(found.map((f) => f.ruleId)).toEqual([...found.map((f) => f.ruleId)].sort());
  });
});

describe('rule details beyond the fixtures', () => {
  it('R-02: a second consumer that has only one provider is still flagged, one finding per provider', () => {
    const g = design(
      [
        comp('a', 'agent_runtime'),
        comp('b', 'agent_runtime'),
        comp('p', 'model_provider'),
        comp('q', 'model_provider'),
      ],
      [link('e1', 'a', 'p'), link('e2', 'a', 'q'), link('e3', 'b', 'p')],
    );
    // a has two providers (p, q); b has only p. p is the sole provider for b, so p is flagged; q is not.
    expect(
      runRules(input(g))
        .filter((f) => f.ruleId === 'R-02')
        .map((f) => f.componentIds),
    ).toEqual([['p']]);
  });

  it('R-05: the threshold is inclusive (0.8 fires, 0.79 does not) and comes from config', () => {
    const mk = (r: number) =>
      design(
        [comp('client', 'client'), comp('api', 'api'), comp('db', 'database', { traits: { readRatio: r } })],
        [link('e1', 'client', 'api'), link('e2', 'api', 'db')],
      );
    const r05 = (g: DesignGraph) => runRules(input(g)).filter((f) => f.ruleId === 'R-05' && f.kind === 'detected');
    expect(DEFAULTS.rules.read_ratio_threshold).toBe(0.8);
    expect(r05(mk(0.8))).toHaveLength(1);
    expect(r05(mk(0.79))).toHaveLength(0);
  });

  it('R-05: a store off the request path is not judged', () => {
    const g = design(
      [
        comp('client', 'client'),
        comp('api', 'api'),
        comp('db', 'database', { traits: { readRatio: 0.99, onRequestPath: false } }),
      ],
      [link('e1', 'client', 'api'), link('e2', 'api', 'db')],
    );
    expect(runRules(input(g)).filter((f) => f.ruleId === 'R-05')).toEqual([]);
  });

  it('R-06: the tightest of several latency limits is used', () => {
    const g = design([comp('client', 'client'), decided('vec', 'vector_store', OPT.a)], [link('e1', 'client', 'vec')]);
    const r = runRules(
      input(g, {
        mustHaves: [
          { kind: 'max_p95_latency_ms', value: 500 },
          { kind: 'max_p95_latency_ms', value: 30 },
        ],
      }),
    );
    expect(r.filter((f) => f.ruleId === 'R-06').map((f) => f.kind)).toEqual(['detected']);
  });

  it('R-06: a latency limit of exactly the path total does not fire (over means strictly over)', () => {
    const g = design([comp('client', 'client'), decided('vec', 'vector_store', OPT.a)], [link('e1', 'client', 'vec')]);
    expect(
      runRules(input(g, { mustHaves: [{ kind: 'max_p95_latency_ms', value: 40 }] })).filter((f) => f.ruleId === 'R-06'),
    ).toEqual([]);
  });

  it('R-06: names the budget and says "conservative upper bound" in plain language', () => {
    const g = design([comp('client', 'client'), decided('vec', 'vector_store', OPT.a)], [link('e1', 'client', 'vec')]);
    const f = runRules(input(g, { mustHaves: [{ kind: 'max_p95_latency_ms', value: 30 }] })).find(
      (x) => x.ruleId === 'R-06',
    ) as Finding;
    expect(f.explanation).toBe(
      'The slowest synchronous path adds up to 40 ms at the 95th percentile, over your limit of 30 ms. This is a conservative upper bound on the tail, not a measured percentile.',
    );
  });

  it('R-06: a loop of synchronous calls is reported as unknown, not as zero latency', () => {
    const g = design(
      [comp('client', 'client'), comp('a', 'api'), comp('b', 'api')],
      [link('e1', 'client', 'a'), link('e2', 'a', 'b'), link('e3', 'b', 'a')],
    );
    const f = runRules(input(g, { mustHaves: [{ kind: 'max_p95_latency_ms', value: 100 }] })).filter(
      (x) => x.ruleId === 'R-06',
    );
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ kind: 'unknown', componentIds: ['a', 'b'] });
  });

  it("R-07: the horizon in config is 12 months, which is the user's own 12-month figure (change the rule before changing it)", () => {
    expect(DEFAULTS.rules.free_tier_horizon_months).toBe(12);
  });

  it('R-07: exactly at the limit at the 12-month scale is not "reached" (usage must exceed the limit)', () => {
    const g = design([decided('vec', 'vector_store', OPT.a)]);
    // 50,000 limit; 5,000 now x 10 = 50,000 at 12 months: at, not above.
    const r = runRules(input(g, { usersNow: 100, usersIn12Months: 1000 }, { metrics: { stored_vectors: 5000 } }));
    expect(r.filter((f) => f.ruleId === 'R-07')).toEqual([]);
  });

  it('R-09: no finding ever repeats the secret, in any field', () => {
    const secret = `sk${'-'}${'Zq7'.repeat(8)}`;
    const g = design(
      [comp('api', 'api', { label: `key ${secret}` }), comp('db', 'database', { label: `db ${secret}` })],
      [link('e1', 'api', 'db', { note: secret })],
    );
    const text = JSON.stringify(runRules(input(g, { deployTarget: secret })));
    expect(text).not.toContain(secret);
    expect(text).not.toContain('Zq7Zq7');
    expect(runRules(input(g)).filter((f) => f.ruleId === 'R-09').length).toBeGreaterThanOrEqual(3);
  });

  it('R-09: a key in a component id is found, and the finding does not repeat it', () => {
    const secret = `sk${'-'}${'Zq7'.repeat(8)}`;
    const g = design([comp(secret, 'api')]);
    const found = runRules(input(g)).filter((f) => f.ruleId === 'R-09');
    expect(found).toHaveLength(1);
    expect(found[0]!.explanation).not.toContain(secret);
    expect(found[0]!.evidence.measurements['location']).not.toContain(secret);
  });

  it('R-09 blocks, and a block finding stops the debate and export', () => {
    const secret = `sk${'-'}${'Zq7'.repeat(8)}`;
    const blocked = runRules(input(design([comp('api', 'api', { label: secret })])));
    expect(hasBlockingFinding(blocked)).toBe(true);
    expect(hasBlockingFinding(runRules(input(design([comp('api', 'api')]))))).toBe(false);
  });

  it('other rules never echo a secret that sits in a label (they redact it)', () => {
    const secret = `sk${'-'}${'Zq7'.repeat(8)}`;
    const g = design(
      [
        comp('client', 'client'),
        comp('api', 'api', { label: secret }),
        comp('agent', 'agent_runtime', { label: `agent ${secret}` }),
      ],
      [link('e1', 'client', 'api'), link('e2', 'api', 'agent')],
    );
    const others = runRules(input(g)).filter((f) => f.ruleId !== 'R-09');
    expect(others.length).toBeGreaterThan(0);
    expect(JSON.stringify(others)).not.toContain(secret);
  });

  it('selectRules keeps registry order and ignores ids that are not built', () => {
    expect(selectRules(['R-05', 'R-01', 'R-99']).map((r) => r.id)).toEqual(['R-01', 'R-05']);
  });
});

describe('properties of the rules (P7, P9)', () => {
  const profileArb = fc.record({
    usersNow: fc.option(fc.integer({ min: 0, max: 100000 }), { nil: null }),
    usersIn12Months: fc.option(fc.integer({ min: 0, max: 1000000 }), { nil: null }),
    budget: fc.constantFrom('free_only', 'small', 'flexible', 'unknown'),
    mustHaves: fc.subarray([
      { kind: 'max_p95_latency_ms', value: 50 },
      { kind: 'max_p95_latency_ms', value: 300 },
    ] as const),
  });
  const usageArb = fc.record({
    readRatio: fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: null }),
    metrics: fc.oneof(fc.constant({}), fc.record({ stored_vectors: fc.integer({ min: 0, max: 5_000_000 }) })),
  });
  /** Random designs whose components may choose fixture options, so the KB-backed rules (R-06, R-07) are exercised. */
  const kbDesignArb: fc.Arbitrary<DesignGraph> = designArb.chain((g) =>
    fc
      .array(fc.constantFrom<string | null>(null, OPT.existing, OPT.a, OPT.b, OPT.c), {
        minLength: g.nodes.length,
        maxLength: g.nodes.length,
      })
      .map((choices) => ({
        nodes: g.nodes.map((n, i) => {
          const c = choices[i] ?? null;
          return c === null
            ? n
            : { ...n, status: 'decided' as const, decisionType: 'vector-store', choice: { optionId: c, params: {} } };
        }),
        edges: g.edges,
      })),
  );

  it('never throws, and every finding is valid, on any design, context and usage', () => {
    fc.assert(
      fc.property(kbDesignArb, profileArb, usageArb, (g, p, u) => {
        const found = runRules(input(g, p as Partial<ContextProfile>, u as Partial<UsageInputs>));
        return found.every((f) => findingSchema.safeParse(f).success);
      }),
      { numRuns: 300 },
    );
  });

  it('is deterministic, and ignores layout and the order of nodes and edges', () => {
    fc.assert(
      fc.property(kbDesignArb, profileArb, usageArb, (g, p, u) => {
        const shuffled: DesignGraph = {
          nodes: [...g.nodes].reverse().map((n) => ({ ...n, position: { x: n.position.x + 7, y: -n.position.y } })),
          edges: [...g.edges].reverse(),
        };
        const a = runRules(input(g, p as Partial<ContextProfile>, u as Partial<UsageInputs>));
        const b = runRules(input(shuffled, p as Partial<ContextProfile>, u as Partial<UsageInputs>));
        return canonicalJson(a) === canonicalJson(b);
      }),
      { numRuns: 300 },
    );
  });

  it('P9: letting time pass can only remove "detected" findings from the data-backed rules (R-06, R-07), never add them', () => {
    const dates = fc.constantFrom('2026-10-20', '2026-11-05', '2026-11-20', '2027-01-10', '2027-03-01', '2028-01-01');
    fc.assert(
      fc.property(kbDesignArb, profileArb, usageArb, dates, dates, (g, p, u, d1, d2) => {
        const [early, late] = d1 <= d2 ? [d1, d2] : [d2, d1];
        const detectedAt = (d: string) =>
          new Set(
            runRules(input(g, p as Partial<ContextProfile>, u as Partial<UsageInputs>, d))
              .filter((f) => (f.ruleId === 'R-06' || f.ruleId === 'R-07') && f.kind === 'detected')
              .map((f) => `${f.ruleId}:${f.componentIds.join(',')}`),
          );
        const e = detectedAt(early);
        return [...detectedAt(late)].every((x) => e.has(x));
      }),
      { numRuns: 300 },
    );
  });

  it('P9: an unknown finding is never a pass in disguise: R-06 and R-07 report unknown when the data they need is absent', () => {
    // A latency limit with a decided component whose profile has expired.
    const g = design([comp('client', 'client'), decided('vec', 'vector_store', OPT.a)], [link('e1', 'client', 'vec')]);
    const r = runRules(input(g, { mustHaves: [{ kind: 'max_p95_latency_ms', value: 1000 }] }, {}, '2027-03-01'));
    expect(r.filter((f) => f.ruleId === 'R-06').map((f) => f.kind)).toEqual(['unknown']);
    // A free tier with no usage figure.
    const r7 = runRules(input(design([decided('vec', 'vector_store', OPT.a)])));
    expect(r7.filter((f) => f.ruleId === 'R-07').map((f) => f.kind)).toEqual(['unknown']);
  });
});
