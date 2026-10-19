// The rule registry. Phase 0 implements R-01..R-07 and R-09 (brief 10.4) plus the cheap, optional R-08 and R-10. R-11
// (embedding dimension mismatch) needs fields the knowledge-base schema does not have and is not implemented.
import type { Finding } from '../schemas/finding';
import { R01 } from './r01-agent-on-sync-path';
import { R02 } from './r02-no-fallback-model';
import { R03 } from './r03-unbounded-context-growth';
import { R04 } from './r04-single-point-of-failure';
import { R05 } from './r05-read-heavy-without-cache';
import { R06 } from './r06-latency-over-budget';
import { R07 } from './r07-free-tier-reached';
import { R08 } from './r08-sync-call-no-failure-handling';
import { R09 } from './r09-secret-looking-text';
import { R10 } from './r10-long-running-on-sync-path';
import type { Rule, RuleInput } from './types';

export const RULES: readonly Rule[] = [R01, R02, R03, R04, R05, R06, R07, R08, R09, R10];

/** "R-01@0.1.0;R-02@0.1.0;..." The aggregate of rule versions; a test locks it so a rule change cannot go unnoticed. */
export function ruleSignature(rules: readonly Rule[] = RULES): string {
  return rules.map((r) => `${r.id}@${r.version}`).join(';');
}

/** The rules with these ids, in registry order. Unknown ids are ignored: a decision type may list a rule not built yet. */
export function selectRules(ids: readonly string[], rules: readonly Rule[] = RULES): Rule[] {
  const wanted = new Set(ids);
  return rules.filter((r) => wanted.has(r.id));
}

const SEVERITY_RANK: Record<Finding['severity'], number> = { block: 0, warn: 1, info: 2 };
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Runs the rules and returns every finding in a stable order (rule id, severity, components, title, text). */
export function runRules(input: RuleInput, rules: readonly Rule[] = RULES): Finding[] {
  return rules
    .flatMap((r) => r.check(input))
    .sort(
      (a, b) =>
        cmp(a.ruleId, b.ruleId) ||
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        cmp(a.componentIds.join(','), b.componentIds.join(',')) ||
        cmp(a.title, b.title) ||
        cmp(a.explanation, b.explanation),
    );
}

/** Rule R-09: while a `block` finding is open, the design is neither debated nor exported, so it is never sent to a model. */
export function hasBlockingFinding(findings: readonly Finding[]): boolean {
  return findings.some((f) => f.severity === 'block');
}
