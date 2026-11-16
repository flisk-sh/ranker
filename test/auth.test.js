import { test, expect } from 'bun:test';
import { handle } from '../src/index.js';
import { makeKeys, signToken } from '../src/token.js';
import { fakeD1 } from './fake-d1.js';

test('sign-in: /login goes to login.flisk.si, /auth sets a signed cookie, nav shows the name', async () => {
  const k = await makeKeys(), env = { DB: fakeD1(), LOGIN_PUBLIC_KEY: k.publicKey, SESSION_SECRET: 's3cret' };
  const r = await handle(new Request('https://ranker.flisk.si/login'), env);
  expect(r.status).toBe(302);
  expect(r.headers.get('location')).toContain('https://login.flisk.si/start?return=https%3A%2F%2Franker.flisk.si%2Fauth');
  const bad = await handle(new Request('https://ranker.flisk.si/auth?flisk_token=x'), env);
  expect(bad.status).toBe(400);
  const tok = await signToken(k.signingKey, { login: 'odykyi', id: 1, aud: 'https://ranker.flisk.si' }, Date.now());
  const ok = await handle(new Request('https://ranker.flisk.si/auth?flisk_token=' + tok), env);
  expect(ok.status).toBe(302);
  const cookie = ok.headers.get('set-cookie').split(';')[0];
  const page = await (await handle(new Request('https://ranker.flisk.si/submit', { headers: { cookie } }), env)).text();
  expect(page).toContain('odykyi');
  const forged = await (await handle(new Request('https://ranker.flisk.si/submit', { headers: { cookie: 'rk_user=evil.abc' } }), env)).text();
  expect(forged).not.toContain('evil');
});
