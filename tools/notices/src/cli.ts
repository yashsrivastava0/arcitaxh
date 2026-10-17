// pnpm notices        -> write THIRD_PARTY_NOTICES.md
// pnpm notices:check  -> fail if it is out of date
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNotices, type NoticePackage } from './lib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const check = process.argv.includes('--check');

// Only what is shipped: production dependencies of packages/* and apps/* (tools/ are never distributed).
// One static command string (no user input): pnpm is a .cmd shim on Windows, so it needs a shell.
const r = spawnSync('pnpm licenses list -r --prod --json --filter "./packages/*" --filter "./apps/*"', {
  cwd: root,
  encoding: 'utf8',
  shell: true,
  maxBuffer: 64 * 1024 * 1024,
});
if (r.status !== 0) {
  console.error(`pnpm licenses list failed (exit ${r.status}): ${r.stderr}`);
  process.exit(2);
}

type Entry = { name: string; versions: string[]; paths: string[]; license: string; homepage?: string };
const grouped = JSON.parse(r.stdout) as Record<string, Entry[]>;

function readFirst(dir: string, re: RegExp): string | null {
  if (!existsSync(dir)) return null;
  const file = readdirSync(dir).find((f) => re.test(f));
  return file ? readFileSync(join(dir, file), 'utf8') : null;
}

const packages: NoticePackage[] = [];
for (const entries of Object.values(grouped)) {
  for (const e of entries) {
    e.versions.forEach((version, i) => {
      const dir = e.paths[i] ?? e.paths[0] ?? '';
      packages.push({
        name: e.name,
        version,
        license: e.license,
        homepage: e.homepage ?? null,
        licenseText: readFirst(dir, /^(licen[cs]e|copying)(\.(md|txt))?$/i),
        noticeText: readFirst(dir, /^notice(\.(md|txt))?$/i),
      });
    });
  }
}

const generated = buildNotices(packages);
const file = join(root, 'THIRD_PARTY_NOTICES.md');
if (check) {
  const current = existsSync(file) ? readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
  if (current !== generated) {
    console.error('THIRD_PARTY_NOTICES.md is out of date. Run `pnpm notices` and commit the result.');
    process.exit(1);
  }
  console.log(`notices:check ok (${packages.length} shipped package(s))`);
} else {
  writeFileSync(file, generated, 'utf8');
  console.log(`notices wrote THIRD_PARTY_NOTICES.md (${packages.length} shipped package(s))`);
}
