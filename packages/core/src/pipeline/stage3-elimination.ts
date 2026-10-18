import { assessFreeTier, growthFactor } from '../calc/free-tier';
import type { KBReader } from '../ports';
import type { Reason, Elimination, Constraints } from '../schemas/verdict';
import type { DecisionTypeDef, OptionRecord } from '../schemas/kb';
import {
  capabilityLabel,
  isFreeTier,
  loadOptionData,
  lookupCapability,
  splitByFreshness,
  type FreshnessContext,
  type OptionData,
} from './records';

/** An option that survived elimination, with whatever doubt Stage 3 raised about it (P9). */
export interface Survivor {
  option: OptionRecord;
  data: OptionData;
  /** True when a record that would decide a question was missing or expired (the option was kept, not removed). */
  uncertain: boolean;
  /** Plain-language notes on that doubt; they become verdict assumptions. */
  notes: string[];
}

export interface EliminatedOption {
  elimination: Elimination;
  option: OptionRecord;
  /** The "why not" shown for it: a fact citing the record that proved the failure (or a judgement for E-5). */
  reason: Reason;
}

export interface Stage3Result {
  survivors: Survivor[];
  eliminated: EliminatedOption[];
}

type Verdict1 = { eliminate: EliminatedOption } | { note: string } | null;

/**
 * Elimination (specification 6.4). An option is removed only when a FRESH record proves it fails a hard constraint,
 * and the removal names the rule and the record. If the record that would decide is missing or expired, the option
 * survives and is marked uncertain (principle P9). Families run in the order the decision type lists them.
 */
export function stage3Elimination(args: {
  def: DecisionTypeDef;
  candidates: readonly OptionRecord[];
  constraints: Constraints;
  kb: KBReader;
  ctx: FreshnessContext;
}): Stage3Result {
  const { def, candidates, constraints, kb, ctx } = args;
  const survivors: Survivor[] = [];
  const eliminated: EliminatedOption[] = [];

  for (const option of candidates) {
    const data = loadOptionData(kb, option);
    const notes: string[] = [];
    let removed: EliminatedOption | null = null;

    for (const family of def.elimination) {
      const r = applyFamily(family, option, data, constraints, ctx);
      if (r === null) continue;
      if ('eliminate' in r) {
        removed = r.eliminate;
        break;
      }
      notes.push(r.note);
    }
    if (removed !== null) eliminated.push(removed);
    else survivors.push({ option, data, uncertain: notes.length > 0, notes });
  }
  return { survivors, eliminated };
}

function applyFamily(
  family: DecisionTypeDef['elimination'][number],
  option: OptionRecord,
  data: OptionData,
  c: Constraints,
  ctx: FreshnessContext,
): Verdict1 {
  switch (family) {
    case 'E-1':
      return firstOf(c.requiredCapabilities.map((cap) => capabilityCheck('E-1', option, data, cap, ctx)));
    case 'E-2':
      return c.euResidencyRequired ? capabilityCheck('E-2', option, data, 'eu_data_residency', ctx) : null;
    case 'E-3':
      return c.profile.deployTarget === null
        ? null
        : capabilityCheck('E-3', option, data, `deploy_target.${c.profile.deployTarget}`, ctx);
    case 'E-4':
      return c.freeOnly ? freeOnlyCheck(option, data, c, ctx) : null;
    case 'E-5':
      return c.avoidedVendors.includes(option.id)
        ? eliminate(option, 'E-5', null, {
            kind: 'judgement',
            text: 'You asked to avoid this vendor.',
            citedRecordIds: [],
          })
        : null;
    case 'E-6':
      return c.latencyBudgetMs === null ? null : latencyCheck(option, data, c.latencyBudgetMs, ctx);
  }
}

/** The first elimination wins; otherwise keep every note (so no doubt is dropped). */
function firstOf(results: Verdict1[]): Verdict1 {
  const elim = results.find((r): r is { eliminate: EliminatedOption } => r !== null && 'eliminate' in r);
  if (elim !== undefined) return elim;
  const notes = results.flatMap((r) => (r !== null && 'note' in r ? [r.note] : []));
  return notes.length > 0 ? { note: notes.join(' ') } : null;
}

