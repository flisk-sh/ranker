// Local preview: the real Worker code on bun:sqlite with a fake GitHub.
// bun scripts/dev.mjs  ->  http://localhost:8820
import { handle } from '../src/index.js';
import { fakeD1 } from '../test/fake-d1.js';
import { fakeGithub } from '../test/fixtures.js';

const repos = { 'acme/runner': { stars: 42000 }, 'acme/pagewind': { stars: 3100 }, 'acme/quill': { stars: 480 }, 'acme/tidal': { stars: 35 }, 'acme/spark': { stars: 6 } };
const env = { DB: fakeD1(), SUBMITS_PER_DAY: '1000' };
const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const gains = { runner: 310, pagewind: 220, quill: 90, tidal: 12, spark: 1 };
for (const [name, g] of Object.entries(gains)) {
  const repo = `acme/${name}`, slug = `acme-${name}`, s = repos[repo].stars;
  env.DB.raw.run('INSERT INTO products (slug, repo, name, tagline, homepage, license, language, topics, verified, created) VALUES (?,?,?,?,?,?,?,?,?,?)', [slug, repo, name, 'A sample product, made up for the preview.', '', 'MIT', 'TypeScript', '', name === 'runner' ? 1 : 0, Date.now()]);
  env.DB.raw.run('INSERT INTO snapshots VALUES (?,?,?,0)', [slug, day(1), s - g]);
  env.DB.raw.run('INSERT INTO snapshots VALUES (?,?,?,0)', [slug, day(0), s]);
}
const deps = { fetch: fakeGithub(repos) };
const port = Number(process.env.PORT) || 8820;
Bun.serve({ port, fetch: (req) => handle(req, env, deps) });
console.log(`ranker dev on http://localhost:${port}`);
