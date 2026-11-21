// The rank: stars gained over a period, counted the same way for every product. Pure, no I/O.
export const PERIODS = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };

const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
export const dayOf = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);

// products: [{ slug, ... }]; snaps: [{ slug, day, stars, forks }]; returns products with
// { stars, forks, gain, rank }, best gain first. A product with one snapshot has gain 0 and isNew true.
export function trending(products, snaps, period = 'daily', today = dayOf()) {
  const days = PERIODS[period] ?? 1;
  const start = addDays(today, -days);
  const by = new Map();
  for (const s of snaps) (by.get(s.slug) || by.set(s.slug, []).get(s.slug)).push(s);
  const rows = [];
  for (const p of products) {
    const list = (by.get(p.slug) || []).sort((a, b) => (a.day < b.day ? -1 : 1));
    if (!list.length) continue;
    const latest = list[list.length - 1];
    const base = [...list].reverse().find((s) => s.day <= start) || list[0];
    rows.push({ ...p, stars: latest.stars, forks: latest.forks, gain: latest.stars - base.stars, isNew: list.length === 1 });
  }
  rows.sort((a, b) => b.gain - a.gain || b.stars - a.stars || (a.slug < b.slug ? -1 : 1));
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

// The star history of one product for the sparkline, oldest first.
export function history(snaps, slug, days = 90, today = dayOf()) {
  const start = addDays(today, -days);
  return snaps.filter((s) => s.slug === slug && s.day >= start).sort((a, b) => (a.day < b.day ? -1 : 1));
}

export const short = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));

// Curated link lists ("awesome-…") are not products; the home page leaves them out unless asked.
export const isAwesome = (p) => /(^|[\/-])awesome(-|$)/i.test(`${p.repo || ''} ${p.slug || ''}`) || /(^|,)(awesome|awesome-list|awesome-lists|awesomelist)(,|$)/i.test(p.topics || '');
export function withoutAwesome(rows) { return rows.filter((r) => !isAwesome(r)).map((r, i) => ({ ...r, rank: i + 1 })); }

// Own achievements: the best rank (top 10 or better) a product reached in each period, overall and in its
// language, and the first day it reached it. A badge needs a full period of history and a field of minField products. Counts products ahead instead of sorting, so it stays cheap.
export function earned(p, products, snaps, today = dayOf(), { top = 10, days = 90, minField = 10 } = {}) {
  const from = addDays(today, -(days + 30)), by = new Map();
  for (const s of snaps) if (s.day >= from) (by.get(s.slug) || by.set(s.slug, []).get(s.slug)).push(s);
  const lines = [];
  for (const pr of products) {
    const list = (by.get(pr.slug) || []).sort((a, b) => (a.day < b.day ? -1 : 1));
    if (list.length) lines.push({ slug: pr.slug, lang: pr.language || '', list });
  }
  const at = (list, day) => { let r = null; for (const s of list) { if (s.day > day) break; r = s; } return r; };
  const mine = (by.get(p.slug) || []).map((s) => s.day).filter((d) => d >= addDays(today, -days)).sort();
  const out = [], best = {};
  for (const day of mine) for (const period of ['daily', 'weekly', 'monthly']) {
    const start = addDays(day, -PERIODS[period]), rows = [];
    for (const l of lines) {
      const last = at(l.list, day);
      if (!last) continue;
      const base = at(l.list, start);
      if (!base) continue;
      rows.push({ slug: l.slug, lang: l.lang, gain: last.stars - base.stars, stars: last.stars });
    }
    const me = rows.find((r) => r.slug === p.slug);
    if (!me || me.gain <= 0 || rows.length < minField) continue;
    for (const scope of p.language ? ['all', 'language'] : ['all']) {
      const rank = 1 + rows.filter((r) => (scope === 'all' || r.lang === p.language) && (r.gain > me.gain || (r.gain === me.gain && (r.stars > me.stars || (r.stars === me.stars && r.slug < me.slug))))).length;
      const k = `${period}-${scope}`;
      if (rank <= top && (!best[k] || rank < best[k].rank)) best[k] = { period, scope, rank, day, stars: me.stars };
    }
  }
  for (const k of Object.keys(best)) out.push(best[k]);
  return out.sort((a, b) => a.rank - b.rank || (a.day < b.day ? -1 : 1));
}
