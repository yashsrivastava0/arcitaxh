import { parseDefaults, type FreshnessConfig, type KbRecord } from '@product/core';
import { describe, expect, it } from 'vitest';
import cost from '../../../config/defaults/cost.json';
import debate from '../../../config/defaults/debate.json';
import finalists from '../../../config/defaults/finalists.json';
import freshnessJson from '../../../config/defaults/freshness.json';
import retention from '../../../config/defaults/retention.json';
import rules from '../../../config/defaults/rules.json';
import scoring from '../../../config/defaults/scoring.json';
import { expectedValidUntil, freshnessState, ttlDays, ttlKey } from './freshness';

const cfg = freshnessJson as FreshnessConfig;

const rec = (type: string, body: Record<string, unknown> = {}, last = '2026-10-18'): KbRecord =>
  ({
    id: `fake.${type}`,
    type,
    decision_type: 'vector-store',
    subject: 'x',
    body,
    verification: { last_verified: last, valid_until: last, verified_by: 't' },
  }) as unknown as KbRecord;

describe('ttl lookup (spec 8.4 defaults from config)', () => {
  it('maps record types to their TTL entry', () => {
    expect(ttlDays(rec('price'), cfg)).toBe(30);
    expect(ttlDays(rec('limit', { scope: 'free_tier' }), cfg)).toBe(30);
    expect(ttlDays(rec('limit', { scope: 'rate_limit' }), cfg)).toBe(30);
    expect(ttlDays(rec('capability'), cfg)).toBe(90);
    expect(ttlDays(rec('latency_profile'), cfg)).toBe(14);
    expect(ttlDays(rec('guidance'), cfg)).toBe(180);
  });

  it('a rate-limit scope selects the rate_limit entry', () => {
    expect(ttlKey(rec('limit', { scope: 'rate_limit' }))).toBe('rate_limit');
    expect(ttlKey(rec('limit', { scope: 'rate_limit:tier-1' }))).toBe('rate_limit');
    expect(ttlKey(rec('limit', { scope: 'free_tier' }))).toBe('limit');
  });

  it('returns null for types with no defined TTL instead of guessing (plan A10)', () => {
    for (const t of ['option', 'tradeoff', 'flip', 'antipattern']) expect(ttlDays(rec(t), cfg), t).toBeNull();
    expect(expectedValidUntil(rec('option'), cfg)).toBeNull();
  });

  it('a TTL that is configured for those types is used', () => {
    const withOption = parseDefaults({
      ...allDefaults(),
      freshness: { ...cfg, ttl_days: { ...cfg.ttl_days, option: 90 } },
    }).freshness;
    expect(ttlDays(rec('option'), withOption)).toBe(90);
  });

  it('expectedValidUntil is last_verified plus the TTL (spec 8.3 example: 30 days)', () => {
    expect(expectedValidUntil(rec('price', {}, '2026-10-18'), cfg)).toBe('2026-11-17');
    expect(expectedValidUntil(rec('latency_profile', {}, '2026-10-18'), cfg)).toBe('2026-11-01');
  });
});

describe('freshnessState', () => {
  const s = (today: string) => freshnessState('2026-11-17', today, cfg);
  it('is fresh until the last seven days, due soon inside them, expired the day after valid_until', () => {
    expect(s('2026-10-18')).toBe('fresh');
    expect(s('2026-11-09')).toBe('fresh'); // 8 days left
    expect(s('2026-11-10')).toBe('due_soon'); // 7 days left
    expect(s('2026-11-17')).toBe('due_soon'); // valid on its last day
    expect(s('2026-11-18')).toBe('expired');
    expect(s('2027-01-01')).toBe('expired');
  });
});

function allDefaults() {
  return { scoring, finalists, rules, freshness: freshnessJson, debate, cost, retention };
}
