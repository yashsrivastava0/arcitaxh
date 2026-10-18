import { describe, expect, it } from 'vitest';
import { FAKE_DECISION_TYPE, optionRecord } from '../test/helpers';
import { BUNDLE_FORMAT, kbBundleSchema, parseBundle, type KbBundle } from './bundle';
import { createBundleReader } from './reader';

const limit = (id: string, subject: string) => ({
  id,
  type: 'limit' as const,
  decision_type: 'vector-store',
  subject,
  body: {
    scope: 'free_tier',
    metric: 'stored_vectors',
    value: 1000,
    unit: 'vectors',
    period: 'none' as const,
    overage_behaviour: 'hard_stop' as const,
    pauses_after_inactivity: false,
    scales_to_zero: false,
  },
  source: { url: 'https://vendor.example/pricing', quote: 'Fake sentence for tests only.', retrieved_on: '2026-10-18' },
  verification: { last_verified: '2026-10-18', valid_until: '2026-11-17', verified_by: 'test' },
  curator_note: '',
});

function bundle(over: Partial<KbBundle> = {}): KbBundle {
  return {
    bundleFormat: BUNDLE_FORMAT,
    version: 'kb-2026.10.1',
    commit: null,
    decisionTypes: [FAKE_DECISION_TYPE, { ...FAKE_DECISION_TYPE, id: 'database', title: 'Database (fake)' }],
    records: [
      optionRecord('option.a'),
      optionRecord('option.b'),
      limit('limit.a.free.2026-10', 'option.a'),
      optionRecord('option.db', 'database'),
    ],
    ...over,
  };
}

describe('kbBundleSchema', () => {
  it('accepts a bundle and round-trips through JSON', () => {
    const b = bundle();
    expect(parseBundle(JSON.parse(JSON.stringify(b)))).toEqual(b);
  });

  it('accepts only release-shaped versions and the dev build', () => {
    for (const v of ['kb-2026.10.1', 'kb-2026.12.14', 'kb-dev'])
      expect(kbBundleSchema.safeParse(bundle({ version: v })).success, v).toBe(true);
    for (const v of ['2026.10.1', 'kb-2026.1.1', 'kb-latest', 'kb-2026.10', ''])
      expect(kbBundleSchema.safeParse(bundle({ version: v })).success, v).toBe(false);
  });

  it('rejects duplicate ids, unknown decision types, a wrong format number and extra keys', () => {
    expect(
      kbBundleSchema.safeParse(bundle({ records: [optionRecord('option.a'), optionRecord('option.a')] })).success,
    ).toBe(false);
    expect(kbBundleSchema.safeParse(bundle({ decisionTypes: [FAKE_DECISION_TYPE, FAKE_DECISION_TYPE] })).success).toBe(
      false,
    );
    expect(kbBundleSchema.safeParse(bundle({ records: [optionRecord('option.x', 'nonexistent')] })).success).toBe(
      false,
    );
    expect(kbBundleSchema.safeParse({ ...bundle(), bundleFormat: 2 }).success).toBe(false);
    expect(kbBundleSchema.safeParse({ ...bundle(), extra: 1 }).success).toBe(false);
  });

  it('rejects a record that is not a valid verified record (a proposal cannot be bundled)', () => {
    const proposal = {
      ...limit('limit.p.2026-10', 'option.a'),
      status: 'proposed',
      verification: { last_verified: null, valid_until: null, verified_by: null },
    };
    expect(kbBundleSchema.safeParse({ ...bundle(), records: [proposal] }).success).toBe(false);
  });
});

describe('createBundleReader', () => {
  const kb = createBundleReader(bundle());

  it('serves the release version and decision types', () => {
    expect(kb.version).toBe('kb-2026.10.1');
    expect(kb.decisionTypes().map((d) => d.id)).toEqual(['vector-store', 'database']);
    expect(kb.decisionType('database')?.title).toBe('Database (fake)');
    expect(kb.decisionType('queue')).toBeNull();
  });

  it('returns the options of one decision type only', () => {
    expect(kb.options('vector-store').map((o) => o.id)).toEqual(['option.a', 'option.b']);
    expect(kb.options('database').map((o) => o.id)).toEqual(['option.db']);
    expect(kb.options('queue')).toEqual([]);
  });

  it('looks up a record by id, or null: a missing record is absence, never a default', () => {
    expect(kb.record('limit.a.free.2026-10')?.type).toBe('limit');
    expect(kb.record('limit.zzz')).toBeNull();
  });

  it('filters records by decision type, type and subject', () => {
    expect(kb.records({ decisionType: 'vector-store' })).toHaveLength(3);
    expect(kb.records({ decisionType: 'vector-store', type: 'limit' }).map((r) => r.id)).toEqual([
      'limit.a.free.2026-10',
    ]);
    expect(
      kb
        .records({ decisionType: 'vector-store', subject: 'option.a' })
        .map((r) => r.id)
        .sort(),
    ).toEqual(['limit.a.free.2026-10', 'option.a']);
    expect(kb.records({ decisionType: 'vector-store', type: 'price' })).toEqual([]);
  });
});
