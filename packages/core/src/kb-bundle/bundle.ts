import { z } from 'zod';
import { decisionTypeDefSchema, kbRecordSchema } from '../schemas/kb';

/** A KB release is a git tag such as "kb-2026.10.1" (spec 8.2). "kb-dev" is a local, non-releasable build. */
export const KB_VERSION_PATTERN = /^(kb-\d{4}\.\d{2}\.\d+|kb-dev)$/;

export const BUNDLE_FORMAT = 1;

/**
 * The release bundle (dist/kb/<version>.json): everything the API and the in-browser calculator need to serve one KB
 * release, as plain JSON. Built by tools/kb-build; read through createBundleReader. Fixture records are never in it.
 */
export const kbBundleSchema = z
  .strictObject({
    bundleFormat: z.literal(BUNDLE_FORMAT),
    version: z.string().regex(KB_VERSION_PATTERN, 'a KB version looks like kb-2026.10.1'),
    /** The git commit the bundle was built from, when known. */
    commit: z.string().min(7).max(64).nullable(),
    decisionTypes: z.array(decisionTypeDefSchema),
    records: z.array(kbRecordSchema),
  })
  .superRefine((b, ctx) => {
    const types = new Set<string>();
    b.decisionTypes.forEach((d, i) => {
      if (types.has(d.id))
        ctx.addIssue({
          code: 'custom',
          message: `duplicate decision type "${d.id}"`,
          path: ['decisionTypes', i, 'id'],
        });
      types.add(d.id);
    });
    const ids = new Set<string>();
    b.records.forEach((r, i) => {
      if (ids.has(r.id))
        ctx.addIssue({ code: 'custom', message: `duplicate record id "${r.id}"`, path: ['records', i, 'id'] });
      ids.add(r.id);
      if (!types.has(r.decision_type)) {
        ctx.addIssue({
          code: 'custom',
          message: `record "${r.id}" has unknown decision type "${r.decision_type}"`,
          path: ['records', i, 'decision_type'],
        });
      }
    });
  });
export type KbBundle = z.infer<typeof kbBundleSchema>;

/** Validates untrusted bundle JSON. Throws a ZodError naming the bad field. */
export function parseBundle(raw: unknown): KbBundle {
  return kbBundleSchema.parse(raw);
}
