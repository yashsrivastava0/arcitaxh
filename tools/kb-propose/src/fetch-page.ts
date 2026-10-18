import { htmlToText } from './html';
import { assertPublicHttpsUrl } from './url-guard';

export interface PageResult {
  /** The URL the text was actually read from, after redirects. */
  finalUrl: string;
  text: string;
}

export interface FetchOptions {
  fetchImpl?: typeof fetch;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

async function readLimited(res: Response, maxBytes: number): Promise<string> {
  if (res.body === null) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`page is larger than ${maxBytes} bytes; refusing to snapshot it`);
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder('utf-8').decode(all);
}

/**
 * Fetches a public https page and returns its text. Redirects are followed manually so every hop is re-validated
 * against the same guard; the size and time are bounded. Only text/html and text/plain are accepted.
 */
export async function fetchPage(rawUrl: string, opts: FetchOptions = {}): Promise<PageResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  let url = assertPublicHttpsUrl(rawUrl);
  for (let hop = 0; hop <= (opts.maxRedirects ?? 5); hop += 1) {
    const res = await doFetch(url.toString(), {
      redirect: 'manual',
      signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
      headers: {
        'user-agent': 'kb-curator/0 (knowledge-base snapshot; contact the site owner via the repository)',
        accept: 'text/html,text/plain;q=0.9',
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (location === null) throw new Error(`redirect ${res.status} without a Location header`);
      url = assertPublicHttpsUrl(new URL(location, url).toString());
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.toString()}`);
    const type = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!type.includes('text/html') && !type.includes('text/plain'))
      throw new Error(`unsupported content type "${type}"`);
    const body = await readLimited(res, maxBytes);
    return {
      finalUrl: url.toString(),
      text: type.includes('text/html') ? htmlToText(body) : body.replace(/\r\n/g, '\n').trim(),
    };
  }
  throw new Error('too many redirects');
}
