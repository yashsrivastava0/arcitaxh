import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { emptyUsageInputs } from '../schemas/usage';
import { EXPIRED, fakeKb, graph, limitRecord, node, optionRecord, priceRecord } from '../test/helpers';
import { analyseScale, freeTierLimits, GROWTH_ASSUMPTION, overagePrice } from './scale';
import { formatPico } from './money';

const ctx = { today: '2026-10-20', dueSoonDays: 7 };
const comp = (id: string, optionId: string) =>
  node(id, { type: 'vector_store', decisionType: 'vector-store', choice: { optionId, params: {} } });
const usage = (metrics: Record<string, number>) => ({ ...emptyUsageInputs(), metrics });
const PRESETS = [1, 10, 100];

// Spec Appendix C.2 (placeholder numbers): a free limit of 10,000 units a month, and 250 units a day at today's traffic.
// usage at 1x = 250 x 30 = 7,500 a month. breakpoint = 10,000 / 7,500 = 1.3333...
const kbBilled = fakeKb([
  optionRecord('option.x'),
  limitRecord('limit.x.free', 'option.x', {
    metric: 'units',
    value: 10_000,
    unit: 'units',
    period: 'month',
    overage_behaviour: 'overage_billed',
  }),
  priceRecord('price.x.unit', 'option.x', {
    unit: 'per_unit',
    unit_name: 'units',
    amount: '0.0004',
    billing_period: 'month',
  }),
]);

describe('analyseScale: the worked example (spec C.2, placeholder numbers)', () => {
  const a = analyseScale({
    graph: graph([comp('v', 'option.x')]),
    usage: usage({ units: 7500 }),
    kb: kbBilled,
    ctx,
    presets: PRESETS,
  });

  it('breakpoint = 10,000 / 7,500 = 1.3333...', () => {
    expect(a.smallestBreakpoint).toEqual({ componentId: 'v', recordId: 'limit.x.free', breakpoint: 10_000 / 7_500 });
    expect(a.presets[0]!.rows[0]!.breakpoint).toBeCloseTo(1.3333333, 6);
  });

  it('at 1x the free tier holds: nothing breaks and there is no bill', () => {
    const p = a.presets[0]!;
    expect(p.rows[0]!.state).toBe('within');
    expect(p.firstToBreak).toBeNull();
    expect(p.overageTotalPico).toBe(0n);
  });

  it('at 10x usage is 75,000, which is 7.5 times the limit; the component breaks first; the bill is (75,000 - 10,000) x 0.0004 = 26 USD', () => {
    const p = a.presets[1]!;
    expect(p.rows[0]!.usageAtScale).toBe(75_000);
    expect(p.firstToBreak).toEqual({ componentId: 'v', recordId: 'limit.x.free', breakpoint: 10_000 / 7_500 });
    const c = p.rows[0]!.consequence;
    expect(c).toMatchObject({ kind: 'overage_cost', priceRecordId: 'price.x.unit' });
    expect(formatPico((c as { costPico: bigint }).costPico)).toBe('26');
    expect(formatPico(p.overageTotalPico as bigint)).toBe('26');
  });

  it('at 100x the bill is (750,000 - 10,000) x 0.0004 = 296 USD', () => {
    expect(formatPico(a.presets[2]!.overageTotalPico as bigint)).toBe('296');
  });

  it('states the growth assumption', () => {
    expect(a.assumption).toBe(GROWTH_ASSUMPTION);
    expect(GROWTH_ASSUMPTION).toBe('Usage is assumed to grow in proportion to traffic.');
  });
});

