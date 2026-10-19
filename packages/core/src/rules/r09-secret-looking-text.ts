import { findSecrets, redactSecrets, stringsWithPaths } from '../security/redact';
import type { Finding } from '../schemas/finding';
import type { Rule } from './types';
import { detected } from './types';
import { comp, design, link } from './fixtures/builders';

// R-09: labels, notes or context contain text that looks like a credential (severity `block`). A design with such text
// must never be sent to a model or exported, so the finding blocks both until it is removed. It names WHERE the text is
// and what family it looks like, and never repeats it. (Specification 7.2, 13; brief 10.4, security/redact.)
export const R09: Rule = {
  id: 'R-09',
  version: '0.1.0',
  title: 'Secret-looking text in the design',
  appliesTo: 'design',
  severity: 'block',
  check({ graph, profile }) {
    const out: Finding[] = [];
    const scan = (value: unknown, where: string, componentIds: string[]): void => {
      for (const s of stringsWithPaths(value)) {
        const kinds = [...new Set(findSecrets(s.text).map((m) => m.kind))].sort();
        if (kinds.length === 0) continue;
        // An id can itself hold a pasted key, so the location text is redacted too; the finding never repeats a secret.
        const place = redactSecrets(`${where}${s.path === '' ? '' : ` (${s.path})`}`).text;
        out.push(
          detected(R09, {
            componentIds,
            title: 'Secret-looking text in the design',
            explanation: `The ${place} contains text that looks like a credential (${kinds.join(', ').replace(/_/g, ' ')}). Remove it. It blocks the debate and the export until it is gone, so it is never sent to a model.`,
            suggestedFix: 'Remove the value and keep the secret in your own secret store',
            measurements: { location: place, matches: kinds.length },
          }),
        );
      }
    };
    for (const n of [...graph.nodes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
      scan({ id: n.id, label: n.label }, `component "${n.id}"`, [n.id]);
      if (n.choice !== null) scan({ choice: n.choice.params }, `component "${n.id}"`, [n.id]);
    }
    for (const e of [...graph.edges].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
      if (e.note !== undefined) scan({ note: e.note }, `edge "${e.id}"`, [e.from, e.to]);
    }
    scan(profile, 'context', []);
    return out;
  },
  fixtures: [
    {
      name: 'a key pasted into a component label (fires, blocks)',
      graph: design([comp('api', 'api', { label: `API key sk${'-'}${'a1'.repeat(14)}` }), comp('db', 'database')]),
      expect: [
        {
          ruleId: 'R-09',
          kind: 'detected',
          severity: 'block',
          componentIds: ['api'],
          evidence: { recordIds: [], measurements: { location: 'component "api" (label)', matches: 1 } },
        },
      ],
    },
    {
      name: 'a token in an edge note (fires, names both ends)',
      graph: design(
        [comp('api', 'api'), comp('db', 'database')],
        [link('e1', 'api', 'db', { note: `auth with gh${'p'}_${'aB3'.repeat(13)}` })],
      ),
      expect: [{ ruleId: 'R-09', severity: 'block', componentIds: ['api', 'db'] }],
    },
    {
      name: 'a credential pasted into the context (fires)',
      graph: design([comp('api', 'api')]),
      profile: { deployTarget: `AK${'IA'}${'Q7'.repeat(8)}` },
      expect: [
        {
          ruleId: 'R-09',
          severity: 'block',
          componentIds: [],
          evidence: { recordIds: [], measurements: { location: 'context (deployTarget)', matches: 1 } },
        },
      ],
    },
    {
      name: 'ordinary labels and notes (does not fire)',
      graph: design(
        [comp('api', 'api', { label: 'Public API (sk- keys are issued per customer)' }), comp('db', 'database')],
        [link('e1', 'api', 'db', { note: 'reads only; the token budget is 4000' })],
      ),
      expect: [],
    },
  ],
};
