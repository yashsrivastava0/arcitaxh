import { addDays, type FreshnessConfig } from '@product/core';
import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import freshnessJson from '../../../config/defaults/freshness.json';
import { checkKb, findPlaceholders, isFakeSourceUrl, verifyProposal } from './checks';
import { formatSnapshot, parseKbSource, splitSnapshot, type SourceFile } from './parse';

// Everything here is fake test data. `.test` hosts are reserved and never real vendors.
const TODAY = '2026-10-20';
const VERIFIED = '2026-10-18';
// The specification gives no TTL for option/tradeoff/flip/antipattern records, so the tests supply their own.
const freshness = {
  ...freshnessJson,
  ttl_days: { ...freshnessJson.ttl_days, option: 90, tradeoff: 90, flip: 90, antipattern: 90 },
} as FreshnessConfig;

const URL_A = 'https://docs.alpha-db.test/pricing';
const QUOTE = 'The free plan includes 1,000 vectors per project.';
const PAGE = `Alpha pricing\n${QUOTE}\nPaid plans start at a monthly fee.`;

interface Rec {
  [k: string]: unknown;
}
const optionRec = (over: Rec = {}): Rec => ({
  id: 'option.alpha',
  type: 'option',
  decision_type: 'vector-store',
  subject: 'option.alpha',
  body: {
    name: 'Alpha',
    vendor: 'Alpha Co',
    categories: ['store'],
    platform: null,
    deployment: 'managed',
    regions: ['eu-1'],
    licence: null,
    status: 'generally_available',
    migration_effort: 'low',
    ops_burden: 'low',
    applies_when: [],
    why_pick: [],
    why_not: [],
  },
  source: { url: URL_A, quote: 'Alpha pricing', retrieved_on: VERIFIED },
  verification: { last_verified: VERIFIED, valid_until: addDays(VERIFIED, 90), verified_by: 'founder' },
  curator_note: '',
  ...over,
});
const limitRec = (over: Rec = {}): Rec => ({
  id: 'limit.alpha.free.2026-10',
  type: 'limit',
  decision_type: 'vector-store',
  subject: 'option.alpha',
  body: {
    scope: 'free_tier',
    metric: 'stored_vectors',
    value: 1000,
    unit: 'vectors',
    period: 'none',
    overage_behaviour: 'hard_stop',
    pauses_after_inactivity: false,
    scales_to_zero: false,
  },
  source: { url: URL_A, quote: QUOTE, retrieved_on: VERIFIED },
  verification: { last_verified: VERIFIED, valid_until: addDays(VERIFIED, 30), verified_by: 'founder' },
  curator_note: '',
  ...over,
});
const decisionType = (over: Rec = {}): Rec => ({
  id: 'vector-store',
  title: 'Vector store',
  summary: 'x',
  launch: true,
  palette_types: ['vector_store'],
  required_context: [{ field: 'usersNow', question: 'About how many users do you have now?' }],
  elimination: ['E-1'],
  design_rules: ['R-05'],
  deferral_option: null,
  applies_when: [],
  ...over,
});

const y = (path: string, obj: Rec): SourceFile => ({ path, content: stringify(obj) });
const snap = (id: string, url = URL_A, retrieved = VERIFIED, page = PAGE): SourceFile => ({
  path: `snapshots/${id}.txt`,
  content: formatSnapshot(url, retrieved, page),
});

function goodTree(): SourceFile[] {
  return [
    y('decision-types/vector-store.yaml', decisionType({ deferral_option: 'option.alpha' })),
    y('options/vector-store/alpha.yaml', optionRec()),
    snap('option.alpha'),
    y('records/vector-store/alpha.limit.free.yaml', limitRec()),
    snap('limit.alpha.free.2026-10'),
  ];
}

const run = (files: SourceFile[], over: Partial<{ mode: 'release' | 'fixture'; today: string }> = {}) => {
  const parsed = parseKbSource(files);
  const checked = checkKb(parsed.tree, { mode: over.mode ?? 'release', today: over.today ?? TODAY, freshness });
  return { parsed, ...checked, all: [...parsed.problems, ...checked.problems] };
};
const codes = (r: { all: { code: string; severity: string }[] }, severity = 'error') =>
  r.all
    .filter((p) => p.severity === severity)
    .map((p) => p.code)
    .sort();
