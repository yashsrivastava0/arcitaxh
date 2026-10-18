// Regression tests for the lint rules that enforce hard rule 3 (core performs no I/O) and the dependency directions
// (brief 4.3). They run the repository's real eslint.config.js against probe snippets, so a weakened rule fails CI.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
let eslint: ESLint;

// ESLint loads the whole config and the TypeScript parser on first use. When the full suite runs in parallel on a
// small machine that can take longer than Vitest's 5 s default, so warm it up once with a generous hook timeout.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 120_000 });

beforeAll(async () => {
  eslint = new ESLint({ cwd: root });
  await eslint.lintText('export {};', { filePath: join(root, 'packages/core/src/warmup.ts') });
});

async function ruleIds(relPath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: join(root, relPath) });
  return (result?.messages ?? []).map((m) => m.ruleId ?? `fatal:${m.message}`);
}

const CORE = 'packages/core/src/probe.ts';

describe('packages/core is pure (hard rule 3)', () => {
  it.each([
    ["import fs from 'node:fs'; export default fs;", 'no-restricted-imports'],
    ["import { readFileSync } from 'fs'; export default readFileSync;", 'no-restricted-imports'],
    ["import http from 'http'; export default http;", 'no-restricted-imports'],
    ["import https from 'node:https'; export default https;", 'no-restricted-imports'],
    ["import net from 'net'; export default net;", 'no-restricted-imports'],
    ["import { createHash } from 'crypto'; export default createHash;", 'no-restricted-imports'],
    ["import cp from 'child_process'; export default cp;", 'no-restricted-imports'],
    ['export const t = Date.now();', 'no-restricted-properties'],
    ['export const r = Math.random();', 'no-restricted-properties'],
    ['export const p = performance.now();', 'no-restricted-globals'],
    ['export const d = new Date();', 'no-restricted-syntax'],
    ['export const d = Date();', 'no-restricted-syntax'],
    ['export const s = new Date().toLocaleString();', 'no-restricted-syntax'],
    ['export const e = process.env.SECRET;', 'no-restricted-globals'],
    ["export const f = () => fetch('https://x.example');", 'no-restricted-globals'],
    ['export const u = () => crypto.randomUUID();', 'no-restricted-globals'],
    ['export const w = () => setTimeout(() => 1, 5);', 'no-restricted-globals'],
    ['export const l = () => console.log(1);', 'no-restricted-globals'],
    ['export const f = Intl.DateTimeFormat;', 'no-restricted-globals'],
  ])('forbids: %s', async (code, rule) => {
    expect(await ruleIds(CORE, code)).toContain(rule);
  });

  it.each([
    "import type { X } from '@product/kb'; export type Y = X;",
    "import { y } from '@product/llm'; export default y;",
    "import { y } from '@product/db'; export default y;",
    "import { y } from '@product/api'; export default y;",
    "import { y } from '@product/tool-licences'; export default y;",
    "import { generateText } from 'ai'; export default generateText;",
    "import { Hono } from 'hono'; export default Hono;",
    "import { drizzle } from 'drizzle-orm'; export default drizzle;",
  ])('forbids importing outside the allowed set: %s', async (code) => {
    expect(await ruleIds(CORE, code)).toContain('no-restricted-imports');
  });

  it('allows what core is meant to use: zod, pure date arithmetic with explicit arguments, parsing a given string', async () => {
    const ok = [
      "import { z } from 'zod'; export const s = z.string();",
      'export const ms = new Date(Date.UTC(2026, 9, 18)).toISOString();',
      "export const parsed = new Date('2026-10-18T00:00:00Z').toISOString();",
      "import { sha256 } from '@noble/hashes/sha2.js'; export default sha256;",
    ];
    for (const code of ok) expect(await ruleIds(CORE, code), code).toEqual([]);
  });

  it('does not apply the purity rules to core test files and helpers', async () => {
    const code = "import fs from 'node:fs'; export const t = Date.now() + Math.random(); export default fs;";
    expect(await ruleIds('packages/core/src/probe.test.ts', code)).not.toContain('no-restricted-properties');
    expect(await ruleIds('packages/core/src/test/probe.ts', code)).not.toContain('no-restricted-imports');
  });
});

