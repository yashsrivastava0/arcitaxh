import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { kbProposalSchema, kbRecordSchema } from '@product/core';
import { afterEach, describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { draftProposal, saveSnapshot } from './draft';
import { fetchPage } from './fetch-page';
import { decodeEntities, htmlToText } from './html';
import { assertPublicHttpsUrl, UnsafeUrlError } from './url-guard';

const tmps: string[] = [];
const kbRoot = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'kb-propose-test-'));
  tmps.push(d);
  return d;
};
afterEach(() => {
  while (tmps.length > 0) rmSync(tmps.pop() as string, { recursive: true, force: true });
});

describe('htmlToText', () => {
  it('drops scripts, styles and comments, keeps block structure, and decodes entities', () => {
    const html = `<html><head><title>x</title><style>p{color:red}</style></head><body>
      <!-- hidden --><script>var a = "1,000 secret";</script>
      <h1>Pricing</h1><p>Free plan includes&nbsp;1,000 vectors &amp; 3&#160;projects.</p>
      <table><tr><td>Pro</td><td>$25 / month</td></tr></table><ul><li>One</li><li>Two</li></ul></body></html>`;
    const text = htmlToText(html);
    expect(text).toContain('Pricing');
    expect(text).toContain('Free plan includes 1,000 vectors & 3 projects.');
    expect(text).toContain('Pro | $25 / month |');
    expect(text.split('\n')).toEqual(expect.arrayContaining(['One', 'Two']));
    expect(text).not.toMatch(/secret|color:red|hidden|<|>/);
  });

  it('decodes numeric and named entities and leaves unknown ones alone', () => {
    expect(decodeEntities('&#65;&#x42;&copy;&unknownthing;&#0;')).toBe('AB©&unknownthing;&#0;');
  });
});

describe('assertPublicHttpsUrl (SSRF guard)', () => {
  it('accepts a plain public https URL', () => {
    expect(assertPublicHttpsUrl('https://docs.example-vendor.dev/pricing#plans').hostname).toBe(
      'docs.example-vendor.dev',
    );
  });

  it.each([
    'http://docs.vendor.dev/pricing',
    'ftp://vendor.dev/x',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'https://user:pass@vendor.dev/x',
    'https://vendor.dev:8443/x',
    'https://localhost/x',
    'https://app.localhost/x',
    'https://intranet/x',
    'https://printer.local/x',
    'https://svc.internal/x',
    'https://127.0.0.1/x',
    'https://10.0.0.5/x',
    'https://172.16.0.1/x',
    'https://172.31.255.255/x',
    'https://192.168.1.1/x',
    'https://169.254.169.254/latest/meta-data',
    'https://100.64.0.1/x',
    'https://0.0.0.0/x',
    'https://[::1]/x',
    'https://2130706433/x',
    'https://0x7f000001/x',
    'not a url',
  ])('refuses %s', (url) => {
    expect(() => assertPublicHttpsUrl(url)).toThrow(UnsafeUrlError);
  });

  it('allows public IPv4 addresses just outside the private ranges', () => {
    expect(() => assertPublicHttpsUrl('https://172.32.0.1/x')).not.toThrow();
    expect(() => assertPublicHttpsUrl('https://8.8.8.8/x')).not.toThrow();
  });
});

const html = (body: string, type = 'text/html; charset=utf-8') =>
  new Response(body, { status: 200, headers: { 'content-type': type } });

describe('fetchPage (with an injected fetch; no network)', () => {
  it('returns the extracted text and the final URL', async () => {
    const calls: string[] = [];
    const page = await fetchPage('https://docs.vendor.dev/pricing', {
      fetchImpl: async (u) => {
        calls.push(String(u));
        return html('<p>Free plan: 1,000 vectors.</p>');
      },
    });
    expect(page.text).toBe('Free plan: 1,000 vectors.');
    expect(page.finalUrl).toBe('https://docs.vendor.dev/pricing');
    expect(calls).toHaveLength(1);
  });

  it('follows redirects manually and re-validates every hop', async () => {
    let n = 0;
    const ok = await fetchPage('https://a.vendor.dev/x', {
      fetchImpl: async () =>
        n++ === 0
          ? new Response(null, { status: 301, headers: { location: 'https://b.vendor.dev/y' } })
          : html('<p>hello</p>'),
    });
    expect(ok.finalUrl).toBe('https://b.vendor.dev/y');
    await expect(
      fetchPage('https://a.vendor.dev/x', {
        fetchImpl: async () =>
          new Response(null, { status: 302, headers: { location: 'https://169.254.169.254/latest' } }),
      }),
    ).rejects.toThrow(UnsafeUrlError);
    await expect(
      fetchPage('https://a.vendor.dev/x', {
        fetchImpl: async () => new Response(null, { status: 302, headers: { location: 'http://b.vendor.dev/' } }),
      }),
    ).rejects.toThrow(UnsafeUrlError);
  });

  it('stops after too many redirects and refuses a missing Location', async () => {
    await expect(
      fetchPage('https://a.vendor.dev/x', {
        maxRedirects: 2,
        fetchImpl: async () => new Response(null, { status: 302, headers: { location: 'https://a.vendor.dev/x' } }),
      }),
    ).rejects.toThrow(/too many redirects/);
    await expect(
      fetchPage('https://a.vendor.dev/x', { fetchImpl: async () => new Response(null, { status: 302 }) }),
    ).rejects.toThrow(/Location/);
  });

  it('refuses errors, non-text content, and oversized pages', async () => {
    await expect(
      fetchPage('https://a.vendor.dev/x', { fetchImpl: async () => new Response('no', { status: 404 }) }),
    ).rejects.toThrow(/HTTP 404/);
    await expect(
      fetchPage('https://a.vendor.dev/x', { fetchImpl: async () => html('%PDF', 'application/pdf') }),
    ).rejects.toThrow(/unsupported content type/);
    await expect(
      fetchPage('https://a.vendor.dev/x', { maxBytes: 10, fetchImpl: async () => html('x'.repeat(100)) }),
    ).rejects.toThrow(/larger than 10 bytes/);
  });

  it('refuses an unsafe starting URL before any request', async () => {
    let called = false;
    await expect(
      fetchPage('https://127.0.0.1/x', { fetchImpl: async () => ((called = true), html('x')) }),
    ).rejects.toThrow(UnsafeUrlError);
    expect(called).toBe(false);
  });
});

