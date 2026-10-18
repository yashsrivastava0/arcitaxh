import { describe, expect, it } from 'vitest';
import { collapseWhitespace, numbersInBody, numbersInText, quoteAppearsIn } from './text';

describe('quoteAppearsIn', () => {
  const page = 'Free plan\r\nincludes   up to 1,000 vectors\nper project.\nPro plan is billed monthly.';

  it('finds a verbatim quote even when the page text wraps differently', () => {
    expect(quoteAppearsIn('Free plan includes up to 1,000 vectors per project.', page)).toBe(true);
    expect(quoteAppearsIn('Pro plan is billed monthly.', page)).toBe(true);
  });

  it('does not find a paraphrase, a changed number or different case', () => {
    expect(quoteAppearsIn('Free plan includes up to 10,000 vectors per project.', page)).toBe(false);
    expect(quoteAppearsIn('The free plan includes up to 1,000 vectors', page)).toBe(false);
    expect(quoteAppearsIn('free plan includes up to 1,000 vectors', page)).toBe(false);
  });

  it('never matches an empty quote', () => {
    expect(quoteAppearsIn('', page)).toBe(false);
    expect(quoteAppearsIn('   ', page)).toBe(false);
  });

  it('collapseWhitespace normalises CRLF and runs', () => {
    expect(collapseWhitespace(' a\r\n\r\n b\t c ')).toBe('a b c');
  });
});

describe('numbersInText', () => {
  it('reads plain, decimal, currency and separated numbers', () => {
    expect(numbersInText('1,000 vectors, $2.50 per unit, 10% off, 3 projects')).toEqual([1000, 2.5, 10, 3]);
  });

  it('does not treat a comma list as one number', () => {
    expect(numbersInText('1,23 and 12,34')).toEqual([1, 23, 12, 34]);
  });

  it('does not convert words or suffixes (a person must handle those)', () => {
    expect(numbersInText('ten users, 5k vectors, 2M rows')).toEqual([5, 2]);
  });
});

describe('numbersInBody', () => {
  it('collects number fields and decimal-string amounts, not other strings', () => {
    expect(
      numbersInBody({
        value: 1000,
        nested: { p50_ms: 10, list: [1, 2] },
        amount: '2.50',
        capability_id: 'hybrid_search',
        region: 'eu-example-1',
        measured_on: '2026-10-18',
      }),
    ).toEqual([1000, 10, 1, 2, 2.5]);
  });
});
