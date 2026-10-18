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
  type FlipRecord,
  type KbProposal,
  type KbRecord,
  type LatencyProfileRecord,
  type LimitBehaviour,
  type LimitRecord,
  type OptionRecord,
  type PriceRecord,
  type PriceUnit,
  type RecordType,
  type TradeoffRecord,
} from './schemas/kb';

// configuration
export {
  DEBATE_ROLES,
  FOUNDER_TO_SET,
  MULTIPLIER_CONDITIONS,
  ROSTER_ROLES,
  costConfigSchema,
  debateConfigSchema,
  defaultsSchema,
  finalistsConfigSchema,
  freshnessConfigSchema,
  parseDefaults,
  phase0ConfigSchema,
  phase0MissingInputs,
  retentionConfigSchema,
  rosterPlaceholders,
  rosterSchema,
  rulesConfigSchema,
  scoringConfigSchema,
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

// knowledge-base release bundle (conflict C-010: pure, so the API and the browser calculator share it)
export { BUNDLE_FORMAT, KB_VERSION_PATTERN, kbBundleSchema, parseBundle, type KbBundle } from './kb-bundle/bundle';
export { createBundleReader } from './kb-bundle/reader';
export { kbJsonSchemas } from './kb-bundle/json-schema';

// freshness, usage inputs, conditions, calculators
export { freshnessState, isCurrent, type FreshnessState } from './freshness';
export { emptyUsageInputs, usageInputsSchema, type UsageInputs } from './schemas/usage';
export { allTrue, evaluateCondition, notRuledOut } from './context/conditions';
export { PICO_PER_MICRO, PICO_PER_UNIT, decimalToPico, formatPico, numberToPico, picoToMicro } from './calc/money';
export {
  assessFreeTier,
  breakpoint,
  formatMultiple,
  growthFactor,
  type FreeTierAssessment,
  type LimitAssessment,
} from './calc/free-tier';
export { CALCULATOR_OUTPUTS, RULES_VERSION } from './versions';

// the six-stage decision pipeline
export {
  runPipeline,
  runPipelineDetailed,
  type PipelineInputs,
  type PipelineRun,
  type PipelineTrace,
} from './pipeline/run-pipeline';
export { assumptionsFor, computeWeights, isMissing, userPlatforms } from './pipeline/stage1-constraints';
