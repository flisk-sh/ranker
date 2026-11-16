// One-off: rebuild up to 90 days of star history from GitHub's stargazer timestamps and print SQL for D1.
// Usage: bun scripts/backfill-stars.mjs repo1 repo2 ... | wrangler d1 execute flisk-ranker --remote --file -
import { $ } from 'bun';
const day = (t) => new Date(t).toISOString().slice(0, 10);
const out = [];
for (const arg of Bun.argv.slice(2)) {
  const [slug, repo] = arg.split('=');
  const info = JSON.parse(await $`gh api repos/${repo}`.text());
  const S = info.stargazers_count, forks = info.forks_count || 0;
  const last = Math.max(1, Math.ceil(S / 100)), stamps = [];
  for (let pg = last; pg >= Math.max(1, last - 9); pg--) {
    let j; try { j = JSON.parse(await $`gh api -H ${'Accept: application/vnd.github.star+json'} ${`repos/${repo}/stargazers?per_page=100&page=${pg}`}`.text()); } catch { break; }
    stamps.push(...j.map((x) => Date.parse(x.starred_at)));
    if (!j.length) break;
  }
  if (!stamps.length) { console.error(repo, 'no stars'); continue; }
  const full = stamps.length >= S; // whole history known
  const oldest = Math.min(...stamps);
  const startDay = full ? day(Math.max(Date.now() - 90 * 864e5, oldest)) : day(oldest + 864e5);
  for (let t = Date.parse(startDay); t <= Date.now(); t += 864e5) {
    const d = day(t), end = Date.parse(d) + 864e5;
    const after = stamps.filter((s) => s >= end).length;
    out.push(`INSERT OR REPLACE INTO snapshots (slug, day, stars, forks) VALUES ('${slug}','${d}',${S - after},${forks});`);
  }
  console.error(repo, S, 'stars,', stamps.length, 'read, from', startDay);
}
console.log(out.join('\n'));
