// What is "on the request path" (specification 5.4 trait onRequestPath: "user-declared or inferred", 7.2, 7.4).
// Pure functions over the design. Results are sorted.
import type { Component, DesignGraph } from '../schemas/design';
import { adjacency } from './graph';

type Shape = Pick<DesignGraph, 'nodes' | 'edges'>;

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Component types that hold data the request needs (rule R-04, R-05). A cache is a store of copies, so it is not one. */
export const DATA_STORE_TYPES: readonly Component['type'][] = ['database', 'vector_store', 'object_storage'];
export const isDataStore = (c: Component): boolean => DATA_STORE_TYPES.includes(c.type);

/**
 * Where a request enters. Every `client` component is an entry point. A design with no client is entered through its
 * `api` components that nothing calls synchronously. A design with neither has no known entry: the callers say so
 * (an `unknown` finding or an uncertain latency) instead of guessing.
 */
export function entryPoints(graph: Shape & { nodes: readonly Component[] }): string[] {
  const clients = graph.nodes.filter((n) => n.type === 'client' && n.traits.onRequestPath !== false).map((n) => n.id);
  if (clients.length > 0) return clients.sort(cmp);
  const called = new Set(graph.edges.filter((e) => e.mode === 'sync').map((e) => e.to));
  return graph.nodes
    .filter((n) => n.type === 'api' && n.traits.onRequestPath !== false && !called.has(n.id))
    .map((n) => n.id)
    .sort(cmp);
}

export interface RequestPath {
  entries: string[];
  /** Components on the request path: reachable from an entry over synchronous edges, or declared `onRequestPath: true`. */
  onPath: Set<string>;
}

/**
 * The request path. A component declared `onRequestPath: false` is off it, and the walk does not continue through it;
 * one declared `true` is on it even if nothing links it to an entry. Everything else is inferred by following
 * synchronous edges from the entry points: an asynchronous edge leaves the user-facing path (specification 7.4 step 1).
 */
export function requestPath(graph: Shape & { nodes: readonly Component[] }): RequestPath {
  const entries = entryPoints(graph);
  const a = adjacency(graph, 'sync');
  const declared = new Map(graph.nodes.map((n) => [n.id, n.traits.onRequestPath]));
  const onPath = new Set<string>();
  const stack = [...entries];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (onPath.has(id) || declared.get(id) === false) continue;
    onPath.add(id);
    for (const next of a.out.get(id) ?? []) stack.push(next);
  }
  for (const n of graph.nodes) if (n.traits.onRequestPath === true) onPath.add(n.id);
  return { entries, onPath };
}
