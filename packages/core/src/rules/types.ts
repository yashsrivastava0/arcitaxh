// The rule contract (specification 7.1). A rule is a pure function with a stable id and a version. It reads the design,
// the context and the knowledge base; it writes nothing. A rule that needs data it does not have returns a finding of
// kind `unknown`, never a pass (P9, hard rule 7). Each rule's version is stored on every finding it returns.
//
// Deviations from the specification's positional signature check(graph, ctx, kb, clock), logged as conflict C-018:
//  - one input object, because
//  - rules also need the user's usage figures (R-05 read ratio, R-07 free-tier usage, spec 7.3 inputs) and the
//    config Defaults (thresholds live in config/, hard rule 6), neither of which the positional form carries.
import type { Clock, KBReader } from '../ports';
import type { Defaults } from '../schemas/config';
import type { ContextProfile } from '../schemas/context';
import type { DesignGraph } from '../schemas/design';
import type { Finding, Severity } from '../schemas/finding';
import type { UsageInputs } from '../schemas/usage';
import { TEXT_LIMITS } from '../schemas/common';
import { redactSecrets } from '../security/redact';

export interface RuleInput {
  graph: DesignGraph;
  profile: ContextProfile;
  usage: UsageInputs;
  kb: KBReader;
  clock: Clock;
  defaults: Defaults;
}

/**
 * A small design with the findings it must produce. Plain data: the test harness supplies the (fake) knowledge base and
 * the clock, so production code never depends on test code. `expect` lists, in order, partial findings that must match;
 * an empty list means the rule returns nothing at all for this design.
 */
export interface RuleFixture {
  name: string;
  graph: DesignGraph;
  profile?: Partial<ContextProfile>;
  usage?: Partial<UsageInputs>;
  /** The date the rule runs on (YYYY-MM-DD). Defaults to the fixture knowledge base's "fresh" date. */
  today?: string;
  expect: Partial<Finding>[];
}

export interface Rule {
  /** "R-01" */
  id: string;
  /** Semantic version of the rule's behaviour. Bump it when the rule's output can change. */
  version: string;
  /** Plain language. */
  title: string;
  appliesTo: 'design' | string[];
  /** The severity of a `detected` finding. An `unknown` finding is always `info`. */
  severity: Severity;
  check(input: RuleInput): Finding[];
  fixtures: RuleFixture[];
}

type Measurements = Finding['evidence']['measurements'];

interface FindingParts {
  componentIds: string[];
  title: string;
  explanation: string;
  suggestedFix: string | null;
  severity?: Severity;
  recordIds?: string[];
  measurements?: Measurements;
}

const clip = (s: string, max: number): string => (s.length <= max ? s : `${s.slice(0, max - 1)}…`);
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** A real finding: the rule found the pattern it looks for. */
export function detected(rule: Pick<Rule, 'id' | 'version' | 'severity'>, p: FindingParts): Finding {
  return {
    kind: 'detected',
    ruleId: rule.id,
    ruleVersion: rule.version,
    severity: p.severity ?? rule.severity,
    componentIds: [...new Set(p.componentIds)],
    title: clip(p.title, TEXT_LIMITS.shortText),
    explanation: clip(p.explanation, TEXT_LIMITS.reasonText),
    evidence: { recordIds: [...new Set(p.recordIds ?? [])].sort(cmp), measurements: p.measurements ?? {} },
    suggestedFix: p.suggestedFix === null ? null : clip(p.suggestedFix, TEXT_LIMITS.shortText),
  };
}

/** The rule could not decide: data it needs is missing or expired. Never a pass; severity is always `info`. */
export function unknownFinding(
  rule: Pick<Rule, 'id' | 'version' | 'title'>,
  p: Omit<FindingParts, 'severity'>,
): Finding {
  return {
    kind: 'unknown',
    ruleId: rule.id,
    ruleVersion: rule.version,
    severity: 'info',
    componentIds: [...new Set(p.componentIds)],
    title: clip(p.title, TEXT_LIMITS.shortText),
    explanation: clip(p.explanation, TEXT_LIMITS.reasonText),
    evidence: { recordIds: [...new Set(p.recordIds ?? [])].sort(cmp), measurements: p.measurements ?? {} },
    suggestedFix: p.suggestedFix === null ? null : clip(p.suggestedFix, TEXT_LIMITS.shortText),
  };
}

/** "A, B and C" with at most `max` names, then "and N more". Labels come from the user and are clipped. */
export function nameList(labels: readonly string[], max = 4): string {
  // A label can hold anything the user typed, including a pasted key: findings never repeat one (R-09 blocks the design).
  const names = labels.map((raw) => {
    const l = redactSecrets(raw).text;
    return l.length > 40 ? `${l.slice(0, 39)}…` : l;
  });
  if (names.length === 0) return 'nothing';
  if (names.length === 1) return names[0] as string;
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(', ')} and ${rest} more`;
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

export const byId = <T extends { id: string }>(a: T, b: T): number => cmp(a.id, b.id);
