import { describe, expect, it } from 'vitest';
import { optionRecord } from '../test/helpers';
import { decisionTypeDefSchema, kbProposalSchema, kbRecordSchema } from './kb';

// Every value below is fake (vendor.example). None is a fact about any real product.
const source = {
  url: 'https://vendor.example/pricing',
  quote: 'Fake sentence for tests only.',
  retrieved_on: '2026-10-18',
};
const verification = { last_verified: '2026-10-18', valid_until: '2026-11-17', verified_by: 'test' };
const env = (type: string, body: unknown) => ({
  id: `fake.${type}.2026-10`,
  type,
  decision_type: 'vector-store',
  subject: 'option.fake-primary',
  body,
  source,
  verification,
  curator_note: '',
});

const bodies = {
  limit: {
    scope: 'free_tier',
    metric: 'stored_vectors',
    value: 1000,
    unit: 'vectors',
    period: 'none',
    overage_behaviour: 'hard_stop',
    pauses_after_inactivity: false,
    scales_to_zero: false,
  },
  price: {
    currency: 'USD',
    unit: 'per_million_input_tokens',
    unit_name: null,
    amount: '2.5',
    tier: 'standard',
    billing_period: 'none',
    includes: '',
  },
  capability: { capability_id: 'hybrid_search', support: 'yes', notes: '' },
  latency_profile: {
    operation: 'query',
    region: 'eu-example-1',
    p50_ms: 10,
    p95_ms: 30,
    basis: 'first_party_measured',
    measured_on: '2026-10-18',
    sample_conditions: 'fake',
  },
  tradeoff: { sentence: 'A fake trade-off.', applies_when: [{ field: 'budget', op: 'eq', value: 'free_only' }] },
  flip: { condition: { field: 'usersNow', op: 'gte', value: 1000 }, explanation: 'Fake flip.' },
  guidance: {
    source_document: 'Fake guide',
    licence: 'CC BY 4.0',
    paraphrase: 'A paraphrase.',
    grounded_in: 'https://vendor.example/guide',
  },
  antipattern: { rule_id: 'R-01', description: 'A fake antipattern.' },
} as const;

describe('kbRecordSchema', () => {
  it('accepts an option record', () => {
    expect(kbRecordSchema.safeParse(optionRecord('option.fake-primary')).success).toBe(true);
  });

  it.each(Object.entries(bodies))('accepts a %s record', (type, body) => {
    const r = kbRecordSchema.safeParse(env(type, body));
    expect(r.success, JSON.stringify(r.success ? '' : r.error.issues)).toBe(true);
  });

  it('rejects the spec 8.3 placeholder example: a placeholder value is not a number', () => {
    const placeholder = env('limit', { ...bodies.limit, value: '<number copied from the source>' });
    expect(kbRecordSchema.safeParse(placeholder).success).toBe(false);
  });

  it('rejects non-https sources and non-URLs', () => {
    expect(
      kbRecordSchema.safeParse({
        ...env('capability', bodies.capability),
        source: { ...source, url: 'http://vendor.example/x' },
      }).success,
    ).toBe(false);
    expect(
      kbRecordSchema.safeParse({
        ...env('capability', bodies.capability),
        source: { ...source, url: 'javascript:alert(1)' },
      }).success,
    ).toBe(false);
    expect(
      kbRecordSchema.safeParse({ ...env('capability', bodies.capability), source: { ...source, url: 'not a url' } })
        .success,
    ).toBe(false);
  });

  it('requires a quote, a verifier and dates in order', () => {
    expect(
      kbRecordSchema.safeParse({ ...env('capability', bodies.capability), source: { ...source, quote: '' } }).success,
    ).toBe(false);
    expect(
      kbRecordSchema.safeParse({
        ...env('capability', bodies.capability),
        verification: { ...verification, verified_by: '' },
      }).success,
    ).toBe(false);
    expect(
      kbRecordSchema.safeParse({
        ...env('capability', bodies.capability),
        verification: { ...verification, valid_until: '2026-10-01' },
      }).success,
    ).toBe(false);
    expect(
      kbRecordSchema.safeParse({
        ...env('capability', bodies.capability),
        verification: { ...verification, last_verified: null },
      }).success,
    ).toBe(false);
  });

  it('typed bodies reject prose where a behaviour or number is required', () => {
    expect(kbRecordSchema.safeParse(env('limit', { ...bodies.limit, overage_behaviour: 'it depends' })).success).toBe(
      false,
    );
    expect(kbRecordSchema.safeParse(env('limit', { ...bodies.limit, value: -1 })).success).toBe(false);
    expect(kbRecordSchema.safeParse(env('price', { ...bodies.price, amount: 2.5 })).success).toBe(false); // money is a decimal string, never a float
    expect(kbRecordSchema.safeParse(env('price', { ...bodies.price, currency: 'dollars' })).success).toBe(false);
    expect(kbRecordSchema.safeParse(env('latency_profile', { ...bodies.latency_profile, p95_ms: 5 })).success).toBe(
      false,
    ); // p95 below p50
    expect(kbRecordSchema.safeParse(env('capability', { ...bodies.capability, support: 'maybe' })).success).toBe(false);
  });

  it('rejects an unknown record type, a type/body mismatch and extra keys', () => {
    expect(kbRecordSchema.safeParse(env('opinion', bodies.capability)).success).toBe(false);
    expect(kbRecordSchema.safeParse(env('limit', bodies.price)).success).toBe(false);
    expect(kbRecordSchema.safeParse({ ...env('capability', bodies.capability), extra: 1 }).success).toBe(false);
  });
});

