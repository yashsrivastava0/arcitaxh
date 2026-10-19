import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  containsSecret,
  findSecrets,
  redactDeep,
  redactSecrets,
  SECRET_KINDS,
  stringsWithPaths,
  type SecretKind,
} from './redact';

// Every sample is assembled from fragments at run time, so this file itself holds no secret-looking literal and the
// repo's own secret scan (tools/secret-scan) stays clean.
const rep = (c: string, n: number) => c.repeat(n);
const SAMPLES: Record<SecretKind, string> = {
  api_key_sk: `sk${'-'}${rep('a1', 14)}`,
  aws_access_key_id: `AK${'IA'}${rep('Q7', 8)}`,
  github_token: `gh${'p'}_${rep('aB3', 13)}`,
  slack_token: `xox${'b'}-${rep('1234', 4)}-${rep('abcd', 3)}`,
  google_api_key: `AI${'za'}${rep('x9', 17)}Z`,
  stripe_key: `sk_${'live'}_${rep('Ab12', 6)}`,
  private_key_block: `-----BEGIN ${'RSA '}PRIVATE KEY-----`,
  jwt: `eyJ${rep('a', 12)}.eyJ${rep('b', 12)}.${rep('c', 12)}`,
  credential_assignment: `api_key = "${rep('Zq7', 8)}"`,
};

describe('findSecrets: each documented family is detected', () => {
  for (const kind of SECRET_KINDS) {
    it(`${kind}`, () => {
      const text = `before ${SAMPLES[kind]} after`;
      const found = findSecrets(text);
      expect(found.map((f) => f.kind)).toContain(kind);
      const f = found.find((x) => x.kind === kind) as { start: number; end: number };
      // The range covers the secret and not the words around it.
      expect(text.slice(f.start, f.end)).not.toMatch(/^before|after$/);
    });
  }

  it('the spec examples sk-, AKIA and ghp_ are all caught', () => {
    expect(containsSecret(SAMPLES.api_key_sk)).toBe(true);
    expect(containsSecret(SAMPLES.aws_access_key_id)).toBe(true);
    expect(containsSecret(SAMPLES.github_token)).toBe(true);
  });

  it('finds several secrets in one text, in order, with correct offsets', () => {
    const text = `a ${SAMPLES.api_key_sk} b ${SAMPLES.aws_access_key_id} c`;
    const found = findSecrets(text);
    expect(found.map((f) => f.kind)).toEqual(['api_key_sk', 'aws_access_key_id']);
    expect(text.slice(found[0]!.start, found[0]!.end)).toBe(SAMPLES.api_key_sk);
    expect(text.slice(found[1]!.start, found[1]!.end)).toBe(SAMPLES.aws_access_key_id);
  });

  it('is case-sensitive for key prefixes, case-insensitive for assignment names', () => {
    expect(containsSecret(SAMPLES.api_key_sk.toUpperCase())).toBe(false);
    expect(containsSecret(`API_KEY: ${rep('Zq7', 8)}`)).toBe(true);
    expect(containsSecret(`Password=${rep('Zq7', 8)}`)).toBe(true);
  });
});

describe('findSecrets: ordinary text is left alone', () => {
  const benign = [
    'A queue for the task-force dashboard',
    'We use sk- style prefixes in our docs',
    'the sk-1 server',
    'AKIA on its own is a prefix',
    'token budget is 4000 per request',
    'password policy: rotate every 90 days',
    'api key rotation is handled by ops',
    'password = short1',
    'Vector store (read ratio 0.9, no cache)',
    'eyJ is how base64 JSON starts',
    'ghp_ is a prefix',
    '',
  ];
  for (const text of benign) {
    it(`"${text}"`, () => {
      expect(containsSecret(text)).toBe(false);
    });
  }

  it('does not treat a key that is glued to other letters as a key', () => {
    expect(containsSecret(`x${SAMPLES.api_key_sk}`)).toBe(false);
    expect(containsSecret(`_${SAMPLES.api_key_sk}`)).toBe(true);
    expect(containsSecret(`(${SAMPLES.api_key_sk})`)).toBe(true);
  });
});

describe('redactSecrets', () => {
  it('replaces the secret with its kind, keeps the surrounding text, and never returns the secret', () => {
    const r = redactSecrets(`use ${SAMPLES.api_key_sk} for calls`);
    expect(r.text).toBe('use [redacted:api_key_sk] for calls');
    expect(r.text).not.toContain(SAMPLES.api_key_sk);
    expect(r.matches).toHaveLength(1);
  });

  it('keeps the name of an assignment visible and removes only the value', () => {
    const r = redactSecrets(`config: password = ${rep('Zq7', 8)} and more`);
    expect(r.text).toBe('config: password = [redacted:credential_assignment] and more');
  });

  it('merges overlapping matches into one replacement', () => {
    const text = `token=${SAMPLES.api_key_sk}`;
    const r = redactSecrets(text);
    expect(r.text.match(/\[redacted:/g)).toHaveLength(1);
    expect(containsSecret(r.text)).toBe(false);
  });

  it('is idempotent: redacting redacted text changes nothing', () => {
    const once = redactSecrets(`${SAMPLES.github_token} ${SAMPLES.jwt}`).text;
    expect(redactSecrets(once)).toEqual({ text: once, matches: [] });
  });

  it('property: after redaction nothing detectable is left, and text without secrets is unchanged', () => {
    const kinds = fc.constantFrom(...SECRET_KINDS);
    const safe = fc.string({ maxLength: 40 }).filter((s) => !containsSecret(s));
    fc.assert(
      fc.property(safe, kinds, safe, (before, kind, after) => {
        // A space on each side keeps the secret on its own, so surrounding random text cannot change what it is.
        const text = `${before} ${SAMPLES[kind]} ${after}`;
        const r = redactSecrets(text);
        expect(containsSecret(r.text)).toBe(false);
        expect(r.text).not.toContain(SAMPLES[kind]);
        expect(redactSecrets(before).text).toBe(before);
      }),
      { numRuns: 300 },
    );
  });
});

describe('redactDeep and stringsWithPaths', () => {
  const value = {
    label: `db ${SAMPLES.api_key_sk}`,
    nested: { notes: [`ok`, `key ${SAMPLES.aws_access_key_id}`], n: 3, flag: true, nothing: null },
  };

  it('redacts every string, keeps structure and non-strings, counts replacements, and does not mutate', () => {
    const before = JSON.stringify(value);
    const r = redactDeep(value);
    expect(r.count).toBe(2);
    expect(r.value).toEqual({
      label: 'db [redacted:api_key_sk]',
      nested: { notes: ['ok', 'key [redacted:aws_access_key_id]'], n: 3, flag: true, nothing: null },
    });
    expect(JSON.stringify(value)).toBe(before);
  });

  it('lists strings with their paths so a finding can say where a secret sits without repeating it', () => {
    expect(stringsWithPaths(value).map((s) => s.path)).toEqual(['label', 'nested.notes[0]', 'nested.notes[1]']);
  });
});
