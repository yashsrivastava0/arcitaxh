import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EXPIRED, edge, fakeKb, graph, latencyRecord, limitRecord, node, optionRecord } from '../test/helpers';
import type { DesignGraph } from '../schemas/design';
import { computeLatency, profilesFromKb, type NodeProfile } from './latency';

const prof = (p50: number, p95: number, region: string | null = null): NodeProfile => ({
  p50Ms: p50,
  p95Ms: p95,
  recordId: null,
  source: 'user',
  region,
});
const profiles = (o: Record<string, NodeProfile>) => new Map(Object.entries(o));
const run = (g: DesignGraph, p: Record<string, NodeProfile>, hop = 5, extra: { expiredProfiles?: string[] } = {}) =>
  computeLatency({ graph: g, profiles: profiles(p), hopDefaultMs: hop, ...extra });

const client = node('c', { type: 'client' });
const api = node('a', { type: 'api' });
const vec = node('v', { type: 'vector_store' });
const model = node('m', { type: 'model_provider' });

describe('computeLatency: golden numbers (hop default 5 ms, marked as a default)', () => {
  // chain c -> a -> v -> m : a 20/20, v 15/30, m 700/1200
  const chain = graph([client, api, vec, model], [edge('e1', 'c', 'a'), edge('e2', 'a', 'v'), edge('e3', 'v', 'm')]);
  const p = { a: prof(20, 20), v: prof(15, 30), m: prof(700, 1200) };

  it('sums nodes and hops along a chain: p50 = 20+5+15+5+700 = 745, p95 = 20+5+30+5+1200 = 1260', () => {
    const r = run(chain, p);
    expect(r.p50Ms).toBe(745);
    expect(r.p95Ms).toBe(1260);
    expect(r.p95Path).toEqual(['c', 'a', 'v', 'm']);
    expect(r.label).toBe('conservative upper bound');
  });

  it('takes the slowest branch where a component fans out: p50 = 20+5+700 = 725, p95 = 20+5+1200 = 1225', () => {
    const fan = graph([client, api, vec, model], [edge('e1', 'c', 'a'), edge('e2', 'a', 'v'), edge('e3', 'a', 'm')]);
    const r = run(fan, p);
    expect(r.p50Ms).toBe(725);
    expect(r.p95Ms).toBe(1225);
    expect(r.p95Path).toEqual(['c', 'a', 'm']);
  });

  it('the typical and tail paths can differ', () => {
    const fan = graph([client, api, vec, model], [edge('e1', 'c', 'a'), edge('e2', 'a', 'v'), edge('e3', 'a', 'm')]);
    const r = run(fan, { a: prof(10, 10), v: prof(100, 100), m: prof(50, 900) });
    expect(r.p50Path).toEqual(['c', 'a', 'v']);
    expect(r.p95Path).toEqual(['c', 'a', 'm']);
    expect(r.p50Ms).toBe(10 + 5 + 100);
    expect(r.p95Ms).toBe(10 + 5 + 900);
  });

  it('is complete and not uncertain when every component has a profile and regions are known and equal', () => {
    const r = run(chain, { a: prof(20, 20, 'r1'), v: prof(15, 30, 'r1'), m: prof(700, 1200, 'r1') });
    expect(r.uncertain).toBe(false);
    expect(r.missingProfiles).toEqual([]);
    expect(r.defaultHops).toEqual([]);
  });

  it('marks hops with unknown regions as defaults and says so', () => {
    const r = run(chain, p);
    expect(r.defaultHops).toEqual([
      { from: 'a', to: 'v' },
      { from: 'v', to: 'm' },
    ]);
    expect(r.assumptions).toContain('A hop whose regions are not known is counted as the same-region default of 5 ms.');
    expect(r.uncertain).toBe(false);
  });

  it("does not count time on the user's network before the first component, and says so", () => {
    expect(run(chain, p).assumptions).toContain(
      "Time on the user's own network before the first component is not counted.",
    );
  });

  it('rounds sums so floating point never leaks: 0.1 + 0.2 style figures', () => {
    const g = graph([client, api, vec], [edge('e1', 'c', 'a'), edge('e2', 'a', 'v')]);
    const r = run(g, { a: prof(0.1, 0.1), v: prof(0.2, 0.2) }, 0);
    expect(r.p50Ms).toBe(0.3);
  });
});

