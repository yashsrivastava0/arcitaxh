import { addDays, type FreshnessConfig, type KbRecord } from '@product/core';

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

export { freshnessState, type FreshnessState } from '@product/core';
