import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseBundle } from '@product/core';
import { findRepoRoot } from '@product/tool-kb-check';
import { afterEach, describe, expect, it } from 'vitest';
import { buildRelease, schemaFiles, staleSchemas } from './lib';

const root = findRepoRoot(import.meta.url);
const tmps: string[] = [];
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'kb-build-test-'));
  tmps.push(d);
  return d;
};
afterEach(() => {
  while (tmps.length > 0) rmSync(tmps.pop() as string, { recursive: true, force: true });
});

describe('kb:build', () => {
  it('builds a dev bundle from the real kb/ tree and the bundle validates', () => {
    const outDir = tmp();
    const r = buildRelease({ repoRoot: root, dev: true, today: '2026-10-20', outDir });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const onDisk = parseBundle(JSON.parse(readFileSync(r.path, 'utf8')));
    expect(onDisk.version).toBe('kb-dev');
    expect(onDisk.decisionTypes.map((d) => d.id)).toEqual(['vector-store']);
    expect(onDisk.records).toEqual([]); // no real record has been promoted yet
  });

  it('is deterministic: building twice gives byte-identical files', () => {
    const a = buildRelease({ repoRoot: root, dev: true, today: '2026-10-20', outDir: tmp() });
    const b = buildRelease({ repoRoot: root, dev: true, today: '2026-10-20', outDir: tmp() });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(readFileSync(a.path, 'utf8')).toBe(readFileSync(b.path, 'utf8'));
  });

  it('refuses to build a release from fixtures, wherever they are mentioned', () => {
    for (const kbRoot of [join(root, 'kb/fixtures'), join(root, 'kb', 'fixtures', 'records')]) {
      const r = buildRelease({ repoRoot: root, kbRoot, dev: true, today: '2026-10-20', outDir: tmp() });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/fixture data must never be bundled/);
    }
  });

  it('refuses a version that is not a release, or that has no changelog entry', () => {
    const msg = (version: string) => {
      const r = buildRelease({ repoRoot: root, version, today: '2026-10-20', outDir: tmp() });
      return r.ok ? 'built' : r.message;
    };
    expect(msg('latest')).toMatch(/not a release version/);
    expect(msg('kb-dev')).toMatch(/not a release version/);
    expect(msg('kb-2026.10')).toMatch(/not a release version/);
    expect(msg('kb-2026.10.1')).toMatch(/no "## kb-2026\.10\.1" heading/);
  });

  it('builds a release once the changelog has its entry, and stamps that version', () => {
    const kbRoot = join(tmp(), 'kb');
    cpSync(join(root, 'kb'), kbRoot, {
      recursive: true,
      filter: (src) => !/[\\/](fixtures|schema)([\\/]|$)/.test(src),
    });
    writeFileSync(join(kbRoot, 'CHANGELOG.md'), '# KB changelog\n\n## kb-2026.10.1\n\n- first release\n');
    const r = buildRelease({ repoRoot: root, kbRoot, version: 'kb-2026.10.1', today: '2026-10-20', outDir: tmp() });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bundle.version).toBe('kb-2026.10.1');
  });

  it('refuses to build while the release checks fail (never a bundle from a broken KB)', () => {
    const kbRoot = join(tmp(), 'kb');
    cpSync(join(root, 'kb'), kbRoot, {
      recursive: true,
      filter: (src) => !/[\\/](fixtures|schema)([\\/]|$)/.test(src),
    });
    mkdirSync(join(kbRoot, 'records/vector-store'), { recursive: true });
    writeFileSync(join(kbRoot, 'records/vector-store/broken.yaml'), 'id: [unclosed');
    const r = buildRelease({ repoRoot: root, kbRoot, dev: true, today: '2026-10-20', outDir: tmp() });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/refusing to build while the release checks fail/);
  });
});

describe('kb/schema is generated, never hand-edited', () => {
  it('the committed files equal what the Zod schemas generate', () => {
    expect(staleSchemas(root)).toEqual([]);
  });

  it('a hand edit or a missing file is reported', () => {
    const fake = tmp();
    mkdirSync(join(fake, 'kb/schema'), { recursive: true });
    for (const f of schemaFiles()) writeFileSync(join(fake, 'kb/schema', f.name), f.text);
    expect(staleSchemas(fake)).toEqual([]);
    writeFileSync(join(fake, 'kb/schema/record.schema.json'), '{ "hand": "edited" }\n');
    rmSync(join(fake, 'kb/schema/bundle.schema.json'));
    expect(staleSchemas(fake).sort()).toEqual(['bundle.schema.json', 'record.schema.json']);
  });

  it('the generated schemas are strict: unknown keys are rejected', () => {
    const record = schemaFiles().find((f) => f.name === 'record.schema.json');
    expect(record?.text).toContain('"additionalProperties": false');
  });
});
