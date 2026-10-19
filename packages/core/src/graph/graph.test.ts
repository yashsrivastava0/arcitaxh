import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { designArb, edge, graph, node } from '../test/helpers';
import {
  adjacency,
  articulationPoints,
  componentsWithout,
  cycles,
  reachable,
  stronglyConnectedComponents,
  topologicalOrder,
} from './graph';

const g = (ids: string[], pairs: [string, string][], mode: 'sync' | 'async' = 'sync') =>
  graph(
    ids.map((id) => node(id)),
    pairs.map(([a, b], i) => edge(`e${i}`, a, b, { mode })),
  );

describe('articulationPoints (Tarjan), hand-built graphs', () => {
  it('a single node has none; two nodes have none', () => {
    expect(articulationPoints(g(['a'], []))).toEqual([]);
    expect(articulationPoints(g(['a', 'b'], [['a', 'b']]))).toEqual([]);
    expect(articulationPoints(g([], []))).toEqual([]);
  });

  it('a chain: every interior node is a cut vertex, the ends are not', () => {
    expect(
      articulationPoints(
        g(
          ['a', 'b', 'c', 'd'],
          [
            ['a', 'b'],
            ['b', 'c'],
            ['c', 'd'],
          ],
        ),
      ),
    ).toEqual(['b', 'c']);
  });

  it('a cycle has none (every node has another way round)', () => {
    expect(
      articulationPoints(
        g(
          ['a', 'b', 'c', 'd'],
          [
            ['a', 'b'],
            ['b', 'c'],
            ['c', 'd'],
            ['d', 'a'],
          ],
        ),
      ),
    ).toEqual([]);
  });

  it('a star: the hub is the only cut vertex', () => {
    expect(
      articulationPoints(
        g(
          ['hub', 'x', 'y', 'z'],
          [
            ['hub', 'x'],
            ['hub', 'y'],
            ['hub', 'z'],
          ],
        ),
      ),
    ).toEqual(['hub']);
  });

  it('two cycles joined by one node: the joint is a cut vertex', () => {
    const ids = ['a', 'b', 'c', 'j', 'd', 'e', 'f'];
    const pairs: [string, string][] = [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'a'],
      ['c', 'j'],
      ['j', 'd'],
      ['d', 'e'],
      ['e', 'f'],
      ['f', 'd'],
    ];
    expect(articulationPoints(g(ids, pairs))).toEqual(['c', 'd', 'j']);
  });

  it('works across disconnected components and isolated nodes', () => {
    const ids = ['a', 'b', 'c', 'x', 'y', 'z', 'lonely'];
    const pairs: [string, string][] = [
      ['a', 'b'],
      ['b', 'c'],
      ['x', 'y'],
      ['y', 'z'],
    ];
    expect(articulationPoints(g(ids, pairs))).toEqual(['b', 'y']);
  });

  it('ignores edge direction, parallel edges and self loops', () => {
    expect(
      articulationPoints(
        g(
          ['a', 'b', 'c'],
          [
            ['b', 'a'],
            ['c', 'b'],
            ['b', 'c'],
            ['b', 'b'],
          ],
        ),
      ),
    ).toEqual(['b']);
  });

  it('a node whose removal splits the graph in two is found even when it is the DFS root', () => {
    expect(
      articulationPoints(
        g(
          ['a', 'b', 'c'],
          [
            ['a', 'b'],
            ['a', 'c'],
          ],
        ),
      ),
    ).toEqual(['a']);
  });

  it('can be restricted to synchronous edges only', () => {
    const mixed = graph(
      [node('a'), node('b'), node('c')],
      [edge('e1', 'a', 'b'), edge('e2', 'b', 'c', { mode: 'async' })],
    );
    expect(articulationPoints(mixed, 'all')).toEqual(['b']);
    expect(articulationPoints(mixed, 'sync')).toEqual([]);
  });

  it('a deep chain does not overflow the stack (iterative)', () => {
    const n = 20_000;
    const ids = Array.from({ length: n }, (_, i) => `n${String(i).padStart(5, '0')}`);
    const pairs: [string, string][] = ids.slice(1).map((id, i) => [ids[i] as string, id]);
    expect(articulationPoints(g(ids, pairs))).toHaveLength(n - 2);
  });

  it('property: matches brute force (a node is a cut vertex iff removing it increases the component count)', () => {
    fc.assert(
      fc.property(designArb, fc.constantFrom('sync', 'all'), (design, mode) => {
        // Definition: removing a cut vertex leaves MORE components than the whole graph has. An isolated node leaves one fewer.
        const base = componentsWithout(design, new Set(), mode).length;
        const brute = design.nodes
          .map((n) => n.id)
          .filter((id) => componentsWithout(design, new Set([id]), mode).length > base)
          .sort();
        expect(articulationPoints(design, mode)).toEqual(brute);
      }),
      { numRuns: 400 },
    );
  });
});

