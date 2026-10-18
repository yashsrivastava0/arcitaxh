import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FreshnessConfig } from '@product/core';
import { afterEach, describe, expect, it } from 'vitest';
import { findRepoRoot, loadFreshness } from './fs';
import { formatReport, formatSweep, runCheck } from './run';

const root = findRepoRoot(import.meta.url);
const FIXTURES = join(root, 'kb/fixtures');
const TODAY = '2026-10-20';
// The specification gives no TTL for option/tradeoff/flip/antipattern records; the fixtures assume 90 days (see
// kb/fixtures), so the release-mode tests supply that. The real config deliberately leaves them undefined.
const real = loadFreshness(root);
const withFixtureTtls: FreshnessConfig = {
  ...real,
  ttl_days: { ...real.ttl_days, option: 90, tradeoff: 90, flip: 90, antipattern: 90 },
};

const tmps: string[] = [];
afterEach(() => {
  while (tmps.length > 0) rmSync(tmps.pop() as string, { recursive: true, force: true });
});
function copyFixtures(): string {
  const dir = mkdtempSync(join(tmpdir(), 'kb-fixture-copy-'));
  tmps.push(dir);
  cpSync(FIXTURES, dir, { recursive: true });
  return dir;
}
const edit = (file: string, from: string, to: string): void => {
  const text = readFileSync(file, 'utf8');
  if (!text.includes(from)) throw new Error(`test setup: "${from}" not found in ${file}`);
  writeFileSync(file, text.replace(from, to));
};
const codes = (r: ReturnType<typeof runCheck>): string[] => [...new Set(r.errors.map((e) => e.code))].sort();
/** Release-mode run over a copy of the fixtures. Every record has a vendor.example source, so fake-source is expected. */
const release = (dir: string, today = TODAY) =>
  runCheck({ kbRoot: dir, mode: 'release', today, freshness: withFixtureTtls });

describe('the real kb/ tree', () => {
  it('passes the release checks today (structure only: a decision type and no records)', () => {
    const r = runCheck({ kbRoot: join(root, 'kb'), mode: 'release', today: TODAY, freshness: real });
    expect(r.errors).toEqual([]);
    expect(r.tree.records).toHaveLength(0);
    expect(r.warnings.map((w) => w.code)).toEqual(['no-options']);
  });
});

describe('the fixture KB', () => {
  it('passes in fixture mode: sound structure, 32 fake records, snapshots for every one', () => {
    const r = runCheck({ kbRoot: FIXTURES, mode: 'fixture', today: TODAY, freshness: real });
    expect(r.errors).toEqual([]);
    expect(r.tree.records).toHaveLength(32);
    expect(r.tree.decisionTypes.map((d) => d.def.id)).toEqual(['vector-store']);
  });

  it('is internally consistent: in release mode ONLY the fake-source guard objects (so a leak would be caught)', () => {
    const r = release(FIXTURES);
    expect(codes(r)).toEqual(['fake-source']);
    expect(r.errors).toHaveLength(32);
    expect(r.due).toEqual([]);
  });
});

describe('each release failure mode fails kb:check on real files', () => {
  it('placeholder value in a launch record', () => {
    const dir = copyFixtures();
    edit(
      join(dir, 'options/vector-store/option.managed-service-a.yaml'),
      'curator_note: FAKE FIXTURE record for tests. Not a fact about any product.',
      'curator_note: <which of two figures was chosen>',
    );
    expect(codes(release(dir))).toContain('placeholder');
  });

  it('quote that is not in the stored snapshot', () => {
    const dir = copyFixtures();
    edit(join(dir, 'snapshots/limit.managed-service-a.free-tier.2026-10.txt'), '50,000', '60,000');
    const r = release(dir);
    expect(codes(r)).toContain('quote-missing');
    expect(r.errors.find((e) => e.code === 'quote-missing')?.file).toBe(
      'records/vector-store/limit.managed-service-a.free-tier.2026-10.yaml',
    );
  });

  it('expired record for a launch decision type', () => {
    const r = release(copyFixtures(), '2027-05-01'); // after every record's valid_until
    expect(codes(r)).toContain('expired');
    expect(r.due.every((d) => d.state === 'expired')).toBe(true);
  });

  it('dangling reference: a subject that is not an option, and a missing deferral option', () => {
    const subject = copyFixtures();
    edit(
      join(subject, 'records/vector-store/cap.managed-service-a.hybrid-search.2026-10.yaml'),
      'subject: option.managed-service-a',
      'subject: option.ghost',
    );
    expect(codes(release(subject))).toContain('dangling-subject');
    const deferral = copyFixtures();
    edit(
      join(deferral, 'decision-types/vector-store.yaml'),
      'deferral_option: option.existing-db-extension',
      'deferral_option: option.ghost',
    );
    expect(codes(release(deferral))).toContain('dangling-deferral');
  });

  it('valid_until that is not last_verified plus the TTL for the type', () => {
    const dir = copyFixtures();
    edit(
      join(dir, 'records/vector-store/price.managed-service-a.standard.2026-10.yaml'),
      'valid_until: 2026-11-17',
      'valid_until: 2027-01-16',
    );
    expect(codes(release(dir))).toContain('wrong-valid-until');
  });

  it('a record type with no configured TTL (the real config leaves option/tradeoff/flip/antipattern undefined)', () => {
    const r = runCheck({ kbRoot: copyFixtures(), mode: 'release', today: TODAY, freshness: real });
    expect(r.errors.filter((e) => e.code === 'ttl-undefined').length).toBeGreaterThan(0);
  });
});

describe('reports', () => {
  it('lists records due within the window and shows the failure count', () => {
    const r = release(copyFixtures(), '2026-10-30'); // latency profiles are valid until 2026-11-01: 2 days left
    const text = formatReport(r, 'kb:check');
    expect(text).toContain('due for re-verification');
    expect(text).toContain('lat.managed-service-a.query.2026-10');
    expect(text).toContain('FAILED: 32 error(s)');
  });

  it('kb:sweep prints the review queue and says it changes nothing', () => {
    const r = release(copyFixtures(), '2026-10-30');
    const text = formatSweep(r, '2026-10-30');
    expect(text).toContain('this command changes nothing');
    expect(text).toContain('lat.self-hosted-c.query.2026-10');
    expect(formatSweep(release(copyFixtures()), TODAY)).toContain('nothing is due or expired');
  });
});
