import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { evaluateCondition, allTrue, notRuledOut } from '../context/conditions';
import { emptyUsageInputs } from '../schemas/usage';
import { profile } from '../test/helpers';
import type { LimitRecord } from '../schemas/kb';
import { assessFreeTier, breakpoint, formatMultiple, growthFactor } from './free-tier';
import { decimalToPico, formatPico, numberToPico, picoToMicro, PICO_PER_UNIT } from './money';

describe('money (exact, no floats)', () => {
  it('parses decimals exactly and round-trips through formatPico', () => {
    expect(decimalToPico('2.50')).toBe(2_500_000_000_000n);
    expect(decimalToPico('0')).toBe(0n);
    expect(decimalToPico('0.000000000001')).toBe(1n);
    for (const s of ['25', '2.5', '0.15', '1000000.000001', '0']) expect(formatPico(decimalToPico(s))).toBe(s);
  });

  it('rejects anything that is not a plain non-negative decimal with at most 12 places', () => {
    for (const bad of ['', '-1', '1e3', '1,5', '1.1234567890123', '.5', '5.', 'abc'])
      expect(() => decimalToPico(bad), bad).toThrow(RangeError);
  });

  it('converts to whole micro-units with round-half-up', () => {
    expect(picoToMicro(decimalToPico('2.5'))).toBe(2_500_000n);
    expect(picoToMicro(decimalToPico('0.0000005'))).toBe(1n); // half rounds up
    expect(picoToMicro(decimalToPico('0.0000004'))).toBe(0n);
  });

  it('converts a user number (a ceiling in dollars) to pico units without float drift', () => {
    expect(numberToPico(12.5)).toBe(12n * PICO_PER_UNIT + PICO_PER_UNIT / 2n);
    expect(numberToPico(0.1 + 0.2)).toBe(decimalToPico('0.300000')); // 0.30000000000000004 -> 6 places
    expect(() => numberToPico(-1)).toThrow(RangeError);
    expect(() => numberToPico(Number.NaN)).toThrow(RangeError);
  });

  it('property: decimal strings round-trip exactly and ordering matches numeric ordering', () => {
    const dec = fc.tuple(fc.nat(1_000_000), fc.nat(999_999)).map(([w, f]) => `${w}.${String(f).padStart(6, '0')}`);
    // Trim trailing zeros of the fractional part only (never the integer part): "100.500000" -> "100.5", "100.000000" -> "100".
    const trim = (s: string): string => s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    fc.assert(
      fc.property(dec, dec, (a, b) => {
        expect(formatPico(decimalToPico(a))).toBe(trim(a));
        // Six decimal places are exactly representable at these magnitudes, so Number ordering is the reference.
        return decimalToPico(a) < decimalToPico(b) === Number(a) < Number(b);
      }),
    );
  });
});

describe('growthFactor and the free-tier breakpoint (specification 7.7)', () => {
  it('prefers requests per day, falls back to users, and is null when it cannot be known', () => {
    expect(
      growthFactor(profile(), { ...emptyUsageInputs(), requestsPerDayNow: 100, requestsPerDay12Months: 1000 }),
    ).toBe(10);
    expect(growthFactor(profile({ usersNow: 500, usersIn12Months: 1000 }), emptyUsageInputs())).toBe(2);
    expect(growthFactor(profile({ usersNow: 500 }), emptyUsageInputs())).toBeNull();
    expect(growthFactor(profile({ usersNow: 0, usersIn12Months: 10 }), emptyUsageInputs())).toBeNull(); // cannot divide by zero: unknown, not invented
    expect(growthFactor(profile(), emptyUsageInputs())).toBeNull();
  });

  it('breakpoint is L / u1, and null when there is no usage (never an invented number)', () => {
    expect(breakpoint(10_000, 7_500)).toBeCloseTo(1.3333, 4); // spec C.2: 10,000 / 7,500
    expect(breakpoint(10_000, 0)).toBeNull();
  });

  it('property: a breakpoint is never negative, and more usage never raises it', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e9, noNaN: true }),
        fc.double({ min: 0.001, max: 1e9, noNaN: true }),
        fc.double({ min: 0, max: 1e6, noNaN: true }),
        (limit, u, extra) => {
          const a = breakpoint(limit, u) as number;
          const b = breakpoint(limit, u + extra) as number;
          return a >= 0 && b >= 0 && b <= a;
        },
      ),
    );
  });

  it('formats a multiple the way flip-condition text shows it', () => {
    expect(formatMultiple(1.3333)).toBe('1.3');
    expect(formatMultiple(2.5)).toBe('2.5');
    expect(formatMultiple(9.96)).toBe('10.0');
    expect(formatMultiple(12.4)).toBe('12');
  });
});

const limit = (id: string, metric: string, value: number): LimitRecord =>
  ({
    id,
    type: 'limit',
    body: {
      scope: 'free_tier',
      metric,
      value,
      unit: 'u',
      period: 'none',
      overage_behaviour: 'hard_stop',
      pauses_after_inactivity: false,
      scales_to_zero: false,
    },
  }) as unknown as LimitRecord;

