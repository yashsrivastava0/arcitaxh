import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { emptyUsageInputs, type UsageInputs } from '../schemas/usage';
import { EXPIRED, fakeKb, graph, node, optionRecord, priceRecord } from '../test/helpers';
import { estimateCost } from './cost';
import { formatPico } from './money';

const ctx = { today: '2026-10-20', dueSoonDays: 7 };
const model = node('m', {
  type: 'model_provider',
  decisionType: 'vector-store',
  choice: { optionId: 'option.model', params: {} },
});
const store = node('s', {
  type: 'vector_store',
  decisionType: 'vector-store',
  choice: { optionId: 'option.store', params: {} },
});

const records = [
  optionRecord('option.model'),
  priceRecord('price.model.in', 'option.model', { unit: 'per_million_input_tokens', amount: '3' }),
  priceRecord('price.model.cached', 'option.model', { unit: 'per_million_cached_input_tokens', amount: '0.30' }),
  priceRecord('price.model.out', 'option.model', { unit: 'per_million_output_tokens', amount: '15' }),
  optionRecord('option.store'),
  priceRecord('price.store.fixed', 'option.store', { unit: 'fixed_per_month', amount: '25' }),
];
const kb = fakeKb(records);
const tokens = {
  typical: { input: 1000, cachedInput: 0, output: 500 },
  high: { input: 4000, cachedInput: 1000, output: 2000 },
};
const usage = (over: Partial<UsageInputs> = {}): UsageInputs => ({ ...emptyUsageInputs(), ...over });
const est = (u: UsageInputs, g = graph([model, store]), k = kb) =>
  estimateCost({ graph: g, usage: u, kb: k, ctx, monthDays: 30 });
const usd = (p: bigint) => formatPico(p);

describe('estimateCost: golden numbers, exact to the last digit', () => {
  // 2 calls per request. Typical per call: 1000 in x 3/M = 0.003, 500 out x 15/M = 0.0075 -> 0.0105; two calls 0.021.
  // High per call: 4000 in = 0.012, 1000 cached x 0.30/M = 0.0003, 2000 out = 0.03 -> 0.0423; two calls 0.0846.
  const u = usage({ modelCallsPerRequest: 2, tokensPerCall: tokens, requestsPerDayNow: 1000 });

  it('per request: 0.021 to 0.0846 USD', () => {
    const r = est(u);
    expect(usd(r.perRequest!.lowPico)).toBe('0.021');
    expect(usd(r.perRequest!.highPico)).toBe('0.0846');
    expect(r.label).toBe('estimate');
  });

  it('per month: 1,000 requests a day x 30 days = 30,000 requests, plus 25 fixed: 655 to 2563 USD', () => {
    const r = est(u);
    expect(usd(r.perMonth!.lowPico)).toBe('655');
    expect(usd(r.perMonth!.highPico)).toBe('2563');
    expect(r.assumptions).toContain('A month is 30 days.');
    expect(r.needsTrafficEstimate).toBe(false);
  });

  it('lists each priced line with the record it came from', () => {
    const r = est(u);
    expect(r.lines.map((l) => [l.componentId, l.kind, l.recordId, l.basis])).toEqual([
      ['m', 'cached_input_tokens', 'price.model.cached', 'per_request'],
      ['m', 'input_tokens', 'price.model.in', 'per_request'],
      ['m', 'output_tokens', 'price.model.out', 'per_request'],
      ['s', 'fixed_monthly', 'price.store.fixed', 'per_month'],
    ]);
    expect(r.uncertain).toBe(false);
  });

  it('a month length from the config changes the result: 31 days gives 31,000 requests', () => {
    const r = estimateCost({ graph: graph([model, store]), usage: u, kb, ctx, monthDays: 31 });
    expect(usd(r.perMonth!.lowPico)).toBe('676'); // 0.021 x 31,000 = 651, plus 25
  });
});

