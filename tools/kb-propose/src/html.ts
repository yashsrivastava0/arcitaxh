// Extracts readable text from an HTML page for a snapshot. Deliberately simple: the founder checks every quote against
// the live page anyway, and the snapshot only has to contain the sentences a quote is copied from.

const NAMED: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  copy: '©',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const cp = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : whole;
    }
    if (body.startsWith('#')) {
      const cp = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : whole;
    }
    return NAMED[body.toLowerCase()] ?? whole;
  });
}

export function htmlToText(html: string): string {
  let t = html.replace(/\r\n/g, '\n');
  t = t.replace(/<!--[\s\S]*?-->/g, ' ');
  t = t.replace(/<(script|style|noscript|svg|template|head)\b[\s\S]*?<\/\1\s*>/gi, ' ');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(
    /<\/(p|div|section|article|header|footer|li|ul|ol|tr|table|h[1-6]|pre|blockquote|dd|dt|dl)\s*>/gi,
    '\n',
  );
  t = t.replace(/<\/(td|th)\s*>/gi, ' | ');
  t = t.replace(/<[^>]*>/g, ' ');
  t = decodeEntities(t);
  return t
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim()) // any whitespace except a newline, including non-breaking spaces
    .filter((line, i, all) => line !== '' || (all[i - 1] ?? '') !== '')
    .join('\n')
    .trim();
}
