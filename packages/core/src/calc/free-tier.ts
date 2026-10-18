import type { ContextProfile } from '../schemas/context';
import type { LimitRecord } from '../schemas/kb';
import type { UsageInputs } from '../schemas/usage';

/**
 * How much traffic grows over 12 months, as a multiple of today (specification 7.7: usage is assumed to grow in
 * proportion to traffic). Requests per day are preferred; users are the fallback. `null` when it cannot be known:
 * nothing is invented.
 */
export function growthFactor(profile: ContextProfile, usage: UsageInputs): number | null {
  const { requestsPerDayNow: now, requestsPerDay12Months: later } = usage;
  if (now !== null && later !== null && now > 0) return later / now;
  if (profile.usersNow !== null && profile.usersIn12Months !== null && profile.usersNow > 0) {
    return profile.usersIn12Months / profile.usersNow;
  }
  return null;
}

/** The free-tier breakpoint L / u1: the multiple of today's usage at which the limit is reached (specification 7.7). */
export function breakpoint(limit: number, usageNow: number): number | null {
  if (usageNow <= 0) return null;
  return limit / usageNow;
}

export interface LimitAssessment {
  recordId: string;
  metric: string;
  limit: number;
  /** Usage today, from the user's own figures; null if the user gave none for this metric. */
  usageNow: number | null;
  /** Usage in 12 months under proportional growth; null if usage or growth is unknown. */
  usage12: number | null;
  breakpoint: number | null;
  state: 'covers' | 'exceeds' | 'unknown';
}

export interface FreeTierAssessment {
  /** exceeds: some limit is passed (conclusive). covers: every limit holds at the 12-month scale. unknown: cannot tell. */
  state: 'covers' | 'exceeds' | 'unknown';
  limits: LimitAssessment[];
}

/**
 * Does the free tier cover the user's 12-month scale? Evaluated only from the user's own figures:
 *  - if today's usage already passes a limit, the free tier does not cover it (conclusive);
 *  - if growth is unknown, "covers" cannot be claimed, so the answer is unknown;
 *  - a limit with no usage figure for its metric is unknown.
 */
export function assessFreeTier(
  limits: readonly LimitRecord[],
  usage: UsageInputs,
  growth: number | null,
): FreeTierAssessment {
  const assessed = limits.map((rec): LimitAssessment => {
    const metric = rec.body.metric;
    const limit = rec.body.value;
    const usageNow = usage.metrics[metric] ?? null;
    const usage12 = usageNow !== null && growth !== null ? usageNow * growth : null;
    let state: LimitAssessment['state'] = 'unknown';
    if (usageNow !== null && usageNow > limit) state = 'exceeds';
    else if (usage12 !== null) state = usage12 > limit ? 'exceeds' : 'covers';
    return {
      recordId: rec.id,
      metric,
      limit,
      usageNow,
      usage12,
      breakpoint: usageNow === null ? null : breakpoint(limit, usageNow),
      state,
    };
  });
  const state = assessed.some((a) => a.state === 'exceeds')
    ? 'exceeds'
    : assessed.length > 0 && assessed.every((a) => a.state === 'covers')
      ? 'covers'
      : 'unknown';
  return { state, limits: assessed };
}

/** A stable one-decimal form below 10, whole numbers above, for flip-condition text such as "about 1.3 times". */
export function formatMultiple(x: number): string {
  return x < 10 ? (Math.round(x * 10) / 10).toFixed(1) : String(Math.round(x));
}
