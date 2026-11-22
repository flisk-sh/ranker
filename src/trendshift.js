// Trendshift achievements for one repo: the badges it earned there and the date each was first earned.
// The repo's Trendshift id comes from the Trendshift badge in its README; the dates from its Trendshift page.
const UA = { 'user-agent': 'flisk-ranker' };

export function idFromReadme(text) {
  return String(text || '').match(/trendshift\.io\/(?:api\/badge\/trendshift\/)?repositories\/(\d{1,12})/)?.[1] || null;
}

// The page ships its data as escaped JSON; each badge is a block keyed "daily-Starlark", "weekly-Starlark".
export function parseAchievements(html, id) {
  const t = String(html).replace(/\\"/g, '"');
  const out = [], seen = new Set();
  const re = /"(daily|weekly|monthly)-([^"]*)",\{[^]*?"First achieved ","(on|in)"," ",\["\$","span",null,\{[^}]*?"children":"([^"]+)"\}\][^]*?"src":"(https:\/\/trendshift\.io\/api\/badge\/[^"]+)"[^]*?"alt":"([^"]+)"/g;
  for (const m of t.matchAll(re)) {
    const key = `${m[1]}-${m[2]}`;
    if (seen.has(key) || !m[5].includes(`/repositories/${id}/`)) continue;
    seen.add(key);
    out.push({ period: m[1], lang: m[2], when: `${m[3]} ${m[4]}`.slice(0, 40), src: m[5], alt: m[6].slice(0, 80) });
  }
  return out;
}

// null when the repo has no Trendshift badge in its README or Trendshift does not answer.
export async function fetchTrendshift(repo, { fetch: f = fetch } = {}) {
  const r = await f(`https://raw.githubusercontent.com/${repo}/HEAD/README.md`, { headers: UA }).catch(() => null);
  const id = r?.ok ? idFromReadme(await r.text().catch(() => '')) : null;
  if (!id) return null;
  const p = await f(`https://trendshift.io/repositories/${id}`, { headers: UA }).catch(() => null);
  if (!p?.ok) return null;
  return { id, items: parseAchievements(await p.text().catch(() => ''), id) };
}
