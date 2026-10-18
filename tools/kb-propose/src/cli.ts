// Curator helper. Snapshots a vendor page and drafts a PROPOSAL in kb/proposals/. It cannot write a record:
// only the founder promotes a reviewed proposal into kb/records/ (rule K5, hard rule 8).
//   kb-propose snapshot <url> --id <record-id> [--force]
//   kb-propose draft <spec.json> [--force]
//   kb-propose verify <proposal-id>
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isRealDate, kbProposalSchema, recordIdSchema } from '@product/core';
import { splitSnapshot, verifyProposal } from '@product/kb';
import { findRepoRoot, todayUtc } from '@product/tool-kb-check';
import { parse as parseYaml } from 'yaml';
import { draftProposal, saveSnapshot, snapshotPath } from './lib';
import { fetchPage } from './fetch-page';

const [command, target, ...rest] = process.argv.slice(2);
const args = [target ?? '', ...rest];
const kbRoot = join(findRepoRoot(import.meta.url), 'kb');
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const force = args.includes('--force');
const today = flag('--today') ?? todayUtc();
if (!isRealDate(today)) {
  console.error(`--today must be a real YYYY-MM-DD date (got "${today}")`);
  process.exit(2);
}

async function main(): Promise<number> {
  if (command === 'snapshot') {
    const id = flag('--id');
    if (target === undefined || id === undefined || !recordIdSchema.safeParse(id).success) {
      console.error('usage: kb-propose snapshot <url> --id <record-id> [--force]');
      return 2;
    }
    const page = await fetchPage(target);
    const path = saveSnapshot(kbRoot, id, page.finalUrl, today, page.text, force);
    console.log(`saved ${path} (${page.text.length} characters from ${page.finalUrl})`);
    console.log(
      'Next: copy ONE exact sentence from the snapshot as source.quote, write a draft spec JSON, then run "kb-propose draft <spec.json>".',
    );
    return 0;
  }
  if (command === 'draft') {
    if (target === undefined || !existsSync(target)) {
      console.error('usage: kb-propose draft <spec.json> [--force]');
      return 2;
    }
    const result = draftProposal(kbRoot, JSON.parse(readFileSync(target, 'utf8')) as unknown, { force });
    if (!result.ok) {
      console.error('proposal NOT written:');
      for (const p of result.problems) console.error(`  - ${p}`);
      return 1;
    }
    console.log(`wrote ${result.path} (status: proposed, verified_by: null)`);
    console.log(
      'The founder must check the quote against the live page, then promote it to kb/records/ (setting verified_by, last_verified and valid_until).',
    );
    return 0;
  }
  if (command === 'verify') {
    const file = target === undefined ? '' : join(kbRoot, 'proposals', `${target}.yaml`);
    if (!existsSync(file)) {
      console.error('usage: kb-propose verify <proposal-id>');
      return 2;
    }
    const proposal = kbProposalSchema.parse(parseYaml(readFileSync(file, 'utf8')) as unknown);
    const snap = existsSync(snapshotPath(kbRoot, proposal.id))
      ? readFileSync(snapshotPath(kbRoot, proposal.id), 'utf8')
      : null;
    const problems = verifyProposal(proposal, snap, proposal.id);
    for (const p of problems) console.log(`${p.severity}: [${p.code}] ${p.message}`);
    const errors = problems.filter((p) => p.severity === 'error');
    console.log(
      errors.length === 0
        ? `ok: ${proposal.id} quote verified${snap !== null ? ` against the snapshot of ${splitSnapshot(snap).url}` : ''}`
        : `FAILED: ${errors.length} error(s)`,
    );
    return errors.length === 0 ? 0 : 1;
  }
  console.error('usage: kb-propose <snapshot|draft|verify> ...');
  return 2;
}

main().then(
  (code) => process.exit(code),
  (e: unknown) => {
    console.error(`kb-propose: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  },
);
