// Flisk Ranker Worker: routes plus the hourly snapshot job.
import { parseRepo, slugOf, fetchRepo, hasBadge } from './github.js';
import { trending, PERIODS, dayOf } from './score.js';
import { badgeSvg } from './badge.js';
import * as page from './page.js';
import { authRoute, userOf } from './auth.js';

const mk = (s, status, who) => new Response(s.replace('<!--USER-->', page.userBox(who)), { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, max-age=0' } });
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
const svg = (s) => new Response(s, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });

async function load(env, today) {
  const products = (await env.DB.prepare('SELECT * FROM products').all()).results || [];
  const from = new Date(Date.parse(today + 'T00:00:00Z') - 400 * 864e5).toISOString().slice(0, 10);
  const snaps = (await env.DB.prepare('SELECT slug, day, stars, forks FROM snapshots WHERE day >= ?').bind(from).all()).results || [];
  return { products, snaps };
}
const ranked = (d, period, today) => trending(d.products, d.snaps, period, today);

async function submitProduct(req, env, deps) {
  const body = await req.json().catch(() => ({}));
  const repo = parseRepo(body.url);
  if (!repo) return json({ error: 'Paste a GitHub link like https://github.com/you/your-product' }, 400);
  const slug = slugOf(repo);
  const old = await env.DB.prepare('SELECT slug FROM products WHERE slug = ?').bind(slug).first();
  if (old) return json({ slug, url: `/p/${slug}` });
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
  return json({ slug, url: `/p/${slug}` });
}

export async function handle(req, env, deps = {}) {
  deps = { fetch: deps.fetch || fetch, now: deps.now || Date.now };
  const u = new URL(req.url), path = u.pathname, origin = u.origin, today = dayOf(deps.now());
  const period = PERIODS[u.searchParams.get('period')] ? u.searchParams.get('period') : 'daily';

  const a = await authRoute(req, env, deps.now());
  if (a) return a;
  const who = await userOf(req, env);
  const html = (s, status = 200) => mk(s, status, who);
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
    const d = await load(env, today);
    return json(ranked(d, period, today).slice(0, 100).map(({ slug, name, repo, stars, gain, rank, verified }) => ({ rank, slug, name, repo, stars, gain, verified: !!verified })));
  }

  m = /^\/badge\/([a-z0-9-]+)\.svg$/.exec(path);
  if (m) {
    const size = u.searchParams.get('size') === 'small' ? 'small' : 'large';
    if (m[1] === 'sample') return svg(page.sampleBadge(size));
    const d = await load(env, today);
    const row = ranked(d, period, today).find((r) => r.slug === m[1]);
    if (!row) return svg(badgeSvg({ size, label: 'Not listed yet' }));
    return svg(badgeSvg({ rank: row.rank, stars: row.stars, period, size }));
  }

  m = /^\/p\/([a-z0-9-]+)$/.exec(path);
  if (m) {
    const d = await load(env, today);
    const p = d.products.find((x) => x.slug === m[1]);
    if (!p) return html(page.shell('Not found', '<h1>Not listed.</h1><p class="sub"><a href="/submit" style="text-decoration:underline">Submit it</a>.</p>'), 404);
    return html(page.product(p, ranked(d, 'daily', today).find((r) => r.slug === p.slug), origin, d.snaps, ranked(d, 'daily', today), Object.fromEntries(Object.keys(PERIODS).map((k) => [k, ranked(d, k, today).find((r) => r.slug === p.slug)?.rank]))));
  }

  if (path === '/compare') {
    const d = await load(env, today), all = ranked(d, 'daily', today);
    const want = (u.searchParams.get('p') || '').split(',').filter(Boolean).slice(0, 4);
    return html(page.compare(want.map((s) => all.find((r) => r.slug === s)).filter(Boolean), d.snaps, all));
  }
  if (path === '/live') return (async () => { const d = await load(env, today); return html(page.live(ranked(d, 'daily', today))); })();
  if (path === '/submit') return html(page.submit(who));
  if (path === '/badges') { const d = await load(env, today); return html(page.badges(ranked(d, 'daily', today), origin)); }
  if (path === '/') { const d = await load(env, today); return html(page.home(ranked(d, period, today), period, d.snaps)); }
  return html(page.shell('Not found', '<h1>Not found.</h1>'), 404);
}

// Hourly: at most 40 products a run (the free plan allows 50 outside calls), the ones without today's snapshot first.
export async function snapshot(env, deps = {}) {
  deps = { fetch: deps.fetch || fetch, now: deps.now || Date.now };
  const today = dayOf(deps.now());
  const todo = (await env.DB.prepare('SELECT p.slug, p.repo, p.verified FROM products p WHERE NOT EXISTS (SELECT 1 FROM snapshots s WHERE s.slug = p.slug AND s.day = ?) LIMIT 40').bind(today).all()).results || [];
  let done = 0;
  for (const p of todo) {
    const r = await fetchRepo(p.repo, { fetch: deps.fetch, env });
    if (r.error) continue;
    await env.DB.prepare('INSERT OR REPLACE INTO snapshots (slug, day, stars, forks) VALUES (?,?,?,?)').bind(p.slug, today, r.stars, r.forks).run();
    done++;
  }
  return done;
}

// The free plan has no spare cron triggers, so the first visit each hour runs the snapshot job.
export async function tick(env, deps = {}) {
  const hour = new Date((deps.now || Date.now)()).toISOString().slice(0, 13);
  const r = await env.DB.prepare('INSERT OR IGNORE INTO days (day, n) VALUES (?, 1)').bind('run-' + hour).run();
  return r.meta?.changes ? snapshot(env, deps) : 0;
}

export default {
  fetch: (req, env, ctx) => { ctx?.waitUntil?.(tick(env).catch(() => 0)); return handle(req, env); },
  scheduled: (_e, env, ctx) => ctx.waitUntil(snapshot(env)),
};
