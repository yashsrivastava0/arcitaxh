import { z } from 'zod';
import {
  dateSchema,
  decisionTypeIdSchema,
  nonNegativeFinite,
  optionIdSchema,
  recordIdSchema,
  TEXT_LIMITS,
} from './common';
import { conditionSchema, contextFieldNameSchema } from './context';
import { paletteTypeSchema } from './design';

// KB record envelope and typed bodies (spec 8.3, 7.4-7.6). Zod is the source of truth; kb/schema/*.json is generated
// from these by `pnpm kb:schema`. Field names are snake_case because they are the file format of kb/**/*.yaml.
// These live in core (not packages/kb) because rules and ports must type records and core imports nothing from kb
// (conflict C-010). Release logic (freshness, TTL, quote checks, loader, bundle) lives in packages/kb.

export const RECORD_TYPES = [
  'option',
  'limit',
  'price',
  'capability',
  'latency_profile',
  'tradeoff',
  'flip',
  'guidance',
  'antipattern',
] as const;
export const recordTypeSchema = z.enum(RECORD_TYPES);
export type RecordType = z.infer<typeof recordTypeSchema>;

/** Typed behaviours when a limit is reached or a resource idles (spec 7.6). */
export const LIMIT_BEHAVIOURS = [
  'hard_stop',
  'pauses_after_inactivity',
  'scale_to_zero',
  'overage_billed',
  'auto_upgrade',
  'throttled',
] as const;
export type LimitBehaviour = (typeof LIMIT_BEHAVIOURS)[number];

const conditions = z.array(conditionSchema).max(10);
const sentence = z.strictObject({ text: z.string().min(1).max(TEXT_LIMITS.reasonText), applies_when: conditions });

/**
 * Decimal money as a string, never a float (micro-unit integer arithmetic happens in the calculators).
 * The currency is the record's own; the app never converts currencies (spec 4.11).
 */
const decimalAmount = z.string().regex(/^\d+(\.\d{1,12})?$/, 'a non-negative decimal such as "2.5"');

const optionBody = z.strictObject({
  name: z.string().min(1).max(120),
  vendor: z.string().min(1).max(120),
  categories: z.array(z.string().min(1).max(64)).min(1),
  /** The platform or ecosystem this option belongs to (for ecosystem_fit and deploy-target checks). */
  platform: z.string().min(1).max(64).nullable(),
  deployment: z.enum(['managed', 'self_hosted', 'both']),
  regions: z.array(z.string().min(1).max(64)),
  licence: z.string().min(1).max(120).nullable(),
  status: z.enum(['generally_available', 'beta', 'deprecated']),
  migration_effort: z.enum(['low', 'medium', 'high', 'unknown']),
  /** Allowed values are not fixed by the specification (Open); low/medium/high/unknown mirrors migration_effort. */
  ops_burden: z.enum(['low', 'medium', 'high', 'unknown']),
  applies_when: conditions,
  why_pick: z.array(sentence),
  why_not: z.array(sentence),
});

const limitBody = z.strictObject({
  scope: z.string().min(1).max(64), // for example free_tier, rate_limit, paid_tier:pro
  metric: z.string().min(1).max(120),
  value: nonNegativeFinite,
  unit: z.string().min(1).max(64),
  period: z.enum(['none', 'second', 'minute', 'hour', 'day', 'month', 'year']),
  overage_behaviour: z.enum(['hard_stop', 'overage_billed', 'auto_upgrade', 'throttled']),
  pauses_after_inactivity: z.boolean(),
  scales_to_zero: z.boolean(),
});

/** Units the cost calculator understands (spec 7.5). `per_unit` carries a metered component's own unit name. */
export const PRICE_UNITS = [
  'per_million_input_tokens',
  'per_million_cached_input_tokens',
  'per_million_output_tokens',
  'per_request',
  'per_unit',
  'fixed_per_month',
] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

const priceBody = z.strictObject({
  currency: z.string().regex(/^[A-Z]{3}$/, 'an ISO 4217 code such as USD'),
  unit: z.enum(PRICE_UNITS),
  unit_name: z.string().min(1).max(64).nullable(),
  amount: decimalAmount,
  tier: z.string().min(1).max(120),
  billing_period: z.enum(['none', 'month', 'year']),
  includes: z.string().max(TEXT_LIMITS.shortText),
});

const capabilityBody = z.strictObject({
  /** For example "hybrid_search", "eu_data_residency", "deploy_target.<platform-id>". */
  capability_id: z.string().min(1).max(120),
  support: z.enum(['yes', 'no', 'partial', 'unknown']),
  notes: z.string().max(TEXT_LIMITS.shortText),
});

const latencyBody = z
  .strictObject({
    operation: z.string().min(1).max(120),
    region: z.string().min(1).max(64),
    p50_ms: z.number().finite().positive(),
    p95_ms: z.number().finite().positive(),
    basis: z.enum(['vendor_documented', 'first_party_measured', 'third_party_licensed']),
    measured_on: dateSchema,
    sample_conditions: z.string().min(1).max(TEXT_LIMITS.shortText),
  })
  .refine((b) => b.p95_ms >= b.p50_ms, { message: 'p95 cannot be below p50', path: ['p95_ms'] });

const tradeoffBody = z.strictObject({
  sentence: z.string().min(1).max(TEXT_LIMITS.reasonText),
  applies_when: conditions,
});

