// Test helpers shared by core tests. Not part of the public API. Reads the real config/defaults/rules.json so tests
// use the same limits as production.
import fc from 'fast-check';
import rulesJson from '../../../../config/defaults/rules.json';
import type { KBReader } from '../ports';
import type { ContextProfile } from '../schemas/context';
import { emptyContextProfile } from '../schemas/context';
import { emptyUsageInputs } from '../schemas/usage';
import type { Component, DesignGraph, DesignLimits, Edge } from '../schemas/design';
import type { DecisionTypeDef, KbRecord, OptionRecord, RecordType } from '../schemas/kb';
import type { Constraints } from '../schemas/verdict';

export const LIMITS: DesignLimits = {
  maxComponents: rulesJson.max_components,
  maxEdges: rulesJson.max_edges,
  maxLabelChars: rulesJson.max_label_chars,
  maxNoteChars: rulesJson.max_note_chars,
};

export function node(id: string, over: Partial<Component> = {}): Component {
  return {
    id,
    type: 'api',
    label: id,
    status: 'undecided',
    decisionType: null,
    choice: null,
    classification: 'classified',
    traits: {},
    position: { x: 0, y: 0 },
    ...over,
  };
}

export function edge(id: string, from: string, to: string, over: Partial<Edge> = {}): Edge {
  return { id, from, to, mode: 'sync', ...over };
}

export function graph(nodes: Component[], edges: Edge[] = []): DesignGraph {
  return { nodes, edges };
}

export function profile(over: Partial<ContextProfile> = {}): ContextProfile {
  return { ...emptyContextProfile(), ...over };
}

export function constraints(over: Partial<Constraints> = {}): Constraints {
  return {
    profile: profile(),
    usage: emptyUsageInputs(),
    weights: {
      cost_fit: 1 / 6,
      scale_fit: 1 / 6,
      latency_fit: 1 / 6,
      operational_simplicity: 1 / 6,
      ecosystem_fit: 1 / 6,
      reversibility: 1 / 6,
    },
    freeOnly: false,
    latencyBudgetMs: null,
    euResidencyRequired: false,
    requiredCapabilities: [],
    avoidedVendors: [],
    assumptions: [],
    ...over,
  };
}

// ---- fake KB records (vendor.example only; nothing here is a real fact) ----

const FAKE_SOURCE = {
  url: 'https://vendor.example/pricing',
  quote: 'Fake sentence for tests only.',
  retrieved_on: '2026-10-18',
};
const FAKE_VERIFICATION = { last_verified: '2026-10-18', valid_until: '2026-11-17', verified_by: 'test' };

export function optionRecord(
  id: string,
  decisionType = 'vector-store',
  over: Partial<OptionRecord['body']> = {},
): OptionRecord {
  return {
    id,
    type: 'option',
    decision_type: decisionType,
    subject: id,
    body: {
      name: `Fake ${id}`,
      vendor: 'vendor.example',
      categories: ['store'],
      platform: null,
      deployment: 'managed',
      regions: ['eu-example-1'],
      licence: null,
      status: 'generally_available',
      migration_effort: 'low',
      ops_burden: 'low',
      applies_when: [],
      why_pick: [],
      why_not: [],
      ...over,
    },
    source: FAKE_SOURCE,
    verification: FAKE_VERIFICATION,
    curator_note: '',
  };
}

type Body<T extends RecordType> = Extract<KbRecord, { type: T }>['body'];

/** A fake record of any type. `verification` defaults to fresh on 2026-10-20 (valid until 2026-11-17). */
function fakeRecord<T extends RecordType>(
  type: T,
  id: string,
  subject: string,
  body: Body<T>,
  verification: { last_verified: string; valid_until: string; verified_by: string } = FAKE_VERIFICATION,
): Extract<KbRecord, { type: T }> {
  return {
    id,
    type,
    decision_type: 'vector-store',
    subject,
    body,
    source: FAKE_SOURCE,
    verification,
    curator_note: '',
  } as unknown as Extract<KbRecord, { type: T }>;
}

export const EXPIRED = { last_verified: '2026-01-01', valid_until: '2026-02-01', verified_by: 'test' };

