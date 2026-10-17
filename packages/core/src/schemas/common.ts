import { z } from 'zod';
import { isRealDate } from '../util/date';

/**
 * Structural bounds on untrusted free text (spec I8). These are not tuned Defaults: they cap what a model or a
 * user can put into a verdict, a finding or a record. Design-shape limits (components, label and note length)
 * come from config/defaults/rules.json and are passed in, never hard-coded here.
 */
export const TEXT_LIMITS = {
  id: 160,
  shortText: 300,
  reasonText: 1000,
  question: 300,
  paramString: 200,
  quote: 2000,
  url: 2000,
} as const;

/** Component and edge ids: stable strings generated once and stored (spec 5.7). */
export const graphIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/, 'ids use letters, digits, and _ . : -');

/** Decision type ids, for example "vector-store". */
export const decisionTypeIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'decision type ids are kebab-case');

/** Option and record ids, for example "option.existing-relational-extension" or "vs.option-a.free-tier.2026-10". */
export const recordIdSchema = z
  .string()
  .min(1)
  .max(TEXT_LIMITS.id)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, 'record ids are lowercase letters, digits, and . _ -');

export const optionIdSchema = recordIdSchema;

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'dates are YYYY-MM-DD')
  .refine(isRealDate, 'not a real calendar date');

export const paramValueSchema = z.union([z.string().max(TEXT_LIMITS.paramString), z.number().finite(), z.boolean()]);

/** A chosen or candidate option with its parameters (spec 5.4 `choice`, 5.5 `pick`). */
export const optionRefSchema = z.strictObject({
  optionId: optionIdSchema,
  params: z.record(z.string().max(64), paramValueSchema),
});
export type OptionRef = z.infer<typeof optionRefSchema>;

export const nonNegativeFinite = z.number().finite().nonnegative();
