import type { Rule } from './types';
import { byId, detected } from './types';
import { comp, design, link } from './fixtures/builders';

// R-03: a conversation or memory store with no truncation or summary policy grows without limit, and so do the prompts
// built from it. The specification gives no field for either fact, so two optional traits are read: `holdsConversation`
// (the user marks the store) and `contextPolicy` (`window`, `summary` or `none`). A store the user did not mark is not
// judged: the rule cannot tell a memory store from any other database. (Conflict C-019.)
export const R03: Rule = {
  id: 'R-03',
  version: '0.1.0',
  title: 'Unbounded context growth',
  appliesTo: 'design',
  severity: 'warn',
  check({ graph }) {
    const out = [];
    for (const n of [...graph.nodes].sort(byId)) {
      if (n.traits.holdsConversation !== true) continue;
      const policy = n.traits.contextPolicy;
      if (policy === 'window' || policy === 'summary') continue;
      out.push(
        detected(R03, {
          componentIds: [n.id],
          title: 'Conversation or memory store with no truncation or summary policy',
          explanation: `${n.label} keeps conversation history and no window or summary step is declared. The history, and the prompt built from it, grows with every turn until it hits the model's limit or the bill grows.`,
          suggestedFix: 'Set a window or a summary step',
          measurements: { contextPolicy: policy ?? 'not declared' },
        }),
      );
    }
    return out;
  },
  fixtures: [
    {
      name: 'a conversation store with no policy declared (fires)',
      graph: design(
        [comp('agent', 'agent_runtime'), comp('memory', 'database', { traits: { holdsConversation: true } })],
        [link('e1', 'agent', 'memory')],
      ),
      expect: [{ ruleId: 'R-03', severity: 'warn', componentIds: ['memory'] }],
    },
    {
      name: 'a conversation store with an explicit policy of none (fires)',
      graph: design([comp('memory', 'database', { traits: { holdsConversation: true, contextPolicy: 'none' } })]),
      expect: [
        {
          ruleId: 'R-03',
          componentIds: ['memory'],
          evidence: { recordIds: [], measurements: { contextPolicy: 'none' } },
        },
      ],
    },
    {
      name: 'a conversation store with a summary step (does not fire)',
      graph: design([comp('memory', 'database', { traits: { holdsConversation: true, contextPolicy: 'summary' } })]),
      expect: [],
    },
    {
      name: 'an ordinary database the user did not mark (does not fire)',
      graph: design([comp('db', 'database')]),
      expect: [],
    },
  ],
};
