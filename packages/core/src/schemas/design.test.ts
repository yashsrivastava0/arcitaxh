import { describe, expect, it } from 'vitest';
import { findUnknownOptions } from '../design/unknown-options';
import { edge, fakeKb, graph, LIMITS, node, optionRecord } from '../test/helpers';
import { checkInvariants, createDesignGraphSchema, parseDesign } from './design';

const invariantsOf = (g: unknown, limits = LIMITS): (string | null)[] => {
  const r = parseDesign(g, limits);
  return r.success ? [] : r.issues.map((i) => i.invariant);
};

describe('design graph: a valid design', () => {
  it('parses a small retrieval-app shaped design', () => {
    const g = graph(
      [node('client', { type: 'client' }), node('api'), node('db', { type: 'database' })],
      [edge('e1', 'client', 'api'), edge('e2', 'api', 'db', { timeoutMs: 2000, retries: 1, note: 'reads' })],
    );
    const r = parseDesign(g, LIMITS);
    expect(r.success).toBe(true);
  });

  it('allows cycles (I6): agents often loop, a rule reports them', () => {
    const g = graph([node('a'), node('b')], [edge('e1', 'a', 'b'), edge('e2', 'b', 'a'), edge('e3', 'a', 'a')]);
    expect(parseDesign(g, LIMITS).success).toBe(true);
  });

  it('allows an empty design', () => {
    expect(parseDesign(graph([]), LIMITS).success).toBe(true);
  });
});

describe('design invariants', () => {
  it('I1: rejects an edge whose endpoint does not exist', () => {
    expect(invariantsOf(graph([node('a')], [edge('e1', 'a', 'ghost')]))).toEqual(['I1']);
    expect(invariantsOf(graph([node('a')], [edge('e1', 'ghost', 'a')]))).toEqual(['I1']);
  });

  it('I2: rejects duplicate component ids and duplicate edge ids', () => {
    expect(invariantsOf(graph([node('a'), node('a')]))).toEqual(['I2']);
    expect(invariantsOf(graph([node('a'), node('b')], [edge('e1', 'a', 'b'), edge('e1', 'b', 'a')]))).toEqual(['I2']);
  });

  it('I2: a component and an edge may share an id (separate namespaces)', () => {
    expect(parseDesign(graph([node('x'), node('y')], [edge('x', 'x', 'y')]), LIMITS).success).toBe(true);
  });

  it('I3: rejects a decided component with no choice, accepts one with a choice', () => {
    expect(invariantsOf(graph([node('db', { status: 'decided' })]))).toEqual(['I3']);
    const ok = node('db', {
      status: 'decided',
      decisionType: 'vector-store',
      choice: { optionId: 'option.a', params: {} },
    });
    expect(parseDesign(graph([ok]), LIMITS).success).toBe(true);
  });

  it('I3: a custom component carries a classification status, and rejects an unknown one', () => {
    const bad = { ...node('c', { type: 'custom' }), classification: 'guessed' };
    expect(parseDesign({ nodes: [bad], edges: [] }, LIMITS).success).toBe(false);
    expect(parseDesign(graph([node('c', { type: 'custom', classification: 'unclassified' })]), LIMITS).success).toBe(
      true,
    );
  });

  it('I7: rejects more components than the configured maximum (default 200)', () => {
    const many = Array.from({ length: LIMITS.maxComponents + 1 }, (_, i) => node(`n${i}`));
    expect(invariantsOf(graph(many))).toEqual(['I7']);
    expect(parseDesign(graph(many.slice(0, LIMITS.maxComponents)), LIMITS).success).toBe(true);
  });

  it('I7 uses the limit it is given, not a constant', () => {
    const three = graph([node('a'), node('b'), node('c')]);
    expect(invariantsOf(three, { ...LIMITS, maxComponents: 2 })).toEqual(['I7']);
  });

  it('bounds the number of edges', () => {
    const g = graph([node('a'), node('b')], [edge('e1', 'a', 'b'), edge('e2', 'b', 'a')]);
    expect(invariantsOf(g, { ...LIMITS, maxEdges: 1 })).toEqual(['LIMIT_EDGES']);
  });

  it('I8: free text is length limited (label at most 80 characters, notes at the configured maximum)', () => {
    expect(parseDesign(graph([node('a', { label: 'x'.repeat(80) })]), LIMITS).success).toBe(true);
    expect(parseDesign(graph([node('a', { label: 'x'.repeat(81) })]), LIMITS).success).toBe(false);
    expect(parseDesign(graph([node('a', { label: '' })]), LIMITS).success).toBe(false);
    const tooLongNote = graph(
      [node('a'), node('b')],
      [edge('e1', 'a', 'b', { note: 'n'.repeat(LIMITS.maxNoteChars + 1) })],
    );
    expect(parseDesign(tooLongNote, LIMITS).success).toBe(false);
  });

  it('reports every violation at once, with paths', () => {
    const r = parseDesign(graph([node('a'), node('a', { status: 'decided' })], [edge('e1', 'a', 'ghost')]), LIMITS);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.issues.map((i) => i.invariant).sort()).toEqual(['I1', 'I2', 'I3']);
      expect(r.issues.find((i) => i.invariant === 'I1')?.path).toBe('edges.0.to');
    }
  });

  it('checkInvariants works on any structurally shaped graph', () => {
    expect(checkInvariants({ nodes: [{ id: 'a', status: 'decided', choice: null }], edges: [] }, LIMITS)).toHaveLength(
      1,
    );
  });
});

