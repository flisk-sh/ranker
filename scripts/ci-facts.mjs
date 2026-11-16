// Run by CI once a day: last-30-days git stats for every listed repo (commits, contributors, PRs and issues,
// releases) from GitHub GraphQL, posted to /api/ingest-facts. Env: GH_TOKEN, INGEST_KEY, RANKER
const base = process.env.RANKER || 'https://ranker.flisk.si', gh = process.env.GH_TOKEN, key = process.env.INGEST_KEY;
if (!gh || !key) { console.error('GH_TOKEN and INGEST_KEY are required'); process.exit(1); }
const list = await (await fetch(`${base}/api/repos`)).json();
const since = new Date(Date.now() - 30 * 864e5).toISOString(), day = since.slice(0, 10), now = Date.now();
const cnt = (n, repo, q) => `${n}:search(query:${JSON.stringify(`repo:${repo} ${q}`)},type:ISSUE,first:1){issueCount}`;
const rows = [];
for (let i = 0; i < list.length; i += 8) {
  const chunk = list.slice(i, i + 8);
  const q = `query{${chunk.map((p, n) => {
    const [o, r] = p.repo.split('/');
    return `r${n}:repository(owner:${JSON.stringify(o)},name:${JSON.stringify(r)}){defaultBranchRef{target{...on Commit{history(since:${JSON.stringify(since)},first:100){totalCount nodes{author{user{login} email}}}}}} releases(first:20,orderBy:{field:CREATED_AT,direction:DESC}){nodes{tagName publishedAt isDraft}}}
${cnt(`m${n}`, p.repo, `is:pr is:merged merged:>=${day}`)} ${cnt(`po${n}`, p.repo, `is:pr created:>=${day}`)} ${cnt(`ic${n}`, p.repo, `is:issue is:closed closed:>=${day}`)} ${cnt(`io${n}`, p.repo, `is:issue created:>=${day}`)}`;
  }).join('\n')}}`;
  const r = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { authorization: `Bearer ${gh}`, 'user-agent': 'flisk-ranker-ci' }, body: JSON.stringify({ query: q }) });
  const j = await r.json().catch(() => ({}));
  if (!j.data) { console.error('batch failed', i, JSON.stringify(j).slice(0, 200)); await new Promise((r) => setTimeout(r, 4000)); continue; }
  chunk.forEach((p, n) => {
    const v = j.data[`r${n}`]; if (!v) return;
    const h = v.defaultBranchRef?.target?.history, rels = (v.releases?.nodes || []).filter((x) => !x.isDraft);
    rows.push({ slug: p.slug, facts: {
      prs: j.data[`m${n}`]?.issueCount ?? null, prsOpened: j.data[`po${n}`]?.issueCount ?? null,
      issues: j.data[`ic${n}`]?.issueCount ?? null, issuesOpened: j.data[`io${n}`]?.issueCount ?? null,
      commits30: h ? h.totalCount : null,
      contributors30: h ? new Set(h.nodes.map((c) => c.author?.user?.login || c.author?.email).filter(Boolean)).size : null,
      contributorsMore: !!h && h.totalCount > 100,
      releases: rels.filter((x) => Date.parse(x.publishedAt) > now - 84 * 864e5).length,
      last: rels[0] ? { tag: String(rels[0].tagName || '').slice(0, 40), at: Date.parse(rels[0].publishedAt) || 0 } : null,
    } });
  });
  await new Promise((r) => setTimeout(r, 1500));
}
for (let i = 0; i < rows.length; i += 100) {
  const r = await fetch(`${base}/api/ingest-facts`, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ rows: rows.slice(i, i + 100) }) });
  if (!r.ok) { console.error('ingest failed', r.status, await r.text()); process.exit(1); }
}
console.log(`facts saved for ${rows.length} of ${list.length} repos`);
