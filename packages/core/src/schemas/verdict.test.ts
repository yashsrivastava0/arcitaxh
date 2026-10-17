import { describe, expect, it } from 'vitest';
import { contextProfileSchema, conditionSchema, emptyContextProfile, mustHaveSchema } from './context';
import { findingSchema } from './finding';
import { outcomeSchema, reasonSchema, verdictSchema, type Verdict } from './verdict';

const ref = { optionId: 'option.fake-primary', params: {} };
const other = { optionId: 'option.fake-secondary', params: {} };

// Record ids below are invented for these structural tests; none is a fact about any product.
function verdict(over: Partial<Verdict> = {}): Verdict {
  return {
    decisionType: 'vector-store',
    componentId: 'vector',
    pick: ref,
    pickOrigin: 'rules',
    rulesPick: ref,
    confidence: 'clear',
    why: [
      {
        kind: 'fact',
        text: 'The primary option documents support for this need.',
        citedRecordIds: ['cap.fake-primary.thing.2026-10'],
      },
      {
        kind: 'judgement',
        text: 'With one database already running, a second service adds burden for little gain.',
        citedRecordIds: [],
      },
    ],
    assumptions: ['Team size was not given; scoring assumed a small team.'],
    flipConditions: [
      {
        text: 'Switch when the corpus outgrows the documented limit.',
        citedRecordIds: ['flip.fake-primary.scale.2026-10'],
        refersTo: ['usersNow'],
      },
    ],
    alternatives: [
      {
        optionId: other.optionId,
        whyNot: [
          {
            kind: 'fact',
            text: 'Its free tier does not cover the stated scale.',
            citedRecordIds: ['limit.fake-secondary.free.2026-10'],
          },
        ],
        flipCondition: null,
      },
    ],
    runnerUp: other,
    reversalCost: 'low',
    blindSpots: ['No backup policy is recorded for the database.'],
    stale: false,
    versions: { kb: 'kb-2026.10.1', rules: 'rules-0.1.0', prompts: null },
    debateId: null,
    eliminated: [],
    scores: [],
    ...over,
  };
}

describe('Reason', () => {
  it('a fact must cite at least one record', () => {
    expect(reasonSchema.safeParse({ kind: 'fact', text: 'A claim.', citedRecordIds: [] }).success).toBe(false);
    expect(reasonSchema.safeParse({ kind: 'fact', text: 'A claim.', citedRecordIds: ['cap.x.2026-10'] }).success).toBe(
      true,
    );
  });

  it('a judgement cannot contain a number, but number words are fine', () => {
    expect(reasonSchema.safeParse({ kind: 'judgement', text: 'Fine for 500 users.', citedRecordIds: [] }).success).toBe(
      false,
    );
    expect(reasonSchema.safeParse({ kind: 'judgement', text: 'It costs $5.', citedRecordIds: [] }).success).toBe(false);
    expect(reasonSchema.safeParse({ kind: 'judgement', text: 'Fine for ٥ users.', citedRecordIds: [] }).success).toBe(
      false,
    ); // non-ASCII digit
    expect(
      reasonSchema.safeParse({
        kind: 'judgement',
        text: 'With one database already running, simpler.',
        citedRecordIds: [],
      }).success,
    ).toBe(true);
  });

  it('rejects an empty or oversized text and a bad record id', () => {
    expect(reasonSchema.safeParse({ kind: 'judgement', text: '', citedRecordIds: [] }).success).toBe(false);
    expect(reasonSchema.safeParse({ kind: 'judgement', text: 'x'.repeat(1001), citedRecordIds: [] }).success).toBe(
      false,
    );
    expect(reasonSchema.safeParse({ kind: 'fact', text: 'A.', citedRecordIds: ['Not A Valid Id'] }).success).toBe(
      false,
    );
  });
});

