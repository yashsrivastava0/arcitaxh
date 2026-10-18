import { inputsHash } from '../hash/inputs-hash';
import type { Clock, KBReader } from '../ports';
import { decisionTypeIdSchema, graphIdSchema, type OptionRef } from '../schemas/common';
import type { Defaults } from '../schemas/config';
import { contextProfileSchema, type ContextProfile } from '../schemas/context';
import { emptyUsageInputs, usageInputsSchema, type UsageInputs } from '../schemas/usage';
import type { Constraints, Outcome } from '../schemas/verdict';
import { dateOfTimestamp } from '../util/date';
import { RULES_VERSION } from '../versions';
import { stage1Constraints, userPlatforms } from './stage1-constraints';
import { stage2Candidates } from './stage2-candidates';
import { stage3Elimination } from './stage3-elimination';
import { stage4Scoring } from './stage4-scoring';
import { stage5Closeness } from './stage5-closeness';
import { stage6Assembly } from './stage6-assembly';

export interface PipelineInputs {
  decisionType: string;
  /** The component the verdict is for (a design component id, or any stable id for a plain-form request). */
  componentId: string;
  profile: ContextProfile;
  usage?: UsageInputs;
  /** Blind spots found by the design rules (milestone M5); the pipeline only carries them into the verdict. */
  blindSpots?: readonly string[];
}

/** What the later layers need besides the outcome: the hash, the ranking and the finalists for a debate. */
export interface PipelineTrace {
  /** Null for needs_context and kb_gap, which have no complete set of inputs. */
  inputsHash: string | null;
  constraints: Constraints | null;
  candidateIds: string[];
  survivorIds: string[];
  /** Best first, with each option's total score (null if nothing could be scored). */
  ranking: { optionId: string; total: number | null }[];
  margin: number | null;
  /** Two or three options. The debate (Layer 3) runs on these, and only when confidence is close or uncertain. */
  finalists: OptionRef[];
}

export interface PipelineRun {
  outcome: Outcome;
  trace: PipelineTrace;
}

const emptyTrace = (): PipelineTrace => ({
  inputsHash: null,
  constraints: null,
  candidateIds: [],
  survivorIds: [],
  ranking: [],
  margin: null,
  finalists: [],
});

/**
 * The six-stage decision pipeline (specification 6): constraints, candidates, elimination, scoring, closeness,
 * assembly. Pure and deterministic: the same inputs, KB release and configuration produce a byte-identical outcome and
 * hash. Time comes only from `clock`. The outcome is a verdict, `needs_context` (with the single next question) or
 * `kb_gap` (naming the decision type); it is never a silent empty result.
 */
export function runPipelineDetailed(inputs: PipelineInputs, kb: KBReader, config: Defaults, clock: Clock): PipelineRun {
  const decisionType = decisionTypeIdSchema.parse(inputs.decisionType);
  const componentId = graphIdSchema.parse(inputs.componentId);
  const profile = contextProfileSchema.parse(inputs.profile);
  const usage = usageInputsSchema.parse(inputs.usage ?? emptyUsageInputs());
  const ctx = { today: dateOfTimestamp(clock.now()), dueSoonDays: config.freshness.due_soon_days };

  const def = kb.decisionType(decisionType);
  if (def === null) {
    return {
      outcome: {
        outcome: 'kb_gap',
        decisionType,
        reason: `The knowledge base has no definition for decision type "${decisionType}".`,
      },
      trace: emptyTrace(),
    };
  }

  const s1 = stage1Constraints({ def, profile, usage, kb, config });
  if (s1.kind === 'needs_context') {
    return {
      outcome: {
        outcome: 'needs_context',
        decisionType,
        missing: s1.needs.missing,
        nextQuestion: s1.needs.nextQuestion,
      },
      trace: emptyTrace(),
    };
  }
  const constraints = s1.constraints;

  const s2 = stage2Candidates({ def, profile: constraints.profile, kb });
  if (s2.kind === 'kb_gap') {
    return { outcome: { outcome: 'kb_gap', decisionType, reason: s2.reason }, trace: { ...emptyTrace(), constraints } };
  }

  const s3 = stage3Elimination({ def, candidates: s2.candidates, constraints, kb, ctx });
  const s4 = stage4Scoring({
    survivors: s3.survivors,
    constraints,
    config: config.scoring,
    ctx,
    userPlatforms: userPlatforms(constraints.profile, kb),
  });
  const s5 = stage5Closeness(s4, config.scoring, config.finalists);
  const verdict = stage6Assembly({
    componentId,
    def,
    constraints,
    candidates: s2.candidates,
    eliminated: s3.eliminated,
    closeness: s5,
    blindSpots: inputs.blindSpots ?? [],
    kb,
    ctx,
    assumptionsFromStages: constraints.assumptions,
  });

  const candidateRefs: OptionRef[] = s2.candidates.map((o) => ({ optionId: o.id, params: {} }));
  return {
    outcome: { outcome: 'verdict', verdict },
    trace: {
      inputsHash: inputsHash({
        constraints,
        decisionType,
        candidates: candidateRefs,
        kbVersion: kb.version,
        rulesVersion: RULES_VERSION,
        promptsVersion: null,
        modelRoster: null,
      }),
      constraints,
      candidateIds: s2.candidates.map((o) => o.id),
      survivorIds: s3.survivors.map((s) => s.option.id),
      ranking: s5.ranking.map((r) => ({ optionId: r.score.optionId, total: r.score.total })),
      margin: s5.margin,
      finalists: s5.finalists.map((f) => ({ optionId: f.score.optionId, params: {} })),
    },
  };
}

/** The outcome only. Use runPipelineDetailed when the hash, ranking or finalists are needed. */
export function runPipeline(inputs: PipelineInputs, kb: KBReader, config: Defaults, clock: Clock): Outcome {
  return runPipelineDetailed(inputs, kb, config, clock).outcome;
}
