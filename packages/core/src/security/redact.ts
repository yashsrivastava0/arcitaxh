// Secret detection and redaction (specification 7.2 rule R-09, 13; brief 10.4). Text that looks like a credential must
// never be sent to a model or written to a log. The pattern families match tools/secret-scan (the repo's own scan).
//
// These are HEURISTICS, not a guarantee: they catch the common, documented key formats and obvious "name = value"
// assignments. A custom or unusual secret can slip through, which is why R-09 also blocks on a match instead of trying
// to repair the text, and why the privacy rules (spec 13) never rely on redaction alone.
//
// Nothing here returns the secret itself: matches carry only a kind and a range.

export const SECRET_KINDS = [
  'api_key_sk',
  'aws_access_key_id',
  'github_token',
  'slack_token',
  'google_api_key',
  'stripe_key',
  'private_key_block',
  'jwt',
  'credential_assignment',
] as const;
export type SecretKind = (typeof SECRET_KINDS)[number];

interface SecretPattern {
  kind: SecretKind;
  /** Group 1, when present, is the part that is the secret; otherwise the whole match is. */
  source: string;
  /** Only the assignment names ("API_KEY", "Password") are case-insensitive; key prefixes are exact. */
  ignoreCase?: boolean;
}

// A leading boundary is written as (?:^|[^A-Za-z0-9]) and not as a look-behind, so the same code runs in older browsers.
const B = '(?:^|[^A-Za-z0-9])';

const PATTERNS: readonly SecretPattern[] = [
  { kind: 'api_key_sk', source: `${B}(sk-(?:ant-|proj-|live-|test-)?[A-Za-z0-9_-]{16,})` },
  { kind: 'aws_access_key_id', source: `${B}((?:AKIA|ASIA)[0-9A-Z]{16})(?![A-Za-z0-9])` },
  {
    kind: 'github_token',
    source: `${B}(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})`,
  },
  { kind: 'slack_token', source: `${B}(xox[baprs]-[A-Za-z0-9-]{10,})` },
  { kind: 'google_api_key', source: `${B}(AIza[0-9A-Za-z_-]{35})(?![A-Za-z0-9_-])` },
  { kind: 'stripe_key', source: `${B}((?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,})` },
  { kind: 'private_key_block', source: '(-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----)' },
  {
    kind: 'jwt',
    source: `${B}(eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,})`,
  },
  {
    // "api_key = abc123...", "password: 'hunter2hunter2hunter2'": a name, a separator, then a long value with a digit.
    kind: 'credential_assignment',
    ignoreCase: true,
    source:
      '\\b(?:api[_-]?key|secret|token|password|passwd)\\b\\s*[:=]\\s*[\'"]?((?=[A-Za-z0-9/+_-]*[0-9])[A-Za-z0-9/+_-]{16,})',
  },
];

export interface SecretMatch {
  kind: SecretKind;
  /** UTF-16 offsets of the secret in the scanned text; `end` is exclusive. */
  start: number;
  end: number;
}

/** Finds secret-looking text. Matches are sorted, and overlapping ranges are merged (the earlier kind wins). */
export function findSecrets(text: string): SecretMatch[] {
  const found: SecretMatch[] = [];
  for (const p of PATTERNS) {
    for (const m of text.matchAll(new RegExp(p.source, p.ignoreCase === true ? 'gi' : 'g'))) {
      const secret = m[1] ?? m[0];
      // The secret is the last thing in the match (a trailing look-ahead consumes nothing).
      const start = m.index + m[0].length - secret.length;
      found.push({ kind: p.kind, start, end: start + secret.length });
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: SecretMatch[] = [];
  for (const f of found) {
    const last = merged[merged.length - 1];
    if (last !== undefined && f.start < last.end) {
      if (f.end > last.end) last.end = f.end;
    } else {
      merged.push({ ...f });
    }
  }
  return merged;
}

export function containsSecret(text: string): boolean {
  return findSecrets(text).length > 0;
}

/** Replaces each secret with `[redacted:<kind>]`. The returned matches describe the ORIGINAL text. */
export function redactSecrets(text: string): { text: string; matches: SecretMatch[] } {
  const matches = findSecrets(text);
  let out = '';
  let at = 0;
  for (const m of matches) {
    out += `${text.slice(at, m.start)}[redacted:${m.kind}]`;
    at = m.end;
  }
  return { text: out + text.slice(at), matches };
}

/**
 * Redacts every string in a JSON-like value (object keys are kept). Returns a new value and how many secrets were
 * replaced. Used before anything is sent to a model or logged.
 */
export function redactDeep<T>(value: T): { value: T; count: number } {
  let count = 0;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const r = redactSecrets(v);
      count += r.matches.length;
      return r.text;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v !== null && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  return { value: walk(value) as T, count };
}

/** Every string in a JSON-like value with the path it was found at, for reporting where a secret sits (never what it is). */
export function stringsWithPaths(value: unknown, base = ''): { path: string; text: string }[] {
  if (typeof value === 'string') return [{ path: base, text: value }];
  if (Array.isArray(value)) return value.flatMap((x, i) => stringsWithPaths(x, `${base}[${i}]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, x]) => stringsWithPaths(x, base === '' ? k : `${base}.${k}`));
  }
  return [];
}
