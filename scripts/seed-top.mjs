// Seed the most-starred public repos. Usage: bun scripts/seed-top.mjs 300 | bunx wrangler@4 d1 execute flisk-ranker --remote --file -
import { $ } from 'bun';
const want = Number(Bun.argv[2] || 300), q = (s) => `'${String(s ?? '').replace(/'/g, "''")}'`;
const today = new Date().toISOString().slice(0, 10), now = Date.now(), out = [];
const slugOf = (r) => r.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
for (let page = 1; out.length / 2 < want && page <= Math.ceil(want / 100); page++) {
  const j = JSON.parse(await $`gh api ${`search/repositories?q=stars:>20000+archived:false&sort=stars&order=desc&per_page=100&page=${page}`}`.text());
  for (const r of j.items) {
    const slug = slugOf(r.full_name), lic = r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : '';
    const home = /^https?:\/\//.test(r.homepage || '') ? r.homepage : '';
    out.push(`INSERT OR IGNORE INTO products (slug, repo, name, tagline, homepage, license, language, topics, verified, created) VALUES (${q(slug)},${q(r.full_name)},${q(r.name)},${q((r.description || '').slice(0, 200))},${q(home)},${q(lic)},${q(r.language || '')},${q((r.topics || []).slice(0, 6).join(','))},0,${now});`);
    out.push(`INSERT OR REPLACE INTO snapshots (slug, day, stars, forks) VALUES (${q(slug)},${q(today)},${r.stargazers_count},${r.forks_count || 0});`);
  }
}
console.error(out.length / 2, 'repos');
console.log(out.join('\n'));