describe('cycles, strongly connected components, topological order', () => {
  it('finds a cycle, a self loop, and none in a DAG', () => {
    expect(
      cycles(
        g(
          ['a', 'b', 'c'],
          [
            ['a', 'b'],
            ['b', 'c'],
            ['c', 'a'],
          ],
        ),
      ),
    ).toEqual([['a', 'b', 'c']]);
    expect(
      cycles(
        g(
          ['a', 'b'],
          [
            ['a', 'b'],
            ['b', 'b'],
          ],
        ),
      ),
    ).toEqual([['b']]);
    expect(
      cycles(
        g(
          ['a', 'b', 'c'],
          [
            ['a', 'b'],
            ['b', 'c'],
          ],
        ),
      ),
    ).toEqual([]);
    expect(cycles(g([], []))).toEqual([]);
  });

  it('separates cycles and reports each once', () => {
    const c = cycles(
      g(
        ['a', 'b', 'c', 'd', 'e'],
        [
          ['a', 'b'],
          ['b', 'a'],
          ['c', 'd'],
          ['d', 'e'],
          ['e', 'c'],
        ],
      ),
    );
    expect(c).toEqual([
      ['a', 'b'],
      ['c', 'd', 'e'],
    ]);
  });

  it('sync-only cycle detection ignores an async back-edge (a queue breaks the loop)', () => {
    const mixed = graph([node('a'), node('b')], [edge('e1', 'a', 'b'), edge('e2', 'b', 'a', { mode: 'async' })]);
    expect(cycles(mixed, 'all')).toEqual([['a', 'b']]);
    expect(cycles(mixed, 'sync')).toEqual([]);
  });

  it('topological order is valid, deterministic, and null when there is a cycle', () => {
    const order = topologicalOrder(
      g(
        ['c', 'a', 'b', 'd'],
        [
          ['a', 'b'],
          ['a', 'c'],
          ['b', 'd'],
          ['c', 'd'],
        ],
      ),
    ) as string[];
    expect(order).toEqual(['a', 'b', 'c', 'd']);
    expect(
      topologicalOrder(
        g(
          ['a', 'b'],
          [
            ['a', 'b'],
            ['b', 'a'],
          ],
        ),
      ),
    ).toBeNull();
    expect(topologicalOrder(g([], []))).toEqual([]);
  });

  it('property: an order, when it exists, puts every edge forward', () => {
    fc.assert(
      fc.property(designArb, (design) => {
        const order = topologicalOrder(design);
        if (order === null) return cycles(design).length > 0;
        const pos = new Map(order.map((id, i) => [id, i]));
        return design.edges.every((e) => (pos.get(e.from) as number) < (pos.get(e.to) as number));
      }),
      { numRuns: 200 },
    );
  });

  it('reachable follows direction; stronglyConnectedComponents partitions every node', () => {
    const a = adjacency(
      g(
        ['a', 'b', 'c', 'd'],
        [
          ['a', 'b'],
          ['b', 'c'],
        ],
      ),
    );
    expect([...reachable(a, 'a')].sort()).toEqual(['a', 'b', 'c']);
    expect([...reachable(a, 'c')]).toEqual(['c']);
    const sccs = stronglyConnectedComponents(a);
    expect(sccs.flat().sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});
