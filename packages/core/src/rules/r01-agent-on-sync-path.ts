import type { Rule } from './types';
import { byId, detected, nameList } from './types';
import { comp, design, link } from './fixtures/builders';

// R-01: an agent_runtime component on a request path with a synchronous edge from the API or the client. An agent can take
// many steps and a long time; the caller would be waiting on the whole loop. (Specification 7.2, blueprint starter list.)
export const R01: Rule = {
  id: 'R-01',
  version: '0.1.0',
  title: 'Agent runs on a synchronous request path',
  appliesTo: 'design',
  severity: 'warn',
  check({ graph }) {
    const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
    const out = [];
    for (const n of [...graph.nodes].sort(byId)) {
      if (n.type !== 'agent_runtime' || n.traits.onRequestPath === false) continue;
      const callers = [...new Set(graph.edges.filter((e) => e.mode === 'sync' && e.to === n.id).map((e) => e.from))]
        .sort()
        .map((id) => nodes.get(id))
        .filter((c) => c !== undefined && (c.type === 'api' || c.type === 'client'));
      if (callers.length === 0) continue;
      out.push(
        detected(R01, {
          componentIds: [n.id],
          title: 'Agent runs on a synchronous request path',
          explanation: `${nameList(callers.map((c) => c?.label ?? ''))} calls ${n.label} and waits for the answer. An agent can take many steps and a long time, so the caller may time out or hang.`,
          suggestedFix: 'Run the agent behind a queue; return a job id; stream progress',
          measurements: { syncCallers: callers.length },
        }),
      );
    }
    return out;
  },
  fixtures: [
    {
      name: 'the API calls an agent synchronously (fires)',
      graph: design(
        [comp('client', 'client'), comp('api', 'api'), comp('agent', 'agent_runtime')],
        [link('e1', 'client', 'api'), link('e2', 'api', 'agent')],
      ),
      expect: [{ ruleId: 'R-01', kind: 'detected', severity: 'warn', componentIds: ['agent'] }],
    },
    {
      name: 'the agent is behind a queue (does not fire)',
      graph: design(
        [comp('client', 'client'), comp('api', 'api'), comp('queue', 'queue'), comp('agent', 'agent_runtime')],
        [
          link('e1', 'client', 'api'),
          link('e2', 'api', 'queue', { mode: 'async' }),
          link('e3', 'queue', 'agent', { mode: 'async' }),
        ],
      ),
      expect: [],
    },
    {
      name: 'an agent declared off the request path (does not fire)',
      graph: design(
        [comp('api', 'api'), comp('agent', 'agent_runtime', { traits: { onRequestPath: false } })],
        [link('e1', 'api', 'agent')],
      ),
      expect: [],
    },
  ],
};
