import type { FreshnessConfig, KbProposal, KbRecord } from '@product/core';
import { expectedValidUntil, freshnessState } from './freshness';
import { splitSnapshot, type KbTree, type ParsedRecord, type Problem, type ProblemCode } from './parse';
import { numbersInBody, numbersInText, quoteAppearsIn } from './text';

export interface CheckOptions {
  /**
   * `release`: the real kb/ tree. Every check applies; the strict ones (placeholders, expiry, fake sources) apply to
   * records of launch decision types. `fixture`: kb/fixtures/, which is exempt from the freshness, snapshot and
   * placeholder checks (the data is fake) but still has to be structurally sound.
   */
  mode: 'release' | 'fixture';
  /** Today as YYYY-MM-DD, from the Clock port. */
  today: string;
  freshness: FreshnessConfig;
}

export interface DueEntry {
  id: string;
  file: string;
  type: string;
  decisionType: string;
  validUntil: string;
  state: 'due_soon' | 'expired';
  launch: boolean;
}

export interface CheckResult {
  problems: Problem[];
  /** Records that are due within `due_soon_days`, or expired, for the review queue (pnpm kb:sweep). */
  due: DueEntry[];
}

const add = (out: Problem[], severity: 'error' | 'warning', code: ProblemCode, file: string, message: string): void => {
  out.push({ code, severity, file, message });
};

/** Placeholder text left in a record: "<...>", "__FOUNDER_TO_SET__", TODO, TBD, FIXME. */
export function findPlaceholders(value: unknown, path = ''): string[] {
  const hits: string[] = [];
  const walk = (v: unknown, p: string): void => {
    if (typeof v === 'string') {
      // Angle brackets hugging text: "<number copied from the source>". Prose like "3 < 5 and 7 > 4" is not flagged.
      if (/<\S(?:[^<>\n]*\S)?>/.test(v) || /__FOUNDER_TO_SET__/.test(v) || /\b(TODO|TBD|FIXME)\b/.test(v))
        hits.push(p || '(root)');
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v !== null && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k);
  };
  walk(value, path);
  return hits;
}

