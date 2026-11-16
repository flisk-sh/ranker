// Flisk Ranker Worker: routes plus the hourly snapshot job.
import { parseRepo, resolveLink, slugOf, fetchRepo, hasBadge, fetchFacts } from './github.js';
import { trending, withoutAwesome, PERIODS, dayOf } from './score.js';
import { badgeSvg } from './badge.js';
import * as page from './page.js';
import { authRoute, userOf } from './auth.js';
import { refreshMentions, pulse, phrasesOf } from './mentions.js';

const mk = (s, status, who) => new Response(s.replace('<!--USER-->', page.userBox(who)), { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, max-age=0' } });
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
const svg = (s) => new Response(s, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });

const MCOLS = 'url, slug, source, text, author, at';
async function mentionsOf(env, slugs) {
  const out = [], since = Date.now() - 30 * 864e5;
  for (let i = 0; i < slugs.length; i += 90) {
    const part = slugs.slice(i, i + 90);
    out.push(...((await env.DB.prepare(`SELECT ${MCOLS} FROM mentions WHERE at > ? AND slug IN (${part.map(() => '?').join(',')}) ORDER BY at DESC LIMIT 200`).bind(since, ...part).all()).results || []));
  }
  return out;
}
async function loadPairs(env) {
  return (await env.DB.prepare('SELECT DISTINCT slug, source FROM mentions WHERE at > ?').bind(Date.now() - 30 * 864e5).all()).results || [];
}
async function load(env, today) {
  const products = (await env.DB.prepare('SELECT * FROM products').all()).results || [];
  const from = new Date(Date.parse(today + 'T00:00:00Z') - 400 * 864e5).toISOString().slice(0, 10);
  const snaps = (await env.DB.prepare('SELECT slug, day, stars, forks FROM snapshots WHERE day >= ?').bind(from).all()).results || [];
  const mentions = (await env.DB.prepare('SELECT m.url, m.slug, m.source, m.text, m.author, m.at FROM mentions m WHERE m.at > ? ORDER BY m.at DESC LIMIT 300').bind(Date.now() - 30 * 864e5).all()).results || [];
  const facts = Object.fromEntries(((await env.DB.prepare('SELECT slug, json FROM facts').all()).results || []).map((r) => { try { return [r.slug, JSON.parse(r.json)]; } catch { return [r.slug, null]; } }));
  return { products, snaps, mentions, facts };
}
const ranked = (d, period, today) => trending(d.products, d.snaps, period, today);

// Yesterday's rank and the rank among products that share this one's first topic, this month.
async function rankExtras(d, p, today, ranks) {
  const y = dayOf(Date.parse(today + 'T00:00:00Z') - 864e5);
  const prev = trending(d.products, d.snaps.filter((s) => s.day <= y), 'daily', y).find((r) => r.slug === p.slug)?.rank;
  const topic = String(p.topics || '').split(',').filter(Boolean)[0];
  let cat;
  if (topic) {
    const mates = ranked(d, 'monthly', today).filter((r) => String(r.topics || '').split(',').includes(topic));
    const i = mates.findIndex((r) => r.slug === p.slug);
    if (i >= 0 && mates.length > 1) cat = { topic, rank: i + 1, of: mates.length };
  }
  return { ...ranks, prev, cat };
}

async function summary(env, slug, rank) {
  const p = await env.DB.prepare('SELECT * FROM products WHERE slug = ?').bind(slug).first();
  const sn = await env.DB.prepare('SELECT stars FROM snapshots WHERE slug = ? ORDER BY day DESC LIMIT 1').bind(slug).first();
  const terms = [...new Set([p.name, ...phrasesOf(p)].map((x) => String(x || '').toLowerCase()).filter(Boolean))];
  return { slug, url: `/p/${slug}`, product: { name: p.name, tagline: p.tagline, license: p.license, language: p.language, topics: p.topics, repo: p.repo, homepage: p.homepage, stars: sn?.stars || 0, verified: !!p.verified }, terms };
}

async function submitProduct(req, env, deps) {
  const body = await req.json().catch(() => ({}));
  const repo = await resolveLink(body.url, { fetch: deps.fetch });
  if (!repo) return json({ error: 'No GitHub repo found at that link. Paste a GitHub, npm, PyPI or website link that points to one.' }, 400);
  const slug = slugOf(repo);
  const old = await env.DB.prepare('SELECT slug FROM products WHERE slug = ?').bind(slug).first();
  if (old) return json(await summary(env, slug));
  const today = dayOf(deps.now());
  const cap = Number(env.SUBMITS_PER_DAY || 100);
  const used = (await env.DB.prepare('SELECT n FROM days WHERE day = ?').bind(today).first())?.n || 0;
  if (used >= cap) return json({ error: 'Many people submitted today. Try again tomorrow.' }, 429);
  const r = await fetchRepo(repo, { fetch: deps.fetch, env });
  if (r.error) return json({ error: r.error }, 422);
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO products (slug, repo, name, tagline, homepage, license, language, topics, verified, created) VALUES (?,?,?,?,?,?,?,?,0,?)').bind(slug, r.repo, r.name, r.tagline, r.homepage, r.license, r.language, r.topics, deps.now()),
    env.DB.prepare('INSERT OR REPLACE INTO snapshots (slug, day, stars, forks) VALUES (?,?,?,?)').bind(slug, today, r.stars, r.forks),
    env.DB.prepare('INSERT INTO days (day, n) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1').bind(today),
  ]);
  return json(await summary(env, slug));
}

