// A login token is "<payload>.<signature>", both base64url. Payload: { login, id (GitHub's number), aud, iat, exp }. Signed with Ed25519, so a
// site needs only the PUBLIC key to check it and never holds a secret. aud is the site's origin: a token made for
// grow.flisk.si is refused by chat.flisk.si.
export const TOKEN_SECONDS = 60;
const enc = new TextEncoder();
const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export async function makeKeys() {
  const pair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
  return { signingKey: b64u(await crypto.subtle.exportKey('pkcs8', pair.privateKey)), publicKey: b64u(await crypto.subtle.exportKey('raw', pair.publicKey)) };
}

export async function signToken(signingKey, { login, id, aud }, now = Date.now()) {
  const key = await crypto.subtle.importKey('pkcs8', unb64u(signingKey), 'Ed25519', false, ['sign']);
  const payload = b64u(enc.encode(JSON.stringify({ login, id, aud, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + TOKEN_SECONDS })));
  return `${payload}.${b64u(await crypto.subtle.sign('Ed25519', key, enc.encode(payload)))}`;
}

// { login } when the token is genuine, made for this site and not expired; otherwise null.
export async function verifyToken(token, publicKey, audience, now = Date.now()) {
  try {
    const [payload, sig] = String(token).split('.');
    if (!payload || !sig) return null;
    const key = await crypto.subtle.importKey('raw', unb64u(publicKey), 'Ed25519', false, ['verify']);
    if (!(await crypto.subtle.verify('Ed25519', key, unb64u(sig), enc.encode(payload)))) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64u(payload)));
    if (p.aud !== audience || !(p.exp * 1000 > now) || typeof p.login !== 'string' || !Number.isSafeInteger(p.id)) return null;
    return { login: p.login, id: p.id };
  } catch { return null; }
}
