import { computeLatency, profilesFromKb } from '../calc/latency';
import { dateOfTimestamp } from '../util/date';
import type { Rule } from './types';
import { detected, nameList, unknownFinding } from './types';
import { comp, decided, design, link } from './fixtures/builders';

// R-06: the longest synchronous path's p95 sum exceeds the latency must-have. The sum is a conservative upper bound on
// the tail, not a measured percentile, and the finding says so. Decision logic under missing data (P9):
//  - if the parts we DO have figures for already exceed the limit, the real total is higher still, so the finding is firm;
//  - if the known total is within the limit but figures are missing, we cannot tell: one `unknown` finding names them;
//  - with no latency must-have there is nothing to compare against and the rule does not apply.
export const R06: Rule = {
  id: 'R-06',
  version: '0.1.0',
  title: 'Synchronous latency over budget',
  appliesTo: 'design',
  severity: 'warn',
  check({ graph, profile, kb, clock, defaults }) {
    const limits = profile.mustHaves.flatMap((m) => (m.kind === 'max_p95_latency_ms' ? [m.value] : []));
    if (limits.length === 0) return [];
    const budget = Math.min(...limits);
    const ctx = { today: dateOfTimestamp(clock.now()), dueSoonDays: defaults.freshness.due_soon_days };
    const lookup = profilesFromKb(graph, kb, ctx);
    const r = computeLatency({
      graph,
      profiles: lookup.profiles,
      expiredProfiles: lookup.expired,
      hopDefaultMs: defaults.rules.hop_default_same_region_ms,
      coldStartNotes: lookup.coldStartNotes,
    });
    const labelOf = (id: string): string => graph.nodes.find((n) => n.id === id)?.label ?? id;
    if (r.noEntry) {
      return [
        unknownFinding(R06, {
          componentIds: [],
          title: 'Could not check latency against your limit',
          explanation: 'The design has no client and no API that starts a request, so there is no path to add up.',
          suggestedFix: 'Add a client or an API component',
        }),
      ];
    }
    if (r.cycle !== null || r.p95Ms === null) {
      return [
        unknownFinding(R06, {
          componentIds: r.cycle ?? [],
          title: 'Could not check latency against your limit',
          explanation:
            'Synchronous calls form a loop, so the time a request takes has no end. Break the loop or make one call asynchronous.',
          suggestedFix: 'Make one call in the loop asynchronous',
        }),
      ];
    }
    const missing = r.missingProfiles;
    const measurements = { p95SumMs: r.p95Ms, limitMs: budget, componentsWithoutFigures: missing.length };
    if (r.p95Ms > budget) {
      const firm = missing.length === 0 && r.unknownHops.length === 0;
      return [
        detected(R06, {
          componentIds: r.p95Path.filter((id) => graph.nodes.find((n) => n.id === id)?.type !== 'client'),
          title: 'Synchronous latency over budget',
          explanation: firm
            ? `The slowest synchronous path adds up to ${r.p95Ms} ms at the 95th percentile, over your limit of ${budget} ms. This is a conservative upper bound on the tail, not a measured percentile.`
            : `The parts of the slowest synchronous path that have figures already add up to ${r.p95Ms} ms at the 95th percentile, over your limit of ${budget} ms. ${missing.length > 0 ? `${nameList(missing.map(labelOf))} ${missing.length === 1 ? 'has' : 'have'} no figures, so ` : ''}the real total is higher. This is a conservative upper bound, not a measured percentile.`,
          suggestedFix: 'Move work off the path, or pick a faster option',
          recordIds: r.recordIds,
          measurements,
        }),
      ];
    }
    if (r.uncertain) {
      const why = [
        missing.length > 0
          ? `no current latency figures for ${nameList(missing.map(labelOf))}${r.expiredProfiles.length > 0 ? ` (${nameList(r.expiredProfiles.map(labelOf))}: the figures have expired)` : ''}`
          : '',
        r.unknownHops.length > 0 ? 'a call crosses regions and no round-trip time is on file' : '',
      ].filter((s) => s !== '');
      return [
        unknownFinding(R06, {
          componentIds: missing,
          title: 'Could not confirm latency is within your limit',
          explanation: `The parts we have figures for add up to ${r.p95Ms} ms at the 95th percentile, within your limit of ${budget} ms, but ${why.join(' and ')}. The total could still go over.`,
          suggestedFix: 'Choose an option for each component, or enter a latency figure of your own',
          recordIds: r.recordIds,
          measurements,
        }),
      ];
    }
    return [];
  },
  fixtures: [
    {
      name: 'a 40 ms store against a 30 ms limit (fires, firm)',
      graph: design(
        [comp('client', 'client'), decided('vec', 'vector_store', 'option.managed-service-a')],
        [link('e1', 'client', 'vec')],
      ),
      profile: { mustHaves: [{ kind: 'max_p95_latency_ms', value: 30 }] },
      expect: [
        {
          ruleId: 'R-06',
          kind: 'detected',
          severity: 'warn',
          componentIds: ['vec'],
          evidence: {
            recordIds: ['lat.managed-service-a.query.2026-10'],
            measurements: { p95SumMs: 40, limitMs: 30, componentsWithoutFigures: 0 },
          },
        },
      ],
    },
    {
      name: 'the same store against a 100 ms limit (does not fire)',
      graph: design(
        [comp('client', 'client'), decided('vec', 'vector_store', 'option.managed-service-a')],
        [link('e1', 'client', 'vec')],
      ),
      profile: { mustHaves: [{ kind: 'max_p95_latency_ms', value: 100 }] },
      expect: [],
    },
    {
      name: 'no latency must-have (the rule does not apply)',
      graph: design(
        [comp('client', 'client'), decided('vec', 'vector_store', 'option.managed-service-a')],
        [link('e1', 'client', 'vec')],
      ),
      expect: [],
    },
    {
      name: 'an API with no latency figures in front of the store, within the limit so far: unknown, not a pass',
      graph: design(
        [comp('client', 'client'), comp('api', 'api'), decided('vec', 'vector_store', 'option.managed-service-a')],
        [link('e1', 'client', 'api'), link('e2', 'api', 'vec')],
      ),
      profile: { mustHaves: [{ kind: 'max_p95_latency_ms', value: 100 }] },
      expect: [{ ruleId: 'R-06', kind: 'unknown', severity: 'info', componentIds: ['api'] }],
    },
    {
      name: 'a missing figure cannot rescue a path that is already over: still fires (the real total is higher)',
      graph: design(
        [comp('client', 'client'), comp('api', 'api'), decided('vec', 'vector_store', 'option.managed-service-a')],
        [link('e1', 'client', 'api'), link('e2', 'api', 'vec')],
      ),
      profile: { mustHaves: [{ kind: 'max_p95_latency_ms', value: 30 }] },
      expect: [
        {
          ruleId: 'R-06',
          kind: 'detected',
          evidence: {
            recordIds: ['lat.managed-service-a.query.2026-10'],
            measurements: { p95SumMs: 45, limitMs: 30, componentsWithoutFigures: 1 },
          },
        },
      ],
    },
    {
      name: "the store's only latency record has expired: it is not used, so the result is unknown",
      graph: design(
        [comp('client', 'client'), decided('vec', 'vector_store', 'option.managed-service-a')],
        [link('e1', 'client', 'vec')],
      ),
      profile: { mustHaves: [{ kind: 'max_p95_latency_ms', value: 30 }] },
      today: '2026-12-01',
      expect: [{ ruleId: 'R-06', kind: 'unknown', componentIds: ['vec'] }],
    },
  ],
};
