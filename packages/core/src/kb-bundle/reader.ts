import type { KBReader } from '../ports';
import type { DecisionTypeDef, KbRecord, OptionRecord, RecordType } from '../schemas/kb';
import type { KbBundle } from './bundle';

/** A KBReader over a validated release bundle. Pure: the bundle is already in memory. */
export function createBundleReader(bundle: KbBundle): KBReader {
  const decisionTypes: readonly DecisionTypeDef[] = bundle.decisionTypes;
  const byId = new Map<string, KbRecord>(bundle.records.map((r) => [r.id, r]));
  const byType = new Map<string, KbRecord[]>();
  for (const r of bundle.records) {
    const list = byType.get(r.decision_type) ?? [];
    list.push(r);
    byType.set(r.decision_type, list);
  }
  return {
    version: bundle.version,
    decisionTypes: () => decisionTypes,
    decisionType: (id) => decisionTypes.find((d) => d.id === id) ?? null,
    options: (decisionType) => (byType.get(decisionType) ?? []).filter((r): r is OptionRecord => r.type === 'option'),
    record: (id) => byId.get(id) ?? null,
    records: (q) =>
      (byType.get(q.decisionType) ?? []).filter(
        (r) =>
          (q.type === undefined || r.type === (q.type satisfies RecordType)) &&
          (q.subject === undefined || r.subject === q.subject),
      ),
  };
}
