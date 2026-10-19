// Cost calculator (specification 7.5). Pure, exact (bigint pico units, see money.ts), and honest:
//  - prices come only from KB price records; a record past its valid-until date is still shown, with the note
//    "price last verified on X; expired", and can never eliminate an option (P9);
//  - with typical and high token counts the result is a low-high range, labelled "estimate";
//  - with no traffic figure only the per-request cost is shown, together with the statement that a traffic estimate is
//    needed. Traffic is never invented;
//  - the app never converts currencies: only USD is summed, a price in another currency is listed as excluded.
//
//   cost_per_request = tokens_in x price_in + tokens_cached_in x price_cached_in + tokens_out x price_out
//                      + units_per_request x price_per_unit (metered components)
//   cost_per_month   = cost_per_request x requests_per_month + fixed_monthly_costs
import { loadOptionData, splitByFreshness, stateOf, type FreshnessContext } from '../kb-records';
import { isCurrent } from '../freshness';
import type { KBReader } from '../ports';
import type { Component, DesignGraph } from '../schemas/design';
import type { PriceRecord, PriceUnit } from '../schemas/kb';
import type { UsageInputs } from '../schemas/usage';
import { decimalToPico } from './money';

export const COST_LABEL = 'estimate' as const;
const PER_MILLION = 1_000_000n;
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export type CostLineKind =
  'input_tokens' | 'cached_input_tokens' | 'output_tokens' | 'per_request' | 'per_unit' | 'fixed_monthly';

export interface CostLine {
  componentId: string;
  recordId: string;
  kind: CostLineKind;
  /** Whether the amount is per request or per month. */
  basis: 'per_request' | 'per_month';
  lowPico: bigint;
  highPico: bigint;
  /** True if the price record has expired. It is still used and shown, never hidden (specification 7.5). */
  expired: boolean;
  note: string | null;
}

export interface CostRange {
  lowPico: bigint;
  highPico: bigint;
}

export interface CostEstimate {
  label: typeof COST_LABEL;
  currency: 'USD';
  lines: CostLine[];
  /** null when nothing priced per request is known. */
  perRequest: CostRange | null;
  /** null when no traffic figure was given (then `needsTrafficEstimate` is true). */
  perMonth: CostRange | null;
  needsTrafficEstimate: boolean;
  /** What could not be priced, and why. Never counted as zero. */
  unknown: { componentId: string; reason: string }[];
  /** Price records not summed because their currency is not USD. */
  excluded: { componentId: string; recordId: string; currency: string }[];
  /** True if any price is expired, anything could not be priced, or a record was excluded. */
  uncertain: boolean;
  assumptions: string[];
}

export interface CostInput {
  graph: Pick<DesignGraph, 'nodes'>;
  usage: UsageInputs;
  kb: KBReader;
  ctx: FreshnessContext;
  /** A month is 30 days by default (config month_days). */
  monthDays: number;
}

/** pico x factor, where factor is a non-negative number taken to 6 decimal places (round half up). */
export function mulPico(pico: bigint, factor: number): bigint {
  if (!Number.isFinite(factor) || factor < 0) throw new RangeError(`not a finite non-negative factor: ${factor}`);
  const micro = BigInt(Math.round(factor * 1_000_000));
  return (pico * micro + 500_000n) / 1_000_000n;
}

/** tokens x (pico per million tokens), exact to the pico (round half up). */
function tokenCost(tokens: number, pricePerMillion: bigint): bigint {
  return (BigInt(tokens) * pricePerMillion + PER_MILLION / 2n) / PER_MILLION;
}

const TOKEN_UNITS: ReadonlySet<PriceUnit> = new Set([
  'per_million_input_tokens',
  'per_million_cached_input_tokens',
  'per_million_output_tokens',
]);

function paramTier(c: Component): string | null {
  const t = c.choice?.params['tier'];
  return typeof t === 'string' && t !== '' ? t : null;
}

