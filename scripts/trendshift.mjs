// Pull the repos Trendshift lists and submit each one to Flisk Ranker.
// bun scripts/trendshift.mjs            (submits to https://ranker.flisk.si)
// RANKER=http://localhost:8820 bun scripts/trendshift.mjs
const RANGES = ['', '?trending-range=7', '?trending-range=30'];

export function parseRepos(html) {
  const seen = new Set(), out = [];
  for (const m of String(html).matchAll(/github\.com\/([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9_.-]{1,100})/g)) {
    const repo = `${m[1]}/${m[2]}`.replace(/\.git$/, '');
    if (!seen.has(repo.toLowerCase())) { seen.add(repo.toLowerCase()); out.push(repo); }
  }
  return out;
}

export async function run({ fetchFn = fetch, base = process.env.RANKER || 'https://ranker.flisk.si', log = console.log } = {}) {
  const repos = new Map();
  for (const r of RANGES) {
    const res = await fetchFn(`https://trendshift.io/${r}`).catch(() => null);
    if (!res?.ok) continue;
    for (const repo of parseRepos(await res.text())) repos.set(repo.toLowerCase(), repo);
  }
  if (!repos.size) throw new Error('Trendshift returned no repos');
  let added = 0, failed = 0;
  for (const repo of repos.values()) {
    const res = await fetchFn(`${base}/api/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: `https://github.com/${repo}` }) });
    if (res.ok) added++;
    else { failed++; log(`${repo}: ${res.status} ${(await res.text()).slice(0, 120)}`); if (res.status === 429) break; }
  }
  log(`${repos.size} repos seen, ${added} submitted or already listed, ${failed} failed`);
  return { seen: repos.size, added, failed };
}

if (import.meta.main) await run();
