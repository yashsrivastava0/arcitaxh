import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../hash/sha256';
import { canonicalEqual, canonicalJson, CanonicalJsonError } from './canonical-json';

describe('canonicalJson', () => {
  it('sorts keys recursively and keeps array order', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, 2, 1], c: 'x' } })).toBe('{"a":{"c":"x","d":[3,2,1]},"b":1}');
  });

  it('is independent of key insertion order', () => {
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });

  it('normalises numbers: -0 is 0, 1.0 is 1, and exponents are stable', () => {
    expect(canonicalJson([-0, 0, 1.0, 1e21, 0.1 + 0.2, 1e-7])).toBe('[0,0,1,1e+21,0.30000000000000004,1e-7]');
  });

  it('drops undefined members, nulls undefined array slots, and keeps null', () => {
    expect(canonicalJson({ a: undefined, b: null, c: [undefined] })).toBe('{"b":null,"c":[null]}');
  });

  it('rejects values that have no stable JSON form instead of guessing', () => {
    expect(() => canonicalJson(Number.NaN)).toThrow(CanonicalJsonError);
    expect(() => canonicalJson({ x: Number.POSITIVE_INFINITY })).toThrow(CanonicalJsonError);
    expect(() => canonicalJson(undefined)).toThrow(CanonicalJsonError);
    expect(() => canonicalJson({ d: new Date(0) })).toThrow(CanonicalJsonError);
    expect(() => canonicalJson({ m: new Map() })).toThrow(CanonicalJsonError);
    expect(() => canonicalJson(10n)).toThrow(CanonicalJsonError);
  });

  it('escapes strings exactly like JSON', () => {
    expect(canonicalJson('a"b\n é')).toBe(JSON.stringify('a"b\n é'));
  });

  it('canonicalEqual ignores key order but not values', () => {
    expect(canonicalEqual({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true);
    expect(canonicalEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(canonicalEqual([1, 2], [2, 1])).toBe(false);
  });

  it('property: shuffling object keys never changes the output', () => {
    const json = fc.letrec((tie) => ({
      value: fc.oneof(
        { depthSize: 'small' },
        fc.constant(null),
        fc.boolean(),
        fc.integer(),
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        fc.string(),
        fc.array(tie('value'), { maxLength: 4 }),
        fc.dictionary(fc.string({ maxLength: 6 }), tie('value'), { maxKeys: 5 }),
      ),
    })).value;
    fc.assert(
      fc.property(json, (v) => {
        const reorder = (x: unknown): unknown => {
          if (Array.isArray(x)) return x.map(reorder);
          if (x !== null && typeof x === 'object') {
            return Object.fromEntries(
              Object.entries(x as Record<string, unknown>)
                .reverse()
                .map(([k, val]) => [k, reorder(val)]),
            );
          }
          return x;
        };
        return canonicalJson(v) === canonicalJson(reorder(v));
      }),
    );
  });
});

describe('sha256Hex', () => {
  it('matches the published SHA-256 test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('hashes UTF-8 bytes, not UTF-16 code units (vectors computed with Node crypto, an independent implementation)', () => {
    expect(sha256Hex('é')).toBe('4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c');
    expect(sha256Hex('日本語')).toBe('77710aedc74ecfa33685e33a6c7df5cc83004da1bdcef7fb280f5c2b2e97e0a5');
    expect(sha256Hex('😀')).toBe('f0443a342c5ef54783a111b51ba56c938e474c32324d90c3a60c9c8e3a37e2d9');
    expect(sha256Hex('a\u0000b')).toBe('59b271ae1bbcb1d31d41929817f4b16fb439eb4f31520b5ad1d5ce98920a7138');
  });
});
