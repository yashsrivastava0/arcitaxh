import { formatMultiple } from '../calc/free-tier';
import { allTrue } from '../context/conditions';
import type { KBReader } from '../ports';
import type { OptionRef } from '../schemas/common';
import type { DecisionTypeDef, OptionRecord } from '../schemas/kb';
import {
  verdictSchema,
  type Alternative,
  type Constraints,
  type Dimension,
  type FlipCondition,
  type Reason,
  type Verdict,
} from '../schemas/verdict';
import { RULES_VERSION } from '../versions';
import { isFreeTier, splitByFreshness, stateOf, type FreshnessContext, type OptionData } from '../kb-records';
import type { Closeness } from './stage5-closeness';
import type { EliminatedOption } from './stage3-elimination';
import type { ScoredOption } from './stage4-scoring';

const DIMENSION_LABEL: Record<Dimension, string> = {
  cost_fit: 'cost',
  scale_fit: 'scale',
  latency_fit: 'latency',
  operational_simplicity: 'operational simplicity',
  ecosystem_fit: 'ecosystem fit',
  reversibility: 'reversibility',
};

const ref = (o: OptionRecord): OptionRef => ({ optionId: o.id, params: {} });

const factFromCurated = (text: string, recordId: string): Reason => ({
  kind: 'fact',
  text,
  citedRecordIds: [recordId],
});

function curatedReasons(sentences: OptionRecord['body']['why_pick'], option: OptionRecord, c: Constraints): Reason[] {
  return sentences.filter((s) => allTrue(s.applies_when, c.profile)).map((s) => factFromCurated(s.text, option.id));
}

/**
 * Assembly (specification 6.7). The verdict is built from curated text selected by the constraints it matches and from
 * computed values, each carrying the record it came from. No model writes anything here. `pickOrigin` is `rules` and
 * `rulesPick` equals the pick.
 */
