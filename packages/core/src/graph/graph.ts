// Graph helpers over the design (specification 7.2.1, 7.4). Pure; they read only ids, edge endpoints and edge modes, never
// layout. Results are sorted so they are deterministic.
import type { DesignGraph } from '../schemas/design';

export interface Adjacency {
  /** Every component id, sorted. */
  ids: string[];
  out: Map<string, string[]>;
  inn: Map<string, string[]>;
}

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Directed adjacency. `mode` filters edges: 'sync' keeps only synchronous edges, 'all' keeps every edge. */
export function adjacency(graph: Pick<DesignGraph, 'nodes' | 'edges'>, mode: 'sync' | 'all' = 'all'): Adjacency {
  const ids = graph.nodes.map((n) => n.id).sort(cmp);
  const out = new Map<string, string[]>(ids.map((id) => [id, []]));
  const inn = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of graph.edges) {
    if (mode === 'sync' && e.mode !== 'sync') continue;
    out.get(e.from)?.push(e.to);
    inn.get(e.to)?.push(e.from);
  }
  for (const list of [...out.values(), ...inn.values()]) list.sort(cmp);
  return { ids, out, inn };
}

/** Undirected neighbour sets (self loops dropped). */
export function undirected(
  graph: Pick<DesignGraph, 'nodes' | 'edges'>,
  mode: 'sync' | 'all' = 'all',
): Map<string, string[]> {
  const a = adjacency(graph, mode);
  const nb = new Map<string, Set<string>>(a.ids.map((id) => [id, new Set<string>()]));
  for (const [from, tos] of a.out) {
    for (const to of tos) {
      if (from === to) continue;
      nb.get(from)?.add(to);
      nb.get(to)?.add(from);
    }
  }
  return new Map([...nb].map(([id, set]) => [id, [...set].sort(cmp)]));
}

/** Ids reachable from `start` following directed edges (start included). */
export function reachable(a: Adjacency, start: string): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of a.out.get(id) ?? []) stack.push(next);
  }
  return seen;
}

/**
 * Strongly connected components with Tarjan's algorithm (iterative, so a long chain cannot overflow the stack).
 * Returns components in a deterministic order, each sorted.
 */
export function stronglyConnectedComponents(a: Adjacency): string[][] {
  let counter = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const result: string[][] = [];

  for (const root of a.ids) {
    if (index.has(root)) continue;
    const work: { id: string; next: number }[] = [{ id: root, next: 0 }];
    index.set(root, counter);
    low.set(root, counter);
    counter += 1;
    stack.push(root);
    onStack.add(root);
    while (work.length > 0) {
      const frame = work[work.length - 1] as { id: string; next: number };
      const succ = a.out.get(frame.id) ?? [];
      if (frame.next < succ.length) {
        const w = succ[frame.next] as string;
        frame.next += 1;
        if (!index.has(w)) {
          index.set(w, counter);
          low.set(w, counter);
          counter += 1;
          stack.push(w);
          onStack.add(w);
          work.push({ id: w, next: 0 });
        } else if (onStack.has(w)) {
          low.set(frame.id, Math.min(low.get(frame.id) as number, index.get(w) as number));
        }
      } else {
        work.pop();
        const parent = work[work.length - 1];
        if (parent !== undefined)
          low.set(parent.id, Math.min(low.get(parent.id) as number, low.get(frame.id) as number));
        if (low.get(frame.id) === index.get(frame.id)) {
          const comp: string[] = [];
          for (;;) {
            const w = stack.pop() as string;
            onStack.delete(w);
            comp.push(w);
            if (w === frame.id) break;
          }
          result.push(comp.sort(cmp));
        }
      }
    }
  }
  return result.sort((x, y) => cmp(x[0] as string, y[0] as string));
}

/** Components that sit on a cycle (a strongly connected component of size > 1, or a self loop). Specification I6. */
export function cycles(graph: Pick<DesignGraph, 'nodes' | 'edges'>, mode: 'sync' | 'all' = 'all'): string[][] {
  const a = adjacency(graph, mode);
  return stronglyConnectedComponents(a).filter(
    (c) => c.length > 1 || (a.out.get(c[0] as string) ?? []).includes(c[0] as string),
  );
}

