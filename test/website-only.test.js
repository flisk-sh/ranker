import { test, expect } from 'bun:test';
import { handle, snapshot } from '../src/index.js';
import { fakeD1 } from './fake-d1.js';
import { siteOf } from '../src/github.js';

const NOW = Date.UTC(2026, 10, 24, 12);
const HTML = (badge) => `<html><head><title>AI-Atlas &mdash; Map what you&#x27;ve built.</title><meta name="description" content="AI-Atlas builds a map of AI skills."/></head><body>${badge || ''}<a href="https://github.com/someone/else">x</a></body></html>`;
const setup = (badge) => {
  const env = { DB: fakeD1() };
  const calls = [];
  const fetch = async (url) => { calls.push(String(url)); return String(url).startsWith('https://getaiatlas.com') ? new Response(HTML(badge)) : new Response('', { status: 404 }); };
  const deps = { fetch, now: () => NOW };
  const call = (path, init) => handle(new Request('https://ranker.flisk.si' + path, init), env, deps);
  return { env, calls, deps, call, post: (p, b) => call(p, { method: 'POST', body: JSON.stringify(b) }) };
};

test('siteOf accepts plain websites only', () => {
  expect(siteOf('https://www.GetAIAtlas.com/x')).toBe('getaiatlas.com');
  expect(siteOf('https://github.com/a/b')).toBe('');
  expect(siteOf('http://localhost:3000')).toBe('');
  expect(siteOf('nope')).toBe('');
});

test('a website with no repo of its own is listed, has a page, a badge, and no GitHub calls', async () => {
  const t = setup();
  // The site only links to other people's repos with an unrelated path; resolveLink must not steal one.
  const r = await t.post('/api/submit', { url: 'https://getaiatlas.com/' });
  expect(r.status).toBe(200);
  const j = await r.json();
  expect(j.slug).toBe('site-getaiatlas-com');
  expect(j.product.name).toBe('AI-Atlas');
  expect(j.product.repo).toBe('site/getaiatlas.com');
  const page = await t.call('/site/getaiatlas.com');
  expect(page.status).toBe(200);
  const html = await page.text();
  expect(html).toContain('Website');
  expect(html).not.toContain('View on GitHub');
  expect((await (await t.call('/badge/site-getaiatlas-com.svg')).text())).toContain('svg');
  t.calls.length = 0;
  await snapshot(t.env, t.deps);
  expect(t.calls.some((c) => c.includes('api.github.com'))).toBe(false);
});

test('a website is verified when its page carries the badge', async () => {
  const t = setup();
  await t.post('/api/submit', { url: 'https://getaiatlas.com/' });
  expect((await (await t.post('/api/verify/site-getaiatlas-com')).json()).verified).toBe(false);
  const t2 = setup('<img src="https://ranker.flisk.si/badge/site-getaiatlas-com.svg">');
  await t2.post('/api/submit', { url: 'https://getaiatlas.com/' });
  expect((await (await t2.post('/api/verify/site-getaiatlas-com')).json()).verified).toBe(true);
});
