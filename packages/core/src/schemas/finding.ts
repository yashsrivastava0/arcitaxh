import { z } from 'zod';
import { graphIdSchema, recordIdSchema, TEXT_LIMITS } from './common';

export const SEVERITIES = ['info', 'warn', 'block'] as const;
export const severitySchema = z.enum(SEVERITIES);
export type Severity = z.infer<typeof severitySchema>;

/**
 * Finding (spec 5.6). `block` means "do not offer a debate or an export until resolved" (rule R-09).
 *
 * `kind` is not in the spec's type but the rule contract (7.1) requires "a finding of the kind unknown" when data
 * is missing, never a pass (hard rule 7, P9). `detected` is a real finding; `unknown` says the rule could not
 * decide. Logged as conflict C-014.
 */
export const findingSchema = z.strictObject({
  kind: z.enum(['detected', 'unknown']),
  ruleId: z.string().regex(/^R-\d{2}$/, 'rule ids look like R-01'),
  ruleVersion: z.string().regex(/^\d+\.\d+\.\d+$/, 'rule versions are semantic versions'),
  severity: severitySchema,
  componentIds: z.array(graphIdSchema),
  title: z.string().min(1).max(TEXT_LIMITS.shortText),
  explanation: z.string().min(1).max(TEXT_LIMITS.reasonText),
  evidence: z.strictObject({
    recordIds: z.array(recordIdSchema),
    measurements: z.record(z.string().max(64), z.union([z.number().finite(), z.string().max(TEXT_LIMITS.paramString)])),
  }),
  suggestedFix: z.string().max(TEXT_LIMITS.shortText).nullable(),
});
export type Finding = z.infer<typeof findingSchema>;
