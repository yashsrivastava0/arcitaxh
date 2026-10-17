import { z } from 'zod';
import { DIMENSIONS } from './verdict';

// Zod schemas for config/defaults/*.json, config/phase0.json and config/model-roster.json (brief 9).
// Every value tagged Default lives in config, not in code (hard rule 6), and is validated at start-up. Core never
// reads files: callers pass the parsed JSON to the parse functions below.

const meta = {
  /** For example "Default" or "Default (Assumption: not given by the specification)". */
  _status: z.string().min(1),
  /** The specification section the values come from. */
  _source: z.string().min(1),
};

const unit = z.number().min(0).max(1);
const positiveInt = z.number().int().positive();
const dimensionRecord = <T extends z.ZodType>(value: T) =>
  z.strictObject({
    cost_fit: value,
    scale_fit: value,
    latency_fit: value,
    operational_simplicity: value,
    ecosystem_fit: value,
    reversibility: value,
  });

export const MULTIPLIER_CONDITIONS = [
  'solo_or_beginner',
  'free_tiers_only',
  'latency_must_have',
  'existing_stack_platform',
  'users_12m_at_least_growth_ratio',
] as const;

export const scoringConfigSchema = z
  .strictObject({
    ...meta,
    theta_clear: unit,
    theta_uncertain: unit,
    base_weights: dimensionRecord(z.number().positive()),
    multipliers: z.array(
      z.strictObject({
        when: z.enum(MULTIPLIER_CONDITIONS),
        dimension: z.enum(DIMENSIONS),
        factor: z.number().positive(),
      }),
    ),
    /** "12-month users at least N times today's users" (spec 6.5 uses 10). */
    growth_ratio_threshold: z.number().gt(1),
    dimension_values: z.strictObject({
      cost_fit: z.strictObject({
        free_tier_covers: unit,
        paid_tier_fits_ceiling: unit,
        otherwise: unit,
        price_expired: unit,
      }),
      scale_fit: z.strictObject({ covers_10x: unit, covers_1x_only: unit, below_1x: unit }),
      latency_fit: z.strictObject({
        comfortable_ratio: z.number().gt(0).lte(1),
        comfortable: unit,
        fits: unit,
        exceeds: unit,
      }),
      operational_simplicity: z.strictObject({
        ops_burden: z.strictObject({ low: unit, medium: unit, high: unit }),
        deployment_factor: z.strictObject({ managed: unit, both: unit, self_hosted: unit }),
      }),
      ecosystem_fit: z.strictObject({ in_stack: unit, same_platform: unit, otherwise: unit }),
      reversibility: z.strictObject({ low: unit, medium: unit, high: unit, unknown: unit }),
    }),
  })
  .refine((c) => c.theta_uncertain < c.theta_clear, {
    message: 'theta_uncertain must be below theta_clear',
    path: ['theta_uncertain'],
  });
export type ScoringConfig = z.infer<typeof scoringConfigSchema>;

export const finalistsConfigSchema = z.strictObject({
  ...meta,
  /** Decision (blueprint 8): at most three finalists. */
  max_finalists: z.number().int().min(2).max(3),
  /** A third finalist is added only if its score is within theta_clear of the first. */
  third_within_theta_clear: z.boolean(),
});
export type FinalistsConfig = z.infer<typeof finalistsConfigSchema>;

export const rulesConfigSchema = z.strictObject({
  ...meta,
  read_ratio_threshold: unit,
  month_days: z.number().int().min(1).max(31),
  max_components: positiveInt,
  max_edges: positiveInt,
  max_label_chars: positiveInt,
  max_note_chars: positiveInt,
  hop_default_same_region_ms: z.number().finite().nonnegative(),
  free_tier_horizon_months: positiveInt,
  scale_presets: z
    .array(z.number().finite().positive())
    .min(1)
    .refine(
      (a) => a[0] === 1 && a.every((v, i) => i === 0 || v > (a[i - 1] as number)),
      'presets start at 1 and increase',
    ),
});
export type RulesConfig = z.infer<typeof rulesConfigSchema>;

const ttl = positiveInt;
export const freshnessConfigSchema = z.strictObject({
  ...meta,
  ttl_days: z.strictObject({
    price: ttl,
    limit: ttl,
    rate_limit: ttl,
    capability: ttl,
    latency_profile: ttl,
    guidance: ttl,
    // Not given by the specification (plan A10, open question 9). Absent means "no TTL defined": kb:check fails
    // for a record of that type instead of guessing.
    option: ttl.optional(),
    tradeoff: ttl.optional(),
    flip: ttl.optional(),
    antipattern: ttl.optional(),
  }),
  due_soon_days: positiveInt,
});
export type FreshnessConfig = z.infer<typeof freshnessConfigSchema>;