describe('Verdict', () => {
  it('accepts a complete rules verdict', () => {
    expect(verdictSchema.safeParse(verdict()).success).toBe(true);
  });

  it('pick: null is valid (deferral or no fit), with a null rulesPick', () => {
    expect(verdictSchema.safeParse(verdict({ pick: null, rulesPick: null, runnerUp: null })).success).toBe(true);
  });

  it('confidence is a category, never a percentage', () => {
    expect(verdictSchema.safeParse({ ...verdict(), confidence: '87%' }).success).toBe(false);
    expect(verdictSchema.safeParse({ ...verdict(), confidence: 0.87 }).success).toBe(false);
    for (const c of ['clear', 'close', 'uncertain'] as const)
      expect(verdictSchema.safeParse(verdict({ confidence: c })).success).toBe(true);
  });

  it('when the rules chose, rulesPick must equal pick (key order does not matter)', () => {
    expect(verdictSchema.safeParse(verdict({ rulesPick: other })).success).toBe(false);
    expect(
      verdictSchema.safeParse(
        verdict({
          pick: { optionId: 'a.b', params: { x: 1, y: 2 } },
          rulesPick: { params: { y: 2, x: 1 }, optionId: 'a.b' },
        }),
      ).success,
    ).toBe(true);
  });

  it('a debate may override the rules, preserving rulesPick, but must link its debate', () => {
    expect(
      verdictSchema.safeParse(verdict({ pickOrigin: 'debate', pick: other, rulesPick: ref, debateId: 'debate-1' }))
        .success,
    ).toBe(true);
    expect(
      verdictSchema.safeParse(verdict({ pickOrigin: 'debate', pick: other, rulesPick: ref, debateId: null })).success,
    ).toBe(false);
  });

  it('rejects unknown keys and a fact reason with no citation inside a verdict', () => {
    expect(verdictSchema.safeParse({ ...verdict(), extra: 1 }).success).toBe(false);
    expect(
      verdictSchema.safeParse(verdict({ why: [{ kind: 'fact', text: 'Uncited.', citedRecordIds: [] }] })).success,
    ).toBe(false);
  });

  it('stores eliminations and per-dimension scores (spec 6.4, 6.5)', () => {
    const v = verdict({
      eliminated: [{ optionId: 'option.fake-third', ruleId: 'E-4', recordId: 'limit.fake-third.free.2026-10' }],
      scores: [
        {
          optionId: ref.optionId,
          total: 0.8,
          partial: true,
          uncertain: false,
          dimensions: [
            { dimension: 'cost_fit', weight: 0.4, value: 1, state: 'scored', uncertain: false },
            { dimension: 'latency_fit', weight: 0, value: null, state: 'not_applicable', uncertain: false },
            { dimension: 'scale_fit', weight: 0.6, value: null, state: 'unknown', uncertain: true },
          ],
        },
      ],
    });
    expect(verdictSchema.safeParse(v).success).toBe(true);
    expect(
      verdictSchema.safeParse({ ...v, eliminated: [{ optionId: 'o.a', ruleId: 'E-9', recordId: null }] }).success,
    ).toBe(false);
  });
});

describe('Outcome', () => {
  it('is a verdict, needs_context or kb_gap', () => {
    expect(outcomeSchema.safeParse({ outcome: 'verdict', verdict: verdict() }).success).toBe(true);
    expect(
      outcomeSchema.safeParse({
        outcome: 'needs_context',
        decisionType: 'vector-store',
        missing: ['usersNow', 'budget'],
        nextQuestion: { field: 'usersNow', question: 'About how many users do you have now?' },
      }).success,
    ).toBe(true);
    expect(
      outcomeSchema.safeParse({
        outcome: 'kb_gap',
        decisionType: 'vector-store',
        reason: 'No options in the knowledge base.',
      }).success,
    ).toBe(true);
  });

  it('needs_context asks about a field that is actually missing', () => {
    const r = outcomeSchema.safeParse({
      outcome: 'needs_context',
      decisionType: 'vector-store',
      missing: ['usersNow'],
      nextQuestion: { field: 'budget', question: 'What is your budget?' },
    });
    expect(r.success).toBe(false);
  });

  it('kb_gap names the decision type; an unknown outcome is rejected', () => {
    expect(outcomeSchema.safeParse({ outcome: 'kb_gap', reason: 'x' }).success).toBe(false);
    expect(outcomeSchema.safeParse({ outcome: 'shrug' }).success).toBe(false);
  });
});

