// pnpm secrets:scan -> scan tracked files (git ls-files). Prints file:line and the pattern id, never the secret.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanText, type SecretFinding } from './lib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const r = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (r.status !== 0) {
  console.error(`git ls-files failed: ${r.stderr}`);
  process.exit(2);
}

const findings: SecretFinding[] = [];
let scanned = 0;
for (const file of r.stdout.split('\0').filter((f) => f !== '')) {
  let text: string;
  try {
    text = readFileSync(join(root, file), 'utf8');
  } catch {
    continue; // deleted or unreadable
  }
  scanned += 1;
  findings.push(...scanText(file, text));
}

if (findings.length > 0) {
  console.error(`secrets:scan: ${findings.length} secret-looking string(s) found`);
  for (const f of findings) console.error(`  ${f.file}:${f.line} (${f.pattern})`);
  process.exit(1);
}
console.log(`secrets:scan ok (${scanned} files)`);
