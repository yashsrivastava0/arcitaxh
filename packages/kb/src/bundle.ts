import { BUNDLE_FORMAT, kbBundleSchema, type KbBundle } from '@product/core';
import type { KbTree } from './parse';

const byId = <T extends { id: string }>(a: T, b: T): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Builds the release bundle from a parsed KB tree. Deterministic: decision types and records are sorted by id, so the
 * same tree always produces byte-identical JSON. Proposals are never included (K5: only verified records ship), and
 * the result is validated against the bundle schema, so an invalid tree cannot produce a bundle.
 *
 * The caller must run checkKb first and stop on errors; this function does not re-check freshness.
 */
export function buildBundle(tree: KbTree, opts: { version: string; commit: string | null }): KbBundle {
  return kbBundleSchema.parse({
    bundleFormat: BUNDLE_FORMAT,
    version: opts.version,
    commit: opts.commit,
    decisionTypes: tree.decisionTypes.map((d) => d.def).sort(byId),
    records: tree.records.map((r) => r.record).sort(byId),
  });
}
