import { articulationPoints, componentsWithout } from '../graph/graph';
import { isDataStore, requestPath } from '../graph/request-path';
import type { Rule } from './types';
import { detected, nameList, unknownFinding } from './types';
import { comp, design, link } from './fixtures/builders';

// R-04: a single point of failure. A component is an articulation point if removing it disconnects the request path from
// a data store or from the response (specification 7.2.1). Computed on the undirected graph of synchronous edges between
// the components on the request path, by Tarjan's algorithm (graph/graph.ts). The entry points (clients, or the API when
// there is no client) are where requests start and are not reported. A component that declares failover is not reported.
//
// Reading note (conflict C-020): a literal articulation-point reading flags a chain's interior - the API in front of a
// database as much as the database - and does not flag a leaf. The specification's own example (Appendix C.1) lists only
// the database. The literal reading is implemented, because the specification defines the rule that way and the brief
// asks for articulation points.
export const R04: Rule = {
  id: 'R-04',
  version: '0.1.0',
  title: 'Single point of failure',
  appliesTo: 'design',
  severity: 'warn',
  check({ graph }) {
    if (graph.nodes.length < 2) return [];
    const { entries, onPath } = requestPath(graph);
    if (entries.length === 0) {
      return [
        unknownFinding(R04, {
          componentIds: [],
          title: 'Could not check for single points of failure',
          explanation:
            'The design has no client and no API that starts a request, so the request path is not known. Without it, a single point of failure cannot be found.',
          suggestedFix: 'Add a client or an API component, or mark which components are on the request path',
        }),
      ];
    }
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const sub = {
      nodes: graph.nodes.filter((n) => onPath.has(n.id)),
      edges: graph.edges.filter((e) => e.mode === 'sync' && onPath.has(e.from) && onPath.has(e.to)),
    };
    const entrySet = new Set(entries);
    const reachableFromEntry = (removed: ReadonlySet<string>): Set<string> => {
      const ids = new Set<string>();
      for (const comp of componentsWithout(sub, removed, 'sync')) {
        if (comp.some((id) => entrySet.has(id))) for (const id of comp) ids.add(id);
      }
      return ids;
    };
    const before = reachableFromEntry(new Set());
    const out = [];
    for (const id of articulationPoints(sub, 'sync')) {
      const node = byId.get(id);
      if (node === undefined || entrySet.has(id) || node.traits.hasFailover === true) continue;
      const after = reachableFromEntry(new Set([id]));
      const lost = [...before].filter((x) => x !== id && !after.has(x)).sort();
      if (lost.length === 0) continue;
      const lostStores = lost.filter((x) => {
        const n = byId.get(x);
        return n !== undefined && isDataStore(n);
      });
      const lostLabels = lost.map((x) => byId.get(x)?.label ?? x);
      out.push(
        detected(R04, {
          componentIds: [id],
          title: `${node.label} is a single point of failure on the request path`,
          explanation:
            `If ${node.label} fails, ${nameList(lostLabels)} can no longer be reached from where requests enter` +
            (lostStores.length > 0 ? ', including a data store' : '') +
            '. No failover is declared for it.',
          suggestedFix: 'Redundancy or a documented recovery plan',
          measurements: { componentsCutOff: lost.length, dataStoresCutOff: lostStores.length },
        }),
      );
    }
    return out;
  },
  fixtures: [
    {
      name: 'a chain: the API and the agent each cut off what is behind them (fires for both interior components)',
      graph: design(
        [comp('client', 'client'), comp('api', 'api'), comp('agent', 'agent_runtime'), comp('db', 'database')],
        [link('e1', 'client', 'api'), link('e2', 'api', 'agent'), link('e3', 'agent', 'db')],
      ),
      expect: [
        {
          ruleId: 'R-04',
          componentIds: ['agent'],
          evidence: { recordIds: [], measurements: { componentsCutOff: 1, dataStoresCutOff: 1 } },
        },
        {
          ruleId: 'R-04',
          componentIds: ['api'],
          evidence: { recordIds: [], measurements: { componentsCutOff: 2, dataStoresCutOff: 1 } },
        },
      ],
    },
    {
      name: 'two API instances in front of one database: every path has a second way round (does not fire)',
      graph: design(
        [comp('client', 'client'), comp('api1', 'api'), comp('api2', 'api'), comp('db', 'database')],
        [
          link('e1', 'client', 'api1'),
          link('e2', 'client', 'api2'),
          link('e3', 'api1', 'db'),
          link('e4', 'api2', 'db'),
        ],
      ),
      expect: [],
    },
    {
      name: 'failover declared on the interior components (does not fire)',
      graph: design(
        [comp('client', 'client'), comp('api', 'api', { traits: { hasFailover: true } }), comp('db', 'database')],
        [link('e1', 'client', 'api'), link('e2', 'api', 'db')],
      ),
      expect: [],
    },
    {
      name: 'no client or API: the request path is unknown, so the rule says it could not check (unknown, not a pass)',
      graph: design([comp('db', 'database'), comp('cache', 'cache')], [link('e1', 'cache', 'db')]),
      expect: [{ ruleId: 'R-04', kind: 'unknown', severity: 'info', componentIds: [] }],
    },
  ],
};
