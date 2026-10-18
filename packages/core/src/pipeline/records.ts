import { freshnessState, isCurrent, type FreshnessState } from '../freshness';
import type { KBReader } from '../ports';
import type {
  CapabilityRecord,
  FlipRecord,
  KbRecord,
  LatencyProfileRecord,
  LimitRecord,
  OptionRecord,
  PriceRecord,
  TradeoffRecord,
} from '../schemas/kb';

/** What every stage needs to judge a record's freshness: today's date and the due-soon window. */
export interface FreshnessContext {
  today: string;
  dueSoonDays: number;
}

export function stateOf(rec: KbRecord, ctx: FreshnessContext): FreshnessState {
  return freshnessState(rec.verification.valid_until, ctx.today, { due_soon_days: ctx.dueSoonDays });
}

/** Splits records into those usable for a decision (fresh or due soon) and those that have expired (P9). */
export function splitByFreshness<T extends KbRecord>(
  recs: readonly T[],
  ctx: FreshnessContext,
): { current: T[]; expired: T[] } {
  const current: T[] = [];
  const expired: T[] = [];
  for (const r of recs) (isCurrent(stateOf(r, ctx)) ? current : expired).push(r);
  return { current, expired };
}

/** Everything the KB says about one option, grouped by record type. Order follows the bundle (sorted by id). */
export interface OptionData {
  option: OptionRecord;
  capabilities: CapabilityRecord[];
  limits: LimitRecord[];
  prices: PriceRecord[];
  latency: LatencyProfileRecord[];
  flips: FlipRecord[];
  tradeoffs: TradeoffRecord[];
}

export function loadOptionData(kb: KBReader, option: OptionRecord): OptionData {
  const data: OptionData = { option, capabilities: [], limits: [], prices: [], latency: [], flips: [], tradeoffs: [] };
  for (const r of kb.records({ decisionType: option.decision_type, subject: option.id })) {
    switch (r.type) {
      case 'capability':
        data.capabilities.push(r);
        break;
      case 'limit':
        data.limits.push(r);
        break;
      case 'price':
        data.prices.push(r);
        break;
      case 'latency_profile':
        data.latency.push(r);
        break;
      case 'flip':
        data.flips.push(r);
        break;
      case 'tradeoff':
        data.tradeoffs.push(r);
        break;
      default:
        break;
    }
  }
  // Deterministic regardless of the order the KB reader returns records in.
  for (const list of [data.capabilities, data.limits, data.prices, data.latency, data.flips, data.tradeoffs]) {
    (list as KbRecord[]).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  return data;
}

/** A free-tier limit (not a rate limit, not a paid-tier cap). */
export const isFreeTier = (l: LimitRecord): boolean => l.body.scope === 'free_tier';

export function isRateLimit(l: LimitRecord): boolean {
  return l.body.scope === 'rate_limit' || l.body.scope.startsWith('rate_limit:');
}

/** Human label for a capability id, for plain-language text. */
export function capabilityLabel(id: string): string {
  if (id === 'eu_data_residency') return 'EU data residency';
  if (id.startsWith('deploy_target.')) return `running on ${id.slice('deploy_target.'.length)}`;
  if (id.startsWith('compliance.')) return `the ${id.slice('compliance.'.length)} compliance requirement`;
  return id.replace(/[._]/g, ' ');
}

export type CapabilityLookup =
  | { kind: 'yes' | 'no' | 'partial' | 'unknown'; record: CapabilityRecord }
  | { kind: 'missing' }
  | { kind: 'expired'; record: CapabilityRecord };

/** The option's capability for `capabilityId`: only a current record can say yes or no; otherwise missing or expired. */
export function lookupCapability(data: OptionData, capabilityId: string, ctx: FreshnessContext): CapabilityLookup {
  const matches = data.capabilities.filter((c) => c.body.capability_id === capabilityId);
  if (matches.length === 0) return { kind: 'missing' };
  const { current, expired } = splitByFreshness(matches, ctx);
  const first = current[0];
  if (first !== undefined) return { kind: first.body.support, record: first };
  return { kind: 'expired', record: expired[0] as CapabilityRecord };
}
