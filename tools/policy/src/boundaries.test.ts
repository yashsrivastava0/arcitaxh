// Regression tests for .dependency-cruiser.cjs. They build a throwaway mini-repo with one deliberate violation per rule,
// run the repository's real rule set over it, and assert that each rule fires on the right file. A weakened or deleted
// rule therefore fails CI instead of silently permitting a bad import.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cruise, type ICruiseOptions, type ICruiseResult } from 'dependency-cruiser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const config = createRequire(import.meta.url)(join(repoRoot, '.dependency-cruiser.cjs')) as {
  forbidden: NonNullable<ICruiseOptions['ruleSet']>['forbidden'];
  options: ICruiseOptions;
};

let tmp: string;
const write = (rel: string, content: string): void => {
  const full = join(tmp, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
};
const stubPackage = (name: string, files: string[] = ['index.js']): void => {
  write(`node_modules/${name}/package.json`, JSON.stringify({ name, version: '1.0.0', main: files[0] }));
  for (const f of files) write(`node_modules/${name}/${f}`, 'module.exports = {};\n');
};

let violations: { from: string; to: string; rule: string }[] = [];
const rulesFor = (from: string): string[] =>
  violations
    .filter((v) => v.from === from)
    .map((v) => v.rule)
    .sort();

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'depcruise-policy-'));
  write('tsconfig.base.json', '{ "compilerOptions": {} }\n');
  stubPackage('zod');
  stubPackage('left-pad');
  stubPackage('ai');
  stubPackage('@noble/hashes', ['sha2.js', 'sha3.js', 'utils.js']);
  write('config/data.json', '{}\n');

  // --- packages/core ---
  write(
    'packages/core/src/ok.ts',
    "import 'zod';\nimport '@noble/hashes/sha2.js';\nimport '@noble/hashes/utils.js';\nimport './util';\nexport {};\n",
  );
  write('packages/core/src/util.ts', 'export {};\n');
  write('packages/core/src/a-sibling.ts', "import '../../kb/src/x';\nexport {};\n");
  write('packages/core/src/b-builtin.ts', "import 'node:fs';\nexport {};\n");
  write('packages/core/src/c-npm.ts', "import 'left-pad';\nexport {};\n");
  write('packages/core/src/d-test-code.ts', "import './test/helper';\nexport {};\n");
  write('packages/core/src/test/helper.ts', 'export {};\n');
  write('packages/core/src/e-outside.ts', "import '../../../config/data.json';\nexport {};\n");
  write('packages/core/src/f-noble.ts', "import '@noble/hashes/sha3.js';\nexport {};\n");
  write(
    'packages/core/src/h-test-file-ok.test.ts',
    "import 'left-pad';\nimport '../../../config/data.json';\nexport {};\n",
  );
  // --- other packages and apps ---
  write('packages/kb/src/x.ts', 'export {};\n');
  write('packages/kb/src/to-tools.ts', "import '../../../tools/y/src/z';\nexport {};\n");
  write('packages/kb/src/to-llm.ts', "import '../../llm/src/l';\nexport {};\n");
  write('packages/kb/src/unresolved.ts', "import './does-not-exist';\nexport {};\n");
  write('packages/kb/src/c1.ts', "import './c2';\nexport {};\n");
  write('packages/kb/src/c2.ts', "import './c1';\nexport {};\n");
  write('packages/llm/src/l.ts', "import 'ai';\nexport {};\n");
  write('packages/llm/src/adapters/ok.ts', "import 'ai';\nexport {};\n");
  write('packages/db/src/to-kb.ts', "import '../../kb/src/x';\nexport {};\n");
  write('apps/web/src/web.ts', "import '../../../packages/kb/src/x';\nimport 'node:path';\nexport {};\n");
  write('apps/web/src/ok.ts', "import '../../../packages/core/src/util';\nexport {};\n");
  write('apps/api/src/api.ts', "import '../../web/src/ok';\nexport {};\n");
  write('tools/y/src/z.ts', "import '../../../packages/core/src/util';\nexport {};\n");

  const { forbidden, options } = config;
  const result = await cruise(['packages', 'apps', 'tools'], {
    ...options,
    ruleSet: { forbidden: forbidden ?? [] },
    validate: true,
    baseDir: tmp,
    outputType: 'json',
  });
  const out = (typeof result.output === 'string' ? JSON.parse(result.output) : result.output) as ICruiseResult;
  violations = out.summary.violations.map((v) => ({ from: v.from, to: v.to, rule: v.rule.name }));
}, 60_000);

afterAll(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe('dependency-cruiser rules fire on deliberate violations', () => {
  it('a clean production core file (zod, the two noble entry points, a local file) has no violation', () => {
    expect(rulesFor('packages/core/src/ok.ts')).toEqual([]);
  });

  it('core importing a sibling package, a Node built-in, an unlisted npm package, test code, an outside file, or another noble entry point', () => {
    expect(rulesFor('packages/core/src/a-sibling.ts')).toContain('core-imports-nothing-internal');
    expect(rulesFor('packages/core/src/a-sibling.ts')).toContain('core-no-imports-outside-the-package');
    expect(rulesFor('packages/core/src/b-builtin.ts')).toContain('core-no-node-builtins');
    expect(rulesFor('packages/core/src/c-npm.ts')).toContain('core-third-party-allow-list');
    expect(rulesFor('packages/core/src/d-test-code.ts')).toContain('core-no-test-code-in-production');
    expect(rulesFor('packages/core/src/e-outside.ts')).toContain('core-no-imports-outside-the-package');
    expect(rulesFor('packages/core/src/f-noble.ts')).toContain('core-noble-entry-points');
  });

  it('core test files are exempt from the production-only rules', () => {
    expect(rulesFor('packages/core/src/h-test-file-ok.test.ts')).toEqual([]);
  });

  it('kb, llm, db, web and api respect their allowed directions', () => {
    expect(rulesFor('packages/kb/src/to-tools.ts')).toEqual(
      expect.arrayContaining(['kb-may-import-core-only', 'nothing-imports-tools']),
    );
    expect(rulesFor('packages/kb/src/to-llm.ts')).toContain('kb-may-import-core-only');
    expect(rulesFor('packages/db/src/to-kb.ts')).toContain('db-may-import-core-only');
    expect(rulesFor('apps/web/src/web.ts')).toEqual(
      expect.arrayContaining(['web-imports-core-only', 'web-no-server-only-modules']),
    );
    expect(rulesFor('apps/web/src/ok.ts')).toEqual([]);
    expect(rulesFor('apps/api/src/api.ts')).toContain('api-does-not-import-other-apps');
  });

  it('vendor SDKs are importable only in the llm adapters', () => {
    expect(rulesFor('packages/llm/src/l.ts')).toContain('vendor-sdks-only-in-llm-adapters');
    expect(rulesFor('packages/llm/src/adapters/ok.ts')).toEqual([]);
  });

  it('tools may import packages (and nothing flags them for it)', () => {
    expect(rulesFor('tools/y/src/z.ts')).toEqual([]);
  });

  it('unresolvable imports and circular dependencies are errors', () => {
    expect(rulesFor('packages/kb/src/unresolved.ts')).toContain('not-to-unresolvable');
    expect(violations.some((v) => v.rule === 'no-circular' && v.from.startsWith('packages/kb/src/c'))).toBe(true);
  });
});