describe('estimateCost: no traffic is invented', () => {
  it('with no traffic figure only the per-request cost is shown, and it says a traffic estimate is needed', () => {
    const r = est(usage({ modelCallsPerRequest: 2, tokensPerCall: tokens }));
    expect(r.perRequest).not.toBeNull();
    expect(r.perMonth).toBeNull();
    expect(r.needsTrafficEstimate).toBe(true);
    expect(r.assumptions.join(' ')).toMatch(/traffic estimate/);
  });

  it('a design with only fixed monthly prices has a monthly figure without traffic', () => {
    const r = est(usage(), graph([store]));
    expect(usd(r.perMonth!.lowPico)).toBe('25');
    expect(r.needsTrafficEstimate).toBe(false);
    expect(r.perRequest).toBeNull();
  });

  it('missing model-call figures leave the token lines unpriced, named, never zero', () => {
    const r = est(usage({ requestsPerDayNow: 1000 }), graph([model]));
    expect(r.lines).toEqual([]);
    expect(r.unknown.map((x) => x.componentId)).toEqual(['m', 'm', 'm']);
    expect(r.unknown[0]!.reason).toBe('model calls per request and tokens per call are needed');
    expect(r.perMonth).toBeNull();
    expect(r.uncertain).toBe(true);
  });

  it('zero traffic is a real figure (0), not missing: the monthly cost is the fixed part', () => {
    const r = est(usage({ modelCallsPerRequest: 2, tokensPerCall: tokens, requestsPerDayNow: 0 }));
    expect(usd(r.perMonth!.lowPico)).toBe('25');
  });
});

describe('estimateCost: expired, ambiguous and foreign prices', () => {
  it('an expired price is still used and shown, with its date, and the result is uncertain', () => {
    const old = priceRecord(
      'price.model.in',
      'option.model',
      { unit: 'per_million_input_tokens', amount: '3' },
      EXPIRED,
    );
    const k = fakeKb([optionRecord('option.model'), old]);
    const r = est(usage({ modelCallsPerRequest: 1, tokensPerCall: tokens }), graph([model]), k);
    const line = r.lines[0]!;
    expect(line.expired).toBe(true);
    expect(line.note).toBe('price last verified on 2026-01-01; expired');
    expect(usd(line.lowPico)).toBe('0.003');
    expect(r.uncertain).toBe(true);
    expect(r.assumptions).toContain(
      'At least one price has expired; it is shown, with its date, and treated as uncertain.',
    );
  });

  it('prefers a current price over an expired one for the same unit and tier', () => {
    const old = priceRecord('price.old', 'option.store', { amount: '99' }, EXPIRED);
    const fresh = priceRecord('price.fresh', 'option.store', { amount: '25' });
    const r = est(usage(), graph([store]), fakeKb([optionRecord('option.store'), old, fresh]));
    expect(r.lines[0]!.recordId).toBe('price.fresh');
    expect(r.uncertain).toBe(false);
  });

  it('several tiers with different prices and no chosen tier: unpriced, asks for a tier; a chosen tier prices it', () => {
    const tiers = [
      optionRecord('option.store'),
      priceRecord('price.free', 'option.store', { tier: 'free', amount: '0' }),
      priceRecord('price.pro', 'option.store', { tier: 'pro', amount: '25' }),
    ];
    const k = fakeKb(tiers);
    const none = est(usage(), graph([store]), k);
    expect(none.lines).toEqual([]);
    expect(none.unknown[0]!.reason).toBe(
      's has several fixed per month prices; choose a tier'.replace('s has', 's has'),
    );
    const pro = node('s', { type: 'vector_store', choice: { optionId: 'option.store', params: { tier: 'pro' } } });
    expect(usd(est(usage(), graph([pro]), k).perMonth!.lowPico)).toBe('25');
    const missing = node('s', {
      type: 'vector_store',
      choice: { optionId: 'option.store', params: { tier: 'enterprise' } },
    });
    expect(est(usage(), graph([missing]), k).unknown[0]!.reason).toBe(
      'no fixed per month price for the tier "enterprise"',
    );
  });

  it('two current prices for one tier that disagree are a data problem: unpriced, not averaged or guessed', () => {
    const a = priceRecord('price.a', 'option.store', { amount: '25' });
    const b = priceRecord('price.b', 'option.store', { amount: '30' });
    const r = est(usage(), graph([store]), fakeKb([optionRecord('option.store'), a, b]));
    expect(r.lines).toEqual([]);
    expect(r.unknown[0]!.reason).toBe('s has conflicting fixed per month prices in the knowledge base');
  });

  it('a price in another currency is not converted: it is excluded and named', () => {
    const eur = priceRecord('price.eur', 'option.store', { currency: 'EUR', amount: '20' });
    const r = est(usage(), graph([store]), fakeKb([optionRecord('option.store'), eur]));
    expect(r.lines).toEqual([]);
    expect(r.excluded).toEqual([{ componentId: 's', recordId: 'price.eur', currency: 'EUR' }]);
    expect(r.uncertain).toBe(true);
    expect(r.assumptions).toContain(
      'Prices in a currency other than USD are not converted and are not included in the totals.',
    );
  });

  it("a per-unit price needs the user's monthly quantity in that price's own unit", () => {
    const metered = priceRecord('price.metered', 'option.store', {
      unit: 'per_unit',
      unit_name: 'million_vectors_month',
      amount: '2.50',
    });
    const k = fakeKb([optionRecord('option.store'), metered]);
    expect(est(usage(), graph([store]), k).unknown[0]!.reason).toBe(
      'a monthly quantity of million_vectors_month is needed',
    );
    const r = est(usage({ metrics: { million_vectors_month: 4 } }), graph([store]), k);
    expect(usd(r.perMonth!.lowPico)).toBe('10');
    expect(r.lines[0]!.kind).toBe('per_unit');
  });

  it('a per-request price adds the same amount to every request', () => {
    const per = priceRecord('price.req', 'option.store', { unit: 'per_request', amount: '0.0002' });
    const r = est(usage({ requestsPerDayNow: 100 }), graph([store]), fakeKb([optionRecord('option.store'), per]));
    expect(usd(r.perRequest!.lowPico)).toBe('0.0002');
    expect(usd(r.perMonth!.lowPico)).toBe('0.6'); // 0.0002 x 3,000
  });

  it('two token-priced components: the split of calls between them is not given, so neither is priced', () => {
    const second = node('m2', { type: 'model_provider', choice: { optionId: 'option.model', params: {} } });
    const r = est(usage({ modelCallsPerRequest: 1, tokensPerCall: tokens }), graph([model, second]));
    expect(r.lines).toEqual([]);
    expect(r.unknown[0]!.reason).toMatch(/more than one component is priced by tokens/);
  });

  it('components with no chosen option, or an option not in the KB, are skipped without inventing a price', () => {
    const r = est(usage(), graph([node('x'), node('y', { choice: { optionId: 'option.unknown', params: {} } })]));
    expect(r.lines).toEqual([]);
    expect(r.unknown).toEqual([]);
    expect(r.perMonth).toBeNull();
  });
});

