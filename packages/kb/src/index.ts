// Public API of @product/kb: knowledge-base release logic. Pure (no file system, no network); the tools read files
// and pass them in. May import @product/core only.
export {
  checkKb,
  findPlaceholders,
  isFakeSourceUrl,
  verifyProposal,
  type CheckOptions,
  type CheckResult,
  type DueEntry,
} from './checks';
export { expectedValidUntil, freshnessState, ttlDays, ttlKey, type FreshnessState, type TtlKey } from './freshness';
export {
  formatSnapshot,
  parseKbSource,
  splitSnapshot,
  type KbTree,
  type ParseOptions,
  type ParseResult,
  type ParsedDecisionType,
  type ParsedProposal,
  type ParsedRecord,
  type Problem,
  type ProblemCode,
  type Snapshot,
  type SourceFile,
} from './parse';
export { collapseWhitespace, numbersInBody, numbersInText, quoteAppearsIn } from './text';
export { buildBundle } from './bundle';
