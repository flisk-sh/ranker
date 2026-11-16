// Run by CI: read stars and forks for every listed repo from GitHub (100 per GraphQL call) and post today's snapshot.
// Env: GH_TOKEN, INGEST_KEY, RANKER (default https://ranker.flisk.si)
const base = process.env.RANKER || 'https://ranker.flisk.si', gh = process.env.GH_TOKEN, key = process.env.INGEST_KEY;
if (!gh || !key) { console.error('GH_TOKEN and INGEST_KEY are required'); process.exit(1); }
const list = await (await fetch(`${base}/api/repos`)).json();
const rows = [];
for (let i = 0; i < list.length; i += 100) {
  const chunk = list.slice(i, i + 100);
  const q = `query{${chunk.map((p, n) => { const [o, r] = p.repo.split('/'); return `r${n}:repository(owner:${JSON.stringify(o)},name:${JSON.stringify(r)}){stargazerCount forkCount}`; }).join('')}}`;
  const r = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { authorization: `Bearer ${gh}`, 'user-agent': 'flisk-ranker-ci' }, body: JSON.stringify({ query: q }) });
  const j = await r.json();
  chunk.forEach((p, n) => { const v = j.data?.[`r${n}`]; if (v) rows.push({ slug: p.slug, stars: v.stargazerCount, forks: v.forkCount }); });
}
for (let i = 0; i < rows.length; i += 200) {
  const r = await fetch(`${base}/api/ingest`, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ rows: rows.slice(i, i + 200) }) });
  if (!r.ok) { console.error('ingest failed', r.status, await r.text()); process.exit(1); }
}
console.log(`snapshot saved for ${rows.length} of ${list.length} repos`);
