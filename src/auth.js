// Sign-in goes through login.flisk.si (flisk-sh/login). It sends the visitor back with a 60-second signed token;
// we check it with the public key and keep the name in a signed cookie. No password, no GitHub token stored.
import { verifyToken } from './token.js';

const enc = new TextEncoder();
const COOKIE = 'rk_user';
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export const userOf = async (req, env) => {
  const raw = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(req.headers.get('cookie') || '')?.[1] || '';
  const at = raw.lastIndexOf('.');
  if (!raw || !env.SESSION_SECRET) return null;
  const login = raw.slice(0, at);
  return /^[A-Za-z0-9-]{1,39}$/.test(login) && (await hmac(env.SESSION_SECRET, login)) === raw.slice(at + 1) ? login : null;
};
const cookie = (v, age) => `${COOKIE}=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;

export async function authRoute(req, env, now) {
  const u = new URL(req.url);
  if (u.pathname === '/login') {
    const to = new URL('https://login.flisk.si/start');
    to.searchParams.set('return', `${u.origin}/auth`);
    return new Response(null, { status: 302, headers: { location: to.href, 'cache-control': 'no-store' } });
  }
  if (u.pathname === '/logout') return new Response(null, { status: 302, headers: { location: '/', 'set-cookie': cookie('', 0) } });
  if (u.pathname === '/auth') {
    const who = await verifyToken(u.searchParams.get('flisk_token'), env.LOGIN_PUBLIC_KEY, u.origin, now);
    if (!who || !env.SESSION_SECRET) return new Response('Sign-in did not work. Go back and try again.', { status: 400 });
    return new Response(null, { status: 302, headers: { location: '/submit', 'set-cookie': cookie(`${who.login}.${await hmac(env.SESSION_SECRET, who.login)}`, 2592000), 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
  }
  return null;
}
export const _hmac = hmac;