export function latencyRecord(
  id: string,
  subject: string,
  p50: number,
  p95: number,
  over: Partial<Body<'latency_profile'>> = {},
  verification?: typeof FAKE_VERIFICATION,
) {
  return fakeRecord(
    'latency_profile',
    id,
    subject,
    {
      operation: 'query',
      region: 'eu-example-1',
      p50_ms: p50,
      p95_ms: p95,
      basis: 'first_party_measured',
      measured_on: '2026-10-18',
      sample_conditions: 'fake',
      ...over,
    },
    verification,
  );
}

export function limitRecord(
  id: string,
  subject: string,
  over: Partial<Body<'limit'>> = {},
  verification?: typeof FAKE_VERIFICATION,
) {
  return fakeRecord(
    'limit',
    id,
    subject,
    {
      scope: 'free_tier',
      metric: 'stored_vectors',
      value: 10_000,
      unit: 'vectors',
      period: 'none',
      overage_behaviour: 'hard_stop',
      pauses_after_inactivity: false,
      scales_to_zero: false,
      ...over,
    },
    verification,
  );
}

export function priceRecord(
  id: string,
  subject: string,
  over: Partial<Body<'price'>> = {},
  verification?: typeof FAKE_VERIFICATION,
) {
  return fakeRecord(
    'price',
    id,
    subject,
    {
      currency: 'USD',
      unit: 'fixed_per_month',
      unit_name: null,
      amount: '10',
      tier: 'standard',
      billing_period: 'month',
      includes: '',
      ...over,
    },
    verification,
  );
}

export const FAKE_DECISION_TYPE: DecisionTypeDef = {
  id: 'vector-store',
  title: 'Vector store (fake)',
  summary: 'Fake decision type for tests.',
  launch: false,
  palette_types: ['vector_store'],
  required_context: [{ field: 'usersNow', question: 'About how many users do you have now?' }],
  elimination: ['E-1', 'E-2', 'E-3', 'E-4'],
  design_rules: ['R-05'],
  deferral_option: null,
  applies_when: [],
};

/** A minimal in-memory KBReader over the given records. */
export function fakeKb(
  records: KbRecord[],
  decisionTypes: DecisionTypeDef[] = [FAKE_DECISION_TYPE],
  version = 'kb-test.0.1',
): KBReader {
  return {
    version,
    decisionTypes: () => decisionTypes,
    decisionType: (id) => decisionTypes.find((d) => d.id === id) ?? null,
    options: (dt) => records.filter((r): r is OptionRecord => r.type === 'option' && r.decision_type === dt),
    record: (id) => records.find((r) => r.id === id) ?? null,
    records: (q) =>
      records.filter(
        (r) =>
          r.decision_type === q.decisionType &&
          (q.type === undefined || r.type === (q.type satisfies RecordType)) &&
          (q.subject === undefined || r.subject === q.subject),
      ),
  };
}

// ---- fast-check arbitraries ----

const idArb = fc.integer({ min: 0, max: 40 }).map((n) => `c${n}`);

/** A random but valid design: unique node ids, edges only between existing nodes. */
export const designArb: fc.Arbitrary<DesignGraph> = fc.uniqueArray(idArb, { minLength: 1, maxLength: 8 }).chain((ids) =>
  fc.record({
    nodes: fc
      .tuple(
        ...ids.map(() =>
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 20 }),
            x: fc.integer(),
            y: fc.integer(),
            type: fc.constantFrom('api', 'database', 'cache', 'queue', 'custom'),
          }),
        ),
      )
      .map((specs) =>
        specs.map((s, i) => node(ids[i] as string, { label: s.label, type: s.type, position: { x: s.x, y: s.y } })),
      ),
    edges: fc
      .uniqueArray(fc.tuple(fc.constantFrom(...ids), fc.constantFrom(...ids), fc.constantFrom('sync', 'async')), {
        maxLength: 10,
        selector: ([a, b]) => `${a}>${b}`,
      })
      .map((es) => es.map(([from, to, mode], i) => edge(`e${i}`, from, to, { mode }))),
  }),
);
