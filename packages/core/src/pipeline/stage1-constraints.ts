import type { KBReader } from '../ports';
import type { ContextFieldName, ContextProfile } from '../schemas/context';
import type { Defaults } from '../schemas/config';
import type { DecisionTypeDef } from '../schemas/kb';
import type { UsageInputs } from '../schemas/usage';
import { DIMENSIONS, type Constraints, type Dimension } from '../schemas/verdict';
import { normaliseContext, sortedUniqueStrings } from '../normalise/normalise';
import { growthFactor } from '../calc/free-tier';

export type NeedsContext = {
  missing: ContextFieldName[];
  nextQuestion: { field: ContextFieldName; question: string };
};

export type Stage1Result = { kind: 'needs_context'; needs: NeedsContext } | { kind: 'ok'; constraints: Constraints };

/**
 * Is this chip unknown? `unknown` and `null` are unknown. The list fields (existingStack, mustHaves) can only be
 * empty, never "unknown": an empty list is a valid answer ("nothing chosen yet" / "no must-haves"), so they never
 * block a verdict (conflict C-016).
 */
export function isMissing(p: ContextProfile, field: ContextFieldName): boolean {
  switch (field) {
    case 'purpose':
      return p.purpose === 'unknown';
    case 'budget':
      return p.budget === 'unknown';
    case 'usersNow':
      return p.usersNow === null;
    case 'usersIn12Months':
      return p.usersIn12Months === null;
    case 'monthlyCeilingUsd':
      return p.monthlyCeilingUsd === null;
    case 'deployTarget':
      return p.deployTarget === null;
    case 'team.size':
      return p.team.size === 'unknown';
    case 'team.experience':
      return p.team.experience === 'unknown';
    case 'existingStack':
    case 'mustHaves':
      return false;
  }
}

/**
 * The platforms the user already lives on: the named deploy target plus the platform of each option in the existing
 * stack that the KB knows. Used for ecosystem fit and its weight multiplier.
 */
export function userPlatforms(profile: ContextProfile, kb: KBReader): Set<string> {
  const platforms = new Set<string>();
  if (profile.deployTarget !== null) platforms.add(profile.deployTarget);
  for (const ref of profile.existingStack) {
    const rec = kb.record(ref.optionId);
    if (rec !== null && rec.type === 'option' && rec.body.platform !== null) platforms.add(rec.body.platform);
  }
  return platforms;
}

/** Scoring weights (specification 6.5): equal, multiplied by the context-dependent factors, renormalised to sum to 1. */
export function computeWeights(
  profile: ContextProfile,
  platforms: ReadonlySet<string>,
  usage: UsageInputs,
  config: Defaults['scoring'],
): Constraints['weights'] {
  const hasLatencyMustHave = profile.mustHaves.some((m) => m.kind === 'max_p95_latency_ms');
  const growth = growthFactor(profile, usage);
  const usersGrowth =
    profile.usersNow !== null && profile.usersIn12Months !== null
      ? profile.usersNow === 0
        ? profile.usersIn12Months > 0
        : profile.usersIn12Months >= config.growth_ratio_threshold * profile.usersNow
      : growth !== null && growth >= config.growth_ratio_threshold;
  const active: Record<(typeof config.multipliers)[number]['when'], boolean> = {
    solo_or_beginner: profile.team.size === 'solo' || profile.team.experience === 'beginner',
    free_tiers_only: profile.budget === 'free_only',
    latency_must_have: hasLatencyMustHave,
    existing_stack_platform: platforms.size > 0,
    users_12m_at_least_growth_ratio: usersGrowth,
  };

  const raw = { ...config.base_weights } as Record<Dimension, number>;
  for (const m of config.multipliers) if (active[m.when]) raw[m.dimension] *= m.factor;
  const total = DIMENSIONS.reduce((s, d) => s + raw[d], 0);
  return {
    cost_fit: raw.cost_fit / total,
    scale_fit: raw.scale_fit / total,
    latency_fit: raw.latency_fit / total,
    operational_simplicity: raw.operational_simplicity / total,
    ecosystem_fit: raw.ecosystem_fit / total,
    reversibility: raw.reversibility / total,
  };
}

/** Plain-language record of every default used for an unknown value (specification 6.2, "assumptions register"). */
export function assumptionsFor(profile: ContextProfile, usage: UsageInputs): string[] {
  const out: string[] = [];
  if (profile.budget === 'unknown')
    out.push(
      'Budget was not given; cost was scored as a soft preference (a small budget), not used to filter options.',
    );
  if (profile.team.size === 'unknown' && profile.team.experience === 'unknown') {
    out.push('Team size and experience were not given; scoring assumed a small team.');
  } else if (profile.team.size === 'unknown') out.push('Team size was not given.');
  else if (profile.team.experience === 'unknown') out.push('Team experience was not given.');
  if (profile.usersNow === null) out.push('The current number of users was not given.');
  if (profile.usersIn12Months === null)
    out.push('The expected number of users in 12 months was not given, so growth was treated as unknown.');
  if (profile.deployTarget === null)
    out.push('No deploy target was given, so whether options run on your platform was not checked.');
  if (Object.keys(usage.metrics).length === 0)
    out.push('No usage figures were given, so free-tier and scale limits could not be compared with your usage.');
  return out;
}

export function stage1Constraints(args: {
  def: DecisionTypeDef;
  profile: ContextProfile;
  usage: UsageInputs;
  kb: KBReader;
  config: Defaults;
}): Stage1Result {
  const { def, usage, kb, config } = args;
  const profile = normaliseContext(args.profile);

  // Required chips for this decision type: the single next question, in the order the decision type lists them.
  const required = def.required_context.filter((r) => isMissing(profile, r.field));
  const first = required[0];
  if (first !== undefined) {
    return {
      kind: 'needs_context',
      needs: { missing: required.map((r) => r.field), nextQuestion: { field: first.field, question: first.question } },
    };
  }

  const platforms = userPlatforms(profile, kb);
  const latencyValues = profile.mustHaves.flatMap((m) => (m.kind === 'max_p95_latency_ms' ? [m.value] : []));
  const capabilities = profile.mustHaves.flatMap((m) => {
    if (m.kind === 'requires_capability') return [m.id];
    if (m.kind === 'compliance') return [`compliance.${m.id}`];
    return [];
  });
  return {
    kind: 'ok',
    constraints: {
      profile,
      usage,
      weights: computeWeights(profile, platforms, usage, config.scoring),
      freeOnly: profile.budget === 'free_only',
      latencyBudgetMs: latencyValues.length > 0 ? Math.min(...latencyValues) : null,
      euResidencyRequired: profile.mustHaves.some((m) => m.kind === 'eu_data_residency'),
      requiredCapabilities: sortedUniqueStrings(capabilities),
      avoidedVendors: sortedUniqueStrings(
        profile.mustHaves.flatMap((m) => (m.kind === 'avoid_vendor' ? [m.optionId] : [])),
      ),
      assumptions: assumptionsFor(profile, usage),
    },
  };
}
