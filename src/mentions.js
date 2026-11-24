// Mentions of a product, found with the free public search that Flisk Grow uses (Hacker News and Bluesky).
// Reddit, X and YouTube block servers, so they are not read. A post counts only when the repo name or the
// site address appears in it as written.
const UA = 'FliskRanker/1.0 (+https://ranker.flisk.si)';
const ent = (t) => t.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const clip = (v, n) => ent(ent(String(v ?? '').replace(/<[^>]+>/g, ' '))).replace(/\s+/g, ' ').trim().slice(0, n);

async function getJson(f, url) {
  try { const r = await f(url, { headers: { accept: 'application/json', 'user-agent': UA }, signal: AbortSignal.timeout(8000) }); return r.ok ? await r.json() : null; } catch { return null; }
}

export async function searchHN(q, since, f) {
  const j = await getJson(f, `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=(story,comment)&hitsPerPage=30&typoTolerance=false&numericFilters=created_at_i>${Math.floor(since / 1000)}`);
  return (j?.hits || []).map((h) => ({ source: 'Hacker News', url: `https://news.ycombinator.com/item?id=${h.objectID}`, text: clip([h.title || h.story_title, h.comment_text || h.story_text].filter(Boolean).join(' '), 400), author: clip(h.author, 60), at: (h.created_at_i || 0) * 1000 }));
}

export async function searchBluesky(q, since, f) {
  const j = await getJson(f, `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&limit=15&sort=latest&since=${new Date(since).toISOString()}`);
  return (j?.posts || []).map((p) => {
    const handle = clip(p.author?.handle, 80);
    return { source: 'Bluesky', url: `https://bsky.app/profile/${handle}/post/${String(p.uri || '').split('/').pop()}`, text: clip([p.record?.text, p.record?.embed?.external?.title, p.record?.embed?.external?.uri].filter(Boolean).join(' '), 400), author: '@' + handle, at: Date.parse(p.record?.createdAt || p.indexedAt) || 0 };
  }).filter((l) => l.text);
}

const rx = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function phrasesOf(p) {
  const out = [p.repo];
  try { if (p.homepage) { const h = new URL(p.homepage).hostname.replace(/^www\./, ''); if (h && !/github\.com$/.test(h)) out.push(h); } } catch {}
  return out;
}
export function matches(text, phrases) {
  const hay = text.toLowerCase();
  return phrases.some((k) => new RegExp(`(^|[^\\p{L}\\p{N}])${k.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(rx).join('[^\\p{L}\\p{N}]+')}($|[^\\p{L}\\p{N}])`, 'u').test(hay));
}

// Looks for the products checked longest ago, a few per call (the Worker allows 50 outgoing requests).
export async function refreshMentions(env, deps = {}, max = 8, ttl = 36e5) {
  const f = deps.fetch || fetch, now = (deps.now || Date.now)();
  const ps = (await env.DB.prepare('SELECT slug, repo, homepage FROM products').all()).results || [];
  const seen = Object.fromEntries(((await env.DB.prepare("SELECT day, n FROM days WHERE day LIKE 'm-%'").all()).results || []).map((r) => [r.day, r.n]));
  const due = ps.filter((p) => now - (seen['m-' + p.slug] || 0) > ttl).sort((a, b) => (seen['m-' + a.slug] || 0) - (seen['m-' + b.slug] || 0)).slice(0, max);
  let added = 0;
  for (const p of due) {
    const phrases = phrasesOf(p), since = now - 30 * 864e5;
    const found = [];
    for (const q of phrases.slice(0, 1)) found.push(...await searchHN(q, since, f), ...await searchBluesky(q, since, f));
    for (const m of found.filter((m) => m.at && matches(m.text, phrases))) {
      const r = await env.DB.prepare('INSERT OR IGNORE INTO mentions (url, slug, source, text, author, at) VALUES (?,?,?,?,?,?)').bind(m.url, p.slug, m.source, m.text, m.author, m.at).run();
      added += r.meta?.changes || 0;
    }
    await env.DB.prepare('INSERT OR REPLACE INTO days (day, n) VALUES (?, ?)').bind('m-' + p.slug, now).run();
  }
  return added;
}

// While someone watches the live list, look for a few more products at most every 20 seconds, each at most every 10 minutes.
export async function pulse(env, deps = {}) {
  const now = (deps.now || Date.now)();
  await env.DB.prepare("INSERT OR IGNORE INTO days (day, n) VALUES ('mp', 0)").run();
  const got = await env.DB.prepare("UPDATE days SET n = ? WHERE day = 'mp' AND n < ?").bind(now, now - 2e4).run();
  if (!got.meta?.changes) return -1;
  return refreshMentions(env, deps, 5, 6e5).catch(() => 0);
}
