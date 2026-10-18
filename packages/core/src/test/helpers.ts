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
