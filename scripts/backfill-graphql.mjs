// One-off: rebuild recent star history for every listed repo from GraphQL stargazer timestamps
// (works for repos we do not own, unlike the REST endpoint). Prints SQL for D1.
// Usage: bun scripts/backfill-graphql.mjs | wrangler d1 execute flisk-ranker --remote --file -
import { $ } from 'bun';
const day = (t) => new Date(t).toISOString().slice(0, 10);
const rows = JSON.parse(await $`bunx wrangler@4 d1 execute flisk-ranker --remote --json --command ${"select slug, repo from products where repo is not null"}`.text())[0].results;
const q = 'query($o:String!,$n:String!,$c:String){repository(owner:$o,name:$n){stargazerCount forkCount stargazers(last:100,before:$c,orderBy:{field:STARRED_AT,direction:ASC}){pageInfo{startCursor hasPreviousPage} edges{starredAt}}}}';
const out = [], cutoff = Date.now() - 30 * 864e5;
for (const { slug, repo } of rows) {
  const [o, n] = repo.split('/'); let cur = null, stamps = [], S = 0, F = 0;
  try {
    for (let i = 0; i < 10; i++) {
      const args = ['-f', `query=${q}`, '-f', `o=${o}`, '-f', `n=${n}`]; if (cur) args.push('-f', `c=${cur}`);
      const r = JSON.parse(await $`gh api graphql ${args}`.text()).data.repository, s = r.stargazers;
      S = r.stargazerCount; F = r.forkCount;
      stamps.push(...s.edges.map((e) => Date.parse(e.starredAt)));
      cur = s.pageInfo.startCursor;
      if (!s.pageInfo.hasPreviousPage || Math.min(...stamps) < cutoff) break;
    }
  } catch (e) { console.error(repo, 'skip'); continue; }
  if (!stamps.length) continue;
  const startDay = day(Math.max(cutoff, Math.min(...stamps) + 864e5));
  for (let t = Date.parse(startDay); t <= Date.now(); t += 864e5) {
    const d = day(t), end = Date.parse(d) + 864e5;
    out.push(`INSERT OR IGNORE INTO snapshots (slug, day, stars, forks) VALUES ('${slug}','${d}',${S - stamps.filter((s) => s >= end).length},${F});`);
  }
  console.error(repo, 'ok', startDay);
}
console.log(out.join('\n'));
