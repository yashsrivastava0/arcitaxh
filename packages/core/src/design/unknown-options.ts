import type { KBReader } from '../ports';
import type { DesignGraph } from '../schemas/design';

export interface UnknownOption {
  componentId: string;
  decisionType: string | null;
  optionId: string;
}

/**
 * Invariant I4 (spec 5.4): a component's `choice.optionId` must exist for its decision type in the knowledge base.
 * If it does not, the component is shown with "unknown option" and the verdict is uncertain. This is reported, not
 * thrown: a design with an unknown option is still a valid design (P9, missing data never silently decides).
 */
export function findUnknownOptions(graph: DesignGraph, kb: KBReader): UnknownOption[] {
  const out: UnknownOption[] = [];
  for (const node of graph.nodes) {
    if (node.choice === null) continue;
    const known =
      node.decisionType !== null && kb.options(node.decisionType).some((o) => o.id === node.choice?.optionId);
    if (!known) out.push({ componentId: node.id, decisionType: node.decisionType, optionId: node.choice.optionId });
  }
  return out;
}
