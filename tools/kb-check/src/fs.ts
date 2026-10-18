// File-system layer for the KB tools. Tools may do I/O; packages/kb stays pure and receives the files as data.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { freshnessConfigSchema, type FreshnessConfig } from '@product/core';
import type { SourceFile } from '@product/kb';

/** The only folders of a KB tree that are read. kb/fixtures and kb/schema are deliberately not among them. */
export const KB_DIRS = ['decision-types', 'options', 'records', 'proposals', 'snapshots'] as const;

/** The repository root: the nearest ancestor of `fromUrl` that holds pnpm-workspace.yaml. */
export function findRepoRoot(fromUrl: string): string {
  let dir = dirname(fileURLToPath(fromUrl));
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error('could not find the repository root (pnpm-workspace.yaml)');
    dir = parent;
  }
}

/** Reads a KB tree (kb/ or kb/fixtures/) into SourceFile objects with forward-slash paths relative to `kbRoot`. */
export function readKbFiles(kbRoot: string): SourceFile[] {
  const out: SourceFile[] = [];
  const walk = (abs: string, rel: string): void => {
    for (const name of readdirSync(abs).sort()) {
      const a = join(abs, name);
      const r = `${rel}/${name}`;
      if (statSync(a).isDirectory()) walk(a, r);
      else out.push({ path: r, content: readFileSync(a, 'utf8') });
    }
  };
  for (const dir of KB_DIRS) {
    const abs = join(kbRoot, dir);
    if (existsSync(abs)) walk(abs, dir);
  }
  return out;
}

export function loadFreshness(repoRoot: string): FreshnessConfig {
  const raw: unknown = JSON.parse(readFileSync(join(repoRoot, 'config/defaults/freshness.json'), 'utf8'));
  return freshnessConfigSchema.parse(raw);
}

/** Today's UTC date. Tools may read the clock; packages/core may not. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True when a path is (inside) a fixtures folder. Fixture data must never be built into a release. */
export function isFixturePath(p: string): boolean {
  return /(^|[\\/])fixtures([\\/]|$)/.test(resolve(p));
}