describe('estimateCost: properties', () => {
  it('more traffic never lowers the monthly cost, and the low estimate never exceeds the high one', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5_000_000 }), fc.integer({ min: 0, max: 5_000_000 }), (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        const base = { modelCallsPerRequest: 3, tokensPerCall: tokens };
        const r1 = est(usage({ ...base, requestsPerDayNow: lo }));
        const r2 = est(usage({ ...base, requestsPerDayNow: hi }));
        return (
          r2.perMonth!.lowPico >= r1.perMonth!.lowPico &&
          r2.perMonth!.highPico >= r1.perMonth!.highPico &&
          r1.perMonth!.lowPico <= r1.perMonth!.highPico
        );
      }),
      { numRuns: 200 },
    );
  });

  it('more tokens never lower the per-request cost', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), fc.integer({ min: 0, max: 1_000_000 }), (a, extra) => {
        const mk = (n: number) =>
          usage({
            modelCallsPerRequest: 1,
            tokensPerCall: {
              typical: { input: n, cachedInput: 0, output: n },
              high: { input: n, cachedInput: 0, output: n },
            },
          });
        return est(mk(a + extra)).perRequest!.lowPico >= est(mk(a)).perRequest!.lowPico;
      }),
      { numRuns: 200 },
    );
  });

  it('is deterministic and independent of node order', () => {
    const u = usage({ modelCallsPerRequest: 2, tokensPerCall: tokens, requestsPerDayNow: 1234 });
    expect(est(u, graph([store, model]))).toEqual(est(u, graph([model, store])));
  });
});
