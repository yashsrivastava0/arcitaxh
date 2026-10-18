import { addDays, daysBetween, type FreshnessConfig, type KbRecord } from '@product/core';

export type FreshnessState = 'fresh' | 'due_soon' | 'expired';

export type TtlKey = keyof FreshnessConfig['ttl_days'];

/** Which TTL entry governs a record (spec 8.4). Rate-limit tiers are `limit` records with a rate_limit scope. */
export function ttlKey(record: KbRecord): TtlKey {
  if (record.type === 'limit') {
    const scope = record.body.scope;
    return scope === 'rate_limit' || scope.startsWith('rate_limit:') ? 'rate_limit' : 'limit';
  }
  return record.type;
}

/** TTL in days for a record, or null when the configuration defines none for its type (never guessed). */
export function ttlDays(record: KbRecord, cfg: FreshnessConfig): number | null {
  return cfg.ttl_days[ttlKey(record)] ?? null;
}

/** valid_until must equal last_verified + TTL. Null when the type has no TTL. */
export function expectedValidUntil(record: KbRecord, cfg: FreshnessConfig): string | null {
  const ttl = ttlDays(record, cfg);
  return ttl === null ? null : addDays(record.verification.last_verified, ttl);
}

/**
 * A record is fresh until its valid-until date (inclusive), due soon in the last `due_soon_days` days before it,
 * and expired after it (spec 8.4). `today` is a YYYY-MM-DD date taken from the Clock port.
 */
export function freshnessState(
  validUntil: string,
  today: string,
  cfg: Pick<FreshnessConfig, 'due_soon_days'>,
): FreshnessState {
  const left = daysBetween(today, validUntil);
  if (left < 0) return 'expired';
  if (left <= cfg.due_soon_days) return 'due_soon';
  return 'fresh';
}