export const DEBATE_ROLES = ['advocate', 'skeptic', 'cost_ops', 'security', 'judge'] as const;
export const debateConfigSchema = z
  .strictObject({
    ...meta,
    /** Hard maximum of three (spec 11.3). */
    max_rounds: z.number().int().min(1).max(3),
    default_rounds: z.number().int().min(1).max(3),
    turn_output_cap_tokens: positiveInt,
    judge_output_cap_tokens: positiveInt,
    max_turns_per_round: positiveInt,
    timeouts_s: z.strictObject({ explain: positiveInt, turn: positiveInt, judge: positiveInt }),
    retries: z.strictObject({
      explain: z.number().int().nonnegative(),
      turn: z.number().int().nonnegative(),
      judge: z.number().int().nonnegative(),
    }),
    retry_backoff_ms: z.strictObject({ base: positiveInt, factor: z.number().gte(1) }),
    early_stop: z.boolean(),
    roles: z.array(z.enum(DEBATE_ROLES)).min(2),
  })
  .refine((c) => c.default_rounds <= c.max_rounds, {
    message: 'default_rounds cannot exceed max_rounds',
    path: ['default_rounds'],
  });
export type DebateConfig = z.infer<typeof debateConfigSchema>;

export const costConfigSchema = z.strictObject({
  ...meta,
  layer2_max_paragraphs: positiveInt,
  /** Arm outputs may differ in length by at most this percentage before a scenario is flagged. */
  length_match_tolerance_pct: z.number().positive().max(100),
});
export type CostConfig = z.infer<typeof costConfigSchema>;

export const retentionConfigSchema = z.strictObject({
  ...meta,
  rendered_debate_inputs_days: positiveInt,
  debate_events_days: positiveInt,
  verdict_cache_days: positiveInt,
  /** Consent screen: rater data deleted this many months after analysis (spec 17.4). */
  rater_data_months_after_analysis: positiveInt,
});
export type RetentionConfig = z.infer<typeof retentionConfigSchema>;

export const defaultsSchema = z.strictObject({
  scoring: scoringConfigSchema,
  finalists: finalistsConfigSchema,
  rules: rulesConfigSchema,
  freshness: freshnessConfigSchema,
  debate: debateConfigSchema,
  cost: costConfigSchema,
  retention: retentionConfigSchema,
});
export type Defaults = z.infer<typeof defaultsSchema>;

/** Validates the parsed contents of the seven config/defaults/*.json files. Throws a ZodError naming the bad field. */
export function parseDefaults(raw: unknown): Defaults {
  return defaultsSchema.parse(raw);
}

// ---- config/phase0.json: founder inputs. Tools refuse to run while a required field is null. ----

export const phase0ConfigSchema = z.strictObject({
  ...meta,
  waitlist: z.strictObject({
    displayed_price_usd: z.number().finite().positive().nullable(),
    displayed_period: z.string().min(1).nullable(),
  }),
  gate: z.strictObject({
    waitlist_min_join_rate: unit,
    h1_min_preference: unit,
    alpha: z.number().gt(0).lt(1),
    min_paired_judgments: positiveInt,
  }),
  spend: z.strictObject({ phase0_model_cap_usd: z.number().finite().positive().nullable() }),
  test: z.strictObject({
    scenarios_per_rater: z.strictObject({ min: positiveInt, max: positiveInt }),
    citation_sample_size: positiveInt,
  }),
});
export type Phase0Config = z.infer<typeof phase0ConfigSchema>;

/** The founder-input fields that are still null. Release and publish tooling must fail while this is non-empty. */
export function phase0MissingInputs(cfg: Phase0Config): string[] {
  const missing: string[] = [];
  if (cfg.waitlist.displayed_price_usd === null) missing.push('waitlist.displayed_price_usd');
  if (cfg.waitlist.displayed_period === null) missing.push('waitlist.displayed_period');
  if (cfg.spend.phase0_model_cap_usd === null) missing.push('spend.phase0_model_cap_usd');
  return missing;
}

// ---- config/model-roster.json: role -> provider and pinned model id. Never hard-coded in code or prompts. ----

export const FOUNDER_TO_SET = '__FOUNDER_TO_SET__';
export const ROSTER_ROLES = [
  'arm_a',
  'explain',
  'advocate_1',
  'advocate_2',
  'advocate_3',
  'skeptic',
  'cost_ops',
  'security',
  'judge',
] as const;
export type RosterRole = (typeof ROSTER_ROLES)[number];

const rosterEntry = z.strictObject({
  provider: z.string().min(1),
  modelId: z.string().min(1),
  gateway: z.string().min(1),
});
export const rosterSchema = z.strictObject({
  ...meta,
  roles: z.strictObject({
    arm_a: rosterEntry,
    explain: rosterEntry,
    advocate_1: rosterEntry,
    advocate_2: rosterEntry,
    advocate_3: rosterEntry,
    skeptic: rosterEntry,
    cost_ops: rosterEntry,
    security: rosterEntry,
    judge: rosterEntry,
  }),
});
export type Roster = z.infer<typeof rosterSchema>;

/** Roles whose provider, model id or gateway is still the placeholder. The real-LLM runner refuses to start if any. */
export function rosterPlaceholders(roster: Roster): string[] {
  const out: string[] = [];
  for (const role of ROSTER_ROLES) {
    const e = roster.roles[role];
    for (const field of ['provider', 'modelId', 'gateway'] as const) {
      if (e[field] === FOUNDER_TO_SET) out.push(`${role}.${field}`);
    }
  }
  return out;
}
