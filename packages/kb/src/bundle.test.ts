import { canonicalJson } from '@product/core';
import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { buildBundle } from './bundle';
import { parseKbSource, type SourceFile } from './parse';

const verification = { last_verified: '2026-10-18', valid_until: '2027-01-16', verified_by: 'founder' };
const source = { url: 'https://docs.alpha-db.test/pricing', quote: 'Alpha pricing', retrieved_on: '2026-10-18' };
const option = (id: string) => ({
  id,
  type: 'option',
  decision_type: 'vector-store',
  subject: id,
  body: {
    name: id,
    vendor: 'v',
    categories: ['store'],
    platform: null,
    deployment: 'managed',
    regions: [],
    licence: null,
    status: 'generally_available',
    migration_effort: 'low',
    ops_burden: 'low',
    applies_when: [],
    why_pick: [],
    why_not: [],
  },
  source,
  verification,
  curator_note: '',
});
const dt = {
  id: 'vector-store',
  title: 'Vector store',
  summary: 'x',
  launch: true,
  palette_types: ['vector_store'],
  required_context: [],
  elimination: [],
  design_rules: [],
  deferral_option: null,
  applies_when: [],
};
const y = (path: string, o: unknown): SourceFile => ({ path, content: stringify(o) });

describe('buildBundle', () => {
  const files = [
    y('decision-types/vector-store.yaml', dt),
    y('options/vector-store/b.yaml', option('option.b')),
    y('options/vector-store/a.yaml', option('option.a')),
  ];

  it('is deterministic: file order never changes the bytes', () => {
    const a = buildBundle(parseKbSource(files).tree, { version: 'kb-2026.10.1', commit: null });
    const b = buildBundle(parseKbSource([...files].reverse()).tree, { version: 'kb-2026.10.1', commit: null });
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(a.records.map((r) => r.id)).toEqual(['option.a', 'option.b']);
  });

  it('never includes proposals', () => {
    const proposal = {
      ...option('option.p'),
      status: 'proposed',
      verification: { last_verified: null, valid_until: null, verified_by: null },
    };
    const parsed = parseKbSource([...files, y('proposals/p.yaml', proposal)]);
    expect(parsed.tree.proposals).toHaveLength(1);
    const bundle = buildBundle(parsed.tree, { version: 'kb-2026.10.1', commit: 'abcdef1' });
    expect(bundle.records.map((r) => r.id)).not.toContain('option.p');
    expect(bundle.commit).toBe('abcdef1');
  });

  it('refuses a bad version or a tree whose records reference a missing decision type', () => {
    expect(() => buildBundle(parseKbSource(files).tree, { version: 'latest', commit: null })).toThrow();
    const orphan = parseKbSource([y('options/vector-store/a.yaml', option('option.a'))]);
    expect(() => buildBundle(orphan.tree, { version: 'kb-2026.10.1', commit: null })).toThrow(/unknown decision type/);
  });

  it('an empty KB with decision types builds (verdicts for it are kb_gap, never invented)', () => {
    const b = buildBundle(parseKbSource([y('decision-types/vector-store.yaml', dt)]).tree, {
      version: 'kb-dev',
      commit: null,
    });
    expect(b.records).toEqual([]);
    expect(b.decisionTypes).toHaveLength(1);
  });
});
