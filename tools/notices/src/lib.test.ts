import { describe, expect, it } from 'vitest';
import { buildNotices, type NoticePackage } from './lib';

const p = (name: string, text: string | null, extra: Partial<NoticePackage> = {}): NoticePackage => ({
  name,
  version: '1.0.0',
  license: 'MIT',
  homepage: null,
  licenseText: text,
  noticeText: null,
  ...extra,
});

describe('buildNotices', () => {
  it('says so when nothing is shipped', () => {
    expect(buildNotices([])).toContain('No third-party software is shipped');
  });

  it('is deterministic and sorted regardless of input order', () => {
    const a = buildNotices([p('b', 'MIT text'), p('a', 'MIT text')]);
    const b = buildNotices([p('a', 'MIT text'), p('b', 'MIT text')]);
    expect(a).toBe(b);
    expect(a.indexOf('| a |')).toBeLessThan(a.indexOf('| b |'));
  });

  it('groups identical licence texts and lists every package under one heading', () => {
    const out = buildNotices([p('a', 'Same text\r\n'), p('b', 'Same text')]);
    expect(out.match(/### MIT/g)?.length).toBe(1);
    expect(out).toContain('Applies to: a@1.0.0, b@1.0.0');
  });

  it('reports packages with no licence file and includes NOTICE files', () => {
    const out = buildNotices([
      p('c', null),
      p('d', 'Apache text', { license: 'Apache-2.0', noticeText: 'Copyright d authors' }),
    ]);
    expect(out).toContain('no licence file found');
    expect(out).toContain('c@1.0.0');
    expect(out).toContain('## NOTICE files');
    expect(out).toContain('Copyright d authors');
  });
});