describe('computeLatency: what is excluded or unknown', () => {
  it('asynchronous edges are excluded from user-facing latency and their targets need no profile', () => {
    const queue = node('q', { type: 'queue' });
    const worker = node('w', { type: 'agent_runtime' });
    const g = graph(
      [client, api, queue, worker],
      [edge('e1', 'c', 'a'), edge('e2', 'a', 'q', { mode: 'async' }), edge('e3', 'q', 'w', { mode: 'async' })],
    );
    const r = run(g, { a: prof(20, 30) });
    expect(r.p95Ms).toBe(30);
    expect(r.missingProfiles).toEqual([]);
    expect(r.uncertain).toBe(false);
  });

  it('a component with no profile is NAMED, makes the result uncertain, and is never counted as zero in disguise', () => {
    const chain = graph([client, api, vec, model], [edge('e1', 'c', 'a'), edge('e2', 'a', 'v'), edge('e3', 'v', 'm')]);
    const r = run(chain, { a: prof(20, 20), m: prof(700, 1200) });
    expect(r.missingProfiles).toEqual(['v']);
    expect(r.uncertain).toBe(true);
    // 20 + 5 + (unknown) + 5 + 1200: the figure is the known part only, and the flag says "at least".
    expect(r.p95Ms).toBe(20 + 5 + 5 + 1200);
  });

  it('names a missing component even on a branch that is not the slowest known one', () => {
    const fan = graph([client, api, vec, model], [edge('e1', 'c', 'a'), edge('e2', 'a', 'v'), edge('e3', 'a', 'm')]);
    const r = run(fan, { a: prof(10, 10), m: prof(700, 1200) });
    expect(r.missingProfiles).toEqual(['v']);
    expect(r.uncertain).toBe(true);
  });

  it('records when the only profile has expired: it is not used, and the component is named as expired', () => {
    const g = graph([client, api], [edge('e1', 'c', 'a')]);
    const r = run(g, {}, 5, { expiredProfiles: ['a'] });
    expect(r.missingProfiles).toEqual(['a']);
    expect(r.expiredProfiles).toEqual(['a']);
    expect(r.uncertain).toBe(true);
  });

  it('a hop between two known, different regions is unknown (no region-pair table yet): uncertain, not invented', () => {
    const g = graph([client, api, vec], [edge('e1', 'c', 'a'), edge('e2', 'a', 'v')]);
    const r = run(g, { a: prof(20, 20, 'eu'), v: prof(15, 30, 'us') });
    expect(r.unknownHops).toEqual([{ from: 'a', to: 'v' }]);
    expect(r.uncertain).toBe(true);
    expect(r.p95Ms).toBe(20 + 30); // the hop contributes nothing to the known part, and the flag says so
  });

  it('a design with no client uses its uncalled api as the entry, and the api then needs a profile', () => {
    const g = graph([api, vec], [edge('e1', 'a', 'v')]);
    const r = run(g, { v: prof(15, 30) });
    expect(r.entries).toEqual(['a']);
    expect(r.missingProfiles).toEqual(['a']);
    expect(run(g, { a: prof(20, 20), v: prof(15, 30) }).p95Ms).toBe(20 + 5 + 30);
  });

  it('no entry point: no figure, flagged', () => {
    const r = run(graph([vec, model], [edge('e1', 'v', 'm')]), {});
    expect(r.noEntry).toBe(true);
    expect(r.p95Ms).toBeNull();
    expect(r.uncertain).toBe(true);
  });

  it('a cycle of synchronous edges has no finite latency, and is reported', () => {
    const g = graph([client, api, vec], [edge('e1', 'c', 'a'), edge('e2', 'a', 'v'), edge('e3', 'v', 'a')]);
    const r = run(g, { a: prof(1, 1), v: prof(1, 1) });
    expect(r.cycle).toEqual(['a', 'v']);
    expect(r.p95Ms).toBeNull();
  });

  it('a component declared off the request path is skipped', () => {
    const side = node('s', { type: 'observability', traits: { onRequestPath: false } });
    const g = graph([client, api, side], [edge('e1', 'c', 'a'), edge('e2', 'a', 's')]);
    const r = run(g, { a: prof(20, 20) });
    expect(r.missingProfiles).toEqual([]);
    expect(r.p95Ms).toBe(20);
  });
});

