import { test, expect } from 'bun:test';
import { handle } from '../src/index.js';
import { userBox } from '../src/page.js';
import { makeKeys, signToken } from '../src/token.js';
import { fakeD1 } from './fake-d1.js';

// The org bar (flisk.si/assets/bar.js) reads the signed-in login from [data-flisk-login]: its whole text must be the login.
const O = 'https://ranker.flisk.si';
async function session() {
  const k = await makeKeys(), env = { DB: fakeD1(), LOGIN_PUBLIC_KEY: k.publicKey, SESSION_SECRET: 's3cret' };
  const tok = await signToken(k.signingKey, { login: 'octo-cat', id: 1, aud: O }, Date.now());
  const ok = await handle(new Request(O + '/auth?flisk_token=' + tok), env);
  return { env, cookie: ok.headers.get('set-cookie').split(';')[0] };
}
const hooks = (html) => [...html.matchAll(/<span data-flisk-login>([^<]*)<\/span>/g)].map((m) => m[1]);

test('userBox: login alone in the hook, text and link unchanged, escaped', () => {
  expect(userBox('octo-cat')).toBe('<a class="me" href="/logout" title="Sign out"><span data-flisk-login>octo-cat</span> &middot; signed in</a>');
  expect(userBox('<b>x')).toContain('<span data-flisk-login>&lt;b&gt;x</span>');
  expect(userBox(null)).not.toContain('data-flisk-login');
});

test('signed in: every html page has exactly one hook with the login; private', async () => {
  const { env, cookie } = await session();
  for (const path of ['/', '/submit', '/compare', '/live', '/badges', '/p/nope-not-listed']) {
    const r = await handle(new Request(O + path, { headers: { cookie } }), env);
    expect(r.headers.get('content-type')).toContain('text/html');
    expect(r.headers.get('cache-control')).toContain('private');
    expect(hooks(await r.text())).toEqual(['octo-cat']);
  }
});

test('signed out and forged cookie: no hook', async () => {
  const { env } = await session();
  for (const headers of [{}, { cookie: 'rk_user=evil.abc' }]) {
    const html = await (await handle(new Request(O + '/submit', { headers }), env)).text();
    expect(html).not.toContain('data-flisk-login');
    expect(html).toContain('href="/login"');
  }
});
