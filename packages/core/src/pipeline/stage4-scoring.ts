import { decimalToPico, numberToPico } from '../calc/money';
import { assessFreeTier, growthFactor } from '../calc/free-tier';
import type { Defaults } from '../schemas/config';
import {
  DIMENSIONS,
  type Constraints,
  type Dimension,
  type DimensionScore,
  type OptionScore,
} from '../schemas/verdict';
import { isFreeTier, isRateLimit, splitByFreshness, stateOf, type FreshnessContext } from '../kb-records';
import type { Survivor } from './stage3-elimination';

/** One dimension before weights: a value, whether it could be scored, and whether data was missing or stale. */
interface Raw {
  value: number | null;
  state: DimensionScore['state'];
  uncertain: boolean;
}
const scored = (value: number, uncertain = false): Raw => ({ value, state: 'scored', uncertain });
const unknown: Raw = { value: null, state: 'unknown', uncertain: true };
const notApplicable: Raw = { value: null, state: 'not_applicable', uncertain: false };

export interface ScoredOption {
  survivor: Survivor;
  score: OptionScore;
}

/**
 * Scoring (specification 6.5). Every survivor gets a value in [0,1] per dimension. A dimension whose data is missing or
 * expired is `unknown`: it is excluded from the sum and the score is flagged partial, never computed from zero. The
 * remaining weights are renormalised to sum to 1, so an option is not penalised for a dimension nobody could check.
 * The per-dimension breakdown is kept for the verdict, so the drawer can show exactly why one option scored higher.
 */
export function stage4Scoring(args: {
  survivors: readonly Survivor[];
  constraints: Constraints;
  config: Defaults['scoring'];
  ctx: FreshnessContext;
  userPlatforms: ReadonlySet<string>;
}): ScoredOption[] {
  const { survivors, constraints, config, ctx, userPlatforms } = args;
  return survivors.map((survivor) => {
    const raw: Record<Dimension, Raw> = {
      cost_fit: costFit(survivor, constraints, config, ctx),
      scale_fit: scaleFit(survivor, constraints, config, ctx),
      latency_fit: latencyFit(survivor, constraints, config, ctx),
      operational_simplicity: operationalSimplicity(survivor, config, ctx),
      ecosystem_fit: ecosystemFit(survivor, constraints, userPlatforms, config),
      reversibility: reversibility(survivor, config, ctx),
    };
    const base = constraints.weights;
    const used = DIMENSIONS.filter((d) => raw[d].state === 'scored');
    const weightSum = used.reduce((s, d) => s + base[d], 0);
    const dimensions: DimensionScore[] = DIMENSIONS.map((d) => ({
      dimension: d,
      weight: raw[d].state === 'scored' && weightSum > 0 ? base[d] / weightSum : 0,
      value: raw[d].value,
      state: raw[d].state,
      uncertain: raw[d].uncertain,
    }));
    const total =
      used.length === 0 || weightSum === 0 ? null : dimensions.reduce((s, d) => s + d.weight * (d.value ?? 0), 0);
    const partial = DIMENSIONS.some((d) => raw[d].state === 'unknown');
    const uncertain = survivor.uncertain || DIMENSIONS.some((d) => raw[d].uncertain);
    return { survivor, score: { optionId: survivor.option.id, total, partial, uncertain, dimensions } };
  });
}

// ---- the six dimension functions ----

