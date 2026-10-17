// Licence gate logic (brief 8.2). Pure: takes parsed inputs, returns problems. The CLI does the I/O.

/** SPDX ids accepted for production dependencies. Dual licences are handled by expression evaluation. */
export const ALLOW_LIST: ReadonlySet<string> = new Set([
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'CC0-1.0',
]);

/** Hard fail anywhere (production or dev). Matched case-insensitively against the whole licence string. */
export const DENY_PATTERNS: readonly RegExp[] = [
  /\bA?GPL\b/i,
  /\bGPL-/i,
  /\bAGPL-/i,
  /\bLGPL/i,
  /\bSSPL/i,
  /\bBUSL/i,
  /\bBSL-1/i,
  /\bElastic/i,
  /\bFSL-/i,
  /\bUNLICENSED\b/i,
  /\bSEE LICENSE/i,
  /\bUNKNOWN\b/i,
  /\bCC-BY-NC/i,
  /^$/,
];

export interface InstalledPackage {
  name: string;
  versions: string[];
  license: string;
}

export interface RegisterRow {
  package: string;
  licence: string;
}

export interface DevException {
  licence: string;
  packages: string[]; // exact names, or a prefix ending in *
  why: string;
}

export interface Register {
  rows: RegisterRow[];
  devExceptions: DevException[];
}

export interface Problem {
  severity: 'error' | 'warning';
  message: string;
}

/** Splits a markdown table row into trimmed cells. */
function cells(line: string): string[] {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return body.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
}

function tableAfterHeading(md: string, headingRe: RegExp, firstColumn: string): string[][] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => headingRe.test(l));
  if (start === -1) return [];
  const out: string[][] = [];
  let inTable = false;
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) break;
    if (!line.trim().startsWith('|')) {
      if (inTable) break;
      continue;
    }
    const c = cells(line);
    if (!inTable) {
      if (c[0] !== firstColumn) continue;
      inTable = true;
      continue; // header
    }
    if (/^[-: ]+$/.test((c[0] ?? '').replace(/\|/g, ''))) continue; // separator
    out.push(c);
  }
  return out;
}

