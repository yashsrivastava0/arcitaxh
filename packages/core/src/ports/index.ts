// Ports: interfaces the core and the orchestration code depend on. Adapters implement them elsewhere
// (packages/kb, packages/db, packages/llm, apps). Types only: nothing here executes.
// More repository ports (DebateRepo, UsageRepo, ...) are added with the milestone that needs them (M7/M8).
import type { DecisionTypeDef, KbRecord, OptionRecord, RecordType } from '../schemas/kb';

/**
 * Time comes in through this port; core never reads the clock (hard rule 3, principle P7).
 * `now()` is an ISO-8601 UTC timestamp such as "2026-10-18T09:30:00.000Z".
 */
export interface Clock {
  now(): string;
}

/** Ids come in through this port; core never generates randomness. Persisted ids are UUIDv7. */
export interface IdGenerator {
  next(): string;
}

/** Read access to one knowledge-base release. Implementations: bundle reader (core), fixtures in tests. */
export interface KBReader {
  /** The release this reader serves, for example "kb-2026.10.1". Stored on every verdict. */
  readonly version: string;
  decisionTypes(): readonly DecisionTypeDef[];
  decisionType(id: string): DecisionTypeDef | null;
  /** All option records of a decision type (including the deferral option when defined). */
  options(decisionType: string): readonly OptionRecord[];
  record(id: string): KbRecord | null;
  records(query: { decisionType: string; type?: RecordType; subject?: string }): readonly KbRecord[];
}
