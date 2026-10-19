// Free tiers, typed overage behaviour and the scale slider (specification 7.6, 7.7). Pure.
//
// For a component with a free limit L per period and usage u1 at today's traffic, breakpoint = L / u1. Usage is assumed
// to grow in proportion to traffic (shown to the user, because it is not always true). The slider presets multiply the
// user's own base figures; nothing is invented. The component with the smallest breakpoint breaks first.
//
// Each limit's typed behaviour decides the calculator's response (specification 7.6):
//   hard_stop                 -> show the failure point as a reliability risk
//   overage_billed            -> compute the bill after the limit: (usage - L) x the listed unit price
//   auto_upgrade              -> show the new cost, with a warning
//   throttled                 -> show it as a latency risk
//   pauses_after_inactivity   -> an operational risk, shown separately from cost
//   scales_to_zero            -> a cold-start note on the latency estimate
import { isFreeTier, loadOptionData, splitByFreshness, type FreshnessContext } from '../kb-records';
import type { KBReader } from '../ports';
import type { DesignGraph } from '../schemas/design';
import type { LimitRecord, PriceRecord } from '../schemas/kb';
import type { UsageInputs } from '../schemas/usage';
import { breakpoint } from './free-tier';
import { decimalToPico, formatPico } from './money';
import { mulPico } from './cost';

export const GROWTH_ASSUMPTION = 'Usage is assumed to grow in proportion to traffic.';
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export interface FreeTierLimit {
  componentId: string;
  label: string;
  optionId: string;
  record: LimitRecord;
  /** The listed unit price that bills usage past this limit, when the KB has one (see `overagePrice`). */
  price: PriceRecord | null;
  expired: boolean;
}

/**
 * The free-tier limit records of every chosen option in the design. Expired records are returned with `expired: true`
 * and must not be used to decide anything (P9); callers report them as unknown.
 */
export function freeTierLimits(
  graph: Pick<DesignGraph, 'nodes'>,
  kb: KBReader,
  ctx: FreshnessContext,
): FreeTierLimit[] {
  const out: FreeTierLimit[] = [];
  for (const node of [...graph.nodes].sort((a, b) => cmp(a.id, b.id))) {
    if (node.choice === null) continue;
    const option = kb.record(node.choice.optionId);
    if (option === null || option.type !== 'option') continue;
    const data = loadOptionData(kb, option);
    const limits = data.limits.filter(isFreeTier);
    const { current, expired } = splitByFreshness(limits, ctx);
    for (const [records, isExpired] of [
      [current, false],
      [expired, true],
    ] as const) {
      for (const record of records) {
        out.push({
          componentId: node.id,
          label: node.label,
          optionId: option.id,
          record,
          price: overagePrice(data.prices, record),
          expired: isExpired,
        });
      }
    }
  }
  return out.sort((a, b) => cmp(a.record.id, b.record.id));
}

/**
 * The listed price that bills usage beyond a limit: a USD per-unit price of the same option whose unit name is the
 * limit's metric, billed over the same period. Convention (Assumption, ADR-042). `null` if there is none or it is
 * ambiguous: the overage is then unknown, not zero.
 */
export function overagePrice(prices: readonly PriceRecord[], limit: LimitRecord): PriceRecord | null {
  const period = limit.body.period === 'month' ? 'month' : limit.body.period === 'year' ? 'year' : 'none';
  const match = prices.filter(
    (p) =>
      p.body.unit === 'per_unit' &&
      p.body.unit_name === limit.body.metric &&
      p.body.currency === 'USD' &&
      p.body.billing_period === period,
  );
  const amounts = new Set(match.map((p) => p.body.amount));
  return amounts.size === 1 ? (match[0] ?? null) : null;
}

export type Consequence =
  | { kind: 'failure_risk'; message: string }
  | { kind: 'overage_cost'; costPico: bigint | null; priceRecordId: string | null; message: string }
  | { kind: 'new_plan_cost'; message: string }
  | { kind: 'latency_risk'; message: string };

export interface ScaleLimitRow {
  componentId: string;
  recordId: string;
  metric: string;
  unit: string;
  period: LimitRecord['body']['period'];
  limit: number;
  usageNow: number | null;
  usageAtScale: number | null;
  /** L / u1, or null if usage is not given or is zero. Never negative. */
  breakpoint: number | null;
  state: 'within' | 'exceeded' | 'unknown';
  behaviour: LimitRecord['body']['overage_behaviour'];
  consequence: Consequence | null;
  /** Separate from cost: the resource pauses after a period with no activity. */
  operationalRisk: string | null;
  /** A cold-start note for the latency estimate. */
  coldStartNote: string | null;
  expired: boolean;
}

export interface ScalePreset {
  scale: number;
  rows: ScaleLimitRow[];
  /** The exceeded limit with the smallest breakpoint at this scale, or null if none is exceeded. */
  firstToBreak: { componentId: string; recordId: string; breakpoint: number } | null;
  /** Sum of the overage bills at this scale. null if any billed overage could not be priced. */
  overageTotalPico: bigint | null;
}