export function stage6Assembly(args: {
  componentId: string;
  def: DecisionTypeDef;
  constraints: Constraints;
  candidates: readonly OptionRecord[];
  eliminated: readonly EliminatedOption[];
  closeness: Closeness;
  blindSpots: readonly string[];
  kb: KBReader;
  ctx: FreshnessContext;
  assumptionsFromStages: readonly string[];
}): Verdict {
  const { def, constraints: c, closeness, eliminated, kb, ctx } = args;
  const [top, second] = closeness.ranking;
  const pickOption = top?.survivor.option ?? null;
  const pick = pickOption === null ? null : ref(pickOption);

  // ---- why ----
  const why: Reason[] = [];
  if (top !== undefined) {
    why.push(...curatedReasons(top.survivor.option.body.why_pick, top.survivor.option, c));
    for (const t of splitByFreshness(top.survivor.data.tradeoffs, ctx).current) {
      if (allTrue(t.body.applies_when, c.profile))
        why.push({ kind: 'fact', text: `Trade-off: ${t.body.sentence}`, citedRecordIds: [t.id] });
    }
    if (why.length === 0) {
      why.push({
        kind: 'judgement',
        text: 'It scored highest across the checks that could be made for your context.',
        citedRecordIds: [],
      });
    }
  } else {
    why.push({
      kind: 'judgement',
      text: 'No option satisfies every hard constraint in your context.',
      citedRecordIds: [],
    });
  }

  // ---- alternatives: outscored survivors in ranking order, then eliminated options ----
  const alternatives: Alternative[] = [];
  for (const s of closeness.ranking.slice(1)) {
    const curated = curatedReasons(s.survivor.option.body.why_not, s.survivor.option, c);
    alternatives.push({
      optionId: s.survivor.option.id,
      whyNot:
        curated.length > 0
          ? curated
          : [
              {
                kind: 'judgement',
                text: 'It scored lower than the top option on the checks that could be made for your context.',
                citedRecordIds: [],
              },
            ],
      flipCondition: curatedFlip(s.survivor.data, ctx),
    });
  }
  for (const e of eliminated) {
    alternatives.push({
      optionId: e.option.id,
      whyNot: [e.reason, ...curatedReasons(e.option.body.why_not, e.option, c)],
      flipCondition: null,
    });
  }

  // ---- flip conditions: curated records about the pick, then those computed from the free-tier breakpoint ----
  const flipConditions: FlipCondition[] = [];
  if (top !== undefined) {
    for (const f of splitByFreshness(top.survivor.data.flips, ctx).current) {
      flipConditions.push({ text: f.body.explanation, citedRecordIds: [f.id], refersTo: [f.body.condition.field] });
    }
    for (const l of splitByFreshness(top.survivor.data.limits.filter(isFreeTier), ctx).current) {
      const used = c.usage.metrics[l.body.metric];
      if (used !== undefined && used > 0) {
        const times = formatMultiple(l.body.value / used);
        flipConditions.push({
          text: `Its free tier (${l.body.metric}) is reached at about ${times} times today's usage.`,
          citedRecordIds: [l.id],
          refersTo: ['calc.free_tier_breakpoint'],
        });
      }
    }
  }

  // ---- assumptions: stage 1 defaults, then every doubt raised by elimination, then gaps in the top two ----
  const assumptions = dedupe([
    ...args.assumptionsFromStages,
    ...closeness.ranking.flatMap((s) => s.survivor.notes),
    ...closeness.ranking.slice(0, 2).flatMap((s) => scoringGaps(s)),
  ]);

  const verdict: Verdict = {
    decisionType: def.id,
    componentId: args.componentId,
    pick,
    pickOrigin: 'rules',
    rulesPick: pick,
    confidence: top === undefined ? 'clear' : closeness.confidence,
    why,
    assumptions,
    flipConditions,
    alternatives,
    runnerUp: second === undefined ? null : ref(second.survivor.option),
    reversalCost: pickOption === null ? 'unknown' : pickOption.body.migration_effort,
    blindSpots: [...args.blindSpots],
    stale: false,
    versions: { kb: kb.version, rules: RULES_VERSION, prompts: null },
    debateId: null,
    eliminated: eliminated.map((e) => e.elimination),
    scores: closeness.ranking.map((s) => s.score),
  };
  verdict.stale = citesExpiredRecord(verdict, pickOption, kb, ctx);
  // A malformed verdict can never leave the pipeline.
  return verdictSchema.parse(verdict);
}

function curatedFlip(data: OptionData, ctx: FreshnessContext): FlipCondition | null {
  const f = splitByFreshness(data.flips, ctx).current[0];
  return f === undefined
    ? null
    : { text: f.body.explanation, citedRecordIds: [f.id], refersTo: [f.body.condition.field] };
}

function scoringGaps(s: ScoredOption): string[] {
  const missing = s.score.dimensions.filter((d) => d.state === 'unknown').map((d) => DIMENSION_LABEL[d.dimension]);
  if (missing.length === 0) return [];
  return [
    `There was not enough current data to score ${s.survivor.option.body.name} on ${missing.join(', ')}; those checks were left out of its score.`,
  ];
}

function citesExpiredRecord(v: Verdict, pickOption: OptionRecord | null, kb: KBReader, ctx: FreshnessContext): boolean {
  const ids = new Set<string>();
  if (pickOption !== null) ids.add(pickOption.id);
  for (const r of [...v.why, ...v.alternatives.flatMap((a) => a.whyNot)])
    for (const id of r.citedRecordIds) ids.add(id);
  for (const f of [
    ...v.flipConditions,
    ...v.alternatives.flatMap((a) => (a.flipCondition === null ? [] : [a.flipCondition])),
  ]) {
    for (const id of f.citedRecordIds) ids.add(id);
  }
  for (const id of ids) {
    const rec = kb.record(id);
    if (rec !== null && stateOf(rec, ctx) === 'expired') return true;
  }
  return false;
}

function dedupe(items: readonly string[]): string[] {
  return [...new Set(items)];
}