describe('analyseScale: the typed behaviours', () => {
  const run = (behaviour: 'hard_stop' | 'auto_upgrade' | 'throttled', extra = {}) =>
    analyseScale({
      graph: graph([comp('v', 'option.x')]),
      usage: usage({ stored_vectors: 6000 }),
      kb: fakeKb([
        optionRecord('option.x'),
        limitRecord('limit.x.free', 'option.x', {
          value: 10_000,
          unit: 'vectors',
          overage_behaviour: behaviour,
          ...extra,
        }),
      ]),
      ctx,
      presets: [1, 2],
    }).presets[1]!.rows[0]!;

  it('hard_stop is shown as a reliability risk at the failure point', () => {
    expect(run('hard_stop').consequence).toEqual({
      kind: 'failure_risk',
      message: 'v: stored_vectors stops working at 10000 vectors; requests fail after that.',
    });
  });

  it('auto_upgrade shows that the bill changes, with a warning, and does not invent the new price', () => {
    const c = run('auto_upgrade').consequence;
    expect(c?.kind).toBe('new_plan_cost');
    expect(c?.message).toContain('The new price is not in the knowledge base.');
  });

  it('throttled is shown as a latency risk', () => {
    expect(run('throttled').consequence?.kind).toBe('latency_risk');
  });

  it('pausing after inactivity is an operational risk, separate from cost, and shown even when the limit is not reached', () => {
    const r = analyseScale({
      graph: graph([comp('v', 'option.x')]),
      usage: usage({ stored_vectors: 100 }),
      kb: fakeKb([
        optionRecord('option.x'),
        limitRecord('limit.x.free', 'option.x', { pauses_after_inactivity: true, scales_to_zero: true }),
      ]),
      ctx,
      presets: [1],
    }).presets[0]!.rows[0]!;
    expect(r.state).toBe('within');
    expect(r.operationalRisk).toBe(
      'v can pause after a period with no activity; this is an operational risk, separate from cost.',
    );
    expect(r.coldStartNote).toBe(
      'v can scale to zero when idle, so the first request after a quiet period may be slower.',
    );
    expect(r.consequence).toBeNull();
  });

  it('a billed overage with no listed unit price is unknown, not zero, and the total is unknown', () => {
    const kb = fakeKb([
      optionRecord('option.x'),
      limitRecord('limit.x.free', 'option.x', { overage_behaviour: 'overage_billed' }),
    ]);
    const p = analyseScale({
      graph: graph([comp('v', 'option.x')]),
      usage: usage({ stored_vectors: 20_000 }),
      kb,
      ctx,
      presets: [1],
    }).presets[0]!;
    expect(p.rows[0]!.consequence).toMatchObject({ kind: 'overage_cost', costPico: null, priceRecordId: null });
    expect(p.overageTotalPico).toBeNull();
  });
});

describe('analyseScale: which component breaks first', () => {
  const kb = fakeKb([
    optionRecord('option.x'),
    optionRecord('option.y'),
    limitRecord('limit.x.free', 'option.x', { metric: 'stored_vectors', value: 1000 }),
    limitRecord('limit.y.free', 'option.y', { metric: 'requests', value: 5000, unit: 'requests', period: 'month' }),
  ]);
  const g = graph([comp('x', 'option.x'), comp('y', 'option.y')]);

  it('the smallest breakpoint breaks first: x at 1000/200 = 5, y at 5000/100 = 50', () => {
    const a = analyseScale({
      graph: g,
      usage: usage({ stored_vectors: 200, requests: 100 }),
      kb,
      ctx,
      presets: PRESETS,
    });
    expect(a.smallestBreakpoint).toMatchObject({ componentId: 'x', breakpoint: 5 });
    expect(a.presets[0]!.firstToBreak).toBeNull();
    expect(a.presets[1]!.firstToBreak).toMatchObject({ componentId: 'x', breakpoint: 5 });
    expect(a.presets[2]!.rows.filter((r) => r.state === 'exceeded').map((r) => r.componentId)).toEqual(['x', 'y']);
    expect(a.presets[2]!.firstToBreak).toMatchObject({ componentId: 'x' });
  });

  it('a limit with no usage figure for its metric, or an expired limit record, is unknown and never decides', () => {
    const old = fakeKb([
      optionRecord('option.x'),
      limitRecord('limit.x.free', 'option.x', {}, EXPIRED),
      optionRecord('option.y'),
      limitRecord('limit.y.free', 'option.y', { metric: 'requests', value: 5000 }),
    ]);
    const a = analyseScale({ graph: g, usage: usage({ stored_vectors: 99_999 }), kb: old, ctx, presets: [1] });
    expect(a.unknown).toEqual([
      { componentId: 'x', recordId: 'limit.x.free', reason: 'expired' },
      { componentId: 'y', recordId: 'limit.y.free', reason: 'no_usage_figure' },
    ]);
    expect(a.presets[0]!.rows).toEqual([]);
    expect(a.smallestBreakpoint).toBeNull();
  });

  it('zero usage has no breakpoint (it never breaks), and is not an error', () => {
    const a = analyseScale({ graph: g, usage: usage({ stored_vectors: 0, requests: 0 }), kb, ctx, presets: [100] });
    expect(a.smallestBreakpoint).toBeNull();
    expect(a.presets[0]!.rows.every((r) => r.state === 'within' && r.breakpoint === null)).toBe(true);
  });
});