export async function handle(req, env, deps = {}) {
  deps = { fetch: deps.fetch || fetch, now: deps.now || Date.now };
  const u = new URL(req.url), path = u.pathname, origin = u.origin, today = dayOf(deps.now());
  const asked = (u.searchParams.has('period') ? u.searchParams.get('period') : u.searchParams.get('type'))?.toLowerCase() ?? null;
  const known = asked !== null && Object.hasOwn(PERIODS, asked);
  const period = known ? asked : 'daily';

  const a = await authRoute(req, env, deps.now());
  if (a) return a;
  const who = await userOf(req, env);
  const html = (s, status = 200) => mk(s, status, who);
  if (path === '/api/repos') {
    const { results } = await env.DB.prepare('SELECT slug, repo FROM products').all();
    return json(results);
  }
  if (req.method === 'POST' && path === '/api/ingest') {
    const key = env.INGEST_KEY;
    if (!key || req.headers.get('authorization') !== `Bearer ${key}`) return json({ error: 'No.' }, 401);
    const body = await req.json().catch(() => ({}));
    const rows = (Array.isArray(body.rows) ? body.rows : []).filter((r) => r && typeof r.slug === 'string' && Number.isFinite(r.stars)).slice(0, 500);
    // The first snapshot ever taken of a product is also its baseline for the day before, so gains show as soon as the next snapshot lands.
    const st = env.DB.prepare('INSERT OR REPLACE INTO snapshots (slug, day, stars, forks) VALUES (?,?,?,?)');
    const base = env.DB.prepare('INSERT INTO snapshots (slug, day, stars, forks) SELECT ?1, ?2, ?3, ?4 WHERE NOT EXISTS (SELECT 1 FROM snapshots WHERE slug = ?1 AND day < ?5)');
    // Hourly points go to Analytics Engine, only for products whose count changed (250 points per request at most).
    if (env.STARS) {
      const pts = rows.slice(0, 200), was = {};
      for (let i = 0; i < pts.length; i += 90) {
        const part = pts.slice(i, i + 90);
        for (const o of (await env.DB.prepare(`SELECT slug, stars FROM snapshots WHERE day = ? AND slug IN (${part.map(() => '?').join(',')})`).bind(today, ...part.map((r) => r.slug)).all()).results || []) was[o.slug] = o.stars;
      }
      for (const r of pts) if (was[r.slug] !== (r.stars | 0)) env.STARS.writeDataPoint({ indexes: [r.slug], blobs: [r.slug], doubles: [r.stars | 0, r.forks | 0] });
    }
    const yday = dayOf(deps.now() - 864e5);
    for (let i = 0; i < rows.length; i += 45) await env.DB.batch(rows.slice(i, i + 45).flatMap((r) => [base.bind(r.slug, yday, r.stars | 0, r.forks | 0, today), st.bind(r.slug, today, r.stars | 0, r.forks | 0)]));
    return json({ saved: rows.length, day: today });
  }
  if (req.method === 'POST' && path === '/api/ingest-facts') {
    const key = env.INGEST_KEY;
    if (!key || req.headers.get('authorization') !== `Bearer ${key}`) return json({ error: 'No.' }, 401);
    const body = await req.json().catch(() => ({}));
    const rows = (Array.isArray(body.rows) ? body.rows : []).filter((r) => r && typeof r.slug === 'string' && r.facts && typeof r.facts === 'object').slice(0, 200);
    const now = deps.now();
    for (let i = 0; i < rows.length; i += 45) {
      const old = (await env.DB.prepare(`SELECT slug, json FROM facts WHERE slug IN (${rows.slice(i, i + 45).map(() => '?').join(',')})`).bind(...rows.slice(i, i + 45).map((r) => r.slug)).all()).results || [];
      const prev = Object.fromEntries(old.map((o) => [o.slug, (() => { try { return JSON.parse(o.json); } catch { return {}; } })()]));
      const st = env.DB.prepare('INSERT OR REPLACE INTO facts (slug, json, at) VALUES (?,?,?)');
      await env.DB.batch(rows.slice(i, i + 45).map((r) => st.bind(r.slug, JSON.stringify({ ...prev[r.slug], ...r.facts }), now)));
    }
    return json({ saved: rows.length });
  }
  if (path === '/api/search') {
    const qs = (u.searchParams.get('q') || '').trim().toLowerCase().slice(0, 60);
    if (qs.length < 2) return json({ n: 0, total: 0, html: '' });
    const d = await load(env, today);
    const all = withoutAwesome(ranked(d, period, today));
    const hit = all.filter((r) => [r.name, r.repo, r.tagline, r.slug].some((x) => String(x || '').toLowerCase().includes(qs)));
    const pairs = await loadPairs(env);
    return json({ n: hit.length, total: all.length, html: hit.slice(0, 30).map((r) => page.rowHtml(r, d.snaps, pairs, period)).join('') });
  }
  const hm = /^\/api\/hourly\/([\w-]+)$/.exec(path);
  if (hm) {
    if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) return json({ error: 'Hourly history is not switched on yet.' }, 503);
    const sql = `SELECT intDiv(toUInt32(timestamp), 3600) * 3600 AS t, max(double1) AS stars FROM ranker_stars WHERE index1 = '${hm[1].replace(/[^\w-]/g, '')}' AND timestamp > NOW() - INTERVAL '7' DAY GROUP BY t ORDER BY t FORMAT JSON`;
    const f = deps.fetch, r = await f(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`, { method: 'POST', headers: { authorization: `Bearer ${env.CF_API_TOKEN}` }, body: sql }).catch(() => null);
    return json(r?.ok ? ((await r.json()).data || []) : { error: 'Hourly history did not answer.' }, r?.ok ? 200 : 502);
  }
  if (path === '/health') return json({ ok: true });
  if (path === '/robots.txt') return new Response('User-agent: *\nAllow: /\n', { headers: { 'content-type': 'text/plain' } });
  if (path === '/icon.svg') return svg(page.ICON);
  if (path === '/llms.txt') return new Response('# Flisk Ranker\nProducts ranked by stars gained on GitHub, with live README badges.\n- /badge/<slug>.svg?period=daily|weekly|monthly|yearly&size=large|small\n- /api/trending?period=daily\n', { headers: { 'content-type': 'text/plain' } });

  if (req.method === 'POST' && path === '/api/submit') return submitProduct(req, env, deps);

  let m = /^\/api\/verify\/([a-z0-9-]+)$/.exec(path);
  if (req.method === 'POST' && m) {
    const p = await env.DB.prepare('SELECT slug, repo FROM products WHERE slug = ?').bind(m[1]).first();
    if (!p) return json({ error: 'Not listed.' }, 404);
    const ok = await hasBadge(p.repo, p.slug, { fetch: deps.fetch, origin });
    if (ok) await env.DB.prepare('UPDATE products SET verified = 1 WHERE slug = ?').bind(p.slug).run();
    return json({ verified: ok });
  }

  if (path === '/api/trending') {
    if (asked !== null && !known) return json({ error: 'period must be daily, weekly, monthly or yearly' }, 400);
    const d = await load(env, today);
    return json((u.searchParams.get('awesome') === '1' ? ranked(d, period, today) : withoutAwesome(ranked(d, period, today))).slice(0, 100).map(({ slug, name, repo, stars, gain, rank, verified }) => ({ rank, slug, name, repo, stars, gain, verified: !!verified, period })));
  }

  m = /^\/badge\/([a-z0-9-]+)\.svg$/.exec(path);
  if (m) {
    const size = u.searchParams.get('size') === 'small' ? 'small' : 'large';
    if (m[1] === 'sample') return svg(page.sampleBadge(size));
    const d = await load(env, today);
    const row = ranked(d, period, today).find((r) => r.slug === m[1]);
    if (!row) return svg(badgeSvg({ size, label: 'Not listed yet' }));
    if (u.searchParams.get('scope') === 'language' && row.language) {
      const peers = ranked(d, period, today).filter((r) => r.language === row.language);
      return svg(badgeSvg({ rank: peers.findIndex((r) => r.slug === row.slug) + 1, stars: row.stars, period, size, lang: row.language, day: today }));
    }
    return svg(badgeSvg({ rank: row.rank, stars: row.stars, period, size, day: today }));
  }

  m = /^\/p\/([a-z0-9-]+)$/.exec(path);
  if (m) {
    const d = await load(env, today);
    const p = d.products.find((x) => x.slug === m[1]);
    if (!p) return html(page.shell('Not found', '<h1>Not listed.</h1><p class="sub"><a href="/submit" style="text-decoration:underline">Submit it</a>.</p>'), 404);
    return html(page.product(p, ranked(d, 'daily', today).find((r) => r.slug === p.slug), origin, d.snaps, ranked(d, 'daily', today), await rankExtras(d, p, today, Object.fromEntries(Object.keys(PERIODS).map((k) => [k, ranked(d, k, today).find((r) => r.slug === p.slug)?.rank]))), await mentionsOf(env, [p.slug]), d.facts[p.slug]));
  }

  if (path === '/compare') {
    const d = await load(env, today), all = ranked(d, 'daily', today);
    const want = (u.searchParams.get('p') || '').split(',').filter(Boolean).slice(0, 4);
    return html(page.compare(want.map((s) => all.find((r) => r.slug === s)).filter(Boolean), d.snaps, all, d.facts, await mentionsOf(env, want)));
  }
  if (path === '/api/mentions') {
    const n = Math.min(60, Math.max(1, Number(u.searchParams.get('limit')) || 10));
    const ms = (await env.DB.prepare('SELECT url, slug, source, text, author, at FROM mentions ORDER BY at DESC LIMIT ?').bind(n).all()).results || [];
    const sl = [...new Set(ms.map((x) => x.slug))];
    const ps = sl.length ? (await env.DB.prepare('SELECT * FROM products WHERE slug IN (' + sl.map(() => '?').join(',') + ')').bind(...sl).all()).results || [] : [];
    return json({ items: page.mentionItems(ms, ps) });
  }
  if (path === '/live') return (async () => { const d = await load(env, today); return html(page.live(ranked(d, 'daily', today), d.mentions)); })();
  if (path === '/submit') return html(page.submit(who));
  if (path === '/badges') { const d = await load(env, today); return html(page.badges(ranked(d, 'daily', today), origin)); }
  if (path === '/') { const d = await load(env, today); return html(page.home(u.searchParams.get('awesome') === '1' ? ranked(d, period, today) : withoutAwesome(ranked(d, period, today)), period, d.snaps, d.mentions, u.searchParams.get('awesome') === '1', await loadPairs(env))); }
  return html(page.shell('Not found', '<h1>Not found.</h1>'), 404);
}

// Hourly: at most 40 products a run (the free plan allows 50 outside calls), the ones without today's snapshot first.
export async function snapshot(env, deps = {}) {
  deps = { fetch: deps.fetch || fetch, now: deps.now || Date.now };
  const today = dayOf(deps.now());
  const todo = (await env.DB.prepare('SELECT p.slug, p.repo, p.verified FROM products p WHERE NOT EXISTS (SELECT 1 FROM snapshots s WHERE s.slug = p.slug AND s.day = ?) LIMIT 28').bind(today).all()).results || [];
  let done = 0;
  for (const p of todo) {
    const r = await fetchRepo(p.repo, { fetch: deps.fetch, env });
    if (r.error) continue;
    await env.DB.prepare('INSERT OR REPLACE INTO snapshots (slug, day, stars, forks) VALUES (?,?,?,?)').bind(p.slug, today, r.stars, r.forks).run();
    done++;
  }
  return done;
}

// Activity facts for the two products checked longest ago (4 outside calls each).
export async function refreshFacts(env, deps = {}, max = 2) {
  const f = deps.fetch || fetch, now = (deps.now || Date.now)();
  const rows = (await env.DB.prepare('SELECT p.slug, p.repo, x.at FROM products p LEFT JOIN facts x ON x.slug = p.slug ORDER BY COALESCE(x.at, 0) ASC LIMIT ?').bind(max).all()).results || [];
  let n = 0;
  for (const p of rows) {
    if (p.at && now - p.at < 6 * 36e5) continue;
    const j = await fetchFacts(p.repo, { fetch: f, env, now });
    await env.DB.prepare('INSERT OR REPLACE INTO facts (slug, json, at) VALUES (?,?,?)').bind(p.slug, JSON.stringify(j), now).run();
    n++;
  }
  return n;
}

// The free plan has no spare cron triggers, so the first visit each hour runs the snapshot job.
export async function tick(env, deps = {}) {
  const hour = new Date((deps.now || Date.now)()).toISOString().slice(0, 13);
  const r = await env.DB.prepare('INSERT OR IGNORE INTO days (day, n) VALUES (?, 1)').bind('run-' + hour).run();
  if (!r.meta?.changes) return 0;
  const n = await snapshot(env, deps);
  await refreshMentions(env, deps, 6).catch(() => 0);
  await refreshFacts(env, deps).catch(() => 0);
  return n;
}

export default {
  fetch: (req, env, ctx) => { ctx?.waitUntil?.(tick(env).catch(() => 0)); if (new URL(req.url).pathname === '/api/mentions') ctx?.waitUntil?.(pulse(env).catch(() => 0)); return handle(req, env); },
  scheduled: (_e, env, ctx) => ctx.waitUntil(snapshot(env)),
};
