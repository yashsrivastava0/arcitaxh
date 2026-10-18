// The curator tool fetches URLs an agent or a person supplies. It must not be usable to reach internal services (SSRF).
// This guards the URL's form and literal host. It cannot stop DNS rebinding; the tool runs on the founder's machine and
// only ever saves text to a file, so that residual risk is accepted and recorded in the tool's README.

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

function isPrivateIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

/** Throws UnsafeUrlError unless the URL is a plain public https URL. Returns the parsed URL. */
export function assertPublicHttpsUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError(`not a valid URL: ${raw}`);
  }
  if (url.protocol !== 'https:') throw new UnsafeUrlError(`only https URLs are fetched (got ${url.protocol})`);
  if (url.username !== '' || url.password !== '') throw new UnsafeUrlError('URLs with credentials are refused');
  if (url.port !== '') throw new UnsafeUrlError('URLs with an explicit port are refused');
  const host = url.hostname.toLowerCase();
  if (host.startsWith('[') || host.includes(':')) throw new UnsafeUrlError('IPv6 literal hosts are refused');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan')
  ) {
    throw new UnsafeUrlError(`internal host refused: ${host}`);
  }
  if (!host.includes('.')) throw new UnsafeUrlError(`single-label host refused: ${host}`);
  if (/^\d+(\.\d+){3}$/.test(host)) {
    if (isPrivateIpv4(host)) throw new UnsafeUrlError(`private or reserved address refused: ${host}`);
  } else if (/^[\d.]+$/.test(host) || /^0x/i.test(host)) {
    throw new UnsafeUrlError(`numeric host refused: ${host}`);
  }
  return url;
}
