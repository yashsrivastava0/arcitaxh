import type { Rule } from './types';
import { byId, detected } from './types';
import { comp, design, link } from './fixtures/builders';

// R-02: only one model provider serves a generation path, and no failover is declared for it. A caller that talks to two
// or more providers has a fallback; a provider with the `hasFailover` trait is its own. (Specification 7.2.)
export const R02: Rule = {
  id: 'R-02',
  version: '0.1.0',
  title: 'No fallback model',
  appliesTo: 'design',
  severity: 'warn',
  check({ graph }) {
    const providers = new Map(graph.nodes.filter((n) => n.type === 'model_provider').map((n) => [n.id, n]));
    // For each caller, the set of distinct model providers it talks to.
    const providersOf = new Map<string, Set<string>>();
    for (const e of graph.edges) {
      if (providers.has(e.to) && e.from !== e.to) {
        providersOf.set(e.from, (providersOf.get(e.from) ?? new Set<string>()).add(e.to));
      }
    }
    const sole = new Set<string>();
    for (const set of providersOf.values()) {
      if (set.size === 1) sole.add([...set][0] as string);
    }
    const out = [];
    for (const p of [...providers.values()].sort(byId)) {
      if (!sole.has(p.id) || p.traits.hasFailover === true) continue;
      out.push(
        detected(R02, {
          componentIds: [p.id],
          title: 'Only one model provider serves generation',
          explanation: `${p.label} is the only model provider for the component that calls it, and no failover is declared. If it is down or limits your requests, generation stops.`,
          suggestedFix: 'Add a second provider behind the same interface, or a gateway with failover',
        }),
      );
    }
    return out;
  },
  fixtures: [
    {
      name: 'one provider, no failover (fires)',
      graph: design([comp('agent', 'agent_runtime'), comp('model', 'model_provider')], [link('e1', 'agent', 'model')]),
      expect: [{ ruleId: 'R-02', severity: 'warn', componentIds: ['model'] }],
    },
    {
      name: 'two providers behind the same caller (does not fire)',
      graph: design(
        [comp('agent', 'agent_runtime'), comp('model-a', 'model_provider'), comp('model-b', 'model_provider')],
        [link('e1', 'agent', 'model-a'), link('e2', 'agent', 'model-b')],
      ),
      expect: [],
    },
    {
      name: 'one provider with failover declared (does not fire)',
      graph: design(
        [comp('agent', 'agent_runtime'), comp('model', 'model_provider', { traits: { hasFailover: true } })],
        [link('e1', 'agent', 'model')],
      ),
      expect: [],
    },
  ],
};
