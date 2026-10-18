import type { FreshnessConfig } from '@product/core';
import { checkKb, parseKbSource, type DueEntry, type KbTree, type Problem } from '@product/kb';
import { readKbFiles } from './fs';

export interface RunOptions {
  kbRoot: string;
  /** `release` for the real kb/ tree; `fixture` for kb/fixtures/. */
  mode: 'release' | 'fixture';
  /** YYYY-MM-DD from the clock (injected so tests are deterministic). */
  today: string;
  freshness: FreshnessConfig;
}

export interface RunReport {
  mode: RunOptions['mode'];
  tree: KbTree;
  errors: Problem[];
  warnings: Problem[];
  due: DueEntry[];
}

export function runCheck(opts: RunOptions): RunReport {
  const parsed = parseKbSource(readKbFiles(opts.kbRoot), { allowFixtures: opts.mode === 'fixture' });
  const checked = checkKb(parsed.tree, { mode: opts.mode, today: opts.today, freshness: opts.freshness });
  const all = [...parsed.problems, ...checked.problems];
  return {
    mode: opts.mode,
    tree: parsed.tree,
    errors: all.filter((p) => p.severity === 'error'),
    warnings: all.filter((p) => p.severity === 'warning'),
    due: checked.due,
  };
}

export function formatReport(r: RunReport, label: string): string {
  const t = r.tree;
  const lines = [
    `${label} (${r.mode}): ${t.decisionTypes.length} decision type(s), ${t.records.length} record(s), ${t.proposals.length} proposal(s)`,
  ];
  for (const p of r.errors) lines.push(`  error   [${p.code}] ${p.file}: ${p.message}`);
  for (const p of r.warnings) lines.push(`  warning [${p.code}] ${p.file}: ${p.message}`);
  if (r.due.length > 0) {
    lines.push(`  due for re-verification (${r.due.length}):`);
    for (const d of r.due)
      lines.push(
        `    ${d.state === 'expired' ? 'EXPIRED ' : 'due soon'} ${d.validUntil}  ${d.id}  (${d.decisionType}/${d.type}${d.launch ? ', launch' : ''})`,
      );
  }
  lines.push(r.errors.length === 0 ? '  ok' : `  FAILED: ${r.errors.length} error(s)`);
  return lines.join('\n');
}

/** What `pnpm kb:sweep` prints: the review queue only. It changes nothing. */
export function formatSweep(r: RunReport, today: string): string {
  if (r.due.length === 0)
    return `kb:sweep ${today}: nothing is due or expired (${r.tree.records.length} record(s) checked)`;
  const lines = [`kb:sweep ${today}: ${r.due.length} record(s) need review (this command changes nothing)`];
  for (const d of r.due)
    lines.push(`  ${d.state === 'expired' ? 'EXPIRED ' : 'due soon'} valid until ${d.validUntil}  ${d.id}  ${d.file}`);
  return lines.join('\n');
}
