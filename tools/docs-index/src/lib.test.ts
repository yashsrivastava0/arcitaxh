import { describe, expect, it } from 'vitest';
import {
  checkDocs,
  classify,
  extractLinks,
  isRealDate,
  splitFrontmatter,
  type CategoriesFile,
  type DocsInput,
} from './lib';

const categories: CategoriesFile = {
  categories: [
    { id: 'source', folder: '01-source', registryOnly: true },
    { id: 'pricing-and-payments', folder: '02-research/pricing-and-payments' },
    { id: 'market-and-competitors', folder: '02-research/market-and-competitors' },
    { id: 'phases', folder: '05-phases' },
  ],
  ignoredFolders: ['00-inbox', '02-research/_archive', '_templates', '_meta'],
  exemptFileNames: ['README.md', 'INDEX.md', 'CLAUDE.md'],
};

const schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'category',
    'type',
    'status',
    'tags',
    'created',
    'updated',
    'verified_on',
    'author',
    'sources',
    'supersedes',
    'related',
    'confidence_tags',
  ],
  properties: {
    title: { type: 'string', minLength: 1 },
    category: { type: 'string', enum: ['pricing-and-payments', 'market-and-competitors', 'phases'] },
    type: { type: 'string', enum: ['research', 'plan', 'note'] },
    status: { type: 'string', enum: ['draft', 'reviewed'] },
    tags: { type: 'array', items: { type: 'string' } },
    created: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    updated: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    verified_on: { anyOf: [{ type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, { type: 'null' }] },
    author: { type: 'string', enum: ['founder', 'agent'] },
    sources: { type: 'array', items: { type: 'string' } },
    supersedes: { type: 'array', items: { type: 'string' } },
    related: { type: 'array', items: { type: 'string' } },
    confidence_tags: { type: 'array', items: { type: 'string' } },
  },
};

const note = (over: Record<string, string> = {}, body = 'Body.\n'): string => {
  const fm: Record<string, string> = {
    title: '"A note"',
    category: 'pricing-and-payments',
    type: 'research',
    status: 'draft',
    tags: '[]',
    created: '2026-10-18',
    updated: '2026-10-18',
    verified_on: 'null',
    author: 'founder',
    sources: '[]',
    supersedes: '[]',
    related: '[]',
    confidence_tags: '[]',
    ...over,
  };
  return `---\n${Object.entries(fm)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}\n---\n\n${body}`;
};

const input = (files: Record<string, string>, extraPaths: string[] = []): DocsInput => ({
  files: new Map(Object.entries(files)),
  allPaths: new Set([...Object.keys(files), ...extraPaths]),
  schema,
  categories,
});

const messages = (files: Record<string, string>, extra: string[] = []): string =>
  checkDocs(input(files, extra))
    .problems.map((p) => `${p.file}: ${p.message}`)
    .join('\n');

const P = '02-research/pricing-and-payments';

describe('helpers', () => {
  it('validates real calendar dates', () => {
    expect(isRealDate('2026-10-18')).toBe(true);
    expect(isRealDate('2026-02-30')).toBe(false);
    expect(isRealDate('18-10-2026')).toBe(false);
  });

  it('splits frontmatter and reports missing or broken blocks', () => {
    expect('error' in splitFrontmatter('# no frontmatter')).toBe(true);
    expect('error' in splitFrontmatter('---\ntitle: x\n')).toBe(true);
    const ok = splitFrontmatter('---\ntitle: x\n---\nbody\n');
    expect('error' in ok).toBe(false);
  });

  it('extracts links outside code spans and fences', () => {
    const body = [
      'See [a](./a.md) and `[b](./b.md)`.',
      '```',
      '[c](./c.md)',
      '```',
      'Also [d](../d.md#frag) and ![i](img.png).',
    ].join('\n');
    expect(extractLinks(body)).toEqual(['./a.md', '../d.md#frag', 'img.png']);
  });

  it('classifies folders', () => {
    expect(classify('00-inbox/x.md', categories).kind).toBe('ignored');
    expect(classify('02-research/_archive/x.md', categories).kind).toBe('ignored');
    expect(classify('01-source/blueprint.pdf', categories).kind).toBe('source');
    expect(classify('02-research/README.md', categories).kind).toBe('exempt');
    expect(classify(`${P}/n.md`, categories)).toEqual({ kind: 'doc', category: 'pricing-and-payments' });
    expect(classify('99-unknown/n.md', categories).kind).toBe('orphan');
  });
});