const replace = (files: SourceFile[], path: string, content: string) =>
  files.map((f) => (f.path === path ? { path, content } : f));

describe('a sound KB passes the release checks', () => {
  it('has no problems and nothing due', () => {
    const r = run(goodTree());
    expect(r.all).toEqual([]);
    expect(r.due).toEqual([]);
    expect(r.parsed.tree.records).toHaveLength(2);
  });
});

describe('release failure modes (each blocks a release)', () => {
  it('rejects a placeholder value in a record of a launch decision type', () => {
    const files = replace(
      goodTree(),
      'records/vector-store/alpha.limit.free.yaml',
      stringify(limitRec({ curator_note: '<which of two figures was chosen>' })),
    );
    expect(codes(run(files))).toContain('placeholder');
    const founder = replace(
      goodTree(),
      'records/vector-store/alpha.limit.free.yaml',
      stringify(limitRec({ curator_note: '__FOUNDER_TO_SET__' })),
    );
    expect(codes(run(founder))).toContain('placeholder');
    const todo = replace(
      goodTree(),
      'records/vector-store/alpha.limit.free.yaml',
      stringify(limitRec({ curator_note: 'TODO check the page again' })),
    );
    expect(codes(run(todo))).toContain('placeholder');
  });

  it('does not apply the placeholder rule to a non-launch decision type', () => {
    const files = goodTree().map((f) =>
      f.path === 'decision-types/vector-store.yaml'
        ? y(f.path, decisionType({ launch: false, deferral_option: 'option.alpha' }))
        : f,
    );
    const withNote = replace(
      files,
      'records/vector-store/alpha.limit.free.yaml',
      stringify(limitRec({ curator_note: 'TODO later' })),
    );
    expect(codes(run(withNote))).not.toContain('placeholder');
  });

  it('rejects a quote that is not in the stored snapshot', () => {
    const files = replace(
      goodTree(),
      'snapshots/limit.alpha.free.2026-10.txt',
      formatSnapshot(URL_A, VERIFIED, 'The free plan includes 10,000 vectors per project.'),
    );
    expect(codes(run(files))).toContain('quote-missing');
  });

  it('rejects a record with no snapshot at all', () => {
    const files = goodTree().filter((f) => f.path !== 'snapshots/limit.alpha.free.2026-10.txt');
    expect(codes(run(files))).toContain('snapshot-missing');
  });

  it('rejects a snapshot of a different page than source.url', () => {
    const files = replace(
      goodTree(),
      'snapshots/limit.alpha.free.2026-10.txt',
      formatSnapshot('https://docs.other.test/pricing', VERIFIED, PAGE),
    );
    expect(codes(run(files))).toContain('snapshot-url-mismatch');
  });

  it('rejects an expired record of a launch decision type; only warns for a non-launch type', () => {
    const late = '2026-11-18'; // one day after valid_until 2026-11-17
    expect(codes(run(goodTree(), { today: late }))).toContain('expired');
    const nonLaunch = goodTree().map((f) =>
      f.path === 'decision-types/vector-store.yaml'
        ? y(f.path, decisionType({ launch: false, deferral_option: 'option.alpha' }))
        : f,
    );
    const r = run(nonLaunch, { today: late });
    expect(codes(r)).not.toContain('expired');
    expect(codes(r, 'warning')).toContain('expired');
  });

  it('rejects a dangling reference: a subject that is not an option, and a missing deferral option', () => {
    const subj = replace(
      goodTree(),
      'records/vector-store/alpha.limit.free.yaml',
      stringify(limitRec({ subject: 'option.ghost' })),
    );
    expect(codes(run(subj))).toContain('dangling-subject');
    const defer = goodTree().map((f) =>
      f.path === 'decision-types/vector-store.yaml' ? y(f.path, decisionType({ deferral_option: 'option.ghost' })) : f,
    );
    expect(codes(run(defer))).toContain('dangling-deferral');
  });

  it('rejects a valid_until that is not last_verified plus the TTL for the type', () => {
    const wrong = replace(
      goodTree(),
      'records/vector-store/alpha.limit.free.yaml',
      stringify(
        limitRec({
          verification: { last_verified: VERIFIED, valid_until: addDays(VERIFIED, 90), verified_by: 'founder' },
        }),
      ),
    );
    const r = run(wrong);
    expect(codes(r)).toContain('wrong-valid-until');
    expect(r.all.find((p) => p.code === 'wrong-valid-until')?.message).toContain(addDays(VERIFIED, 30));
  });

  it('refuses to guess a TTL for a type that has none configured', () => {
    const noTtl = { ...freshness, ttl_days: { ...freshnessJson.ttl_days } } as FreshnessConfig; // option has none
    const parsed = parseKbSource(goodTree());
    const r = checkKb(parsed.tree, { mode: 'release', today: TODAY, freshness: noTtl });
    expect(r.problems.filter((p) => p.code === 'ttl-undefined').map((p) => p.file)).toEqual([
      'options/vector-store/alpha.yaml',
    ]);
  });

  it('rejects fixture-looking sources in a real record, duplicate ids and files in the wrong place', () => {
    const fake = replace(
      goodTree(),
      'records/vector-store/alpha.limit.free.yaml',
      stringify(limitRec({ source: { url: 'https://vendor.example/pricing', quote: QUOTE, retrieved_on: VERIFIED } })),
    );
    expect(codes(run(fake))).toContain('fake-source');
    const dup = [...goodTree(), y('records/vector-store/copy.yaml', limitRec())];
    expect(codes(run(dup))).toContain('duplicate-id');
    const wrongFolder = goodTree().map((f) =>
      f.path === 'records/vector-store/alpha.limit.free.yaml'
        ? { ...f, path: 'records/database/alpha.limit.free.yaml' }
        : f,
    );
    expect(codes(run(wrongFolder))).toContain('wrong-folder');
    const wrongSection = [
      ...goodTree(),
      y('options/vector-store/misplaced.yaml', limitRec({ id: 'limit.misplaced.2026-10' })),
    ];
    expect(codes(run(wrongSection))).toContain('wrong-section');
  });

  it('rejects an unreadable or schema-invalid file with its path, never silently skipping it', () => {
    const bad = [
      ...goodTree(),
      { path: 'records/vector-store/broken.yaml', content: 'id: [unclosed' },
      y('records/vector-store/invalid.yaml', { id: 'x' }),
    ];
    const r = run(bad);
    expect(
      r.all
        .filter((p) => p.code === 'yaml' || p.code === 'schema')
        .map((p) => p.file)
        .sort(),
    ).toEqual(['records/vector-store/broken.yaml', 'records/vector-store/invalid.yaml']);
    expect(codes(run([...goodTree(), { path: 'records/vector-store/notes.docx', content: '' }]))).toContain(
      'unexpected-file',
    );
  });
});