/**
 * A topological order (Kahn's algorithm, ties broken by id), or `null` if the graph has a cycle.
 */
export function topologicalOrder(
  graph: Pick<DesignGraph, 'nodes' | 'edges'>,
  mode: 'sync' | 'all' = 'all',
): string[] | null {
  const a = adjacency(graph, mode);
  const indegree = new Map<string, number>(a.ids.map((id) => [id, (a.inn.get(id) ?? []).length]));
  const ready = a.ids.filter((id) => indegree.get(id) === 0);
  const order: string[] = [];
  while (ready.length > 0) {
    ready.sort(cmp);
    const id = ready.shift() as string;
    order.push(id);
    for (const to of a.out.get(id) ?? []) {
      const d = (indegree.get(to) as number) - 1;
      indegree.set(to, d);
      if (d === 0) ready.push(to);
    }
  }
  return order.length === a.ids.length ? order : null;
}

/**
 * Articulation points (cut vertices) of the UNDIRECTED graph, by Tarjan's algorithm: a component whose removal
 * increases the number of connected components. Iterative. Handles cycles, disconnected components, parallel edges and
 * a single node (which has none). Returned sorted.
 *
 * Specification 7.2.1: "a component is an articulation point if removing it disconnects the request path from a data
 * store or from the response". Rule R-04 applies that filter; this function is the graph-theory part.
 */
export function articulationPoints(
  graph: Pick<DesignGraph, 'nodes' | 'edges'>,
  mode: 'sync' | 'all' = 'all',
): string[] {
  const nb = undirected(graph, mode);
  const ids = [...nb.keys()].sort(cmp);
  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const cut = new Set<string>();
  let time = 0;

  for (const root of ids) {
    if (disc.has(root)) continue;
    parent.set(root, null);
    disc.set(root, time);
    low.set(root, time);
    time += 1;
    let rootChildren = 0;
    const work: { id: string; next: number }[] = [{ id: root, next: 0 }];
    while (work.length > 0) {
      const frame = work[work.length - 1] as { id: string; next: number };
      const neighbours = nb.get(frame.id) ?? [];
      if (frame.next < neighbours.length) {
        const w = neighbours[frame.next] as string;
        frame.next += 1;
        if (!disc.has(w)) {
          parent.set(w, frame.id);
          disc.set(w, time);
          low.set(w, time);
          time += 1;
          if (frame.id === root) rootChildren += 1;
          work.push({ id: w, next: 0 });
        } else if (w !== parent.get(frame.id)) {
          low.set(frame.id, Math.min(low.get(frame.id) as number, disc.get(w) as number));
        }
      } else {
        work.pop();
        const p = parent.get(frame.id);
        if (p !== null && p !== undefined) {
          low.set(p, Math.min(low.get(p) as number, low.get(frame.id) as number));
          if (p !== root && (low.get(frame.id) as number) >= (disc.get(p) as number)) cut.add(p);
        }
      }
    }
    if (rootChildren > 1) cut.add(root);
  }
  return [...cut].sort(cmp);
}

/** Connected components of the undirected graph after removing `removed` ids; each sorted, in a deterministic order. */
export function componentsWithout(
  graph: Pick<DesignGraph, 'nodes' | 'edges'>,
  removed: ReadonlySet<string>,
  mode: 'sync' | 'all' = 'all',
): string[][] {
  const nb = undirected(graph, mode);
  const seen = new Set<string>(removed);
  const comps: string[][] = [];
  for (const start of [...nb.keys()].sort(cmp)) {
    if (seen.has(start)) continue;
    const comp: string[] = [];
    const stack = [start];
    while (stack.length > 0) {
      const id = stack.pop() as string;
      if (seen.has(id)) continue;
      seen.add(id);
      comp.push(id);
      for (const n of nb.get(id) ?? []) if (!seen.has(n)) stack.push(n);
    }
    comps.push(comp.sort(cmp));
  }
  return comps;
}