describe('computeLatency: properties', () => {
  const profileArb = fc.record({ p50: fc.integer({ min: 1, max: 500 }), extra: fc.integer({ min: 0, max: 2000 }) });

  it('adding a synchronous hop (a new node on the path) never lowers latency', () => {
    fc.assert(
      fc.property(profileArb, profileArb, profileArb, fc.integer({ min: 0, max: 50 }), (pa, pv, pn, hop) => {
        const base = graph([client, api, vec], [edge('e1', 'c', 'a'), edge('e2', 'a', 'v')]);
        const longer = graph(
          [client, api, node('n', { type: 'cache' }), vec],
          [edge('e1', 'c', 'a'), edge('e2', 'a', 'n'), edge('e3', 'n', 'v')],
        );
        const pr = (x: { p50: number; extra: number }) => prof(x.p50, x.p50 + x.extra);
        const before = run(base, { a: pr(pa), v: pr(pv) }, hop);
        const after = run(longer, { a: pr(pa), n: pr(pn), v: pr(pv) }, hop);
        return (
          (after.p95Ms as number) >= (before.p95Ms as number) && (after.p50Ms as number) >= (before.p50Ms as number)
        );
      }),
      { numRuns: 200 },
    );
  });

  it('raising any profile never lowers latency, and p95 is never below p50 when profiles obey p95 >= p50', () => {
    fc.assert(
      fc.property(profileArb, profileArb, fc.integer({ min: 0, max: 1000 }), (pa, pv, bump) => {
        const g = graph([client, api, vec], [edge('e1', 'c', 'a'), edge('e2', 'a', 'v')]);
        const pr = (x: { p50: number; extra: number }, add = 0) => prof(x.p50 + add, x.p50 + x.extra + add);
        const lo = run(g, { a: pr(pa), v: pr(pv) });
        const hi = run(g, { a: pr(pa), v: pr(pv, bump) });
        return (hi.p95Ms as number) >= (lo.p95Ms as number) && (lo.p95Ms as number) >= (lo.p50Ms as number);
      }),
      { numRuns: 200 },
    );
  });

  it('is deterministic and ignores node order and layout', () => {
    const a = graph([client, api, vec], [edge('e1', 'c', 'a'), edge('e2', 'a', 'v')]);
    const b = graph([{ ...vec, position: { x: 99, y: 5 } }, api, client], [edge('e2', 'a', 'v'), edge('e1', 'c', 'a')]);
    const p = { a: prof(20, 25), v: prof(15, 30) };
    expect(run(b, p)).toEqual(run(a, p));
  });
});

describe('profilesFromKb', () => {
  const ctx = { today: '2026-10-20', dueSoonDays: 7 };
  const opt = optionRecord('option.x');
  const fresh = latencyRecord('lat.x.query', 'option.x', 10, 40);
  const g = graph([
    node('v', { type: 'vector_store', decisionType: 'vector-store', choice: { optionId: 'option.x', params: {} } }),
  ]);

  it('reads the current profile of the chosen option and records which record it used', () => {
    const { profiles: p } = profilesFromKb(g, fakeKb([opt, fresh]), ctx);
    expect(p.get('v')).toEqual({ p50Ms: 10, p95Ms: 40, recordId: 'lat.x.query', source: 'kb', region: 'eu-example-1' });
  });

  it('with several records, uses the one with the slowest p95 (the sum stays an upper bound)', () => {
    const slow = latencyRecord('lat.x.write', 'option.x', 30, 90, { operation: 'upsert' });
    expect(profilesFromKb(g, fakeKb([opt, fresh, slow]), ctx).profiles.get('v')?.recordId).toBe('lat.x.write');
  });

  it('filters by the region and the operation the user chose, and does not fall back to another region', () => {
    const us = latencyRecord('lat.x.us', 'option.x', 90, 200, { region: 'us-example-1' });
    const pick = (params: Record<string, string>) =>
      profilesFromKb(
        graph([node('v', { decisionType: 'vector-store', choice: { optionId: 'option.x', params } })]),
        fakeKb([opt, fresh, us]),
        ctx,
      ).profiles.get('v')?.recordId;
    expect(pick({ region: 'us-example-1' })).toBe('lat.x.us');
    expect(pick({ region: 'eu-example-1' })).toBe('lat.x.query');
    expect(pick({ region: 'ap-example-1' })).toBeUndefined();
    expect(pick({ operation: 'query' })).toBe('lat.x.us'); // both are "query"; the slowest p95 wins
  });

  it('does not use an expired profile, and names the component whose only profile has expired', () => {
    const old = latencyRecord('lat.x.old', 'option.x', 10, 40, {}, EXPIRED);
    const r = profilesFromKb(g, fakeKb([opt, old]), ctx);
    expect(r.profiles.has('v')).toBe(false);
    expect(r.expired).toEqual(['v']);
  });

  it('skips components with no chosen option, and options that are not in the KB', () => {
    const none = graph([node('a'), node('b', { choice: { optionId: 'option.unknown', params: {} } })]);
    const r = profilesFromKb(none, fakeKb([opt, fresh]), ctx);
    expect(r.profiles.size).toBe(0);
    expect(r.expired).toEqual([]);
  });

  it('adds a cold-start note for a current limit record that says the resource scales to zero', () => {
    const sleepy = limitRecord('limit.x.idle', 'option.x', { scales_to_zero: true });
    const { coldStartNotes } = profilesFromKb(g, fakeKb([opt, fresh, sleepy]), ctx);
    expect(coldStartNotes).toEqual([
      {
        componentId: 'v',
        recordId: 'limit.x.idle',
        text: 'v can scale to zero when idle, so the first request after a quiet period may be slower than these figures.',
      },
    ]);
    const expiredSleepy = limitRecord('limit.x.idle', 'option.x', { scales_to_zero: true }, EXPIRED);
    expect(profilesFromKb(g, fakeKb([opt, fresh, expiredSleepy]), ctx).coldStartNotes).toEqual([]);
  });
});
