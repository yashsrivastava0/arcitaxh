// Small builders for rule fixtures. Production-safe: they do not import test code, because each rule carries its
// fixtures (specification 7.1) and the rules are production code.
import type { Component, DesignGraph, Edge } from '../../schemas/design';

export function comp(id: string, type: Component['type'], over: Partial<Component> = {}): Component {
  return {
    id,
    type,
    label: over.label ?? id,
    status: 'undecided',
    decisionType: null,
    choice: null,
    classification: 'classified',
    traits: {},
    position: { x: 0, y: 0 },
    ...over,
  };
}

export function link(id: string, from: string, to: string, over: Partial<Edge> = {}): Edge {
  return { id, from, to, mode: 'sync', ...over };
}

export function design(nodes: Component[], edges: Edge[] = []): DesignGraph {
  return { nodes, edges };
}

/** A decided component whose chosen option is `optionId` (a record in the fixture knowledge base). */
export function decided(
  id: string,
  type: Component['type'],
  optionId: string,
  over: Partial<Component> = {},
): Component {
  return comp(id, type, { status: 'decided', decisionType: 'vector-store', choice: { optionId, params: {} }, ...over });
}
