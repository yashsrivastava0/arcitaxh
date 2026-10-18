// pnpm kb:build (--version kb-YYYY.MM.N | --dev) [--today YYYY-MM-DD] [--out DIR]
// pnpm kb:schema [--check]
import { isRealDate } from '@product/core';
import { findRepoRoot, todayUtc } from '@product/tool-kb-check';
import { buildRelease, staleSchemas, writeSchemas } from './lib';

const [command, ...args] = process.argv.slice(2);
const repoRoot = findRepoRoot(import.meta.url);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

if (command === 'build') {
  const today = flag('--today') ?? todayUtc();
  if (!isRealDate(today)) {
    console.error(`--today must be a real YYYY-MM-DD date (got "${today}")`);
    process.exit(2);
  }
  const version = flag('--version');
  const dev = args.includes('--dev');
  if (!dev && version === undefined) {
    console.error('usage: kb:build (--version kb-YYYY.MM.N | --dev) [--today YYYY-MM-DD] [--out DIR]');
    process.exit(2);
  }
  const outDir = flag('--out');
  const result = buildRelease({
    repoRoot,
    today,
    dev,
    ...(version !== undefined ? { version } : {}),
    ...(outDir !== undefined ? { outDir } : {}),
  });
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log(
    `kb:build wrote ${result.path} (${result.bundle.version}: ${result.bundle.decisionTypes.length} decision type(s), ${result.bundle.records.length} record(s))`,
  );
} else if (command === 'schema') {
  if (args.includes('--check')) {
    const stale = staleSchemas(repoRoot);
    if (stale.length > 0) {
      console.error(
        `kb/schema is out of date or hand-edited: ${stale.join(', ')}. Run \`pnpm kb:schema\` and commit the result.`,
      );
      process.exit(1);
    }
    console.log('kb:schema ok');
  } else {
    console.log(`kb:schema wrote ${writeSchemas(repoRoot).join(', ')}`);
  }
} else {
  console.error('usage: kb-build <build ... | schema [--check]>');
  process.exit(2);
}
