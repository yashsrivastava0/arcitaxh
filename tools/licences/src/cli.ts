// pnpm licences:check
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLicences, parsePnpmLicences, parseRegister } from './lib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function pnpmLicences(extra: string[]): unknown {
  // One static command string (no user input): pnpm is a .cmd shim on Windows, so it needs a shell.
  const r = spawnSync(['pnpm', 'licenses', 'list', '-r', '--json', ...extra].join(' '), {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    console.error(`pnpm licenses list failed (exit ${r.status}): ${r.stderr}`);
    process.exit(2);
  }
  return JSON.parse(r.stdout) as unknown;
}

function workspaceManifests(): string[] {
  const out = [join(root, 'package.json')];
  for (const dir of ['packages', 'apps', 'tools']) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs)) {
      const p = join(abs, name, 'package.json');
      if (existsSync(p)) out.push(p);
    }
  }
  return out;
}

const direct = new Set<string>();
for (const file of workspaceManifests()) {
  const pkg = JSON.parse(readFileSync(file, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  for (const name of [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]) {
    if (!name.startsWith('@product/')) direct.add(name);
  }
}

const problems = checkLicences({
  production: parsePnpmLicences(pnpmLicences(['--prod'])),
  all: parsePnpmLicences(pnpmLicences([])),
  directDependencies: [...direct],
  register: parseRegister(readFileSync(join(root, 'docs/03-specs/licence-register.md'), 'utf8')),
});

if (problems.length > 0) {
  console.error(`licences: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  ${p.severity.toUpperCase()}: ${p.message}`);
  process.exit(1);
}
console.log(
  `licences:check ok (${direct.size} direct dependencies registered; production dependencies on the allow-list)`,
);