describe('drafting a proposal', () => {
  const URL_A = 'https://docs.vendor.dev/pricing';
  const QUOTE = 'The free plan includes 1,000 vectors per project.';
  const spec = (over: Record<string, unknown> = {}) => ({
    id: 'limit.vendor.free-tier.2026-10',
    type: 'limit',
    decision_type: 'vector-store',
    subject: 'option.vendor',
    body: {
      scope: 'free_tier',
      metric: 'stored_vectors',
      value: 1000,
      unit: 'vectors',
      period: 'none',
      overage_behaviour: 'hard_stop',
      pauses_after_inactivity: false,
      scales_to_zero: false,
    },
    source: { url: URL_A, quote: QUOTE },
    curator_note: '',
    ...over,
  });
  const setup = (): string => {
    const root = kbRoot();
    saveSnapshot(root, 'limit.vendor.free-tier.2026-10', URL_A, '2026-10-20', `Pricing\n${QUOTE}\nMore text.`);
    return root;
  };

  it('writes a proposal that is unverified, status proposed, and cannot be mistaken for a record', () => {
    const root = setup();
    const r = draftProposal(root, spec());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const written = parseYaml(readFileSync(r.path, 'utf8')) as unknown;
    expect(kbProposalSchema.safeParse(written).success).toBe(true);
    expect(kbRecordSchema.safeParse(written).success).toBe(false);
    expect(r.proposal.status).toBe('proposed');
    expect(r.proposal.verification).toEqual({ last_verified: null, valid_until: null, verified_by: null });
    expect(r.proposal.source.retrieved_on).toBe('2026-10-20'); // from the snapshot, not supplied by the curator
    expect(r.path).toContain(join(root, 'proposals'));
    expect(existsSync(join(root, 'records'))).toBe(false); // never writes a record
  });

  it('writes nothing when the quote is not in the snapshot', () => {
    const root = setup();
    const r = draftProposal(
      root,
      spec({ source: { url: URL_A, quote: 'The free plan includes 5,000 vectors per project.' } }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.join(' ')).toMatch(/quote-missing/);
    expect(existsSync(join(root, 'proposals'))).toBe(false);
  });

  it('writes nothing when a number in the body is not in the quote', () => {
    const root = setup();
    const body = { ...spec().body, value: 2000 };
    const r = draftProposal(root, spec({ body }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.join(' ')).toMatch(/number-not-in-quote.*2000|2000.*not in its quote/);
  });

  it('writes nothing when the URL differs from the snapshotted page', () => {
    const root = setup();
    const r = draftProposal(root, spec({ source: { url: 'https://docs.other.dev/pricing', quote: QUOTE } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.join(' ')).toMatch(/snapshot-url-mismatch/);
  });

  it('needs a snapshot first, and rejects a malformed spec with the field named', () => {
    const r = draftProposal(kbRoot(), spec());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems[0]).toMatch(/no snapshot/);
    const bad = draftProposal(kbRoot(), { id: 'x' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.problems.join(' ')).toMatch(/spec type|spec decision_type/);
  });

  it('will not claim a verifier even if the spec tries to smuggle one in', () => {
    const root = setup();
    const r = draftProposal(root, { ...spec(), verification: { verified_by: 'model' }, status: 'verified' });
    expect(r.ok).toBe(false); // strict spec: unknown keys are rejected
  });

  it('does not overwrite an existing proposal or snapshot without --force, and refuses to shadow a record', () => {
    const root = setup();
    expect(draftProposal(root, spec()).ok).toBe(true);
    const again = draftProposal(root, spec());
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.problems[0]).toMatch(/already exists/);
    expect(draftProposal(root, spec(), { force: true }).ok).toBe(true);
    expect(() => saveSnapshot(root, 'limit.vendor.free-tier.2026-10', URL_A, '2026-10-21', 'new')).toThrow(
      /already exists/,
    );

    const shadow = setup();
    mkdirSync(join(shadow, 'records/vector-store'), { recursive: true });
    writeFileSync(join(shadow, 'records/vector-store/limit.vendor.free-tier.2026-10.yaml'), 'id: x\n');
    const r = draftProposal(shadow, spec());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems[0]).toMatch(/already exists/);
  });
});