describe('dependency directions (brief 4.3)', () => {
  it('llm may not import db, api, web or worker; the AI SDK is allowed only in adapters', async () => {
    expect(await ruleIds('packages/llm/src/probe.ts', "import x from '@product/db'; export default x;")).toContain(
      'no-restricted-imports',
    );
    expect(
      await ruleIds('packages/llm/src/probe.ts', "import { generateText } from 'ai'; export default generateText;"),
    ).toContain('no-restricted-imports');
    expect(
      await ruleIds(
        'packages/llm/src/probe.ts',
        "import { createOpenRouter } from '@openrouter/ai-sdk-provider'; export default createOpenRouter;",
      ),
    ).toContain('no-restricted-imports');
    expect(
      await ruleIds(
        'packages/llm/src/adapters/probe.ts',
        "import { generateText } from 'ai'; export default generateText;",
      ),
    ).toEqual([]);
    expect(
      await ruleIds(
        'packages/llm/src/probe.ts',
        "import x from '@product/core'; import y from '@product/kb'; export default [x, y];",
      ),
    ).toEqual([]);
  });

  it('kb may import core only; db may import core only', async () => {
    expect(await ruleIds('packages/kb/src/probe.ts', "import x from '@product/llm'; export default x;")).toContain(
      'no-restricted-imports',
    );
    expect(await ruleIds('packages/db/src/probe.ts', "import x from '@product/kb'; export default x;")).toContain(
      'no-restricted-imports',
    );
    expect(await ruleIds('packages/db/src/probe.ts', "import x from '@product/llm'; export default x;")).toContain(
      'no-restricted-imports',
    );
    expect(await ruleIds('packages/db/src/probe.ts', "import x from '@product/core'; export default x;")).toEqual([]);
  });

  it('web imports core only and never server-only modules or provider SDKs', async () => {
    for (const bad of ['@product/kb', '@product/llm', '@product/db', 'node:fs', 'fs', 'ai', 'drizzle-orm', 'hono']) {
      expect(await ruleIds('apps/web/src/probe.ts', `import x from '${bad}'; export default x;`), bad).toContain(
        'no-restricted-imports',
      );
    }
    expect(await ruleIds('apps/web/src/probe.ts', "import x from '@product/core'; export default x;")).toEqual([]);
  });

  it('nothing in packages or apps imports tools', async () => {
    expect(
      await ruleIds('apps/api/src/probe.ts', "import x from '@product/tool-licences'; export default x;"),
    ).toContain('no-restricted-imports');
    expect(
      await ruleIds('packages/kb/src/probe.ts', "import x from '@product/tool-notices'; export default x;"),
    ).toContain('no-restricted-imports');
  });
});

// Hardening found by an independent review of the enforcement itself (M2): each of these was a way to get impure code
// past the first version of the rules.
describe('packages/core purity: bypass attempts are caught', () => {
  it.each([
    ["import { readFile } from 'fs/promises'; export default readFile;", 'no-restricted-imports'],
    ["import { posix } from 'path/posix'; export default posix;", 'no-restricted-imports'],
    ["import { AsyncLocalStorage } from 'async_hooks'; export default AsyncLocalStorage;", 'no-restricted-imports'],
    ["import v8 from 'v8'; export default v8;", 'no-restricted-imports'],
    ["import { createRequire } from 'module'; export default createRequire;", 'no-restricted-imports'],
    ["import { randomBytes } from '@noble/hashes/utils.js'; export default randomBytes;", 'no-restricted-imports'],
    ["import { sha3_256 } from '@noble/hashes/sha3.js'; export default sha3_256;", 'no-restricted-imports'],
    ["import { randomBytes } from '@noble/hashes/crypto.js'; export default randomBytes;", 'no-restricted-imports'],
    ["import * as noble from '@noble/hashes'; export default noble;", 'no-restricted-imports'],
    ['export const load = () => import("node:fs");', 'no-restricted-syntax'],
    ['const D = Date; export const t = new D();', 'no-restricted-syntax'],
    ['let D: DateConstructor; D = Date; export default D;', 'no-restricted-syntax'],
    ['export const t = new Date(...[]);', 'no-restricted-syntax'],
    ['const { random } = Math; export default random;', 'no-restricted-syntax'],
    ['export const cmp = (a: string, b: string) => a.localeCompare(b);', 'no-restricted-syntax'],
    ['export const c = new Intl.Collator();', 'no-restricted-globals'],
    ['export const g = globalThis;', 'no-restricted-globals'],
    ['export const p = global.process;', 'no-restricted-globals'],
    ['export const s = self;', 'no-restricted-globals'],
    ['export const w = window;', 'no-restricted-globals'],
    ['export const q = () => queueMicrotask(() => 1);', 'no-restricted-globals'],
    ['export const e = () => eval("1");', 'no-eval'],
    ['export const f = new Function("return 1");', 'no-new-func'],
  ])('forbids: %s', async (code, rule) => {
    expect(await ruleIds(CORE, code)).toContain(rule);
  });

  it('applies to every source extension, not just .ts', async () => {
    const code = 'export const t = Date.now();';
    for (const file of ['probe.js', 'probe.mjs', 'probe.cjs', 'probe.mts', 'probe.tsx']) {
      expect(await ruleIds(`packages/core/src/${file}`, code), file).toContain('no-restricted-properties');
    }
  });

  it('still allows the pure helpers core actually uses', async () => {
    const ok = [
      "import { sha256 } from '@noble/hashes/sha2.js'; export default sha256;",
      "import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'; export default [bytesToHex, utf8ToBytes];",
      'export const ms = new Date(Date.UTC(2026, 9, 18)).getTime();',
      'export const sorted = ["b", "a"].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));',
    ];
    for (const code of ok) expect(await ruleIds(CORE, code), code).toEqual([]);
  });
});

describe('packages/core contains only plain TypeScript source', () => {
  it('has no .js, .tsx, .mts or .json file in production source (the lint and tsc globs are *.ts)', async () => {
    const { readdirSync, statSync } = await import('node:fs');
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        return statSync(full).isDirectory() ? walk(full) : [full];
      });
    const stray = walk(join(root, 'packages/core/src')).filter((f) => !f.endsWith('.ts'));
    expect(stray).toEqual([]);
  });
});
