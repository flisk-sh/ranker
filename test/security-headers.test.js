import { test, expect } from 'bun:test';
import worker from '../src/index.js';
import { withSecurityHeaders } from '../src/security-headers.js';
import { fakeD1 } from './fake-d1.js';

const EXPECTED = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; media-src 'self' https:; frame-src 'self' https:; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'self' https://analytics.flisk.si; base-uri 'self'; form-action 'self' https:",
};

test('every Worker response carries the baseline security headers', async () => {
  const env = { DB: fakeD1() };
  for (const path of ['/health', '/robots.txt', '/nope-not-here']) {
    const res = await worker.fetch(new Request('https://ranker.flisk.si' + path), env, { waitUntil() {} });
    for (const [k, v] of Object.entries(EXPECTED)) expect(res.headers.get(k)).toBe(v);
  }
});

test('existing headers are kept and a CSP gains frame-ancestors', () => {
  const res = withSecurityHeaders(new Response('x', { headers: { 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'none'" } }));
  expect(res.headers.get('x-frame-options')).toBe('DENY');
  expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'self' https://analytics.flisk.si");
  const keep = withSecurityHeaders(new Response('x', { headers: { 'content-security-policy': 'frame-ancestors https://a.example' } }));
  expect(keep.headers.get('content-security-policy')).toBe('frame-ancestors https://a.example');
});

test('the body stream passes through untouched', async () => {
  const src = new Response('abc', { headers: { 'content-type': 'image/svg+xml' } });
  const out = withSecurityHeaders(src);
  expect(out.body).toBe(src.body);
  expect(await out.text()).toBe('abc');
});