const stripBackticks = (s: string): string => s.replace(/`/g, '').trim();

export function parseRegister(markdown: string): Register {
  const rows = tableAfterHeading(markdown, /^##\s+2\./, 'Package').map((c) => ({
    package: stripBackticks(c[0] ?? ''),
    licence: stripBackticks(c[1] ?? ''),
  }));
  const devExceptions = tableAfterHeading(markdown, /^##\s+4\./, 'Licence (SPDX)').map((c) => ({
    licence: stripBackticks(c[0] ?? ''),
    packages: (c[1] ?? '')
      .split(',')
      .map((p) => stripBackticks(p))
      .filter((p) => p !== ''),
    why: c[2] ?? '',
  }));
  return { rows, devExceptions };
}

/** Flattens `pnpm licenses list --json` (grouped by licence) into a package list. */
export function parsePnpmLicences(json: unknown): InstalledPackage[] {
  const out: InstalledPackage[] = [];
  if (json === null || typeof json !== 'object') return out;
  for (const [license, pkgs] of Object.entries(json as Record<string, unknown>)) {
    if (!Array.isArray(pkgs)) continue;
    for (const p of pkgs as { name?: string; versions?: string[]; license?: string }[]) {
      if (typeof p.name !== 'string') continue;
      out.push({ name: p.name, versions: p.versions ?? [], license: p.license ?? license });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ---- SPDX expression evaluation: "(MIT OR Apache-2.0)", "MIT AND BSD-3-Clause", "MIT*" etc. ----

const ALIASES: Readonly<Record<string, string>> = {
  'Apache 2.0': 'Apache-2.0',
  Apache2: 'Apache-2.0',
  BSD: 'BSD-3-Clause',
  'BSD*': 'BSD-3-Clause',
};

function tokenize(expr: string): string[] {
  return expr
    .replace(/\(/g, ' ( ')
    .replace(/\)/g, ' ) ')
    .split(/\s+/)
    .filter((t) => t !== '');
}

/** True when the SPDX expression is satisfied entirely by licences in `allowed`. */
export function expressionAllowed(expression: string, allowed: ReadonlySet<string> = ALLOW_LIST): boolean {
  const aliased = ALIASES[expression.trim()] ?? expression.trim();
  const tokens = tokenize(aliased);
  let pos = 0;
  const parseOr = (): boolean => {
    let v = parseAnd();
    while (tokens[pos]?.toUpperCase() === 'OR') {
      pos += 1;
      const r = parseAnd();
      v = v || r;
    }
    return v;
  };
  const parseAnd = (): boolean => {
    let v = parseAtom();
    while (tokens[pos]?.toUpperCase() === 'AND') {
      pos += 1;
      const r = parseAtom();
      v = v && r;
    }
    return v;
  };
  const parseAtom = (): boolean => {
    const t = tokens[pos];
    if (t === undefined) return false;
    if (t === '(') {
      pos += 1;
      const v = parseOr();
      if (tokens[pos] === ')') pos += 1;
      return v;
    }
    pos += 1;
    if (tokens[pos]?.toUpperCase() === 'WITH') {
      pos += 2; // a licence exception changes the terms: never auto-approved
      return false;
    }
    return allowed.has(t.replace(/\+$/, ''));
  };
  if (tokens.length === 0) return false;
  const result = parseOr();
  return result && pos >= tokens.length;
}

/**
 * Denied = matches the hard-deny list AND cannot be satisfied by an allowed option.
 * "MIT OR GPL-3.0" is fine (we rely on MIT); "GPL-3.0" and "MIT AND GPL-3.0" are not.
 */
export function isDenied(licence: string): boolean {
  if (expressionAllowed(licence)) return false;
  return DENY_PATTERNS.some((re) => re.test(licence.trim()));
}

function matchesException(pkg: string, patterns: string[]): boolean {
  return patterns.some((p) => (p.endsWith('*') ? pkg.startsWith(p.slice(0, -1)) : pkg === p));
}

export interface CheckInput {
  /** `pnpm licenses list -r --prod --json` */
  production: InstalledPackage[];
  /** `pnpm licenses list -r --json` (includes dev) */
  all: InstalledPackage[];
  /** Direct dependency names (dependencies + devDependencies) of every workspace package, workspace-internal excluded. */
  directDependencies: string[];
  register: Register;
}

export function checkLicences(input: CheckInput): Problem[] {
  const problems: Problem[] = [];
  const err = (message: string): void => void problems.push({ severity: 'error', message });
  const prodNames = new Set(input.production.map((p) => p.name));

  // 1. Hard-deny list, anywhere.
  for (const p of input.all) {
    if (isDenied(p.license))
      err(
        `${p.name}@${p.versions.join(',')}: licence "${p.license}" is on the hard-deny list (GPL/AGPL/LGPL/SSPL/BUSL/Elastic/FSL/UNLICENSED/unknown)`,
      );
  }

  // 2. Production dependencies: strict allow-list, no exceptions.
  for (const p of input.production) {
    if (isDenied(p.license)) continue; // already reported
    if (!expressionAllowed(p.license)) {
      err(
        `${p.name}@${p.versions.join(',')}: production dependency has licence "${p.license}", which is not on the allow-list (${[...ALLOW_LIST].join(', ')})`,
      );
    }
  }

  // 3. Dev-only dependencies outside the allow-list need an explicit, reasoned exception in the register.
  for (const p of input.all) {
    if (prodNames.has(p.name) || isDenied(p.license) || expressionAllowed(p.license)) continue;
    const ex = input.register.devExceptions.find(
      (e) => e.licence === p.license && matchesException(p.name, e.packages),
    );
    if (!ex)
      err(
        `${p.name}@${p.versions.join(',')}: dev dependency has licence "${p.license}" and no dev-only exception in the register (section 4)`,
      );
  }

  // 4. Every direct dependency has a register row whose licence matches what is installed.
  const installed = new Map(input.all.map((p) => [p.name, p]));
  const rows = new Map(input.register.rows.map((r) => [r.package, r]));
  for (const name of [...new Set(input.directDependencies)].sort()) {
    const row = rows.get(name);
    const inst = installed.get(name);
    if (!row) {
      err(
        `${name}: direct dependency has no row in docs/03-specs/licence-register.md section 2 (add one after verifying the licence from the package)`,
      );
      continue;
    }
    if (inst && normalise(row.licence) !== normalise(inst.license)) {
      err(`${name}: register says "${row.licence}" but the installed package says "${inst.license}"`);
    }
  }
  return problems;
}

const normalise = (s: string): string => s.replace(/[()]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
