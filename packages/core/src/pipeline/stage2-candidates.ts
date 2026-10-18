import { notRuledOut } from '../context/conditions';
import type { KBReader } from '../ports';
import type { ContextProfile } from '../schemas/context';
import type { DecisionTypeDef, OptionRecord } from '../schemas/kb';

export type Stage2Result =
  { kind: 'kb_gap'; reason: string } | { kind: 'ok'; candidates: OptionRecord[]; deferral: OptionRecord | null };

/**
 * Candidates (specification 6.3): the KB options of this decision type whose applicability conditions are not
 * definitely false for the context. An unknown condition keeps the option in play (P9). The decision type's deferral
 * option ("keep it simple for now") is itself an option record, so it is included whenever it applies. An empty set is
 * the outcome `kb_gap`, which names the decision type; it is never a silent empty result.
 */
export function stage2Candidates(args: { def: DecisionTypeDef; profile: ContextProfile; kb: KBReader }): Stage2Result {
  const { def, profile, kb } = args;
  if (!notRuledOut(def.applies_when, profile)) {
    return { kind: 'kb_gap', reason: `Decision type "${def.id}" does not apply to this context.` };
  }
  // Sorted by id so the result never depends on the order a KB reader happens to return records in.
  const candidates = kb
    .options(def.id)
    .filter((o) => notRuledOut(o.body.applies_when, profile))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (candidates.length === 0) {
    return {
      kind: 'kb_gap',
      reason: `The knowledge base has no options for "${def.id}" that apply to this context. Add or promote option records for it.`,
    };
  }
  const deferral = def.deferral_option === null ? null : (candidates.find((o) => o.id === def.deferral_option) ?? null);
  return { kind: 'ok', candidates, deferral };
}