describe('freeTierLimits and overagePrice', () => {
  it('only free-tier limits are returned; rate limits and paid caps are not breakpoints', () => {
    const kb = fakeKb([
      optionRecord('option.x'),
      limitRecord('limit.x.free', 'option.x'),
      limitRecord('limit.x.rate', 'option.x', { scope: 'rate_limit' }),
      limitRecord('limit.x.paid', 'option.x', { scope: 'paid_tier:pro' }),
    ]);
    expect(freeTierLimits(graph([comp('v', 'option.x')]), kb, ctx).map((l) => l.record.id)).toEqual(['limit.x.free']);
  });

  it('an overage price must be USD, per unit, named after the metric, over the same period; two different amounts are ambiguous', () => {
    const limit = limitRecord('limit.x.free', 'option.x', { metric: 'units', period: 'month' });
    const ok = priceRecord('p1', 'option.x', {
      unit: 'per_unit',
      unit_name: 'units',
      amount: '0.1',
      billing_period: 'month',
    });
    expect(overagePrice([ok], limit)?.id).toBe('p1');
    expect(
      overagePrice(
        [priceRecord('p2', 'option.x', { unit: 'per_unit', unit_name: 'other', billing_period: 'month' })],
        limit,
      ),
    ).toBeNull();
    expect(
      overagePrice(
        [priceRecord('p3', 'option.x', { unit: 'per_unit', unit_name: 'units', billing_period: 'year' })],
        limit,
      ),
    ).toBeNull();
    expect(
      overagePrice(
        [
          priceRecord('p4', 'option.x', {
            unit: 'per_unit',
            unit_name: 'units',
            currency: 'EUR',
            billing_period: 'month',
          }),
        ],
        limit,
      ),
    ).toBeNull();
    const other = priceRecord('p5', 'option.x', {
      unit: 'per_unit',
      unit_name: 'units',
      amount: '0.2',
      billing_period: 'month',
    });
    expect(overagePrice([ok, other], limit)).toBeNull();
  });
});

describe('analyseScale: properties', () => {
  const g = graph([comp('v', 'option.x')]);
  const mk = (limit: number) =>
    fakeKb([
      optionRecord('option.x'),
      limitRecord('limit.x.free', 'option.x', {
        metric: 'units',
        value: limit,
        period: 'month',
        overage_behaviour: 'overage_billed',
      }),
      priceRecord('price.x.unit', 'option.x', {
        unit: 'per_unit',
        unit_name: 'units',
        amount: '0.0004',
        billing_period: 'month',
      }),
    ]);

  it('a breakpoint is never negative, and is exactly limit / usage', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), fc.integer({ min: 1, max: 1_000_000 }), (limit, u) => {
        const a = analyseScale({ graph: g, usage: usage({ units: u }), kb: mk(limit), ctx, presets: [1] });
        const b = a.smallestBreakpoint!.breakpoint;
        return b >= 0 && b === limit / u;
      }),
      { numRuns: 200 },
    );
  });

  it('more traffic never lowers the overage bill', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 1, max: 1000 }),
        (limit, u, extra) => {
          const lo = analyseScale({ graph: g, usage: usage({ units: u }), kb: mk(limit), ctx, presets: [1, 10, 100] });
          const hi = analyseScale({
            graph: g,
            usage: usage({ units: u + extra }),
            kb: mk(limit),
            ctx,
            presets: [1, 10, 100],
          });
          const total = (p: bigint | null) => p as bigint;
          return (
            lo.presets.every((p, i) => total(p.overageTotalPico) <= total(hi.presets[i]!.overageTotalPico)) &&
            lo.presets.every(
              (p, i) => i === 0 || total(lo.presets[i - 1]!.overageTotalPico) <= total(p.overageTotalPico),
            )
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
