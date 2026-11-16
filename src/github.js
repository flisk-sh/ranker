// What Ranker reads from GitHub: one repo's numbers, and its README (to find the badge).
const UA = { 'user-agent': 'flisk-ranker', accept: 'application/vnd.github+json' };

// "https://github.com/owner/repo(.git)(/anything)" -> "owner/repo"; anything else -> ''.
export function parseRepo(input) {
  const m = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i.exec(String(input || '').trim());
  if (!m || /^(sponsors|orgs|features|topics|login|about|marketplace|settings|apps)$/i.test(m[1])) return '';
  return `${m[1]}/${m[2]}`;
}

export const slugOf = (repo) => repo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const headers = (env) => (env?.GITHUB_TOKEN ? { ...UA, authorization: `Bearer ${env.GITHUB_TOKEN}` } : UA);

// { repo, name, tagline, homepage, license, language, topics, stars, forks } or { error }.
export async function fetchRepo(repo, { fetch: f = fetch, env } = {}) {
  const r = await f(`https://api.github.com/repos/${repo}`, { headers: headers(env) }).catch(() => null);
  if (!r) return { error: 'GitHub did not answer. Try again in a minute.' };
  if (r.status === 404) return { error: 'No public repo at that link.' };
  if (r.status === 403 || r.status === 429) return { error: `GitHub is busy (${r.status}). Try again in a minute.` };
  if (!r.ok) return { error: `GitHub answered ${r.status}.` };
  const j = await r.json().catch(() => null);
  if (!j || typeof j.stargazers_count !== 'number') return { error: 'GitHub gave an unexpected answer.' };
  if (j.private || j.disabled || j.archived) return { error: j.archived ? 'This repo is archived.' : 'No public repo at that link.' };
  return {
    repo: j.full_name || repo,
    name: j.name,
    tagline: String(j.description || '').slice(0, 200),
    homepage: /^https?:\/\//.test(j.homepage || '') ? j.homepage : '',
    license: j.license?.spdx_id && j.license.spdx_id !== 'NOASSERTION' ? j.license.spdx_id : '',
    language: j.language || '',
    topics: (j.topics || []).slice(0, 6).join(','),
    stars: j.stargazers_count,
    forks: j.forks_count || 0,
  };
}

// True when the repo's README carries this product's Ranker badge.
export async function hasBadge(repo, slug, { fetch: f = fetch, origin = 'https://ranker.flisk.si' } = {}) {
  const r = await f(`https://raw.githubusercontent.com/${repo}/HEAD/README.md`, { headers: { 'user-agent': 'flisk-ranker' } }).catch(() => null);
  if (!r?.ok) return false;
  const text = await r.text().catch(() => '');
  return text.includes(`${new URL(origin).host}/badge/${slug}.svg`);
}
