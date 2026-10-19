import { adjacency, reachable } from '../graph/graph';
import { isDataStore, requestPath } from '../graph/request-path';
import type { DesignGraph } from '../schemas/design';
import type { Rule } from './types';
import { byId, detected, nameList, unknownFinding } from './types';
import { comp, design, link } from './fixtures/builders';

/**
 * Is there a cache on the way to the store? Two shapes count (Assumption, ADR-042):
 *  - read-through: a cache that leads to the store, directly or through other components;
 *  - cache-aside: a cache called by the same component that calls the store.
 * Only synchronous edges and caches not declared off the request path are considered.
 */
export function hasCacheFor(graph: Pick<DesignGraph, 'nodes' | 'edges'>, storeId: string): boolean {
  const caches = graph.nodes.filter((n) => n.type === 'cache' && n.traits.onRequestPath !== false).map((n) => n.id);
  if (caches.length === 0) return false;
  const a = adjacency(graph, 'sync');
  if (caches.some((c) => reachable(a, c).has(storeId))) return true;
  const callers = a.inn.get(storeId) ?? [];
  return callers.some((x) => (a.out.get(x) ?? []).some((to) => caches.includes(to)));
}

// R-05: a read-heavy path with no cache. The read ratio is the store's own `readRatio` trait, else the user's overall
// read ratio. At or above the threshold (config read_ratio_threshold, Default 0.8) with no cache, the rule says so (info).
// A store with no read ratio at all cannot be judged: that is one `unknown` finding, not a pass.
export const R05: Rule = {
  id: 'R-05',
  version: '0.1.0',
  title: 'Read-heavy path without cache',
  appliesTo: 'design',
  severity: 'info',
  check({ graph, usage, defaults }) {
    const threshold = defaults.rules.read_ratio_threshold;
    const { onPath } = requestPath(graph);
    const stores = graph.nodes.filter((n) => isDataStore(n) && onPath.has(n.id)).sort(byId);
    const out = [];
    const unknownStores = [];
    for (const s of stores) {
      const ratio = s.traits.readRatio ?? usage.readRatio;
      if (ratio === null || ratio === undefined) {
        unknownStores.push(s);
        continue;
      }
      if (ratio < threshold || hasCacheFor(graph, s.id)) continue;
      out.push(
        detected(R05, {
          componentIds: [s.id],
          title: 'Read-heavy path with no cache',
          explanation: `${s.label} is read much more than it is written (read ratio ${ratio}, at or above ${threshold}), and no cache sits on the path to it. Every read goes to the store.`,
          suggestedFix: 'Add a cache on the path to the store',
          measurements: { readRatio: ratio, threshold },
        }),
      );
    }
    if (unknownStores.length > 0) {
      out.push(
        unknownFinding(R05, {
          componentIds: unknownStores.map((s) => s.id),
          title: 'Could not check whether the path to a store needs a cache',
          explanation: `No read ratio is given for ${nameList(unknownStores.map((s) => s.label))}, so we cannot tell whether reads dominate. A missing figure is not treated as "fine".`,
          suggestedFix: 'Give the share of requests that only read, for the store or for the whole design',
        }),
      );
    }
    return out;
  },
  fixtures: [
    {
      name: 'a store read 90% of the time, with no cache (fires)',
      graph: design(
        [comp('client', 'client'), comp('api', 'api'), comp('vector', 'vector_store', { traits: { readRatio: 0.9 } })],
        [link('e1', 'client', 'api'), link('e2', 'api', 'vector')],
      ),
      expect: [{ ruleId: 'R-05', kind: 'detected', severity: 'info', componentIds: ['vector'] }],
    },
    {
      name: 'the same store with a cache called by the same API (cache-aside; does not fire)',
      graph: design(
        [
          comp('client', 'client'),
          comp('api', 'api'),
          comp('cache', 'cache'),
          comp('vector', 'vector_store', { traits: { readRatio: 0.9 } }),
        ],
        [link('e1', 'client', 'api'), link('e2', 'api', 'cache'), link('e3', 'api', 'vector')],
      ),
      expect: [],
    },
    {
      name: 'a cache in front of the store (read-through; does not fire)',
      graph: design(
        [
          comp('client', 'client'),
          comp('api', 'api'),
          comp('cache', 'cache'),
          comp('vector', 'vector_store', { traits: { readRatio: 0.95 } }),
        ],
        [link('e1', 'client', 'api'), link('e2', 'api', 'cache'), link('e3', 'cache', 'vector')],
      ),
      expect: [],
    },
    {
      name: 'a write-heavy store (read ratio 0.3) (does not fire)',
      graph: design(
        [comp('client', 'client'), comp('api', 'api'), comp('db', 'database', { traits: { readRatio: 0.3 } })],
        [link('e1', 'client', 'api'), link('e2', 'api', 'db')],
      ),
      expect: [],
    },
    {
      name: 'no read ratio anywhere: unknown, not a pass',
      graph: design(
        [comp('client', 'client'), comp('api', 'api'), comp('db', 'database')],
        [link('e1', 'client', 'api'), link('e2', 'api', 'db')],
      ),
      expect: [{ ruleId: 'R-05', kind: 'unknown', severity: 'info', componentIds: ['db'] }],
    },
    {
      name: 'the overall read ratio from the user stands in when the store has none (fires)',
      graph: design(
        [comp('client', 'client'), comp('api', 'api'), comp('db', 'database')],
        [link('e1', 'client', 'api'), link('e2', 'api', 'db')],
      ),
      usage: { readRatio: 0.85 },
      expect: [{ ruleId: 'R-05', kind: 'detected', componentIds: ['db'] }],
    },
  ],
};