describe('checkDocs', () => {
  it('accepts a valid note, ignores the inbox, and builds an index', () => {
    const r = checkDocs(
      input({ [`${P}/2026-10-18-a.md`]: note(), '00-inbox/raw.md': '# raw, no frontmatter, [broken](./nope.md)' }),
    );
    expect(r.problems).toEqual([]);
    expect(r.docs).toHaveLength(1);
    expect(r.index).toContain('| A note | research | draft | 2026-10-18 |');
  });

  it('rejects a category that does not match the folder', () => {
    expect(messages({ [`${P}/a.md`]: note({ category: 'market-and-competitors' }) })).toMatch(
      /does not match the folder's category "pricing-and-payments"/,
    );
  });

  it('rejects missing frontmatter, unknown values and extra keys', () => {
    expect(messages({ [`${P}/a.md`]: '# plain' })).toMatch(/missing frontmatter/);
    expect(messages({ [`${P}/a.md`]: note({ author: 'robot' }) })).toMatch(
      /author: must be equal to one of the allowed values/,
    );
    expect(messages({ [`${P}/a.md`]: note({ surprise: 'yes' }) })).toMatch(
      /must NOT have additional properties \(surprise\)/,
    );
  });

  it('rejects impossible dates and updated before created', () => {
    expect(messages({ [`${P}/a.md`]: note({ created: '2026-02-30', updated: '2026-02-30' }) })).toMatch(
      /not a real calendar date/,
    );
    expect(messages({ [`${P}/a.md`]: note({ created: '2026-10-18', updated: '2026-10-17' }) })).toMatch(
      /updated is earlier than created/,
    );
  });

  it('checks supersedes and related targets and relative body links', () => {
    expect(messages({ [`${P}/a.md`]: note({ supersedes: '["gone.md"]' }) })).toMatch(
      /supersedes target does not exist: gone\.md/,
    );
    expect(messages({ [`${P}/a.md`]: note({ related: '["b.md"]' }) }, [`${P}/b.md`])).toBe('');
    expect(messages({ [`${P}/a.md`]: note({}, 'See [x](./nope.md).\n') })).toMatch(
      /broken relative link: \.\/nope\.md/,
    );
    expect(
      messages({ [`${P}/a.md`]: note({}, 'See [x](./b.md) and [ext](https://example.com).\n') }, [`${P}/b.md`]),
    ).toBe('');
  });

  it('exempts README files from frontmatter but still checks their links', () => {
    expect(messages({ [`${P}/README.md`]: '# readme\n[ok](./a.md)', [`${P}/a.md`]: note() })).toBe('');
    expect(messages({ [`${P}/README.md`]: '# readme\n[bad](./zzz.md)' })).toMatch(/broken relative link/);
  });

  it('flags a markdown file outside every category folder', () => {
    expect(messages({ '99-unknown/n.md': note() })).toMatch(/outside every category folder/);
  });

  it('fails when the schema enum and categories.json disagree', () => {
    const bad = {
      ...schema,
      properties: { ...schema.properties, category: { type: 'string', enum: ['pricing-and-payments'] } },
    };
    const r = checkDocs({ ...input({}), schema: bad });
    expect(r.problems.map((p) => p.message).join('\n')).toMatch(/category enum in frontmatter\.schema\.json/);
  });

  it('generates a deterministic index: newest first within a category, source files listed', () => {
    const files = {
      [`${P}/2026-10-01-old.md`]: note({ title: '"Old"', created: '2026-10-01', updated: '2026-10-01' }),
      [`${P}/2026-10-18-new.md`]: note({ title: '"New"' }),
      '01-source/blueprint.pdf': '',
    };
    const a = checkDocs(input(files)).index;
    const b = checkDocs(input(Object.fromEntries(Object.entries(files).reverse()))).index;
    expect(a).toBe(b);
    expect(a.indexOf('| New |')).toBeLessThan(a.indexOf('| Old |'));
    expect(a).toContain('blueprint.pdf');
  });
});