describe('assessFreeTier', () => {
  const u = (metrics: Record<string, number>) => ({ ...emptyUsageInputs(), metrics });

  it('covers when the 12-month usage fits every limit', () => {
    const a = assessFreeTier([limit('l1', 'vectors', 50_000)], u({ vectors: 20_000 }), 2);
    expect(a.state).toBe('covers');
    expect(a.limits[0]).toMatchObject({ usageNow: 20_000, usage12: 40_000, state: 'covers' });
    expect(a.limits[0]?.breakpoint).toBe(2.5);
  });

  it('exceeds when the 12-month usage passes a limit, and when today already does (even with growth unknown)', () => {
    expect(assessFreeTier([limit('l1', 'vectors', 50_000)], u({ vectors: 20_000 }), 10).state).toBe('exceeds');
    expect(assessFreeTier([limit('l1', 'vectors', 50_000)], u({ vectors: 60_000 }), null).state).toBe('exceeds');
  });

  it('is unknown, never "covers", when growth is unknown or the user gave no figure for the metric', () => {
    expect(assessFreeTier([limit('l1', 'vectors', 50_000)], u({ vectors: 20_000 }), null).state).toBe('unknown');
    expect(assessFreeTier([limit('l1', 'vectors', 50_000)], u({}), 2).state).toBe('unknown');
    expect(assessFreeTier([], u({ vectors: 1 }), 2).state).toBe('unknown');
  });

  it('one limit passed is enough to exceed; all must hold to cover', () => {
    const limits = [limit('l1', 'vectors', 50_000), limit('l2', 'queries', 100)];
    expect(assessFreeTier(limits, u({ vectors: 1, queries: 500 }), 1).state).toBe('exceeds');
    expect(assessFreeTier(limits, u({ vectors: 1, queries: 50 }), 1).state).toBe('covers');
    expect(assessFreeTier(limits, u({ vectors: 1 }), 1).state).toBe('unknown');
  });

  it('property: more traffic never turns "exceeds" back into "covers"', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e6, noNaN: true }),
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (usage, g, extra) => {
          const l = [limit('l1', 'm', 1000)];
          const base = assessFreeTier(l, u({ m: usage }), g).state;
          const more = assessFreeTier(l, u({ m: usage }), g + extra).state;
          return !(base === 'exceeds' && more === 'covers');
        },
      ),
    );
  });
});

describe('condition evaluation: unknown stays unknown (P9)', () => {
  const p = profile({
    usersNow: 500,
    budget: 'free_only',
    deployTarget: 'platform.x',
    team: { size: 'solo', experience: 'unknown' },
    existingStack: [{ optionId: 'option.a', params: {} }],
    mustHaves: [{ kind: 'eu_data_residency' }],
  });

  it('evaluates scalar, numeric, membership conditions', () => {
    expect(evaluateCondition({ field: 'budget', op: 'eq', value: 'free_only' }, p)).toBe(true);
    expect(evaluateCondition({ field: 'budget', op: 'neq', value: 'free_only' }, p)).toBe(false);
    expect(evaluateCondition({ field: 'usersNow', op: 'lte', value: 1000 }, p)).toBe(true);
    expect(evaluateCondition({ field: 'usersNow', op: 'gte', value: 1000 }, p)).toBe(false);
    expect(evaluateCondition({ field: 'team.size', op: 'eq', value: 'solo' }, p)).toBe(true);
    expect(evaluateCondition({ field: 'deployTarget', op: 'eq', value: 'platform.x' }, p)).toBe(true);
    expect(evaluateCondition({ field: 'existingStack', op: 'includes', value: 'option.a' }, p)).toBe(true);
    expect(evaluateCondition({ field: 'existingStack', op: 'includes', value: 'option.z' }, p)).toBe(false);
    expect(evaluateCondition({ field: 'mustHaves', op: 'includes', value: 'eu_data_residency' }, p)).toBe(true);
    expect(evaluateCondition({ field: 'mustHaves', op: 'includes', value: 'compliance' }, p)).toBe(false);
  });

  it('returns null (unknown) when the field is unknown, never true or false', () => {
    expect(evaluateCondition({ field: 'team.experience', op: 'eq', value: 'beginner' }, p)).toBeNull();
    expect(evaluateCondition({ field: 'usersIn12Months', op: 'gte', value: 1 }, p)).toBeNull();
    expect(evaluateCondition({ field: 'purpose', op: 'eq', value: 'startup' }, p)).toBeNull();
    expect(evaluateCondition({ field: 'monthlyCeilingUsd', op: 'lte', value: 10 }, p)).toBeNull();
  });

  it('returns null for operators that do not fit the field', () => {
    expect(evaluateCondition({ field: 'budget', op: 'lte', value: 'free_only' }, p)).toBeNull();
    expect(evaluateCondition({ field: 'usersNow', op: 'includes', value: 5 }, p)).toBeNull();
    expect(evaluateCondition({ field: 'usersNow', op: 'eq', value: 'many' }, p)).toBeNull();
  });

  it('allTrue needs every condition definitely true; notRuledOut only needs none definitely false', () => {
    const yes = { field: 'budget', op: 'eq', value: 'free_only' } as const;
    const no = { field: 'budget', op: 'eq', value: 'flexible' } as const;
    const unk = { field: 'purpose', op: 'eq', value: 'startup' } as const;
    expect(allTrue([yes], p)).toBe(true);
    expect(allTrue([yes, unk], p)).toBe(false);
    expect(notRuledOut([yes, unk], p)).toBe(true);
    expect(notRuledOut([yes, no], p)).toBe(false);
    expect(allTrue([], p)).toBe(true);
    expect(notRuledOut([], p)).toBe(true);
  });
});