function costFit(s: Survivor, c: Constraints, cfg: Defaults['scoring'], ctx: FreshnessContext): Raw {
  const v = cfg.dimension_values.cost_fit;
  const free = splitByFreshness(s.data.limits.filter(isFreeTier), ctx);
  const fixed = splitByFreshness(
    s.data.prices.filter((p) => p.body.unit === 'fixed_per_month'),
    ctx,
  );

  const freeState =
    free.current.length === 0 ? 'none' : assessFreeTier(free.current, c.usage, growthFactor(c.profile, c.usage)).state;
  if (freeState === 'covers') return scored(v.free_tier_covers);

  // Does a paid tier fit? Only USD prices are compared with the user's USD ceiling (the app never converts currency).
  const usd = fixed.current.filter((p) => p.body.currency === 'USD');
  let paidFits: boolean | null = null;
  if (usd.length > 0) {
    const cheapest = usd.map((p) => decimalToPico(p.body.amount)).reduce((a, b) => (b < a ? b : a));
    if (c.profile.monthlyCeilingUsd !== null) paidFits = cheapest <= numberToPico(c.profile.monthlyCeilingUsd);
    else if (c.profile.budget === 'flexible') paidFits = true;
  }
  if (paidFits === true) return scored(v.paid_tier_fits_ceiling);
  if (paidFits === false && (freeState === 'exceeds' || freeState === 'none')) return scored(v.otherwise);

  // The price record that would decide has expired: shown, but it cannot decide (spec: 0.5 with an uncertain flag).
  if (free.expired.length > 0 || fixed.expired.length > 0) return scored(v.price_expired, true);
  return unknown;
}

function scaleFit(s: Survivor, c: Constraints, cfg: Defaults['scoring'], ctx: FreshnessContext): Raw {
  const v = cfg.dimension_values.scale_fit;
  const metrics = Object.entries(c.usage.metrics);
  if (metrics.length === 0) return unknown;
  const growth = growthFactor(c.profile, c.usage);
  const current = splitByFreshness(
    s.data.limits.filter((l) => !isRateLimit(l)),
    ctx,
  ).current;

  let covers10 = true;
  let covers1 = true;
  for (const [metric, usageNow] of metrics) {
    const caps = current.filter((l) => l.body.metric === metric).map((l) => l.body.value);
    if (caps.length === 0) return unknown; // limits are missing (or expired) for a metric the user gave: uncertain
    const cap = Math.max(...caps);
    const base = growth === null ? usageNow : usageNow * growth; // the 12-month scale when known
    if (base * 10 > cap) covers10 = false;
    if (base > cap) covers1 = false;
  }
  return scored(covers10 ? v.covers_10x : covers1 ? v.covers_1x_only : v.below_1x);
}

function latencyFit(s: Survivor, c: Constraints, cfg: Defaults['scoring'], ctx: FreshnessContext): Raw {
  if (c.latencyBudgetMs === null) return notApplicable;
  const v = cfg.dimension_values.latency_fit;
  const current = splitByFreshness(s.data.latency, ctx).current;
  if (current.length === 0) return unknown;
  const best = Math.min(...current.map((l) => l.body.p95_ms));
  if (best <= v.comfortable_ratio * c.latencyBudgetMs) return scored(v.comfortable);
  return scored(best <= c.latencyBudgetMs ? v.fits : v.exceeds);
}

function operationalSimplicity(s: Survivor, cfg: Defaults['scoring'], ctx: FreshnessContext): Raw {
  const burden = s.option.body.ops_burden;
  if (burden === 'unknown' || stateOf(s.option, ctx) === 'expired') return unknown;
  const v = cfg.dimension_values.operational_simplicity;
  return scored(v.ops_burden[burden] * v.deployment_factor[s.option.body.deployment]);
}

function ecosystemFit(s: Survivor, c: Constraints, platforms: ReadonlySet<string>, cfg: Defaults['scoring']): Raw {
  const v = cfg.dimension_values.ecosystem_fit;
  if (c.profile.existingStack.some((o) => o.optionId === s.option.id)) return scored(v.in_stack);
  const platform = s.option.body.platform;
  if (platform !== null && platforms.has(platform)) return scored(v.same_platform);
  return scored(v.otherwise);
}

function reversibility(s: Survivor, cfg: Defaults['scoring'], ctx: FreshnessContext): Raw {
  const v = cfg.dimension_values.reversibility;
  const effort = s.option.body.migration_effort;
  if (stateOf(s.option, ctx) === 'expired') return unknown;
  // Spec 6.5: an unknown migration effort scores 0.5 and carries an uncertain flag.
  return effort === 'unknown' ? scored(v.unknown, true) : scored(v[effort]);
}
