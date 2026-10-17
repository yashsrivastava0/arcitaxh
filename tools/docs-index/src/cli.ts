// pnpm docs:check  -> validate frontmatter and links, fail if INDEX.md is out of date
// pnpm docs:index  -> validate, then regenerate docs/INDEX.md
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDocs, indexIsCurrent, loadDocsInput } from './lib';

const mode = process.argv.includes('--write') ? 'write' : 'check';
const here = dirname(fileURLToPath(import.meta.url));
const docsDir = resolve(here, '../../../docs').replace(/\\/g, '/');

const result = checkDocs(loadDocsInput(docsDir));

if (result.problems.length > 0) {
  console.error(`docs: ${result.problems.length} problem(s)`);
  for (const p of result.problems) console.error(`  docs/${p.file}: ${p.message}`);
  process.exit(1);
}

if (mode === 'write') {
  writeFileSync(`${docsDir}/INDEX.md`, result.index, 'utf8');
  console.log(
    `docs:index wrote docs/INDEX.md (${result.docs.length} documents, ${result.sources.length} source files)`,
  );
} else if (!indexIsCurrent(docsDir, result.index)) {
  console.error('docs: INDEX.md is out of date. Run `pnpm docs:index` and commit the result.');
  process.exit(1);
} else {
  console.log(`docs:check ok (${result.docs.length} documents, ${result.sources.length} source files)`);
}