describe('Finding', () => {
  const finding = {
    kind: 'detected',
    ruleId: 'R-01',
    ruleVersion: '1.0.0',
    severity: 'warn',
    componentIds: ['agent'],
    title: 'Agent runs on a synchronous request path',
    explanation: 'An agent runtime has a synchronous edge from the API.',
    evidence: { recordIds: [], measurements: { syncEdges: 1, path: 'api>agent' } },
    suggestedFix: 'Run the agent behind a queue; return a job id.',
  };

  it('accepts a detected finding and an unknown finding (missing data is never a pass)', () => {
    expect(findingSchema.safeParse(finding).success).toBe(true);
    expect(findingSchema.safeParse({ ...finding, kind: 'unknown', severity: 'info', suggestedFix: null }).success).toBe(
      true,
    );
  });

  it('rejects an unknown severity, a bad rule id or version, and non-finite measurements', () => {
    expect(findingSchema.safeParse({ ...finding, severity: 'fatal' }).success).toBe(false);
    expect(findingSchema.safeParse({ ...finding, ruleId: 'RULE1' }).success).toBe(false);
    expect(findingSchema.safeParse({ ...finding, ruleVersion: 'v1' }).success).toBe(false);
    expect(
      findingSchema.safeParse({
        ...finding,
        evidence: { recordIds: [], measurements: { x: Number.POSITIVE_INFINITY } },
      }).success,
    ).toBe(false);
  });
});

describe('ContextProfile and MustHave', () => {
  it('an empty profile (everything unknown) is valid: unknown stays unknown', () => {
    expect(contextProfileSchema.safeParse(emptyContextProfile()).success).toBe(true);
  });

  it('accepts a full profile with every MustHave kind', () => {
    const p = {
      ...emptyContextProfile(),
      purpose: 'startup',
      usersNow: 500,
      usersIn12Months: 5000,
      budget: 'free_only',
      monthlyCeilingUsd: 0,
      deployTarget: 'platform.fake',
      existingStack: [{ optionId: 'option.fake-primary', params: {} }],
      team: { size: 'solo', experience: 'beginner' },
      mustHaves: [
        { kind: 'eu_data_residency' },
        { kind: 'max_p95_latency_ms', value: 1000 },
        { kind: 'compliance', id: 'hipaa' },
        { kind: 'requires_capability', id: 'hybrid_search' },
        { kind: 'avoid_vendor', optionId: 'option.fake-secondary' },
      ],
    };
    expect(contextProfileSchema.safeParse(p).success).toBe(true);
  });

  it('rejects negative or non-finite numbers and unknown enum values', () => {
    const base = emptyContextProfile();
    expect(contextProfileSchema.safeParse({ ...base, usersNow: -1 }).success).toBe(false);
    expect(contextProfileSchema.safeParse({ ...base, usersNow: Number.NaN }).success).toBe(false);
    expect(contextProfileSchema.safeParse({ ...base, budget: 'unlimited' }).success).toBe(false);
    expect(contextProfileSchema.safeParse({ ...base, extra: true }).success).toBe(false);
    expect(mustHaveSchema.safeParse({ kind: 'max_p95_latency_ms', value: 0 }).success).toBe(false);
    expect(mustHaveSchema.safeParse({ kind: 'make_it_fast' }).success).toBe(false);
  });

  it('conditions reference only known context fields', () => {
    expect(conditionSchema.safeParse({ field: 'team.size', op: 'eq', value: 'solo' }).success).toBe(true);
    expect(conditionSchema.safeParse({ field: 'favouriteColour', op: 'eq', value: 'blue' }).success).toBe(false);
    expect(conditionSchema.safeParse({ field: 'usersNow', op: 'roughly', value: 1 }).success).toBe(false);
  });
});