describe('fixtures can never enter a release', () => {
  it('the loader refuses fixture files by default', () => {
    const files = [...goodTree(), y('fixtures/records/vector-store/fake.yaml', limitRec({ id: 'limit.fake.2026-10' }))];
    const parsed = parseKbSource(files);
    expect(parsed.problems.map((p) => p.code)).toEqual(['fixture-in-release']);
    expect(parsed.tree.records.map((r) => r.record.id)).not.toContain('limit.fake.2026-10');
  });

  it('only an explicit opt-in (used by tests of the fixture KB) loads them', () => {
    const files = [y('fixtures/decision-types/vector-store.yaml', decisionType())];
    expect(parseKbSource(files, { allowFixtures: true }).problems).toEqual([]);
  });

  it('fixture mode skips the freshness, snapshot and placeholder checks but keeps the structural ones', () => {
    const files = [
      y('decision-types/vector-store.yaml', decisionType()),
      y('options/vector-store/alpha.yaml', optionRec({ curator_note: 'TODO' })),
      y('records/vector-store/orphan.yaml', limitRec({ subject: 'option.ghost' })),
    ];
    const r = run(files, { mode: 'fixture', today: '2030-01-01' });
    expect(codes(r)).toEqual(['dangling-subject']);
  });
});

describe('the review queue (kb:sweep)', () => {
  it('lists records due within the window and expired ones, soonest first, and changes nothing', () => {
    const r = run(goodTree(), { today: '2026-11-12' }); // limit valid_until 2026-11-17: 5 days left
    expect(r.due.map((d) => [d.id, d.state])).toEqual([['limit.alpha.free.2026-10', 'due_soon']]);
    const later = run(goodTree(), { today: '2026-11-20' });
    expect(later.due.map((d) => [d.id, d.state])).toEqual([['limit.alpha.free.2026-10', 'expired']]);
  });
});

