import {
  decisionTypeDefSchema,
  kbProposalSchema,
  kbRecordSchema,
  type DecisionTypeDef,
  type KbProposal,
  type KbRecord,
} from '@product/core';
import { parse as parseYaml } from 'yaml';

/** A file of the KB source tree: `path` is relative to the KB root and uses forward slashes. */
export interface SourceFile {
  path: string;
  content: string;
}

export type ProblemCode =
  | 'yaml'
  | 'schema'
  | 'unexpected-file'
  | 'fixture-in-release'
  | 'wrong-section'
  | 'wrong-folder'
  | 'unknown-decision-type'
  | 'id-mismatch'
  | 'duplicate-id'
  | 'ttl-undefined'
  | 'wrong-valid-until'
  | 'placeholder'
  | 'fake-source'
  | 'expired'
  | 'snapshot-missing'
  | 'snapshot-url-mismatch'
  | 'snapshot-date-mismatch'
  | 'quote-missing'
  | 'number-not-in-quote'
  | 'dangling-subject'
  | 'dangling-deferral'
  | 'no-options'
  | 'proposal-shadows-record';

export interface Problem {
  code: ProblemCode;
  severity: 'error' | 'warning';
  file: string;
  message: string;
}

export interface ParsedDecisionType {
  def: DecisionTypeDef;
  file: string;
}
export interface ParsedRecord {
  record: KbRecord;
  file: string;
  /** Which folder it was read from: options/ holds option records, records/ everything else. */
  section: 'options' | 'records';
}
export interface ParsedProposal {
  proposal: KbProposal;
  file: string;
}

export interface KbTree {
  decisionTypes: ParsedDecisionType[];
  records: ParsedRecord[];
  proposals: ParsedProposal[];
  /** Snapshot text by record id (file name without `.txt`). */
  snapshots: Map<string, string>;
}

export interface ParseResult {
  tree: KbTree;
  problems: Problem[];
}

export interface ParseOptions {
  /** A release never reads fixtures. Tools and tests that load the fixture KB set this; paths are then re-rooted at fixtures/. */
  allowFixtures?: boolean;
}

const err = (code: ProblemCode, file: string, message: string): Problem => ({ code, severity: 'error', file, message });

function readYaml(file: SourceFile): { ok: true; data: unknown } | { ok: false; problem: Problem } {
  try {
    return { ok: true, data: parseYaml(file.content) as unknown };
  } catch (e) {
    return { ok: false, problem: err('yaml', file.path, `not valid YAML: ${(e as Error).message.split('\n')[0]}`) };
  }
}

function describeIssues(issues: readonly { path: PropertyKey[]; message: string }[]): string {
  return issues
    .slice(0, 5)
    .map((i) => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`)
    .join('; ');
}

const IGNORED = /(^|\/)(\.gitkeep|README\.md|CHANGELOG\.md)$/;

/**
 * Parses the files of a KB source tree (specification 8.2) into typed records, without touching the file system.
 * Layout: decision-types/<id>.yaml, options/<decision-type>/<name>.yaml, records/<decision-type>/<name>.yaml,
 * proposals/<name>.yaml, snapshots/<record-id>.txt. Anything else is reported, not silently skipped.
 */
export function parseKbSource(files: readonly SourceFile[], opts: ParseOptions = {}): ParseResult {
  const tree: KbTree = { decisionTypes: [], records: [], proposals: [], snapshots: new Map() };
  const problems: Problem[] = [];

  for (const file of [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    let p = file.path.replace(/\\/g, '/');
    if (IGNORED.test(p)) continue;

    const isFixturePath = p.startsWith('fixtures/') || p.includes('/fixtures/');
    if (isFixturePath && !opts.allowFixtures) {
      problems.push(err('fixture-in-release', p, 'fixture files must never be loaded into a release'));
      continue;
    }
    // The fixture KB has the same layout as kb/, rooted at kb/fixtures/.
    if (isFixturePath) p = p.replace(/^(?:.*\/)?fixtures\//, '');

    const parts = p.split('/');
    const [top] = parts;

    if (top === 'snapshots' && parts.length === 2 && p.endsWith('.txt')) {
      tree.snapshots.set((parts[1] as string).slice(0, -'.txt'.length), file.content);
      continue;
    }

    if (!p.endsWith('.yaml')) {
      problems.push(err('unexpected-file', p, 'not part of the KB layout (expected .yaml records or .txt snapshots)'));
      continue;
    }

    const y = readYaml({ path: p, content: file.content });
    if (!y.ok) {
      problems.push(y.problem);
      continue;
    }

    if (top === 'decision-types' && parts.length === 2) {
      const r = decisionTypeDefSchema.safeParse(y.data);
      if (!r.success) {
        problems.push(err('schema', p, describeIssues(r.error.issues)));
        continue;
      }
      const expected = (parts[1] as string).slice(0, -'.yaml'.length);
      if (r.data.id !== expected) {
        problems.push(err('id-mismatch', p, `decision type id "${r.data.id}" must equal the file name "${expected}"`));
        continue;
      }
      tree.decisionTypes.push({ def: r.data, file: p });
    } else if ((top === 'options' || top === 'records') && parts.length === 3) {
      const r = kbRecordSchema.safeParse(y.data);
      if (!r.success) {
        problems.push(err('schema', p, describeIssues(r.error.issues)));
        continue;
      }
      if ((top === 'options') !== (r.data.type === 'option')) {
        problems.push(
          err(
            'wrong-section',
            p,
            `a ${r.data.type} record belongs in ${r.data.type === 'option' ? 'options' : 'records'}/, not ${top}/`,
          ),
        );
        continue;
      }
      if (r.data.decision_type !== parts[1]) {
        problems.push(
          err('wrong-folder', p, `decision_type "${r.data.decision_type}" does not match its folder "${parts[1]}"`),
        );
        continue;
      }
      tree.records.push({ record: r.data, file: p, section: top });
    } else if (top === 'proposals' && parts.length === 2) {
      const r = kbProposalSchema.safeParse(y.data);
      if (!r.success) {
        problems.push(err('schema', p, describeIssues(r.error.issues)));
        continue;
      }
      tree.proposals.push({ proposal: r.data, file: p });
    } else {
      problems.push(err('unexpected-file', p, 'not part of the KB layout'));
    }
  }
  return { tree, problems };
}

/** The format kb-propose writes (and a promoted record keeps): a header, a separator line, then the page text. */
export interface Snapshot {
  url: string | null;
  retrieved: string | null;
  body: string;
}

export function splitSnapshot(text: string): Snapshot {
  const normalised = text.replace(/\r\n/g, '\n');
  const sep = normalised.indexOf('\n---\n');
  if (sep === -1) return { url: null, retrieved: null, body: normalised };
  const header = normalised.slice(0, sep);
  const url = /^URL:\s*(\S+)\s*$/m.exec(header)?.[1] ?? null;
  const retrieved = /^Retrieved:\s*(\d{4}-\d{2}-\d{2})\s*$/m.exec(header)?.[1] ?? null;
  return { url, retrieved, body: normalised.slice(sep + 5) };
}

export function formatSnapshot(url: string, retrieved: string, body: string): string {
  return `URL: ${url}\nRetrieved: ${retrieved}\n---\n${body.replace(/\r\n/g, '\n')}`;
}
