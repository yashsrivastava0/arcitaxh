// pnpm kb:check [--fixtures] [--today YYYY-MM-DD]   release checks (exit 1 on any error)
// pnpm kb:sweep [--today YYYY-MM-DD]                list records due or expired; changes nothing
import { join } from 'node:path';
import { isRealDate } from '@product/core';
import { findRepoRoot, loadFreshness, todayUtc } from './fs';
import { formatReport, formatSweep, runCheck } from './run';

const [command, ...args] = process.argv.slice(2);
const root = findRepoRoot(import.meta.url);
const freshness = loadFreshness(root);

const todayArg = args.indexOf('--today');
const today = todayArg === -1 ? todayUtc() : (args[todayArg + 1] ?? '');
if (!isRealDate(today)) {
  console.error(`--today must be a real YYYY-MM-DD date (got "${today}")`);
  process.exit(2);
}

if (command === 'check') {
  const fixtures = args.includes('--fixtures');
  const report = runCheck({
    kbRoot: join(root, fixtures ? 'kb/fixtures' : 'kb'),
    mode: fixtures ? 'fixture' : 'release',
    today,
    freshness,
  });
  console.log(formatReport(report, 'kb:check'));
  process.exit(report.errors.length === 0 ? 0 : 1);
} else if (command === 'sweep') {
  const report = runCheck({ kbRoot: join(root, 'kb'), mode: 'release', today, freshness });
  console.log(formatSweep(report, today));
  // Sweep only reports. Errors unrelated to freshness are for kb:check to fail on.
  process.exit(0);
} else {
  console.error('usage: kb-check <check [--fixtures] | sweep> [--today YYYY-MM-DD]');
  process.exit(2);
}