describe('kbProposalSchema', () => {
  const proposal = (over: Record<string, unknown> = {}) => ({
    ...env('capability', bodies.capability),
    status: 'proposed',
    verification: { last_verified: null, valid_until: null, verified_by: null },
    ...over,
  });

  it('accepts a proposal: unverified, with a quote', () => {
    expect(kbProposalSchema.safeParse(proposal()).success).toBe(true);
  });

  it('a proposal is not a record, and a record is not a proposal', () => {
    expect(kbRecordSchema.safeParse(proposal()).success).toBe(false);
    expect(kbProposalSchema.safeParse({ ...env('capability', bodies.capability), status: 'proposed' }).success).toBe(
      false,
    );
  });

  it('a proposal cannot claim a verifier (models never write verified records, K5)', () => {
    expect(
      kbProposalSchema.safeParse(
        proposal({ verification: { last_verified: null, valid_until: null, verified_by: 'model' } }),
      ).success,
    ).toBe(false);
  });
});

describe('decisionTypeDefSchema', () => {
  const def = {
    id: 'vector-store',
    title: 'Vector store',
    summary: 'Where embeddings live.',
    launch: true,
    palette_types: ['vector_store'],
    required_context: [{ field: 'usersNow', question: 'About how many users do you have now?' }],
    elimination: ['E-1', 'E-2', 'E-3', 'E-4'],
    design_rules: ['R-05', 'R-07'],
    deferral_option: 'option.keep-vector-search-in-existing-database',
    applies_when: [],
  };

  it('accepts a decision type definition with a deferral option', () => {
    expect(decisionTypeDefSchema.safeParse(def).success).toBe(true);
    expect(decisionTypeDefSchema.safeParse({ ...def, deferral_option: null }).success).toBe(true);
  });

  it('rejects unknown palette types, elimination families, rule ids and context fields', () => {
    expect(decisionTypeDefSchema.safeParse({ ...def, palette_types: ['spaceship'] }).success).toBe(false);
    expect(decisionTypeDefSchema.safeParse({ ...def, elimination: ['E-9'] }).success).toBe(false);
    expect(decisionTypeDefSchema.safeParse({ ...def, design_rules: ['rule-5'] }).success).toBe(false);
    expect(
      decisionTypeDefSchema.safeParse({ ...def, required_context: [{ field: 'mood', question: 'How are you?' }] })
        .success,
    ).toBe(false);
    expect(decisionTypeDefSchema.safeParse({ ...def, palette_types: [] }).success).toBe(false);
  });
});
