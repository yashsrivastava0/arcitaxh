// Latency calculator (specification 7.4). Pure. Algorithm:
//  1. keep only synchronous edges (asynchronous ones leave the user-facing path);
//  2. each component on the path adds its profile's p50 (typical path) or p95 (tail path);
//  3. each edge adds a hop time;
//  4. where a component calls several others, the slowest branch counts (they are treated as parallel);
//  5. a component with no usable profile makes the result uncertain and is NAMED; it is never counted as zero.
//
// Honest labelling: summing p95 values along a path is a conservative upper bound on the tail, not the true p95 of the
// whole path. The label travels with the result.
import { requestPath } from '../graph/request-path';
import { adjacency, cycles, topologicalOrder } from '../graph/graph';
import { splitByFreshness, type FreshnessContext } from '../kb-records';
import type { KBReader } from '../ports';
import type { Component, DesignGraph } from '../schemas/design';
import type { LatencyProfileRecord, LimitRecord } from '../schemas/kb';

export const LATENCY_LABEL = 'conservative upper bound' as const;

export interface NodeProfile {
  p50Ms: number;
  p95Ms: number;
  /** The KB record the figures come from, or null for a figure the user typed in. */
  recordId: string | null;
  source: 'kb' | 'user';
  /** Where the component runs, when known (from the record, or the region the user chose). */
  region: string | null;
}

export interface ProfileLookup {
  profiles: Map<string, NodeProfile>;
  /** Components whose only profile records have expired: not used (principle P9), and named as such. */
  expired: string[];
  /** Cold-start notes from current limit records that say a resource scales to zero (specification 7.6). */
  coldStartNotes: { componentId: string; recordId: string; text: string }[];
}

const round3 = (x: number): number => Math.round(x * 1000) / 1000;
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function paramString(c: Component, key: string): string | null {
  const v = c.choice?.params[key];
  return typeof v === 'string' && v !== '' ? v : null;
}

/**
 * Looks up a latency profile for every component with a chosen option. If the user chose a region or an operation
 * (`choice.params.region`, `choice.params.operation`) only matching records are used. If several records remain, the
 * one with the slowest p95 is used, so the sum stays an upper bound. Expired records are not used.
 */
export function profilesFromKb(graph: Pick<DesignGraph, 'nodes'>, kb: KBReader, ctx: FreshnessContext): ProfileLookup {
  const profiles = new Map<string, NodeProfile>();
  const expired: string[] = [];
  const coldStartNotes: ProfileLookup['coldStartNotes'] = [];
  for (const node of [...graph.nodes].sort((a, b) => cmp(a.id, b.id))) {
    const optionId = node.choice?.optionId;
    if (optionId === undefined) continue;
    const option = kb.record(optionId);
    if (option === null || option.type !== 'option') continue;
    const all = kb.records({ decisionType: option.decision_type, subject: optionId });
    const wantRegion = paramString(node, 'region');
    const wantOperation = paramString(node, 'operation');
    const latency = all
      .filter((r): r is LatencyProfileRecord => r.type === 'latency_profile')
      .filter(
        (r) =>
          (wantRegion === null || r.body.region === wantRegion) &&
          (wantOperation === null || r.body.operation === wantOperation),
      )
      .sort((a, b) => cmp(a.id, b.id));
    const { current, expired: old } = splitByFreshness(latency, ctx);
    if (current.length > 0) {
      const slowest = current.reduce((best, r) => (r.body.p95_ms > best.body.p95_ms ? r : best));
      profiles.set(node.id, {
        p50Ms: slowest.body.p50_ms,
        p95Ms: slowest.body.p95_ms,
        recordId: slowest.id,
        source: 'kb',
        region: wantRegion ?? slowest.body.region,
      });
    } else if (old.length > 0) {
      expired.push(node.id);
    }
    const limits = all.filter((r): r is LimitRecord => r.type === 'limit' && r.body.scales_to_zero);
    for (const l of splitByFreshness(limits, ctx).current) {
      coldStartNotes.push({
        componentId: node.id,
        recordId: l.id,
        text: `${node.label} can scale to zero when idle, so the first request after a quiet period may be slower than these figures.`,
      });
    }
  }
  expired.sort(cmp);
  return { profiles, expired, coldStartNotes };
}

export interface Hop {
  from: string;
  to: string;
  /** Hop time added. 0 and `source: 'unknown'` when it cannot be known (counted in `unknownHops`). */
  ms: number;
  source: 'default' | 'unknown';
}

export interface LatencyResult {
  label: typeof LATENCY_LABEL;
  entries: string[];
  /** Sum along the slowest path. When `uncertain`, the figure covers only what is known: treat it as "at least". */
  p50Ms: number | null;
  p95Ms: number | null;
  p50Path: string[];
  p95Path: string[];
  /** True if anything is missing or assumed beyond a marked default. */
  uncertain: boolean;
  /** Components on the path with no usable profile (named, never counted as zero). */
  missingProfiles: string[];
  /** Missing because the only records have expired. */
  expiredProfiles: string[];
  /** Hops between two known, different regions: no region-pair table exists in the KB yet. */
  unknownHops: { from: string; to: string }[];
  /** Hops that use the default same-region figure because a region was not known (stated in `assumptions`). */
  defaultHops: { from: string; to: string }[];
  /** A cycle of synchronous edges: no finite latency. */
  cycle: string[] | null;
  noEntry: boolean;
  recordIds: string[];
  coldStartNotes: { componentId: string; recordId: string; text: string }[];
  assumptions: string[];
}

export interface LatencyInput {
  graph: DesignGraph;
  profiles: ReadonlyMap<string, NodeProfile>;
  /** Components whose profile exists only as an expired record (from `profilesFromKb`). */
  expiredProfiles?: readonly string[];
  /** The small default for one hop inside one region (config hop_default_same_region_ms), marked as a default. */
  hopDefaultMs: number;
  coldStartNotes?: ProfileLookup['coldStartNotes'];
}

