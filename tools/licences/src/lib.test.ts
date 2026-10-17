import { describe, expect, it } from 'vitest';
import { checkLicences, expressionAllowed, isDenied, parsePnpmLicences, parseRegister, type Register } from './lib';

const pkg = (name: string, license: string) => ({ name, versions: ['1.0.0'], license });
const emptyRegister: Register = { rows: [], devExceptions: [] };

describe('expressionAllowed', () => {
  it.each([
    'MIT',
    'ISC',
    'Apache-2.0',
    'BSD-3-Clause',
    '(MIT OR Apache-2.0)',
    'MIT OR GPL-3.0',
    '(MIT AND BSD-2-Clause)',
    '(ISC OR (MIT AND CC0-1.0))',
  ])('allows %s', (l) => expect(expressionAllowed(l)).toBe(true));
  it.each([
    'GPL-3.0',
    'AGPL-3.0-only',
    'MPL-2.0',
    'MIT AND GPL-3.0',
    'BlueOak-1.0.0',
    'Apache-2.0 WITH LLVM-exception',
    '',
    'SEE LICENSE IN LICENSE.txt',
  ])('does not allow %s', (l) => expect(expressionAllowed(l)).toBe(false));
});

describe('isDenied', () => {
  it('denies copyleft and unknown licences', () => {
    for (const l of [
      'GPL-3.0',
      'GPL-3.0-or-later',
      'AGPL-3.0',
      'LGPL-2.1',
      'SSPL-1.0',
      'BUSL-1.1',
      'Elastic-2.0',
      'FSL-1.1-MIT',
      'UNLICENSED',
      'UNKNOWN',
      'SEE LICENSE IN x',
      'CC-BY-NC-4.0',
      '',
    ]) {
      expect(isDenied(l), l).toBe(true);
    }
  });
  it('does not deny a dual licence that has an allowed option, or merely unusual permissive licences', () => {
    expect(isDenied('MIT OR GPL-3.0')).toBe(false);
    expect(isDenied('MPL-2.0')).toBe(false); // not on the allow-list, but handled by a dev-only exception, not the hard-deny list
    expect(isDenied('BlueOak-1.0.0')).toBe(false);
  });
});

describe('checkLicences', () => {
  const reg = (rows: [string, string][], devExceptions: Register['devExceptions'] = []): Register => ({
    rows: rows.map(([p, l]) => ({ package: p, licence: l })),
    devExceptions,
  });

  it('passes a clean tree', () => {
    const all = [pkg('zod', 'MIT'), pkg('vitest', 'MIT')];
    expect(
      checkLicences({
        production: [pkg('zod', 'MIT')],
        all,
        directDependencies: ['zod', 'vitest'],
        register: reg([
          ['zod', 'MIT'],
          ['vitest', 'MIT'],
        ]),
      }),
    ).toEqual([]);
  });

  it('fails a GPL package anywhere (hard deny)', () => {
    const all = [pkg('fake-gpl-package', 'GPL-3.0-only')];
    const p = checkLicences({ production: [], all, directDependencies: [], register: emptyRegister });
    expect(p.map((x) => x.message).join('\n')).toMatch(/fake-gpl-package.*hard-deny/);
  });

  it('fails a production dependency whose licence is not on the allow-list, even a permissive one, with no exceptions', () => {
    const p = checkLicences({
      production: [pkg('left-pad', 'MPL-2.0')],
      all: [pkg('left-pad', 'MPL-2.0')],
      directDependencies: [],
      register: reg([], [{ licence: 'MPL-2.0', packages: ['left-pad'], why: 'x' }]),
    });
    expect(p.some((x) => /production dependency.*MPL-2.0/.test(x.message))).toBe(true);
  });

  it('accepts a dev-only dependency outside the allow-list only with a named exception', () => {
    const all = [pkg('lightningcss', 'MPL-2.0'), pkg('lightningcss-win32-x64-msvc', 'MPL-2.0')];
    expect(checkLicences({ production: [], all, directDependencies: [], register: emptyRegister }).length).toBe(2);
    const ok = reg([], [{ licence: 'MPL-2.0', packages: ['lightningcss*'], why: 'dev-only build tool' }]);
    expect(checkLicences({ production: [], all, directDependencies: [], register: ok })).toEqual([]);
  });

  it('requires a register row for every direct dependency and a matching licence', () => {
    const all = [pkg('zod', 'MIT'), pkg('yaml', 'ISC')];
    const missing = checkLicences({
      production: all,
      all,
      directDependencies: ['zod', 'yaml'],
      register: reg([['zod', 'MIT']]),
    });
    expect(missing.map((x) => x.message).join('\n')).toMatch(/yaml: direct dependency has no row/);
    const wrong = checkLicences({
      production: all,
      all,
      directDependencies: ['zod'],
      register: reg([['zod', 'Apache-2.0']]),
    });
    expect(wrong.map((x) => x.message).join('\n')).toMatch(
      /zod: register says "Apache-2.0" but the installed package says "MIT"/,
    );
  });
});

describe('parsers', () => {
  it('parses section 2 and section 4 of the register', () => {
    const md = [
      '## 2. Packages in use',
      '',
      '| Package | Licence (SPDX) | Closed-source OK | Obligation | Status | Verified on | Verified from | Used by |',
      '|---|---|---|---|---|---|---|---|',
      '| pnpm | MIT | Yes | none | Plan | 2026-10-18 | npm | root |',
      '| `zod` | MIT | Yes | none | Plan | 2026-10-18 | npm | core |',
      '',
      '## 4. Dev-only exceptions',
      '',
      '| Licence (SPDX) | Packages | Why it is acceptable | Verified on |',
      '|---|---|---|---|',
      '| MPL-2.0 | lightningcss, lightningcss-win32-x64-msvc | build tool, not distributed | 2026-10-18 |',
    ].join('\n');
    const r = parseRegister(md);
    expect(r.rows.map((x) => x.package)).toEqual(['pnpm', 'zod']);
    expect(r.devExceptions[0]).toMatchObject({
      licence: 'MPL-2.0',
      packages: ['lightningcss', 'lightningcss-win32-x64-msvc'],
    });
  });

  it('flattens pnpm licences json', () => {
    const out = parsePnpmLicences({
      MIT: [{ name: 'b', versions: ['1.0.0'], license: 'MIT' }],
      ISC: [{ name: 'a', versions: ['2.0.0'] }],
    });
    expect(out).toEqual([
      { name: 'a', versions: ['2.0.0'], license: 'ISC' },
      { name: 'b', versions: ['1.0.0'], license: 'MIT' },
    ]);
  });
});
