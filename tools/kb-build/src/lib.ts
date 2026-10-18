import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { kbJsonSchemas, KB_VERSION_PATTERN, type KbBundle } from '@product/core';
import { buildBundle } from '@product/kb';
import { formatReport, isFixturePath, loadFreshness, runCheck, todayUtc } from '@product/tool-kb-check';

export interface BuildOptions {
  repoRoot: string;
  /** Defaults to <repoRoot>/kb. A path inside a fixtures folder is refused. */
  kbRoot?: string;
  /** A release version such as kb-2026.10.1; ignored when `dev` is true. */
  version?: string;
  /** Build a local, non-releasable bundle named kb-dev. */
  dev?: boolean;
  today: string;
  outDir?: string;
}

export type BuildResult = { ok: true; bundle: KbBundle; path: string } | { ok: false; message: string };

function gitCommit(cwd: string): string | null {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' });
  const sha = r.status === 0 ? r.stdout.trim() : '';
  return /^[0-9a-f]{7,64}$/.test(sha) ? sha : null;
}

export function buildRelease(opts: BuildOptions): BuildResult {
  const kbRoot = opts.kbRoot ?? join(opts.repoRoot, 'kb');
  if (isFixturePath(kbRoot)) {
    return { ok: false, message: `refusing to build a release from ${kbRoot}: fixture data must never be bundled` };
  }

  const version = opts.dev === true ? 'kb-dev' : (opts.version ?? '');
  if (opts.dev !== true) {
    if (version === 'kb-dev' || !KB_VERSION_PATTERN.test(version)) {
      return {
        ok: false,
        message: `"${version}" is not a release version (expected kb-YYYY.MM.N, for example kb-2026.10.1). Use --dev for a local bundle.`,
      };
    }
    const changelog = existsSync(join(kbRoot, 'CHANGELOG.md'))
      ? readFileSync(join(kbRoot, 'CHANGELOG.md'), 'utf8')
      : '';
    if (!new RegExp(`^##\\s+${version.replace(/\./g, '\\.')}\\b`, 'm').test(changelog)) {
      return { ok: false, message: `kb/CHANGELOG.md has no "## ${version}" heading: write the release entry first` };
    }
  }

  const report = runCheck({ kbRoot, mode: 'release', today: opts.today, freshness: loadFreshness(opts.repoRoot) });
  if (report.errors.length > 0) {
    return {
      ok: false,
      message: `${formatReport(report, 'kb:check')}\nrefusing to build while the release checks fail`,
    };
  }

  const bundle = buildBundle(report.tree, { version, commit: gitCommit(opts.repoRoot) });
  const path = join(opts.outDir ?? join(opts.repoRoot, 'dist/kb'), `${version}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
  return { ok: true, bundle, path };
}

// ---- kb/schema/*.json: generated from the Zod schemas, never hand-edited ----

export function schemaFiles(): { name: string; text: string }[] {
  return Object.entries(kbJsonSchemas())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([name, schema]) => ({ name, text: `${JSON.stringify(schema, null, 2)}\n` }));
}

export function writeSchemas(repoRoot: string): string[] {
  const dir = join(repoRoot, 'kb/schema');
  mkdirSync(dir, { recursive: true });
  return schemaFiles().map((f) => {
    writeFileSync(join(dir, f.name), f.text, 'utf8');
    return f.name;
  });
}

/** Names of schema files that are missing or differ from what the Zod schemas generate (a hand edit, or stale). */
export function staleSchemas(repoRoot: string): string[] {
  return schemaFiles()
    .filter((f) => {
      const p = join(repoRoot, 'kb/schema', f.name);
      return !existsSync(p) || readFileSync(p, 'utf8').replace(/\r\n/g, '\n') !== f.text;
    })
    .map((f) => f.name);
}

// ---- packages/core/src/test/fixture-bundle.json: the fake fixture KB as a bundle, for tests that cannot read files ----

export const FIXTURE_BUNDLE_PATH = 'packages/core/src/test/fixture-bundle.json';

/**
 * The fixture KB (kb/fixtures) as a bundle. It is for tests only: it is never written under dist/, never named like a
 * release, and carries no commit so it is byte-stable. Throws if the fixture KB does not pass its structural checks.
 */
export function fixtureBundleText(repoRoot: string): string {
  const report = runCheck({
    kbRoot: join(repoRoot, 'kb/fixtures'),
    mode: 'fixture',
    today: todayUtc(),
    freshness: loadFreshness(repoRoot),
  });
  if (report.errors.length > 0) throw new Error('the fixture KB is invalid:\n' + formatReport(report, 'kb:check'));
  return JSON.stringify(buildBundle(report.tree, { version: 'kb-dev', commit: null }), null, 2) + '\n';
}

export function writeFixtureBundle(repoRoot: string): string {
  const path = join(repoRoot, FIXTURE_BUNDLE_PATH);
  writeFileSync(path, fixtureBundleText(repoRoot), 'utf8');
  return FIXTURE_BUNDLE_PATH;
}

export function staleFixtureBundle(repoRoot: string): boolean {
  const path = join(repoRoot, FIXTURE_BUNDLE_PATH);
  return !existsSync(path) || readFileSync(path, 'utf8').replace(/\r\n/g, '\n') !== fixtureBundleText(repoRoot);
}
