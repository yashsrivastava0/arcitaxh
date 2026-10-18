/**
 * Bump when the pipeline or any rule changes behaviour, so a stored verdict, its cache entry and its hash can never be
 * mistaken for the output of different logic (principle P7). Milestone M5 turns this into the aggregate of the
 * per-rule versions.
 */
export const RULES_VERSION = 'rules-0.1.0';

/** Names a flip condition may refer to besides context fields (checked by validator G6). */
export const CALCULATOR_OUTPUTS = ['calc.free_tier_breakpoint', 'calc.monthly_cost', 'calc.latency_p95_sum'] as const;
