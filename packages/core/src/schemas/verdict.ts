import { z } from 'zod';
import { canonicalEqual } from '../normalise/canonical-json';
import {
  decisionTypeIdSchema,
  graphIdSchema,
  optionIdSchema,
  optionRefSchema,
  recordIdSchema,
  TEXT_LIMITS,
} from './common';
import { contextFieldNameSchema, contextProfileSchema } from './context';

export const DIMENSIONS = [
  'cost_fit',
  'scale_fit',
  'latency_fit',
  'operational_simplicity',
  'ecosystem_fit',
  'reversibility',
] as const;
export const dimensionSchema = z.enum(DIMENSIONS);
export type Dimension = z.infer<typeof dimensionSchema>;

/** Assumption: a plain-language sentence, for example "Team size was not given; scoring assumed a small team." */
export const assumptionSchema = z.string().min(1).max(TEXT_LIMITS.shortText);
export type Assumption = z.infer<typeof assumptionSchema>;

/**
 * Reason (spec 5.5). A `fact` reason must cite at least one KB record. A `judgement` reason is labelled as one and
 * cannot contain a number, price or limit. Only digits are rejected here; the full numeric-token check is the
 * grounding validator's G3/G5 (a judgement like "one database" with a number word is allowed, spec C.4).
 */
export const reasonSchema = z
  .strictObject({
    text: z.string().min(1).max(TEXT_LIMITS.reasonText),
    kind: z.enum(['fact', 'judgement']),
    citedRecordIds: z.array(recordIdSchema).max(20),
  })
  .superRefine((r, ctx) => {
    if (r.kind === 'fact' && r.citedRecordIds.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'a fact reason must cite at least one knowledge-base record',
        path: ['citedRecordIds'],
      });
    }
    if (r.kind === 'judgement' && /\p{Nd}/u.test(r.text)) {
      ctx.addIssue({ code: 'custom', message: 'a judgement reason cannot contain a number', path: ['text'] });
    }
  });
export type Reason = z.infer<typeof reasonSchema>;

/**
 * FlipCondition: the condition under which the recommendation would change, with the records it depends on.
 * `refersTo` names the context fields or calculator outputs it depends on; validator check G6 requires them to
 * exist.
 */
export const flipConditionSchema = z.strictObject({
  text: z.string().min(1).max(TEXT_LIMITS.reasonText),
  citedRecordIds: z.array(recordIdSchema).max(20),
  refersTo: z.array(z.string().min(1).max(64)).max(10),
});
export type FlipCondition = z.infer<typeof flipConditionSchema>;

export const alternativeSchema = z.strictObject({
  optionId: optionIdSchema,
  whyNot: z.array(reasonSchema),
  flipCondition: flipConditionSchema.nullable(),
});
export type Alternative = z.infer<typeof alternativeSchema>;

export const ELIMINATION_RULES = ['E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6'] as const;
/** "The verdict keeps a list: eliminated option, rule id, record id" (spec 6.4). E-5 uses user input, so no record. */
export const eliminationSchema = z.strictObject({
  optionId: optionIdSchema,
  ruleId: z.enum(ELIMINATION_RULES),
  recordId: recordIdSchema.nullable(),
});
export type Elimination = z.infer<typeof eliminationSchema>;

export const dimensionScoreSchema = z.strictObject({
  dimension: dimensionSchema,
  weight: z.number().min(0).max(1),
  value: z.number().min(0).max(1).nullable(),
  /** scored: has a value. unknown: data missing, excluded from the sum, score flagged partial. not_applicable: e.g. no latency must-have. */
  state: z.enum(['scored', 'unknown', 'not_applicable']),
  uncertain: z.boolean(),
});
export type DimensionScore = z.infer<typeof dimensionScoreSchema>;

/** Per-dimension breakdown stored with the verdict (spec 6.5). `total` is null when no dimension could be scored. */
export const optionScoreSchema = z.strictObject({
  optionId: optionIdSchema,
  total: z.number().min(0).max(1).nullable(),
  partial: z.boolean(),
  uncertain: z.boolean(),
  dimensions: z.array(dimensionScoreSchema),
});
export type OptionScore = z.infer<typeof optionScoreSchema>;

