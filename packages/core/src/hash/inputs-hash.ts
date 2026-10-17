import { canonicalJson } from '../normalise/canonical-json';
import { normaliseContext, normaliseDesign, normaliseOptionRefs, sortedUniqueStrings } from '../normalise/normalise';
import type { OptionRef } from '../schemas/common';
import type { DesignGraph } from '../schemas/design';
import type { Constraints } from '../schemas/verdict';
import { sha256Hex } from './sha256';

/** Bump when the canonical shape below changes, so old and new hashes can never collide. */
export const HASH_FORMAT_VERSION = 1;

/**
 * Everything a verdict depends on (spec 5.7): normalised constraints, decision type, candidate option ids and
 * parameters, KB version, rules version, prompt version, and the model roster. Used for the exact-hash verdict
 * cache (never semantic, ADR-028) and for stale detection.
 */
export interface HashInputs {
  constraints: Constraints;
  decisionType: string;
  candidates: readonly OptionRef[];
  kbVersion: string;
  rulesVersion: string;
  promptsVersion: string | null;
  /** JSON-compatible roster as stored with the verdict, or null when no model was involved (Layer 1). */
  modelRoster: unknown;
}

/** Lowercase hex SHA-256 (64 characters). The database adapter converts it to bytea. */
export function inputsHash(inputs: HashInputs): string {
  const c = inputs.constraints;
  const payload = {
    hashFormat: HASH_FORMAT_VERSION,
    constraints: {
      ...c,
      profile: normaliseContext(c.profile),
      requiredCapabilities: sortedUniqueStrings(c.requiredCapabilities),
      avoidedVendors: sortedUniqueStrings(c.avoidedVendors),
    },
    decisionType: inputs.decisionType,
    candidates: normaliseOptionRefs(inputs.candidates),
    kbVersion: inputs.kbVersion,
    rulesVersion: inputs.rulesVersion,
    promptsVersion: inputs.promptsVersion,
    modelRoster: inputs.modelRoster ?? null,
  };
  return sha256Hex(canonicalJson(payload));
}

/** Fingerprint of a design's semantics: layout is removed first, so moving a box never changes it. */
export function designHash(graph: DesignGraph): string {
  return sha256Hex(canonicalJson({ hashFormat: HASH_FORMAT_VERSION, design: normaliseDesign(graph) }));
}
