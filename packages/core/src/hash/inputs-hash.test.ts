import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normaliseContext, normaliseDesign } from '../normalise/normalise';
import { constraints, designArb, edge, graph, node, profile } from '../test/helpers';
import { designHash, inputsHash, type HashInputs } from './inputs-hash';

const base = (): HashInputs => ({
  constraints: constraints({
    profile: profile({
      purpose: 'startup',
      usersNow: 500,
      budget: 'free_only',
      existingStack: [
        { optionId: 'option.b', params: { x: 1 } },
        { optionId: 'option.a', params: {} },
      ],
      mustHaves: [{ kind: 'eu_data_residency' }, { kind: 'max_p95_latency_ms', value: 1000 }],
    }),
    requiredCapabilities: ['hybrid_search', 'filtering'],
    avoidedVendors: ['option.z', 'option.y'],
    assumptions: ['Team size was not given; scoring assumed a small team.'],
  }),
  decisionType: 'vector-store',
  candidates: [
    { optionId: 'option.a', params: {} },
    { optionId: 'option.b', params: { tier: 'free' } },
  ],
  kbVersion: 'kb-2026.10.1',
  rulesVersion: 'rules-0.1.0',
  promptsVersion: null,
  modelRoster: null,
});

describe('inputsHash', () => {
  it('is a 64-character lowercase hex string', () => {
    expect(inputsHash(base())).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is stable: same inputs, byte-identical hash (golden value locks the canonical format; verified independently with Node crypto and a separate canonicaliser)', () => {
    expect(inputsHash(base())).toBe(inputsHash(base()));
    expect(inputsHash(base())).toBe('2d521218f5fdece21793ce02f8e15e75f5181d7afc16d258808f089c5de546eb');
  });

  it('does not depend on key order or on the order of order-insensitive lists', () => {
    const a = base();
    const b: HashInputs = {
      ...a,
      constraints: {
        ...a.constraints,
        profile: {
          ...a.constraints.profile,
          existingStack: [...a.constraints.profile.existingStack].reverse(),
          mustHaves: [...a.constraints.profile.mustHaves].reverse(),
        },
        requiredCapabilities: [...a.constraints.requiredCapabilities].reverse(),
        avoidedVendors: [...a.constraints.avoidedVendors].reverse(),
      },
      candidates: [...a.candidates].reverse(),
    };
    expect(inputsHash(b)).toBe(inputsHash(a));
  });

  it('every semantic input changes the hash', () => {
    const h = inputsHash(base());
    const changed: HashInputs[] = [
      { ...base(), decisionType: 'database' },
      { ...base(), kbVersion: 'kb-2026.10.2' },
      { ...base(), rulesVersion: 'rules-0.1.1' },
      { ...base(), promptsVersion: 'explain@1' },
      { ...base(), modelRoster: { judge: 'x' } },
      { ...base(), candidates: [{ optionId: 'option.a', params: {} }] },
      {
        ...base(),
        candidates: [
          { optionId: 'option.a', params: {} },
          { optionId: 'option.b', params: { tier: 'paid' } },
        ],
      },
      { ...base(), constraints: constraints({ ...base().constraints, freeOnly: true }) },
      {
        ...base(),
        constraints: constraints({
          ...base().constraints,
          profile: profile({ ...base().constraints.profile, usersNow: 501 }),
        }),
      },
      { ...base(), constraints: constraints({ ...base().constraints, assumptions: [] }) },
      {
        ...base(),
        constraints: constraints({ ...base().constraints, weights: { ...base().constraints.weights, cost_fit: 0.5 } }),
      },
    ];
    const hashes = changed.map(inputsHash);
    for (const x of hashes) expect(x).not.toBe(h);
    expect(new Set(hashes).size).toBe(hashes.length); // and none collide with each other
  });

  it('an unknown value is different from a known one (null is not zero)', () => {
    const a = base();
    const withNull = { ...a, constraints: { ...a.constraints, profile: { ...a.constraints.profile, usersNow: null } } };
    const withZero = { ...a, constraints: { ...a.constraints, profile: { ...a.constraints.profile, usersNow: 0 } } };
    expect(inputsHash(withNull)).not.toBe(inputsHash(withZero));
  });

  it('normalising the context does not change what it means', () => {
    const p = base().constraints.profile;
    expect(normaliseContext(normaliseContext(p))).toEqual(normaliseContext(p));
    expect(normaliseContext({ ...p, mustHaves: [...p.mustHaves, ...p.mustHaves] }).mustHaves).toHaveLength(
      p.mustHaves.length,
    );
  });
});