/**
 * Verdict (spec 5.5). `eliminated` and `scores` are added to the spec's listing because sections 6.4 and 6.5 say
 * they are stored with the verdict (conflict C-013). `pick: null` is valid (deferral or no fit).
 */
export const verdictSchema = z
  .strictObject({
    decisionType: decisionTypeIdSchema,
    componentId: graphIdSchema,
    pick: optionRefSchema.nullable(),
    pickOrigin: z.enum(['rules', 'debate']),
    rulesPick: optionRefSchema.nullable(),
    confidence: z.enum(['clear', 'close', 'uncertain']),
    why: z.array(reasonSchema),
    assumptions: z.array(assumptionSchema),
    flipConditions: z.array(flipConditionSchema),
    alternatives: z.array(alternativeSchema),
    runnerUp: optionRefSchema.nullable(),
    reversalCost: z.enum(['low', 'medium', 'high', 'unknown']),
    blindSpots: z.array(z.string().min(1).max(TEXT_LIMITS.shortText)),
    stale: z.boolean(),
    versions: z.strictObject({
      kb: z.string().min(1).max(64),
      rules: z.string().min(1).max(64),
      prompts: z.string().min(1).max(64).nullable(),
    }),
    debateId: z.string().min(1).max(64).nullable(),
    eliminated: z.array(eliminationSchema),
    scores: z.array(optionScoreSchema),
  })
  .superRefine((v, ctx) => {
    if (v.pickOrigin === 'rules' && !canonicalEqual(v.pick, v.rulesPick)) {
      ctx.addIssue({
        code: 'custom',
        message: 'when the rules chose the pick, rulesPick must equal pick',
        path: ['rulesPick'],
      });
    }
    if (v.pickOrigin === 'debate' && v.debateId === null) {
      ctx.addIssue({ code: 'custom', message: 'a debate-origin pick must link its debate', path: ['debateId'] });
    }
  });
export type Verdict = z.infer<typeof verdictSchema>;

/** Constraints (Stage 1 output): the validated, normalised profile plus derived values. Weights sum to 1. */
export const constraintsSchema = z.strictObject({
  profile: contextProfileSchema,
  weights: z.strictObject({
    cost_fit: z.number().min(0).max(1),
    scale_fit: z.number().min(0).max(1),
    latency_fit: z.number().min(0).max(1),
    operational_simplicity: z.number().min(0).max(1),
    ecosystem_fit: z.number().min(0).max(1),
    reversibility: z.number().min(0).max(1),
  }),
  freeOnly: z.boolean(),
  latencyBudgetMs: z.number().positive().nullable(),
  euResidencyRequired: z.boolean(),
  requiredCapabilities: z.array(z.string().min(1).max(TEXT_LIMITS.paramString)),
  avoidedVendors: z.array(optionIdSchema),
  assumptions: z.array(assumptionSchema),
});
export type Constraints = z.infer<typeof constraintsSchema>;

/** Outcome = Verdict | needs_context | kb_gap (spec 6.1). A result other than a verdict is never a silent empty. */
export const verdictOutcomeSchema = z.strictObject({ outcome: z.literal('verdict'), verdict: verdictSchema });

export const needsContextOutcomeSchema = z
  .strictObject({
    outcome: z.literal('needs_context'),
    decisionType: decisionTypeIdSchema,
    missing: z.array(contextFieldNameSchema).min(1),
    /** The single next question, asked one at a time in the interview style. */
    nextQuestion: z.strictObject({
      field: contextFieldNameSchema,
      question: z.string().min(1).max(TEXT_LIMITS.question),
    }),
  })
  .superRefine((o, ctx) => {
    if (!o.missing.includes(o.nextQuestion.field)) {
      ctx.addIssue({
        code: 'custom',
        message: 'the next question must be about a missing field',
        path: ['nextQuestion', 'field'],
      });
    }
  });

export const kbGapOutcomeSchema = z.strictObject({
  outcome: z.literal('kb_gap'),
  /** Names the decision type, so the gap can be fixed in the knowledge base. */
  decisionType: decisionTypeIdSchema,
  reason: z.string().min(1).max(TEXT_LIMITS.shortText),
});

export const outcomeSchema = z.discriminatedUnion('outcome', [
  verdictOutcomeSchema,
  needsContextOutcomeSchema,
  kbGapOutcomeSchema,
]);
export type Outcome = z.infer<typeof outcomeSchema>;
