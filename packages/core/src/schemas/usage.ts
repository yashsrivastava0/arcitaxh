import { z } from 'zod';
import { nonNegativeFinite } from './common';

const tokenCounts = z.strictObject({
  input: z.number().int().nonnegative(),
  cachedInput: z.number().int().nonnegative(),
  output: z.number().int().nonnegative(),
});

/**
 * The usage figures the user gives to the calculators (specification 7.3). Each is marked as user input, so it is never
 * mistaken for a fact, and `null` means "not given": the app never invents traffic. They are part of `Constraints`, so
 * they are part of the verdict hash.
 */
export const usageInputsSchema = z.strictObject({
  requestsPerDayNow: nonNegativeFinite.nullable(),
  requestsPerDay12Months: nonNegativeFinite.nullable(),
  modelCallsPerRequest: nonNegativeFinite.nullable(),
  /** Typical and high token counts per model call, for the low and high cost range. */
  tokensPerCall: z.strictObject({ typical: tokenCounts, high: tokenCounts }).nullable(),
  readRatio: z.number().min(0).max(1).nullable(),
  /** Region of the user base, where it matters for hop times. */
  userRegion: z.string().min(1).max(64).nullable(),
  /**
   * Current usage per limit metric (for example stored_vectors), in the unit and period of the limit records that
   * govern it. Usage is assumed to grow in proportion to traffic (specification 7.7).
   */
  metrics: z.record(z.string().min(1).max(64), nonNegativeFinite),
});
export type UsageInputs = z.infer<typeof usageInputsSchema>;

export function emptyUsageInputs(): UsageInputs {
  return {
    requestsPerDayNow: null,
    requestsPerDay12Months: null,
    modelCallsPerRequest: null,
    tokensPerCall: null,
    readRatio: null,
    userRegion: null,
    metrics: {},
  };
}