export interface ScaleAnalysis {
  assumption: typeof GROWTH_ASSUMPTION;
  presets: ScalePreset[];
  /** The smallest breakpoint in the design, whatever the preset: the first thing that will break. */
  smallestBreakpoint: { componentId: string; recordId: string; breakpoint: number } | null;
  /** Free-tier limits that could not be used: expired records, or no usage figure for the metric. */
  unknown: { componentId: string; recordId: string; reason: 'expired' | 'no_usage_figure' }[];
}

function consequenceOf(l: FreeTierLimit, usageAtScale: number): Consequence {
  const b = l.record.body;
  const where = `${l.label}: ${b.metric}`;
  switch (b.overage_behaviour) {
    case 'hard_stop':
      return {
        kind: 'failure_risk',
        message: `${where} stops working at ${b.value} ${b.unit}; requests fail after that.`,
      };
    case 'overage_billed': {
      if (l.price === null) {
        return {
          kind: 'overage_cost',
          costPico: null,
          priceRecordId: null,
          message: `${where} is billed beyond ${b.value} ${b.unit}, but the knowledge base has no listed unit price for it.`,
        };
      }
      const cost = mulPico(decimalToPico(l.price.body.amount), usageAtScale - b.value);
      return {
        kind: 'overage_cost',
        costPico: cost,
        priceRecordId: l.price.id,
        message: `${where} is billed beyond ${b.value} ${b.unit}: ${formatPico(cost)} USD at this scale.`,
      };
    }
    case 'auto_upgrade':
      return {
        kind: 'new_plan_cost',
        message: `${where}: the plan changes automatically past ${b.value} ${b.unit}, so the bill changes. The new price is not in the knowledge base.`,
      };
    case 'throttled':
      return {
        kind: 'latency_risk',
        message: `${where}: requests are slowed past ${b.value} ${b.unit}, which adds latency.`,
      };
  }
}

export interface ScaleInput {
  graph: Pick<DesignGraph, 'nodes'>;
  usage: UsageInputs;
  kb: KBReader;
  ctx: FreshnessContext;
  /** Config scale_presets: [1, 10, 100]. */
  presets: readonly number[];
}

export function analyseScale(input: ScaleInput): ScaleAnalysis {
  const limits = freeTierLimits(input.graph, input.kb, input.ctx);
  const unknown: ScaleAnalysis['unknown'] = [];
  const usable: FreeTierLimit[] = [];
  for (const l of limits) {
    if (l.expired) unknown.push({ componentId: l.componentId, recordId: l.record.id, reason: 'expired' });
    else if (input.usage.metrics[l.record.body.metric] === undefined) {
      unknown.push({ componentId: l.componentId, recordId: l.record.id, reason: 'no_usage_figure' });
    } else usable.push(l);
  }
  const usageOf = (l: FreeTierLimit): number => input.usage.metrics[l.record.body.metric] as number;

  const presets = input.presets.map((scale): ScalePreset => {
    const rows = usable.map((l): ScaleLimitRow => {
      const b = l.record.body;
      const usageNow = usageOf(l);
      const usageAtScale = usageNow * scale;
      const exceeded = usageAtScale > b.value;
      return {
        componentId: l.componentId,
        recordId: l.record.id,
        metric: b.metric,
        unit: b.unit,
        period: b.period,
        limit: b.value,
        usageNow,
        usageAtScale,
        breakpoint: breakpoint(b.value, usageNow),
        state: exceeded ? 'exceeded' : 'within',
        behaviour: b.overage_behaviour,
        consequence: exceeded ? consequenceOf(l, usageAtScale) : null,
        operationalRisk: b.pauses_after_inactivity
          ? `${l.label} can pause after a period with no activity; this is an operational risk, separate from cost.`
          : null,
        coldStartNote: b.scales_to_zero
          ? `${l.label} can scale to zero when idle, so the first request after a quiet period may be slower.`
          : null,
        expired: false,
      };
    });
    const broken = rows
      .filter((r) => r.state === 'exceeded' && r.breakpoint !== null)
      .sort((a, b) => (a.breakpoint as number) - (b.breakpoint as number) || cmp(a.recordId, b.recordId));
    const billed = rows.flatMap((r) => (r.consequence?.kind === 'overage_cost' ? [r.consequence] : []));
    return {
      scale,
      rows,
      firstToBreak:
        broken[0] === undefined
          ? null
          : {
              componentId: broken[0].componentId,
              recordId: broken[0].recordId,
              breakpoint: broken[0].breakpoint as number,
            },
      overageTotalPico: billed.some((c) => c.costPico === null)
        ? null
        : billed.reduce((s, c) => s + (c.costPico ?? 0n), 0n),
    };
  });

  const all = usable
    .map((l) => ({
      componentId: l.componentId,
      recordId: l.record.id,
      breakpoint: breakpoint(l.record.body.value, usageOf(l)),
    }))
    .filter((x): x is { componentId: string; recordId: string; breakpoint: number } => x.breakpoint !== null)
    .sort((a, b) => a.breakpoint - b.breakpoint || cmp(a.recordId, b.recordId));
  return {
    assumption: GROWTH_ASSUMPTION,
    presets,
    smallestBreakpoint: all[0] ?? null,
    unknown: unknown.sort((a, b) => cmp(a.recordId, b.recordId)),
  };
}
