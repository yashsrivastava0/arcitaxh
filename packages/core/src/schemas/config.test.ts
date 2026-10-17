import { describe, expect, it } from 'vitest';
import cost from '../../../../config/defaults/cost.json';
import debate from '../../../../config/defaults/debate.json';
import finalists from '../../../../config/defaults/finalists.json';
import freshness from '../../../../config/defaults/freshness.json';
import retention from '../../../../config/defaults/retention.json';
import rules from '../../../../config/defaults/rules.json';
import scoring from '../../../../config/defaults/scoring.json';
import phase0 from '../../../../config/phase0.json';
import roster from '../../../../config/model-roster.json';
import {
  FOUNDER_TO_SET,
  parseDefaults,
  phase0ConfigSchema,
  phase0MissingInputs,
  rosterPlaceholders,
  rosterSchema,
} from './config';

const raw = { scoring, finalists, rules, freshness, debate, cost, retention };
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

describe('config/defaults/*.json', () => {
  it('all seven files validate against their schemas', () => {
    const d = parseDefaults(raw);
    expect(d.scoring.theta_clear).toBe(0.15);
    expect(d.scoring.theta_uncertain).toBe(0.05);
    expect(d.finalists.max_finalists).toBe(3);
    expect(d.rules.month_days).toBe(30);
    expect(d.rules.max_components).toBe(200);
    expect(d.rules.read_ratio_threshold).toBe(0.8);
    expect(d.freshness.ttl_days).toMatchObject({
      price: 30,
      limit: 30,
      rate_limit: 30,
      capability: 90,
      latency_profile: 14,
      guidance: 180,
    });
    expect(d.debate.max_rounds).toBe(3);
    expect(d.debate.default_rounds).toBe(2);
    expect(d.debate.timeouts_s).toEqual({ explain: 15, turn: 90, judge: 120 });
    expect(d.cost.length_match_tolerance_pct).toBe(10);
    expect(d.retention.verdict_cache_days).toBe(90);
  });

  it('every file states its status and source', () => {
    for (const [name, file] of Object.entries(raw)) {
      expect((file as { _status: string })._status, name).toMatch(/\S/);
      expect((file as { _source: string })._source, name).toMatch(/\S/);
    }
  });

  it('the scoring multipliers match specification 6.5', () => {
    const m = Object.fromEntries(scoring.multipliers.map((x) => [x.when, [x.dimension, x.factor]]));
    expect(m).toEqual({
      solo_or_beginner: ['operational_simplicity', 2],
      free_tiers_only: ['cost_fit', 2],
      latency_must_have: ['latency_fit', 2],
      existing_stack_platform: ['ecosystem_fit', 1.5],
      users_12m_at_least_growth_ratio: ['scale_fit', 1.5],
    });
    expect(scoring.dimension_values.reversibility).toEqual({ low: 1.0, medium: 0.6, high: 0.2, unknown: 0.5 });
  });

  it('freshness leaves the TTLs the specification does not give undefined (plan A10)', () => {
    expect(Object.keys(freshness.ttl_days).sort()).toEqual([
      'capability',
      'guidance',
      'latency_profile',
      'limit',
      'price',
      'rate_limit',
    ]);
  });

  it('rejects cross-field mistakes and bad values with a path', () => {
    const bad = clone(raw);
    bad.scoring.theta_uncertain = 0.2;
    expect(() => parseDefaults(bad)).toThrow(/theta_uncertain/);

    const rounds = clone(raw);
    rounds.debate.max_rounds = 4;
    expect(() => parseDefaults(rounds)).toThrow();

    const finalistCap = clone(raw);
    finalistCap.finalists.max_finalists = 4;
    expect(() => parseDefaults(finalistCap)).toThrow();

    const ttl = clone(raw);
    ttl.freshness.ttl_days.price = 0;
    expect(() => parseDefaults(ttl)).toThrow();

    const presets = clone(raw);
    presets.rules.scale_presets = [10, 100];
    expect(() => parseDefaults(presets)).toThrow();

    const stray = { ...clone(raw), extra: {} };
    expect(() => parseDefaults(stray)).toThrow();
  });

  it('accepts an explicit TTL for a record type that has none yet', () => {
    const withOption = clone(raw) as { freshness: { ttl_days: Record<string, number> } };
    withOption.freshness.ttl_days.option = 90;
    expect(parseDefaults(withOption).freshness.ttl_days.option).toBe(90);
  });
});

describe('config/phase0.json (founder inputs)', () => {
  it('validates and lists exactly the inputs the founder still has to set', () => {
    const cfg = phase0ConfigSchema.parse(phase0);
    expect(phase0MissingInputs(cfg)).toEqual([
      'waitlist.displayed_price_usd',
      'waitlist.displayed_period',
      'spend.phase0_model_cap_usd',
    ]);
    expect(cfg.gate).toEqual({
      waitlist_min_join_rate: 0.1,
      h1_min_preference: 0.6,
      alpha: 0.025,
      min_paired_judgments: 100,
    });
  });

  it('is complete once the founder fills it in; the price is never invented here', () => {
    const filled = phase0ConfigSchema.parse({
      ...clone(phase0),
      waitlist: { displayed_price_usd: 1, displayed_period: 'month' },
      spend: { phase0_model_cap_usd: 1 },
    });
    expect(phase0MissingInputs(filled)).toEqual([]);
  });

  it('rejects a zero or negative price and an alpha outside (0,1)', () => {
    expect(
      phase0ConfigSchema.safeParse({
        ...clone(phase0),
        waitlist: { displayed_price_usd: 0, displayed_period: 'month' },
      }).success,
    ).toBe(false);
    expect(phase0ConfigSchema.safeParse({ ...clone(phase0), gate: { ...phase0.gate, alpha: 1 } }).success).toBe(false);
  });
});

describe('config/model-roster.json (founder inputs)', () => {
  it('is all placeholders until the founder pins it, and the runner can tell', () => {
    const r = rosterSchema.parse(roster);
    const missing = rosterPlaceholders(r);
    expect(missing).toHaveLength(9 * 3);
    expect(missing).toContain('judge.modelId');
    expect(roster.roles.judge.modelId).toBe(FOUNDER_TO_SET);
  });

  it('reports only the placeholders that remain', () => {
    const r = rosterSchema.parse(roster);
    const pinned = { ...r, roles: { ...r.roles, judge: { provider: 'p', modelId: 'm', gateway: 'g' } } };
    expect(rosterPlaceholders(pinned)).not.toContain('judge.modelId');
    expect(rosterPlaceholders(pinned)).toHaveLength(8 * 3);
  });

  it('requires every role', () => {
    const { judge: _judge, ...rest } = roster.roles;
    expect(rosterSchema.safeParse({ ...clone(roster), roles: rest }).success).toBe(false);
  });
});