describe('verifyProposal (the quote-verification step for a future LLM proposal)', () => {
  const proposal = (over: Rec = {}) => {
    const p = {
      ...limitRec(),
      status: 'proposed',
      verification: { last_verified: null, valid_until: null, verified_by: null },
      ...over,
    };
    const parsed = parseKbSource([y('proposals/p.yaml', p)]);
    expect(parsed.problems).toEqual([]);
    return (parsed.tree.proposals[0] as { proposal: Parameters<typeof verifyProposal>[0] }).proposal;
  };
  const snapText = formatSnapshot(URL_A, VERIFIED, PAGE);

  it('accepts a proposal whose quote is in the snapshot and whose numbers are in the quote', () => {
    expect(verifyProposal(proposal(), snapText)).toEqual([]);
  });

  it('rejects a quote that is not in the page', () => {
    const p = proposal({
      source: { url: URL_A, quote: 'The free plan includes 5,000 vectors per project.', retrieved_on: VERIFIED },
    });
    expect(verifyProposal(p, snapText).map((x) => x.code)).toContain('quote-missing');
  });

  it('rejects a number that is not in the quote even when the quote itself is genuine', () => {
    const p = proposal({ body: { ...(limitRec().body as Rec), value: 2000 } });
    const out = verifyProposal(p, snapText);
    expect(out.map((x) => x.code)).toEqual(['number-not-in-quote']);
    expect(out[0]?.message).toContain('2000');
  });

  it('rejects a source URL that does not match the page that was snapshotted', () => {
    const p = proposal({ source: { url: 'https://docs.other.test/pricing', quote: QUOTE, retrieved_on: VERIFIED } });
    expect(verifyProposal(p, snapText).map((x) => x.code)).toContain('snapshot-url-mismatch');
  });

  it('rejects a proposal with no snapshot behind it', () => {
    expect(verifyProposal(proposal(), null).map((x) => x.code)).toEqual(['snapshot-missing']);
  });

  it('a proposal never counts as a record: it needs no TTL, no expiry and does not feed the bundle', () => {
    const r = run([
      y('decision-types/vector-store.yaml', decisionType()),
      y('proposals/p.yaml', {
        ...limitRec(),
        status: 'proposed',
        verification: { last_verified: null, valid_until: null, verified_by: null },
      }),
      snap('limit.alpha.free.2026-10'),
    ]);
    expect(r.parsed.tree.records).toHaveLength(0);
    expect(r.parsed.tree.proposals).toHaveLength(1);
    expect(codes(r)).not.toContain('expired');
  });
});

describe('helpers', () => {
  it('findPlaceholders reports where', () => {
    expect(findPlaceholders({ a: '<x>', b: { c: ['ok', 'TODO'] }, d: 'fine, 3 < 5 and 7 > 4' })).toEqual([
      'a',
      'b.c[1]',
    ]);
  });

  it('isFakeSourceUrl flags the .example family only', () => {
    for (const u of [
      'https://vendor.example/pricing',
      'https://docs.vendor.example/x',
      'https://example.com/x',
      'https://a.example.org/',
    ])
      expect(isFakeSourceUrl(u), u).toBe(true);
    for (const u of ['https://docs.alpha-db.test/pricing', 'https://examples.com/x', 'https://myexample.com/'])
      expect(isFakeSourceUrl(u), u).toBe(false);
  });

  it('splitSnapshot reads the header written by formatSnapshot', () => {
    expect(splitSnapshot(formatSnapshot(URL_A, VERIFIED, 'body text'))).toEqual({
      url: URL_A,
      retrieved: VERIFIED,
      body: 'body text',
    });
    expect(splitSnapshot('no header here')).toEqual({ url: null, retrieved: null, body: 'no header here' });
  });
});
