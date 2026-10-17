import { describe, expect, it } from 'vitest';
import { scanText } from './lib';

// Fake keys are assembled at runtime so this file never contains a secret-looking literal itself.
const fake = {
  openai: 's' + 'k-' + 'a'.repeat(24),
  aws: 'AK' + 'IA' + 'A'.repeat(16),
  github: 'gh' + 'p_' + 'b'.repeat(36),
  pem: '-----BEGIN ' + 'PRIVATE KEY-----',
};

describe('scanText', () => {
  it('finds key-shaped strings and reports file, line and pattern but not the value', () => {
    const text = ['harmless', `key = ${fake.openai}`, `aws: ${fake.aws}`, `t=${fake.github}`, fake.pem].join('\n');
    const f = scanText('src/x.ts', text);
    expect(f.map((x) => [x.line, x.pattern])).toEqual([
      [2, 'openai-or-anthropic-key'],
      [3, 'aws-access-key-id'],
      [4, 'github-token'],
      [5, 'private-key-block'],
    ]);
    expect(JSON.stringify(f)).not.toContain('aaaa');
  });

  it('flags quoted credential assignments but not short or unquoted values', () => {
    expect(scanText('a.ts', `const password = "${'x'.repeat(30)}";`)).toHaveLength(1);
    expect(scanText('a.ts', 'const password = "short";')).toHaveLength(0);
    expect(scanText('a.ts', 'API_KEY=')).toHaveLength(0);
  });

  it('ignores prefixes mentioned in prose and skips lockfiles and source documents', () => {
    expect(
      scanText('docs/x.md', 'Redact obvious secrets such as sk-, AKIA and ghp_ before any LLM call.'),
    ).toHaveLength(0);
    expect(scanText('pnpm-lock.yaml', `x ${fake.openai}`)).toHaveLength(0);
    expect(scanText('docs/01-source/blueprint.pdf', `x ${fake.openai}`)).toHaveLength(0);
  });
});
