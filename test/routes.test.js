import { test, expect } from 'bun:test';
import { handle, snapshot } from '../src/index.js';
import { parseRepo, slugOf } from '../src/github.js';
import { fakeD1 } from './fake-d1.js';
import { fakeGithub } from './fixtures.js';

const NOW = Date.UTC(2026, 10, 16, 12);
const setup = (repos, readmes, vars = {}) => {
  const env = { DB: fakeD1(), ...vars };
  const gh = fakeGithub(repos, readmes);
  const deps = { fetch: gh, now: () => NOW };
  const call = (path, init) => handle(new Request('https://ranker.flisk.si' + path, init), env, deps);
  const post = (path, body) => call(path, { method: 'POST', body: JSON.stringify(body) });
  return { env, gh, deps, call, post };
};

test('parseRepo and slugOf', () => {
  expect(parseRepo('https://github.com/Acme/Run.git/issues')).toBe('Acme/Run');
  expect(parseRepo('https://example.com/a/b')).toBe('');
  expect(parseRepo('https://github.com/sponsors/x')).toBe('');
  expect(slugOf('Acme/Run.js')).toBe('acme-run-js');
});

test('submit imports the repo, lists it and serves its badge', async () => {
  const t = setup({ 'acme/run': { stars: 4200 } });
  const r = await t.post('/api/submit', { url: 'https://github.com/acme/run' });
  expect(r.status).toBe(200);
  expect((await r.json()).slug).toBe('acme-run');
  const page = await (await t.call('/p/acme-run')).text();
  expect(page).toContain('Check my README');
  const b = await t.call('/badge/acme-run.svg');
  expect(b.headers.get('content-type')).toContain('image/svg+xml');
  expect(await b.text()).toContain('#1 Trending today');
  expect(await (await t.call('/badge/acme-run.svg?size=small')).text()).toContain('height="20"');
});

test('submitting twice does not count twice', async () => {
  const t = setup({ 'acme/run': { stars: 1 } });
  await t.post('/api/submit', { url: 'https://github.com/acme/run' });
  await t.post('/api/submit', { url: 'https://github.com/acme/run' });
  expect((await t.env.DB.prepare('SELECT n FROM days').first()).n).toBe(1);
});

test('bad link, missing repo and the daily cap', async () => {
  const t = setup({ 'a/one': { stars: 1 }, 'a/two': { stars: 1 } }, {}, { SUBMITS_PER_DAY: '1' });
  expect((await t.post('/api/submit', { url: 'nope' })).status).toBe(400);
  expect((await t.post('/api/submit', { url: 'https://github.com/a/missing' })).status).toBe(422);
  expect((await t.post('/api/submit', { url: 'https://github.com/a/one' })).status).toBe(200);
  expect((await t.post('/api/submit', { url: 'https://github.com/a/two' })).status).toBe(429);
});

test('unknown slug gets a Not listed badge, sample works', async () => {
  const t = setup({});
  expect(await (await t.call('/badge/ghost.svg')).text()).toContain('Not listed yet');
  expect(await (await t.call('/badge/sample.svg')).text()).toContain('#1 Trending');
});

test('verify finds the badge in the README', async () => {
  const t = setup({ 'acme/run': { stars: 1 } }, { 'acme/run': 'hi ![x](https://ranker.flisk.si/badge/acme-run.svg)' });
  await t.post('/api/submit', { url: 'https://github.com/acme/run' });
  expect((await (await t.post('/api/verify/acme-run', {})).json()).verified).toBe(true);
  expect((await t.env.DB.prepare('SELECT verified v FROM products').first()).v).toBe(1);
  expect((await t.post('/api/verify/ghost', {})).status).toBe(404);
});

test('verify says false when the badge is missing', async () => {
  const t = setup({ 'acme/run': { stars: 1 } }, { 'acme/run': 'nothing here' });
  await t.post('/api/submit', { url: 'https://github.com/acme/run' });
  expect((await (await t.post('/api/verify/acme-run', {})).json()).verified).toBe(false);
});

test('snapshot job adds today, tomorrow gain ranks the climber first', async () => {
  const repos = { 'a/slow': { stars: 100 }, 'a/fast': { stars: 50 } };
  const t = setup(repos);
  await t.post('/api/submit', { url: 'https://github.com/a/slow' });
  await t.post('/api/submit', { url: 'https://github.com/a/fast' });
  expect(await snapshot(t.env, t.deps)).toBe(0);
  repos['a/fast'].stars = 90; repos['a/slow'].stars = 101;
  const next = { ...t.deps, now: () => NOW + 864e5 };
  expect(await snapshot(t.env, next)).toBe(2);
  const r = await (await handle(new Request('https://ranker.flisk.si/api/trending'), t.env, next)).json();
  expect(r.map((x) => x.slug)).toEqual(['a-fast', 'a-slow']);
  expect(r[0].gain).toBe(40);
});

test('pages and plumbing answer', async () => {
  const t = setup({});
  for (const p of ['/', '/?period=weekly', '/submit', '/badges', '/compare', '/live', '/health', '/robots.txt', '/llms.txt', '/icon.svg']) expect((await t.call(p)).status).toBe(200);
  expect((await t.call('/p/ghost')).status).toBe(404);
  expect((await t.call('/nope')).status).toBe(404);
});

test('tick runs the snapshot once an hour', async () => {
  const { tick } = await import('../src/index.js');
  const t = setup({ 'a/x': { stars: 5 } });
  await t.post('/api/submit', { url: 'https://github.com/a/x' });
  const next = { ...t.deps, now: () => NOW + 864e5 };
  expect(await tick(t.env, next)).toBe(1);
  expect(await tick(t.env, next)).toBe(0);
});

test('compare shows the chosen products side by side', async () => {
  const t = setup({ 'a/one': { stars: 10 }, 'a/two': { stars: 20 } });
  await t.post('/api/submit', { url: 'https://github.com/a/one' });
  await t.post('/api/submit', { url: 'https://github.com/a/two' });
  const h = await (await t.call('/compare?p=a-one,a-two,ghost')).text();
  expect(h).toContain('a-one'.replace('a-one', 'one'));
  expect(h).toContain(' vs ');
  expect(await (await t.call('/compare')).text()).toContain('Pick two to four');
});

test('badge ?scope=language ranks inside the language', async () => {
  const { fakeD1 } = await import('./fake-d1.js');
  const { handle } = await import('../src/index.js');
  const env = { DB: fakeD1() };
  const day = new Date().toISOString().slice(0, 10);
  const add = (slug, lang, stars, base) => { env.DB.raw.run('INSERT INTO products (slug, repo, name, tagline, homepage, license, language, topics, verified, created) VALUES (?,?,?,?,?,?,?,?,0,?)', [slug, `o/${slug}`, slug, '', '', '', lang, '', 1]); env.DB.raw.run('INSERT INTO snapshots VALUES (?,?,?,0)', [slug, new Date(Date.now() - 864e5).toISOString().slice(0, 10), base]); env.DB.raw.run('INSERT INTO snapshots VALUES (?,?,?,0)', [slug, day, stars]); };
  add('big-js', 'JavaScript', 900, 100); add('star-a', 'Starlark', 50, 40); add('star-b', 'Starlark', 20, 5);
  const get = async (slug) => (await handle(new Request(`https://r.si/badge/${slug}.svg?scope=language`), env, {})).text();
  expect(await get('star-a')).toContain('#2 in Starlark');
  expect(await get('star-b')).toContain('#1 in Starlark');
});