export function estimateCost(input: CostInput): CostEstimate {
  const { usage, kb, ctx } = input;
  const lines: CostLine[] = [];
  const unknown: CostEstimate['unknown'] = [];
  const excluded: CostEstimate['excluded'] = [];
  const assumptions: string[] = [];
  const nodes = [...input.graph.nodes].sort((a, b) => cmp(a.id, b.id));

  // A token-priced component needs the model-call figures; with more than one such component the split of calls between
  // them is not given, so none is priced.
  const tokenPriced = nodes.filter((n) => {
    const opt = n.choice === null ? null : kb.record(n.choice.optionId);
    if (opt === null || opt.type !== 'option') return false;
    return loadOptionData(kb, opt).prices.some((p) => TOKEN_UNITS.has(p.body.unit));
  });
  const tokenUsage =
    usage.modelCallsPerRequest !== null && usage.tokensPerCall !== null
      ? { calls: usage.modelCallsPerRequest, tokens: usage.tokensPerCall }
      : null;

  for (const node of nodes) {
    if (node.choice === null) continue;
    const option = kb.record(node.choice.optionId);
    if (option === null || option.type !== 'option') continue;
    const prices = loadOptionData(kb, option).prices;
    // One price per unit: the chosen tier, or the only tier, or - if several tiers differ - none (the user must choose).
    const byUnit = new Map<PriceUnit, PriceRecord[]>();
    for (const p of prices) byUnit.set(p.body.unit, [...(byUnit.get(p.body.unit) ?? []), p]);
    for (const [unit, records] of [...byUnit].sort(([a], [b]) => cmp(a, b))) {
      const tier = paramTier(node);
      const matching = tier === null ? records : records.filter((r) => r.body.tier === tier);
      if (matching.length === 0) {
        unknown.push({ componentId: node.id, reason: `no ${unit.replace(/_/g, ' ')} price for the tier "${tier}"` });
        continue;
      }
      // Which tier is a question for the user, whatever the dates say.
      if (new Set(matching.map((r) => r.body.tier)).size > 1) {
        unknown.push({
          componentId: node.id,
          reason: `${node.label} has several ${unit.replace(/_/g, ' ')} prices; choose a tier`,
        });
        continue;
      }
      // Within one tier a current record beats an expired one; two current records that disagree are a data problem.
      const { current, expired } = splitByFreshness(matching, ctx);
      const pool = current.length > 0 ? current : expired;
      if (new Set(pool.map((r) => `${r.body.amount}\u0000${r.body.currency}`)).size > 1) {
        unknown.push({
          componentId: node.id,
          reason: `${node.label} has conflicting ${unit.replace(/_/g, ' ')} prices in the knowledge base`,
        });
        continue;
      }
      const rec = pool[0] as PriceRecord;
      const isExpired = !isCurrent(stateOf(rec, ctx));
      if (rec.body.currency !== 'USD') {
        excluded.push({ componentId: node.id, recordId: rec.id, currency: rec.body.currency });
        continue;
      }
      const note = isExpired ? `price last verified on ${rec.verification.last_verified}; expired` : null;
      const amount = decimalToPico(rec.body.amount);
      const base = { componentId: node.id, recordId: rec.id, expired: isExpired, note };

      if (TOKEN_UNITS.has(unit)) {
        if (tokenPriced.length > 1) {
          unknown.push({
            componentId: node.id,
            reason: 'more than one component is priced by tokens and the calls per request for each are not given',
          });
          continue;
        }
        if (tokenUsage === null) {
          unknown.push({ componentId: node.id, reason: 'model calls per request and tokens per call are needed' });
          continue;
        }
        const pick = (t: UsageInputs['tokensPerCall'] & object, which: 'typical' | 'high') =>
          unit === 'per_million_input_tokens'
            ? t[which].input
            : unit === 'per_million_cached_input_tokens'
              ? t[which].cachedInput
              : t[which].output;
        const low = mulPico(tokenCost(pick(tokenUsage.tokens, 'typical'), amount), tokenUsage.calls);
        const high = mulPico(tokenCost(pick(tokenUsage.tokens, 'high'), amount), tokenUsage.calls);
        const kind: CostLineKind =
          unit === 'per_million_input_tokens'
            ? 'input_tokens'
            : unit === 'per_million_cached_input_tokens'
              ? 'cached_input_tokens'
              : 'output_tokens';
        lines.push({ ...base, kind, basis: 'per_request', lowPico: low, highPico: high });
      } else if (unit === 'per_request') {
        lines.push({ ...base, kind: 'per_request', basis: 'per_request', lowPico: amount, highPico: amount });
      } else if (unit === 'fixed_per_month') {
        lines.push({ ...base, kind: 'fixed_monthly', basis: 'per_month', lowPico: amount, highPico: amount });
      } else {
        // per_unit: the user's monthly quantity, in this price's own unit name, is needed.
        const name = rec.body.unit_name;
        const qty = name === null ? undefined : usage.metrics[name];
        if (qty === undefined) {
          unknown.push({ componentId: node.id, reason: `a monthly quantity of ${name ?? 'units'} is needed` });
          continue;
        }
        const total = mulPico(amount, qty);
        lines.push({ ...base, kind: 'per_unit', basis: 'per_month', lowPico: total, highPico: total });
      }
    }
  }

  const sum = (basis: CostLine['basis']): CostRange | null => {
    const ls = lines.filter((l) => l.basis === basis);
    if (ls.length === 0) return null;
    return { lowPico: ls.reduce((s, l) => s + l.lowPico, 0n), highPico: ls.reduce((s, l) => s + l.highPico, 0n) };
  };
  const perRequest = sum('per_request');
  const monthly = sum('per_month');
  const needsTrafficEstimate = perRequest !== null && usage.requestsPerDayNow === null;
  let perMonth: CostRange | null = null;
  if (usage.requestsPerDayNow !== null) {
    const requestsPerMonth = usage.requestsPerDayNow * input.monthDays;
    const variable =
      perRequest === null
        ? { lowPico: 0n, highPico: 0n }
        : {
            lowPico: mulPico(perRequest.lowPico, requestsPerMonth),
            highPico: mulPico(perRequest.highPico, requestsPerMonth),
          };
    const fixed = monthly ?? { lowPico: 0n, highPico: 0n };
    if (perRequest !== null || monthly !== null)
      perMonth = { lowPico: variable.lowPico + fixed.lowPico, highPico: variable.highPico + fixed.highPico };
    assumptions.push(`A month is ${input.monthDays} days.`);
  } else if (monthly !== null && perRequest === null) {
    // Only fixed monthly prices: they do not depend on traffic, so the monthly figure is known without it.
    perMonth = monthly;
  }
  if (needsTrafficEstimate)
    assumptions.push(
      'A traffic estimate (requests per day) is needed to show a monthly cost. None was given, so none was assumed.',
    );
  if (lines.some((l) => l.expired))
    assumptions.push('At least one price has expired; it is shown, with its date, and treated as uncertain.');
  if (excluded.length > 0)
    assumptions.push('Prices in a currency other than USD are not converted and are not included in the totals.');
  return {
    label: COST_LABEL,
    currency: 'USD',
    lines: lines.sort((a, b) => cmp(`${a.componentId}\u0000${a.kind}`, `${b.componentId}\u0000${b.kind}`)),
    perRequest,
    perMonth,
    needsTrafficEstimate,
    unknown: unknown.sort((a, b) => cmp(`${a.componentId}\u0000${a.reason}`, `${b.componentId}\u0000${b.reason}`)),
    excluded: excluded.sort((a, b) => cmp(a.recordId, b.recordId)),
    uncertain: lines.some((l) => l.expired) || unknown.length > 0 || excluded.length > 0,
    assumptions,
  };
}