export function computeLatency(input: LatencyInput): LatencyResult {
  const { graph, profiles } = input;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const { entries, onPath } = requestPath(graph);
  const empty: LatencyResult = {
    label: LATENCY_LABEL,
    entries,
    p50Ms: null,
    p95Ms: null,
    p50Path: [],
    p95Path: [],
    uncertain: true,
    missingProfiles: [],
    expiredProfiles: [],
    unknownHops: [],
    defaultHops: [],
    cycle: null,
    noEntry: entries.length === 0,
    recordIds: [],
    coldStartNotes: [],
    assumptions: [],
  };
  if (entries.length === 0) return empty;

  // The synchronous subgraph restricted to the request path.
  const sub: Pick<DesignGraph, 'nodes' | 'edges'> = {
    nodes: graph.nodes.filter((n) => onPath.has(n.id)),
    edges: graph.edges.filter((e) => e.mode === 'sync' && onPath.has(e.from) && onPath.has(e.to)),
  };
  const loop = cycles(sub, 'sync')[0];
  if (loop !== undefined) return { ...empty, cycle: loop };
  const order = topologicalOrder(sub, 'sync') as string[];
  const a = adjacency(sub, 'sync');

  const isOrigin = (id: string): boolean => byId.get(id)?.type === 'client';
  const expiredSet = new Set(input.expiredProfiles ?? []);
  const missing = new Set<string>();
  const expiredUsed = new Set<string>();
  const unknownHops: { from: string; to: string }[] = [];
  const defaultHops: { from: string; to: string }[] = [];
  const recordIds = new Set<string>();

  const regionOf = (id: string): string | null => {
    const p = profiles.get(id);
    if (p?.region) return p.region;
    const n = byId.get(id);
    return n ? paramString(n, 'region') : null;
  };

  const hopOf = (from: string, to: string): Hop => {
    // Time on the user's own network before the first component is outside the system and is not counted.
    if (isOrigin(from)) return { from, to, ms: 0, source: 'default' };
    const rf = regionOf(from);
    const rt = regionOf(to);
    if (rf !== null && rt !== null && rf !== rt) return { from, to, ms: 0, source: 'unknown' };
    return { from, to, ms: input.hopDefaultMs, source: 'default' };
  };

  // Which nodes and hops are reachable from an entry matters for what is "missing": only the request path counts.
  for (const id of order) {
    if (isOrigin(id)) continue;
    const p = profiles.get(id);
    if (p === undefined) {
      missing.add(id);
      if (expiredSet.has(id)) expiredUsed.add(id);
    } else if (p.recordId !== null) {
      recordIds.add(p.recordId);
    }
  }
  const hops = new Map<string, Hop>();
  for (const e of sub.edges) {
    const h = hopOf(e.from, e.to);
    hops.set(`${e.from}\u0000${e.to}`, h);
    if (isOrigin(e.from)) continue;
    if (h.source === 'unknown') unknownHops.push({ from: e.from, to: e.to });
    else if (regionOf(e.from) === null || regionOf(e.to) === null) defaultHops.push({ from: e.from, to: e.to });
  }

  const solve = (pick: (p: NodeProfile) => number): { total: number; path: string[] } => {
    const best = new Map<string, { total: number; next: string | null }>();
    for (const id of [...order].reverse()) {
      const own = isOrigin(id)
        ? 0
        : (() => {
            const p = profiles.get(id);
            return p === undefined ? 0 : pick(p);
          })();
      let tail = 0;
      let next: string | null = null;
      for (const to of a.out.get(id) ?? []) {
        const hop = (hops.get(`${id}\u0000${to}`) as Hop).ms;
        const t = hop + (best.get(to) as { total: number }).total;
        if (next === null || t > tail) {
          tail = t;
          next = to;
        }
      }
      best.set(id, { total: own + tail, next });
    }
    let top: string | null = null;
    for (const e of entries) {
      if (!best.has(e)) continue;
      if (top === null || (best.get(e) as { total: number }).total > (best.get(top) as { total: number }).total)
        top = e;
    }
    const path: string[] = [];
    for (let at: string | null = top; at !== null; at = (best.get(at) as { next: string | null }).next) path.push(at);
    return { total: top === null ? 0 : round3((best.get(top) as { total: number }).total), path };
  };

  const s50 = solve((p) => p.p50Ms);
  const s95 = solve((p) => p.p95Ms);
  const missingProfiles = [...missing].sort(cmp);
  const assumptions: string[] = [
    'Calls from one component to several others are treated as parallel, so only the slowest branch counts.',
    "Time on the user's own network before the first component is not counted.",
  ];
  if (defaultHops.length > 0) {
    assumptions.push(
      `A hop whose regions are not known is counted as the same-region default of ${input.hopDefaultMs} ms.`,
    );
  }
  return {
    ...empty,
    p50Ms: s50.total,
    p95Ms: s95.total,
    p50Path: s50.path,
    p95Path: s95.path,
    uncertain: missingProfiles.length > 0 || unknownHops.length > 0,
    missingProfiles,
    expiredProfiles: [...expiredUsed].sort(cmp),
    unknownHops: unknownHops.sort((x, y) => cmp(`${x.from}>${x.to}`, `${y.from}>${y.to}`)),
    defaultHops: defaultHops.sort((x, y) => cmp(`${x.from}>${x.to}`, `${y.from}>${y.to}`)),
    recordIds: [...recordIds].sort(cmp),
    coldStartNotes: (input.coldStartNotes ?? []).filter((c) => onPath.has(c.componentId)),
    assumptions,
  };
}
