// Canonical JSON (spec 5.7): keys sorted, numbers normalised, `undefined` dropped. Pure and deterministic, so the
// same input produces byte-identical output in Node and in the browser build (parity test, spec 4.9).

export class CanonicalJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanonicalJsonError';
  }
}

function canonicalNumber(n: number, path: string): string {
  if (!Number.isFinite(n)) throw new CanonicalJsonError(`non-finite number at ${path}`);
  // -0 and 0 are the same number semantically; String(-0) is already "0", but be explicit.
  if (n === 0) return '0';
  // ECMAScript Number-to-String is specified exactly (shortest round-trip), identical across engines.
  return String(n);
}

function walk(value: unknown, path: string): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      return canonicalNumber(value, path);
    case 'undefined':
      // Only reachable inside arrays (object members with undefined are skipped): JSON.stringify gives null.
      return 'null';
    case 'object': {
      if (Array.isArray(value)) return `[${value.map((v, i) => walk(v, `${path}[${i}]`)).join(',')}]`;
      const proto = Object.getPrototypeOf(value) as unknown;
      if (proto !== Object.prototype && proto !== null) {
        throw new CanonicalJsonError(`only plain objects are allowed at ${path}`);
      }
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record)
        .filter((k) => record[k] !== undefined)
        .sort(); // UTF-16 code unit order: deterministic everywhere
      return `{${keys.map((k) => `${JSON.stringify(k)}:${walk(record[k], `${path}.${k}`)}`).join(',')}}`;
    }
    default:
      throw new CanonicalJsonError(`unsupported ${typeof value} at ${path}`);
  }
}

export function canonicalJson(value: unknown): string {
  if (value === undefined) throw new CanonicalJsonError('undefined has no canonical form');
  return walk(value, '$');
}

/** Structural equality of two JSON-compatible values, independent of key order. */
export function canonicalEqual(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}