function eliminate(
  option: OptionRecord,
  ruleId: Elimination['ruleId'],
  recordId: string | null,
  reason: Reason,
): { eliminate: EliminatedOption } {
  return { eliminate: { elimination: { optionId: option.id, ruleId, recordId }, option, reason } };
}

function capabilityCheck(
  rule: 'E-1' | 'E-2' | 'E-3',
  option: OptionRecord,
  data: OptionData,
  capabilityId: string,
  ctx: FreshnessContext,
): Verdict1 {
  const name = option.body.name;
  const label = capabilityLabel(capabilityId);
  const found = lookupCapability(data, capabilityId, ctx);
  switch (found.kind) {
    case 'yes':
      return null;
    case 'no':
      return eliminate(option, rule, found.record.id, {
        kind: 'fact',
        text: `${name} does not support ${label}, according to a current record.`,
        citedRecordIds: [found.record.id],
      });
    case 'partial':
      return { note: `${name} supports ${label} only partly, so it was kept as a candidate.` };
    case 'unknown':
      return {
        note: `A current record says it is unknown whether ${name} supports ${label}, so it was kept as a candidate.`,
      };
    case 'expired':
      return {
        note: `The record on whether ${name} supports ${label} has expired and was not used, so it was kept as a candidate.`,
      };
    case 'missing':
      return { note: `No record shows whether ${name} supports ${label}, so it was kept as a candidate.` };
  }
}

function freeOnlyCheck(option: OptionRecord, data: OptionData, c: Constraints, ctx: FreshnessContext): Verdict1 {
  const name = option.body.name;
  const free = data.limits.filter(isFreeTier);
  const { current, expired } = splitByFreshness(free, ctx);
  if (current.length === 0) {
    return {
      note:
        expired.length > 0
          ? `The free-tier record for ${name} has expired and was not used, so whether it fits a free-tiers-only budget could not be checked.`
          : `No free-tier record exists for ${name}, so whether it fits a free-tiers-only budget could not be checked.`,
    };
  }
  const assessment = assessFreeTier(current, c.usage, growthFactor(c.profile, c.usage));
  if (assessment.state === 'exceeds') {
    const hit = assessment.limits.find((l) => l.state === 'exceeds');
    if (hit !== undefined) {
      const used = hit.usage12 ?? hit.usageNow;
      return eliminate(option, 'E-4', hit.recordId, {
        kind: 'fact',
        text: `Its free tier allows ${hit.limit} ${hit.metric}, which your usage (${used}) passes.`,
        citedRecordIds: [hit.recordId],
      });
    }
  }
  if (assessment.state === 'unknown') {
    return {
      note: `The free tier of ${name} could not be compared with your usage (a usage figure or your growth was not given), so it was kept as a candidate.`,
    };
  }
  return null;
}

function latencyCheck(option: OptionRecord, data: OptionData, budgetMs: number, ctx: FreshnessContext): Verdict1 {
  const name = option.body.name;
  const { current, expired } = splitByFreshness(data.latency, ctx);
  if (current.length === 0) {
    return {
      note:
        expired.length > 0
          ? `The latency profile for ${name} has expired and was not used, so it was kept as a candidate.`
          : `No latency profile exists for ${name}, so whether it meets your latency limit could not be checked.`,
    };
  }
  // The option's own best-case profile alone must exceed the budget to eliminate it.
  const best = current.reduce((a, b) => (b.body.p95_ms < a.body.p95_ms ? b : a));
  if (best.body.p95_ms > budgetMs) {
    return eliminate(option, 'E-6', best.id, {
      kind: 'fact',
      text: `Its own response time alone (${best.body.p95_ms} ms at the 95th percentile) exceeds your limit of ${budgetMs} ms.`,
      citedRecordIds: [best.id],
    });
  }
  return null;
}