describe('design schema strictness', () => {
  const valid = () => ({ nodes: [node('a')], edges: [] as unknown[] });

  it('rejects unknown keys anywhere (nothing smuggled into a verdict input)', () => {
    expect(parseDesign({ ...valid(), extra: 1 }, LIMITS).success).toBe(false);
    expect(parseDesign({ nodes: [{ ...node('a'), sneaky: true }], edges: [] }, LIMITS).success).toBe(false);
  });

  it('rejects bad ids, non-finite positions and out-of-range traits', () => {
    expect(parseDesign({ nodes: [{ ...node('a'), id: 'has space' }], edges: [] }, LIMITS).success).toBe(false);
    expect(
      parseDesign({ nodes: [{ ...node('a'), position: { x: Number.NaN, y: 0 } }], edges: [] }, LIMITS).success,
    ).toBe(false);
    expect(parseDesign({ nodes: [{ ...node('a'), traits: { readRatio: 1.5 } }], edges: [] }, LIMITS).success).toBe(
      false,
    );
    expect(parseDesign({ nodes: [{ ...node('a'), traits: { readRatio: 0.9 } }], edges: [] }, LIMITS).success).toBe(
      true,
    );
  });

  it('rejects an unknown component type and bad edge modes', () => {
    expect(parseDesign({ nodes: [{ ...node('a'), type: 'blockchain' }], edges: [] }, LIMITS).success).toBe(false);
    expect(
      parseDesign({ nodes: [node('a'), node('b')], edges: [{ ...edge('e', 'a', 'b'), mode: 'maybe' }] }, LIMITS)
        .success,
    ).toBe(false);
    expect(
      parseDesign({ nodes: [node('a'), node('b')], edges: [{ ...edge('e', 'a', 'b'), timeoutMs: -5 }] }, LIMITS)
        .success,
    ).toBe(false);
  });

  it('can be used directly as a Zod schema', () => {
    expect(createDesignGraphSchema(LIMITS).safeParse(valid()).success).toBe(true);
  });
});

describe('I4: option must exist for its decision type', () => {
  const kb = fakeKb([optionRecord('option.a'), optionRecord('option.b')]);

  it('reports an unknown option instead of rejecting the design', () => {
    const g = graph([
      node('ok', { status: 'decided', decisionType: 'vector-store', choice: { optionId: 'option.a', params: {} } }),
      node('bad', { status: 'decided', decisionType: 'vector-store', choice: { optionId: 'option.zzz', params: {} } }),
      node('free', {}),
    ]);
    expect(parseDesign(g, LIMITS).success).toBe(true);
    expect(findUnknownOptions(g, kb)).toEqual([
      { componentId: 'bad', decisionType: 'vector-store', optionId: 'option.zzz' },
    ]);
  });

  it('treats a choice with no decision type as unknown (it cannot be verified)', () => {
    const g = graph([node('x', { status: 'decided', choice: { optionId: 'option.a', params: {} } })]);
    expect(findUnknownOptions(g, kb)).toHaveLength(1);
  });

  it('treats an option of a different decision type as unknown', () => {
    const g = graph([
      node('x', { status: 'decided', decisionType: 'database', choice: { optionId: 'option.a', params: {} } }),
    ]);
    expect(findUnknownOptions(g, kb)).toHaveLength(1);
  });
});
