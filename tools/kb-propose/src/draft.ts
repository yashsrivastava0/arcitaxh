import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { kbProposalSchema, kbRecordSchema, recordTypeSchema, type KbProposal } from '@product/core';
import { formatSnapshot, splitSnapshot, verifyProposal, type Problem } from '@product/kb';
import { stringify } from 'yaml';
import { z } from 'zod';

/** What the curator supplies: everything except what only a person can set (verifier, dates) or the tool derives. */
export const draftSpecSchema = z.strictObject({
  id: z.string().min(1),
  type: recordTypeSchema,
  decision_type: z.string().min(1),
  subject: z.string().min(1),
  body: z.record(z.string(), z.unknown()),
  source: z.strictObject({ url: z.string().min(1), quote: z.string().min(1) }),
  curator_note: z.string().default(''),
});
export type DraftSpec = z.infer<typeof draftSpecSchema>;

export type DraftResult = { ok: true; path: string; proposal: KbProposal } | { ok: false; problems: string[] };

const messages = (ps: Problem[]): string[] => ps.map((p) => `[${p.code}] ${p.message}`);

export function snapshotPath(kbRoot: string, id: string): string {
  return join(kbRoot, 'snapshots', `${id}.txt`);
}

/** Saves the page text as kb/snapshots/<id>.txt with the URL and retrieval date header. Never overwrites without force. */
export function saveSnapshot(
  kbRoot: string,
  id: string,
  url: string,
  today: string,
  text: string,
  force = false,
): string {
  const path = snapshotPath(kbRoot, id);
  if (existsSync(path) && !force) throw new Error(`${path} already exists (use --force to replace it)`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, formatSnapshot(url, today, text), 'utf8');
  return path;
}

/**
 * Drafts kb/proposals/<id>.yaml from a spec and the saved snapshot. The proposal is `status: proposed` with every
 * verification field null: this tool cannot create a verified record, and it never writes under kb/records/. The draft
 * is written only if the quote is in the snapshot, every number is in the quote, and the URL matches (spec 8.5).
 */
export function draftProposal(kbRoot: string, specRaw: unknown, opts: { force?: boolean } = {}): DraftResult {
  const spec = draftSpecSchema.safeParse(specRaw);
  if (!spec.success) {
    return { ok: false, problems: spec.error.issues.map((i) => `spec ${i.path.join('.') || '(root)'}: ${i.message}`) };
  }
  const s = spec.data;
  const snapFile = snapshotPath(kbRoot, s.id);
  if (!existsSync(snapFile))
    return { ok: false, problems: [`no snapshot ${snapFile}: run "kb-propose snapshot <url> --id ${s.id}" first`] };
  const snapText = readFileSync(snapFile, 'utf8');
  const snap = splitSnapshot(snapText);
  if (snap.retrieved === null) return { ok: false, problems: ['the snapshot has no Retrieved date header'] };

  const candidate = {
    id: s.id,
    type: s.type,
    decision_type: s.decision_type,
    subject: s.subject,
    body: s.body,
    source: { url: s.source.url, quote: s.source.quote, retrieved_on: snap.retrieved },
    verification: { last_verified: null, valid_until: null, verified_by: null },
    curator_note: s.curator_note,
    status: 'proposed',
  };
  const parsed = kbProposalSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      problems: parsed.error.issues.slice(0, 8).map((i) => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`),
    };
  }
  const verification = verifyProposal(parsed.data, snapText, s.id).filter((p) => p.severity === 'error');
  if (verification.length > 0) return { ok: false, problems: messages(verification) };

  // A proposal must not shadow a promoted record, and nothing here may be mistaken for one.
  if (kbRecordSchema.safeParse(candidate).success)
    return { ok: false, problems: ['internal error: a proposal parsed as a verified record'] };
  if (existsSync(join(kbRoot, 'records', s.decision_type, `${s.id}.yaml`))) {
    return { ok: false, problems: [`a promoted record with id ${s.id} already exists`] };
  }
  const path = join(kbRoot, 'proposals', `${s.id}.yaml`);
  if (existsSync(path) && opts.force !== true)
    return { ok: false, problems: [`${path} already exists (use --force to replace it)`] };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stringify(parsed.data, { lineWidth: 0 }), 'utf8');
  return { ok: true, path, proposal: parsed.data };
}
