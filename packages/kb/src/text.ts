// Text helpers for the quote rules (spec 8.5 step 4): the quote must appear verbatim in the snapshot, and every
// number in a proposal must appear in its quote. Pure and deterministic.

/** Collapses CRLF and runs of whitespace so that line-wrapping in extracted page text does not defeat a match. */
export function collapseWhitespace(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
}

/** True when `quote` appears verbatim in `snapshot`, ignoring only differences in whitespace. */
export function quoteAppearsIn(quote: string, snapshot: string): boolean {
  const q = collapseWhitespace(quote);
  return q.length > 0 && collapseWhitespace(snapshot).includes(q);
}

/**
 * The numbers written in a text, as numbers: "1,000" is 1000, "$2.50" is 2.5, "10%" is 10. A thousands separator
 * is a comma followed by exactly three digits. Anything else (words like "ten", units like "k" or "M") is not
 * converted: a proposal whose number is only written that way is rejected for a person to handle, never guessed.
 */
export function numbersInText(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\d+(?:,\d{3})*(?:\.\d+)?/g)) {
    out.push(Number(m[0].replace(/,/g, '')));
  }
  return out;
}

/** Every number-typed value, and every decimal-string amount, found anywhere inside a record body. */
export function numbersInBody(body: unknown): number[] {
  const out: number[] = [];
  const walk = (v: unknown, key: string): void => {
    if (typeof v === 'number') out.push(v);
    else if (typeof v === 'string' && key === 'amount' && /^\d+(\.\d+)?$/.test(v)) out.push(Number(v));
    else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v !== null && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(body, '');
  return out;
}
