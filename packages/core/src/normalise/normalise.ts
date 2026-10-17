import type { OptionRef } from '../schemas/common';
import type { ContextProfile } from '../schemas/context';
import type { Component, DesignGraph, Edge } from '../schemas/design';
import { canonicalJson } from './canonical-json';

/** Fields that exist only for drawing. They never reach a rule, a calculator or a hash (invariant I5). */
export const LAYOUT_FIELDS = ['position'] as const;

export type StrippedComponent = Omit<Component, (typeof LAYOUT_FIELDS)[number]>;
export interface NormalisedDesign {
  nodes: StrippedComponent[];
  edges: Edge[];
}

/** Locale-independent string order (UTF-16 code units). Never use localeCompare for anything hashed. */
export function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Sorts by canonical form and removes exact duplicates. */
function sortedUnique<T>(items: readonly T[]): T[] {
  const keyed = items.map((item) => ({ item, key: canonicalJson(item) }));
  keyed.sort((a, b) => compareStrings(a.key, b.key));
  return keyed.filter((k, i) => i === 0 || k.key !== (keyed[i - 1] as { key: string }).key).map((k) => k.item);
}

/** The design with layout removed and nodes and edges in id order: moving or re-ordering never changes semantics. */
export function normaliseDesign(graph: DesignGraph): NormalisedDesign {
  const nodes = graph.nodes.map((n): StrippedComponent => {
    const { position: _layout, ...rest } = n;
    return rest;
  });
  nodes.sort((a, b) => compareStrings(a.id, b.id));
  const edges = [...graph.edges].sort((a, b) => compareStrings(a.id, b.id));
  return { nodes, edges };
}

/** The context with order-insensitive lists sorted and de-duplicated. */
export function normaliseContext(profile: ContextProfile): ContextProfile {
  return {
    ...profile,
    existingStack: sortedUnique(profile.existingStack),
    mustHaves: sortedUnique(profile.mustHaves),
  };
}

export function normaliseOptionRefs(refs: readonly OptionRef[]): OptionRef[] {
  return sortedUnique(refs);
}

export function sortedUniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareStrings);
}