describe('designHash (invariant I5: layout never affects semantics)', () => {
  const sample = () =>
    graph(
      [
        node('a', { label: 'API' }),
        node('b', { type: 'database', label: 'DB' }),
        node('c', { type: 'cache', label: 'Cache' }),
      ],
      [edge('e1', 'a', 'b'), edge('e2', 'a', 'c', { mode: 'async' })],
    );

  it('moving a node never changes the hash', () => {
    const moved = sample();
    moved.nodes[0] = { ...moved.nodes[0]!, position: { x: 9999, y: -42.5 } };
    expect(designHash(moved)).toBe(designHash(sample()));
  });

  it('re-ordering nodes and edges never changes the hash', () => {
    const g = sample();
    const shuffled = graph([...g.nodes].reverse(), [...g.edges].reverse());
    expect(designHash(shuffled)).toBe(designHash(g));
  });

  it('semantic changes change the hash', () => {
    const h = designHash(sample());
    const relabel = sample();
    relabel.nodes[0] = { ...relabel.nodes[0]!, label: 'Different' };
    const retype = sample();
    retype.nodes[1] = { ...retype.nodes[1]!, type: 'queue' };
    const rewire = sample();
    rewire.edges[1] = { ...rewire.edges[1]!, mode: 'sync' };
    const choose = sample();
    choose.nodes[1] = {
      ...choose.nodes[1]!,
      status: 'decided',
      decisionType: 'database',
      choice: { optionId: 'option.a', params: {} },
    };
    const trait = sample();
    trait.nodes[2] = { ...trait.nodes[2]!, traits: { readRatio: 0.9 } };
    const dropEdge = sample();
    dropEdge.edges.pop();
    const addNode = sample();
    addNode.nodes.push(node('d'));
    const all = [relabel, retype, rewire, choose, trait, dropEdge, addNode].map(designHash);
    for (const x of all) expect(x).not.toBe(h);
    expect(new Set(all).size).toBe(all.length);
  });

  it('property: any random valid design, with all positions replaced and orders shuffled, keeps its hash', () => {
    fc.assert(
      fc.property(designArb, fc.integer(), fc.integer(), (g, dx, dy) => {
        const moved = graph(
          [...g.nodes].reverse().map((n) => ({ ...n, position: { x: n.position.x + dx, y: n.position.y - dy } })),
          [...g.edges].reverse(),
        );
        return designHash(moved) === designHash(g);
      }),
    );
  });

  it('property: changing any node label to a different string changes the hash', () => {
    fc.assert(
      fc.property(designArb, fc.nat(), fc.string({ minLength: 1, maxLength: 20 }), (g, i, newLabel) => {
        const idx = i % g.nodes.length;
        fc.pre(g.nodes[idx]!.label !== newLabel);
        const changed = graph(
          g.nodes.map((n, k) => (k === idx ? { ...n, label: newLabel } : n)),
          g.edges,
        );
        return designHash(changed) !== designHash(g);
      }),
    );
  });

  it('property: flipping any edge mode changes the hash', () => {
    fc.assert(
      fc.property(designArb, fc.nat(), (g, i) => {
        fc.pre(g.edges.length > 0);
        const idx = i % g.edges.length;
        const flipped = graph(
          g.nodes,
          g.edges.map((e, k) =>
            k === idx ? { ...e, mode: e.mode === 'sync' ? ('async' as const) : ('sync' as const) } : e,
          ),
        );
        return designHash(flipped) !== designHash(g);
      }),
    );
  });

  it('the normalised design carries no layout field at all', () => {
    const n = normaliseDesign(sample());
    expect(JSON.stringify(n)).not.toContain('position');
  });
});
