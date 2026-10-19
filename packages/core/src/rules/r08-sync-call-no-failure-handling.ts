import type { Rule } from './types';
import { detected } from './types';
import { comp, design, link } from './fixtures/builders';

// R-08: a synchronous call with no timeout or no retry policy (info). A call with no timeout can hang the caller; one with
// no retry policy gives up on the first blip. `retries: 0` is a decision; a missing value is not. (Specification 7.2.)
// Optional in Phase 0 (brief 10.4); it is cheap and its example is in Appendix C.1.
export const R08: Rule = {
  id: 'R-08',
  version: '0.1.0',
  title: 'Sync call without failure handling',
  appliesTo: 'design',
  severity: 'info',
  check({ graph }) {
    const labels = new Map(graph.nodes.map((n) => [n.id, n.label]));
    return [...graph.edges]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .filter((e) => e.mode === 'sync' && (e.timeoutMs === undefined || e.retries === undefined))
      .map((e) => {
        const missing =
          e.timeoutMs === undefined && e.retries === undefined
            ? 'a timeout or a retry policy'
            : e.timeoutMs === undefined
              ? 'a timeout'
              : 'a retry policy';
        return detected(R08, {
          componentIds: [e.from, e.to],
          title: 'Synchronous call without failure handling',
          explanation: `The call from ${labels.get(e.from) ?? e.from} to ${labels.get(e.to) ?? e.to} has no ${missing.replace(/^a /, '')} set. Without ${missing}, a slow or failing dependency can hang the caller or fail it on the first error.`,
          suggestedFix: 'Timeout and retry policy on the edge',
          measurements: {
            hasTimeout: e.timeoutMs === undefined ? 0 : 1,
            hasRetryPolicy: e.retries === undefined ? 0 : 1,
          },
        });
      });
  },
  fixtures: [
    {
      name: 'a sync call with neither a timeout nor retries (fires)',
      graph: design([comp('api', 'api'), comp('database', 'database')], [link('e1', 'api', 'database')]),
      expect: [{ ruleId: 'R-08', severity: 'info', componentIds: ['api', 'database'] }],
    },
    {
      name: 'a sync call with a timeout but no retry policy (fires)',
      graph: design([comp('api', 'api'), comp('db', 'database')], [link('e1', 'api', 'db', { timeoutMs: 500 })]),
      expect: [{ ruleId: 'R-08', evidence: { recordIds: [], measurements: { hasTimeout: 1, hasRetryPolicy: 0 } } }],
    },
    {
      name: 'a sync call with both, retries explicitly zero (does not fire)',
      graph: design(
        [comp('api', 'api'), comp('db', 'database')],
        [link('e1', 'api', 'db', { timeoutMs: 500, retries: 0 })],
      ),
      expect: [],
    },
    {
      name: 'an asynchronous call needs no timeout (does not fire)',
      graph: design([comp('api', 'api'), comp('q', 'queue')], [link('e1', 'api', 'q', { mode: 'async' })]),
      expect: [],
    },
  ],
};
