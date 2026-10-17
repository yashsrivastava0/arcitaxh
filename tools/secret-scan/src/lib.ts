// Secret scan for tracked files. Patterns are deliberately conservative (low false-positive rate); the same
// families are used by rule R-09 and security/redact in packages/core (M6).

export interface SecretPattern {
  id: string;
  re: RegExp;
}

export const SECRET_PATTERNS: readonly SecretPattern[] = [
  { id: 'openai-or-anthropic-key', re: /\bsk-(?:ant-|proj-|live-|test-)?[A-Za-z0-9_-]{20,}/ },
  { id: 'aws-access-key-id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { id: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { id: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: 'private-key-block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
  {
    id: 'quoted-credential-assignment',
    re: /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*['"][A-Za-z0-9/+_-]{24,}['"]/i,
  },
];

export interface SecretFinding {
  file: string;
  line: number;
  pattern: string;
}

/** Paths that are never scanned: lockfiles (integrity hashes), binary documents, the immutable source documents. */
export const SKIP_PATHS: readonly RegExp[] = [
  /^pnpm-lock\.yaml$/,
  /^docs\/01-source\//,
  /\.(pdf|png|jpg|jpeg|gif|ico|woff2?)$/i,
];

export function scanText(file: string, text: string): SecretFinding[] {
  if (SKIP_PATHS.some((re) => re.test(file))) return [];
  const findings: SecretFinding[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const p of SECRET_PATTERNS) if (p.re.test(line)) findings.push({ file, line: i + 1, pattern: p.id });
  });
  return findings;
}