const flipBody = z.strictObject({
  condition: conditionSchema,
  explanation: z.string().min(1).max(TEXT_LIMITS.reasonText),
});

const guidanceBody = z.strictObject({
  source_document: z.string().min(1).max(200),
  licence: z.string().min(1).max(120),
  paraphrase: z.string().min(1).max(TEXT_LIMITS.reasonText),
  grounded_in: z.url(),
});

const antipatternBody = z.strictObject({
  rule_id: z.string().regex(/^R-\d{2}$/),
  description: z.string().min(1).max(TEXT_LIMITS.reasonText),
});

const sourceSchema = z.strictObject({
  url: z
    .url()
    .max(TEXT_LIMITS.url)
    .refine((u) => u.startsWith('https://'), 'source URLs must be https'),
  quote: z.string().min(1).max(TEXT_LIMITS.quote),
  retrieved_on: dateSchema,
});

const verifiedSchema = z
  .strictObject({
    last_verified: dateSchema,
    valid_until: dateSchema,
    verified_by: z.string().min(1).max(100),
  })
  .refine((v) => v.valid_until >= v.last_verified, {
    message: 'valid_until cannot be before last_verified',
    path: ['valid_until'],
  });

/** A proposal has not been verified by a person: all three verification fields are null (spec 8.5, K5). */
const unverifiedSchema = z.strictObject({
  last_verified: z.null(),
  valid_until: z.null(),
  verified_by: z.null(),
});

function envelope<T extends RecordType, B extends z.ZodType>(type: T, body: B) {
  return z.strictObject({
    id: recordIdSchema,
    type: z.literal(type),
    decision_type: decisionTypeIdSchema,
    subject: z.string().min(1).max(160),
    body,
    source: sourceSchema,
    verification: verifiedSchema,
    curator_note: z.string().max(TEXT_LIMITS.shortText),
  });
}

function proposalEnvelope<T extends RecordType, B extends z.ZodType>(type: T, body: B) {
  return z.strictObject({
    id: recordIdSchema,
    type: z.literal(type),
    decision_type: decisionTypeIdSchema,
    subject: z.string().min(1).max(160),
    body,
    source: sourceSchema,
    verification: unverifiedSchema,
    curator_note: z.string().max(TEXT_LIMITS.shortText),
    status: z.literal('proposed'),
  });
}

/** A verified record, as stored in kb/records/ (and kb/fixtures/ for fake ones). */
export const kbRecordSchema = z.discriminatedUnion('type', [
  envelope('option', optionBody),
  envelope('limit', limitBody),
  envelope('price', priceBody),
  envelope('capability', capabilityBody),
  envelope('latency_profile', latencyBody),
  envelope('tradeoff', tradeoffBody),
  envelope('flip', flipBody),
  envelope('guidance', guidanceBody),
  envelope('antipattern', antipatternBody),
]);
export type KbRecord = z.infer<typeof kbRecordSchema>;
export type OptionRecord = Extract<KbRecord, { type: 'option' }>;
export type LimitRecord = Extract<KbRecord, { type: 'limit' }>;
export type PriceRecord = Extract<KbRecord, { type: 'price' }>;
export type CapabilityRecord = Extract<KbRecord, { type: 'capability' }>;
export type LatencyProfileRecord = Extract<KbRecord, { type: 'latency_profile' }>;
export type TradeoffRecord = Extract<KbRecord, { type: 'tradeoff' }>;
export type FlipRecord = Extract<KbRecord, { type: 'flip' }>;

/** A drafted record awaiting human review, as stored in kb/proposals/. Never loaded into a release. */
export const kbProposalSchema = z.discriminatedUnion('type', [
  proposalEnvelope('option', optionBody),
  proposalEnvelope('limit', limitBody),
  proposalEnvelope('price', priceBody),
  proposalEnvelope('capability', capabilityBody),
  proposalEnvelope('latency_profile', latencyBody),
  proposalEnvelope('tradeoff', tradeoffBody),
  proposalEnvelope('flip', flipBody),
  proposalEnvelope('guidance', guidanceBody),
  proposalEnvelope('antipattern', antipatternBody),
]);
export type KbProposal = z.infer<typeof kbProposalSchema>;

export const ELIMINATION_FAMILIES = ['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6'] as const;

/** kb/decision-types/<id>.yaml (spec 8.2): applicability, required chips, rules list, deferral option, palette mapping. */
export const decisionTypeDefSchema = z.strictObject({
  id: decisionTypeIdSchema,
  title: z.string().min(1).max(120),
  summary: z.string().max(TEXT_LIMITS.shortText),
  /** A launch decision type is held to the strict release checks (no placeholders, nothing expired). */
  launch: z.boolean(),
  palette_types: z.array(paletteTypeSchema).min(1),
  /** The chips this decision type's verdict needs; a missing one yields needs_context with this question. */
  required_context: z.array(
    z.strictObject({ field: contextFieldNameSchema, question: z.string().min(1).max(TEXT_LIMITS.question) }),
  ),
  /** Elimination families (E-1..E-6) and design rules (R-nn) that apply, versioned with the KB. */
  elimination: z.array(z.enum(ELIMINATION_FAMILIES)),
  design_rules: z.array(z.string().regex(/^R-\d{2}$/)),
  /** The "do not add this yet" option, when defined (spec 6.3). */
  deferral_option: optionIdSchema.nullable(),
  applies_when: conditions,
});
export type DecisionTypeDef = z.infer<typeof decisionTypeDefSchema>;