/** A source host that is obviously fake (vendor.example, example.com, ...): fixture data leaking into a real record. */
export function isFakeSourceUrl(url: string): boolean {
  // No URL global here: this package is pure and has no platform types.
  const host = /^[a-z][a-z0-9+.-]*:\/\/(?:[^/@?#]*@)?([^/:?#]+)/i.exec(url)?.[1]?.toLowerCase();
  if (host === undefined) return false;
  return host === 'example' || host.endsWith('.example') || /(^|\.)example\.(com|org|net)$/.test(host);
}

/**
 * Release checks (spec 8.4, brief 10.6). Every `error` blocks a release; `warning` does not. In `release` mode:
 * schema; no placeholders and no expired records for launch types; every quote appears in its stored snapshot
 * and the snapshot is of the same URL; valid_until equals last_verified plus the TTL of the record's type; every
 * reference resolves. It also lists records due within the review window.
 */
export function checkKb(tree: KbTree, opts: CheckOptions): CheckResult {
  const problems: Problem[] = [];
  const due: DueEntry[] = [];
  const strict = opts.mode === 'release';
  const launchTypes = new Set(tree.decisionTypes.filter((d) => d.def.launch).map((d) => d.def.id));
  const knownTypes = new Set(tree.decisionTypes.map((d) => d.def.id));

  // ---- structure: ids, decision types, references ----
  const seen = new Map<string, string>();
  const optionIds = new Map<string, Set<string>>(); // decision type -> option ids
  for (const r of tree.records) {
    const prev = seen.get(r.record.id);
    if (prev !== undefined)
      add(problems, 'error', 'duplicate-id', r.file, `record id "${r.record.id}" is already used in ${prev}`);
    else seen.set(r.record.id, r.file);
    if (!knownTypes.has(r.record.decision_type)) {
      add(
        problems,
        'error',
        'unknown-decision-type',
        r.file,
        `decision type "${r.record.decision_type}" has no kb/decision-types/ file`,
      );
    }
    if (r.record.type === 'option') {
      const set = optionIds.get(r.record.decision_type) ?? new Set<string>();
      set.add(r.record.id);
      optionIds.set(r.record.decision_type, set);
    }
  }
  for (const r of tree.records) {
    if (
      r.record.type !== 'option' &&
      r.record.subject.startsWith('option.') &&
      !optionIds.get(r.record.decision_type)?.has(r.record.subject)
    ) {
      add(
        problems,
        'error',
        'dangling-subject',
        r.file,
        `subject "${r.record.subject}" is not an option of ${r.record.decision_type}`,
      );
    }
  }
  for (const d of tree.decisionTypes) {
    if (d.def.deferral_option !== null && !optionIds.get(d.def.id)?.has(d.def.deferral_option)) {
      add(
        problems,
        'error',
        'dangling-deferral',
        d.file,
        `deferral option "${d.def.deferral_option}" is not an option record of ${d.def.id}`,
      );
    }
    if (strict && d.def.launch && (optionIds.get(d.def.id)?.size ?? 0) === 0) {
      add(
        problems,
        'warning',
        'no-options',
        d.file,
        `launch decision type ${d.def.id} has no option records yet (verdicts will be kb_gap)`,
      );
    }
  }

  // ---- per-record checks that need real data ----
  if (strict) {
    for (const r of tree.records) checkRealRecord(r, tree, opts, launchTypes, problems, due);
  }

  // ---- proposals ----
  const recordIds = new Set(tree.records.map((r) => r.record.id));
  for (const p of tree.proposals) {
    if (recordIds.has(p.proposal.id)) {
      add(
        problems,
        'warning',
        'proposal-shadows-record',
        p.file,
        `proposal "${p.proposal.id}" has the same id as a promoted record; remove it once promoted`,
      );
    }
    const snap = tree.snapshots.get(p.proposal.id);
    problems.push(...verifyProposal(p.proposal, snap ?? null, p.file));
  }

  due.sort((a, b) => (a.validUntil === b.validUntil ? (a.id < b.id ? -1 : 1) : a.validUntil < b.validUntil ? -1 : 1));
  return { problems, due };
}

function checkRealRecord(
  r: ParsedRecord,
  tree: KbTree,
  opts: CheckOptions,
  launchTypes: Set<string>,
  problems: Problem[],
  due: DueEntry[],
): void {
  const rec: KbRecord = r.record;
  const launch = launchTypes.has(rec.decision_type);

  // TTL: the type must have one, and valid_until must equal last_verified + TTL.
  const expected = expectedValidUntil(rec, opts.freshness);
  if (expected === null) {
    add(
      problems,
      'error',
      'ttl-undefined',
      r.file,
      `no freshness TTL is configured for ${rec.type} records (config/defaults/freshness.json); the specification gives none, so none is guessed`,
    );
  } else if (rec.verification.valid_until !== expected) {
    add(
      problems,
      'error',
      'wrong-valid-until',
      r.file,
      `valid_until is ${rec.verification.valid_until} but last_verified ${rec.verification.last_verified} plus the TTL gives ${expected}`,
    );
  }

  // Freshness, and the review queue.
  const state = freshnessState(rec.verification.valid_until, opts.today, opts.freshness);
  if (state !== 'fresh') {
    due.push({
      id: rec.id,
      file: r.file,
      type: rec.type,
      decisionType: rec.decision_type,
      validUntil: rec.verification.valid_until,
      state,
      launch,
    });
  }
  if (state === 'expired') {
    add(
      problems,
      launch ? 'error' : 'warning',
      'expired',
      r.file,
      `expired on ${rec.verification.valid_until} (today is ${opts.today}); re-verify it against the live source`,
    );
  }

  // Placeholders and fake sources: launch types only (anything else is not shown as a launch fact).
  if (launch) {
    const hits = findPlaceholders(rec);
    if (hits.length > 0) add(problems, 'error', 'placeholder', r.file, `placeholder text in: ${hits.join(', ')}`);
    if (isFakeSourceUrl(rec.source.url)) {
      add(
        problems,
        'error',
        'fake-source',
        r.file,
        `source URL ${rec.source.url} looks like fixture data; fixtures must never enter a release`,
      );
    }
  }

  // The quote must appear verbatim in the stored snapshot, and the snapshot must be of the same page.
  const snapText = tree.snapshots.get(rec.id);
  if (snapText === undefined) {
    add(
      problems,
      'error',
      'snapshot-missing',
      r.file,
      `no snapshot kb/snapshots/${rec.id}.txt to verify the quote against`,
    );
    return;
  }
  const snap = splitSnapshot(snapText);
  if (!quoteAppearsIn(rec.source.quote, snap.body)) {
    add(problems, 'error', 'quote-missing', r.file, 'source.quote does not appear verbatim in the stored snapshot');
  }
  if (snap.url !== null && snap.url !== rec.source.url) {
    add(
      problems,
      'error',
      'snapshot-url-mismatch',
      r.file,
      `snapshot is of ${snap.url} but source.url is ${rec.source.url}`,
    );
  }
  if (snap.retrieved !== null && snap.retrieved !== rec.source.retrieved_on) {
    add(
      problems,
      'warning',
      'snapshot-date-mismatch',
      r.file,
      `snapshot was retrieved ${snap.retrieved} but source.retrieved_on is ${rec.source.retrieved_on}`,
    );
  }
}

/**
 * The quote-verification step an LLM-proposal pipeline must pass (spec 8.5 step 4): the quote must appear verbatim
 * in the new snapshot, every number in the proposal must appear in its quote, and the source URL must match the
 * page the snapshot is of. A failing proposal is discarded; it is never published.
 */
export function verifyProposal(proposal: KbProposal, snapshotText: string | null, file = proposal.id): Problem[] {
  const out: Problem[] = [];
  if (snapshotText === null) {
    add(
      out,
      'error',
      'snapshot-missing',
      file,
      `no snapshot kb/snapshots/${proposal.id}.txt: a proposal must be backed by the page text it quotes`,
    );
    return out;
  }
  const snap = splitSnapshot(snapshotText);
  if (!quoteAppearsIn(proposal.source.quote, snap.body)) {
    add(out, 'error', 'quote-missing', file, 'source.quote does not appear verbatim in the snapshot');
  }
  if (snap.url === null) {
    add(out, 'error', 'snapshot-url-mismatch', file, 'the snapshot has no URL header, so the source cannot be matched');
  } else if (snap.url !== proposal.source.url) {
    add(
      out,
      'error',
      'snapshot-url-mismatch',
      file,
      `snapshot is of ${snap.url} but source.url is ${proposal.source.url}`,
    );
  }
  if (snap.retrieved !== null && snap.retrieved !== proposal.source.retrieved_on) {
    add(
      out,
      'warning',
      'snapshot-date-mismatch',
      file,
      `snapshot was retrieved ${snap.retrieved} but source.retrieved_on is ${proposal.source.retrieved_on}`,
    );
  }
  const inQuote = new Set(numbersInText(proposal.source.quote));
  for (const n of numbersInBody(proposal.body)) {
    if (!inQuote.has(n))
      add(out, 'error', 'number-not-in-quote', file, `the number ${n} is in the proposal but not in its quote`);
  }
  return out;
}
