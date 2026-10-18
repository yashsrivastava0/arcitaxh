import { daysBetween } from './util/date';

export type FreshnessState = 'fresh' | 'due_soon' | 'expired';

/**
 * A record is fresh until its valid-until date (inclusive), due soon in the last `due_soon_days` days before it, and
 * expired after it (specification 8.4). `today` is a YYYY-MM-DD date taken from the Clock port. An expired record is
 * shown as expired and never eliminates an option or produces a pick (principle P9).
 */
export function freshnessState(validUntil: string, today: string, cfg: { due_soon_days: number }): FreshnessState {
  const left = daysBetween(today, validUntil);
  if (left < 0) return 'expired';
  if (left <= cfg.due_soon_days) return 'due_soon';
  return 'fresh';
}

/** Usable for a decision: fresh or due soon. Expired records are not. */
export function isCurrent(state: FreshnessState): boolean {
  return state !== 'expired';
}
