import { z } from 'zod';
import { nonNegativeFinite, optionIdSchema, optionRefSchema, TEXT_LIMITS } from './common';

/** MustHave (spec 5.2). */
export const mustHaveSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('eu_data_residency') }),
  z.strictObject({ kind: z.literal('max_p95_latency_ms'), value: z.number().finite().positive() }),
  z.strictObject({ kind: z.literal('compliance'), id: z.string().min(1).max(TEXT_LIMITS.paramString) }),
  z.strictObject({ kind: z.literal('requires_capability'), id: z.string().min(1).max(TEXT_LIMITS.paramString) }),
  z.strictObject({ kind: z.literal('avoid_vendor'), optionId: optionIdSchema }),
]);
export type MustHave = z.infer<typeof mustHaveSchema>;

/** ContextProfile (spec 5.2): the chips the user sees, as typed values. `null` and `'unknown'` mean unknown. */
export const contextProfileSchema = z.strictObject({
  purpose: z.enum(['personal', 'startup', 'company', 'unknown']),
  usersNow: nonNegativeFinite.nullable(),
  usersIn12Months: nonNegativeFinite.nullable(),
  budget: z.enum(['free_only', 'small', 'flexible', 'unknown']),
  monthlyCeilingUsd: nonNegativeFinite.nullable(),
  deployTarget: z.string().min(1).max(TEXT_LIMITS.paramString).nullable(),
  existingStack: z.array(optionRefSchema).max(50),
  team: z.strictObject({
    size: z.enum(['solo', 'small', 'large', 'unknown']),
    experience: z.enum(['beginner', 'intermediate', 'expert', 'unknown']),
  }),
  mustHaves: z.array(mustHaveSchema).max(50),
});
export type ContextProfile = z.infer<typeof contextProfileSchema>;

/**
 * Names a rule, a condition or a flip condition may refer to. Dotted names address nested fields.
 * Used by `needs_context` (the single next question) and by validator check G6.
 */
export const CONTEXT_FIELD_NAMES = [
  'purpose',
  'usersNow',
  'usersIn12Months',
  'budget',
  'monthlyCeilingUsd',
  'deployTarget',
  'existingStack',
  'team.size',
  'team.experience',
  'mustHaves',
] as const;
export const contextFieldNameSchema = z.enum(CONTEXT_FIELD_NAMES);
export type ContextFieldName = z.infer<typeof contextFieldNameSchema>;

/**
 * A typed condition on the context, used by curated KB text ("applies when") and by option applicability
 * (spec 6.3). `eq`/`neq` compare a scalar field; `lte`/`gte` compare a number; `includes` tests membership of
 * `existingStack` (by option id) or `mustHaves` (by kind).
 */
export const conditionSchema = z.strictObject({
  field: contextFieldNameSchema,
  op: z.enum(['eq', 'neq', 'lte', 'gte', 'includes']),
  value: z.union([z.string().max(TEXT_LIMITS.paramString), z.number().finite(), z.boolean()]),
});
export type Condition = z.infer<typeof conditionSchema>;

/** An "unknown" starting point: nothing given. Useful for tests and for a skipped interview. */
export function emptyContextProfile(): ContextProfile {
  return {
    purpose: 'unknown',
    usersNow: null,
    usersIn12Months: null,
    budget: 'unknown',
    monthlyCeilingUsd: null,
    deployTarget: null,
    existingStack: [],
    team: { size: 'unknown', experience: 'unknown' },
    mustHaves: [],
  };
}
