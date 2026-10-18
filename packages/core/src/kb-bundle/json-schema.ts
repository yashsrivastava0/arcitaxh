import { z } from 'zod';
import { decisionTypeDefSchema, kbProposalSchema, kbRecordSchema } from '../schemas/kb';
import { kbBundleSchema } from './bundle';

/**
 * JSON Schemas for the files under kb/ and for the release bundle, generated from the Zod schemas (the single source
 * of truth). `pnpm kb:schema` writes them to kb/schema/; they are never hand-edited. Pure: returns plain objects.
 */
export function kbJsonSchemas(): Record<string, object> {
  const gen = (schema: z.ZodType): object =>
    z.toJSONSchema(schema, { target: 'draft-2020-12', unrepresentable: 'any' });
  return {
    'record.schema.json': gen(kbRecordSchema),
    'proposal.schema.json': gen(kbProposalSchema),
    'decision-type.schema.json': gen(decisionTypeDefSchema),
    'bundle.schema.json': gen(kbBundleSchema),
  };
}
