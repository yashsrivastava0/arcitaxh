// Public API of @product/core. Everything else in this package is private.
// Pure TypeScript: no I/O, no clock, no randomness, no environment (hard rule 3).

// ports (types only)
export type { Clock, IdGenerator, KBReader } from './ports';

// shared schemas and ids
export {
  TEXT_LIMITS,
  dateSchema,
  decisionTypeIdSchema,
  graphIdSchema,
  optionIdSchema,
  optionRefSchema,
  recordIdSchema,
  type OptionRef,
} from './schemas/common';

// context profile
export {
  CONTEXT_FIELD_NAMES,
  conditionSchema,
  contextFieldNameSchema,
  contextProfileSchema,
  emptyContextProfile,
  mustHaveSchema,
  type Condition,
  type ContextFieldName,
  type ContextProfile,
  type MustHave,
} from './schemas/context';

// design graph
export {
  PALETTE_TYPES,
  checkInvariants,
  componentTypeSchema,
  createDesignGraphSchema,
  paletteTypeSchema,
  parseDesign,
  type Component,
  type DesignGraph,
  type DesignIssue,
  type DesignLimits,
  type Edge,
  type InvariantCode,
  type PaletteType,
  type ParseDesignResult,
  type Violation,
} from './schemas/design';
export { findUnknownOptions, type UnknownOption } from './design/unknown-options';

// verdict, findings, outcomes
export {
  DIMENSIONS,
  ELIMINATION_RULES,
  alternativeSchema,
  assumptionSchema,
  constraintsSchema,
  dimensionSchema,
  eliminationSchema,
  flipConditionSchema,
  kbGapOutcomeSchema,
  needsContextOutcomeSchema,
  optionScoreSchema,
  outcomeSchema,
  reasonSchema,
  verdictOutcomeSchema,
  verdictSchema,
  type Alternative,
  type Assumption,
  type Constraints,
  type Dimension,
  type DimensionScore,
  type Elimination,
  type FlipCondition,
  type OptionScore,
  type Outcome,
  type Reason,
  type Verdict,
} from './schemas/verdict';
export { SEVERITIES, findingSchema, severitySchema, type Finding, type Severity } from './schemas/finding';

// knowledge-base records
export {
  ELIMINATION_FAMILIES,
  LIMIT_BEHAVIOURS,
  PRICE_UNITS,
  RECORD_TYPES,
  decisionTypeDefSchema,
  kbProposalSchema,
  kbRecordSchema,
  recordTypeSchema,
  type CapabilityRecord,
  type DecisionTypeDef,
  type KbProposal,
  type KbRecord,
  type LatencyProfileRecord,
  type LimitBehaviour,
  type LimitRecord,
  type OptionRecord,
  type PriceRecord,
  type PriceUnit,
  type RecordType,
} from './schemas/kb';

// configuration
export {
  DEBATE_ROLES,
  FOUNDER_TO_SET,
  MULTIPLIER_CONDITIONS,
  ROSTER_ROLES,
  defaultsSchema,
  parseDefaults,
  phase0ConfigSchema,
  phase0MissingInputs,
  rosterPlaceholders,
  rosterSchema,
  type CostConfig,
  type DebateConfig,
  type Defaults,
  type FinalistsConfig,
  type FreshnessConfig,
  type Phase0Config,
  type RetentionConfig,
  type Roster,
  type RosterRole,
  type RulesConfig,
  type ScoringConfig,
} from './schemas/config';

// normalisation and hashing
export { CanonicalJsonError, canonicalEqual, canonicalJson } from './normalise/canonical-json';
export {
  LAYOUT_FIELDS,
  compareStrings,
  normaliseContext,
  normaliseDesign,
  normaliseOptionRefs,
  sortedUniqueStrings,
  type NormalisedDesign,
} from './normalise/normalise';
export { sha256Hex } from './hash/sha256';
export { HASH_FORMAT_VERSION, designHash, inputsHash, type HashInputs } from './hash/inputs-hash';

// dates
export { addDays, dateOfTimestamp, daysBetween, isRealDate } from './util/date';
