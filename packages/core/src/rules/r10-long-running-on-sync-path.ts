import type { Rule } from './types';
import { byId, detected, nameList } from './types';
import { comp, design, link } from './fixtures/builders';

// R-10: a component marked `longRunning` (expected to take more than a few seconds) with a synchronous edge from the
// client or the API. The caller would wait for all of it. Optional in Phase 0 (brief 10.4); it is a pure graph check.
export const R10: Rule = {
  id: 'R-10',
  version: '0.1.0',
  title: 'Long-running work on a synchronous path',
  appliesTo: 'design',
  severity: 'warn',
  check({ graph }) {
    const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
    const out = [];
    for (const n of [...graph.nodes].sort(byId)) {
      if (n.traits.longRunning !== true) continue;
      const callers = [...new Set(graph.edges.filter((e) => e.mode === 'sync' && e.to === n.id).map((e) => e.from))]
        .sort()
        .map((id) => nodes.get(id))
        .filter((c) => c !== undefined && (c.type === 'client' || c.type === 'api'));
      if (callers.length === 0) continue;
      out.push(
        detected(R10, {
          componentIds: [n.id],
          title: 'Long-running work on a synchronous path',
          explanation: `${nameList(callers.map((c) => c?.label ?? ''))} calls ${n.label}, which is expected to take more than a few seconds, and waits for it. The caller may time out.`,
          suggestedFix: 'Queue',
          measurements: { syncCallers: callers.length },
        }),
      );
    }
    return out;
  },
  fixtures: [
    {
      name: 'the API waits for a long-running job (fires)',
      graph: design(
        [comp('api', 'api'), comp('job', 'custom', { traits: { longRunning: true } })],
        [link('e1', 'api', 'job')],
      ),
      expect: [{ ruleId: 'R-10', severity: 'warn', componentIds: ['job'] }],
    },
    {
      name: 'the same job behind a queue (does not fire)',
      graph: design(
        [comp('api', 'api'), comp('q', 'queue'), comp('job', 'custom', { traits: { longRunning: true } })],
        [link('e1', 'api', 'q', { mode: 'async' }), link('e2', 'q', 'job', { mode: 'async' })],
      ),
      expect: [],
    },
    {
      name: 'a quick component called synchronously (does not fire)',
      graph: design([comp('api', 'api'), comp('db', 'database')], [link('e1', 'api', 'db')]),
      expect: [],
    },
  ],
};
