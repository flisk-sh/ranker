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
