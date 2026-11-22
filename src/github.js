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
    tagline: clip(String(j.description || '').trim(), 200),
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

// Activity numbers for the product page: merged PRs and closed issues in 30 days, releases in 12 weeks,
// the last release, and commits per week for 12 weeks. Fields GitHub does not answer stay null.
export async function fetchFacts(repo, { fetch: f = fetch, env, now = Date.now() } = {}) {
  const h = headers(env), since = new Date(now - 30 * 864e5).toISOString().slice(0, 10);
  const get = async (u) => { const r = await f(`https://api.github.com/${u}`, { headers: h }).catch(() => null); return r?.ok ? r.json().catch(() => null) : null; };
  const count = async (q) => (await get(`search/issues?per_page=1&q=${encodeURIComponent(`repo:${repo} ${q}`)}`))?.total_count ?? null;
  const [prs, issues, rel, act, prsOpened, issuesOpened, recent] = await Promise.all([count(`is:pr is:merged merged:>=${since}`), count(`is:issue is:closed closed:>=${since}`), get(`repos/${repo}/releases?per_page=30`), get(`repos/${repo}/stats/commit_activity`), count(`is:pr created:>=${since}`), count(`is:issue created:>=${since}`), get(`repos/${repo}/commits?per_page=100&since=${since}T00:00:00Z`)]);
  const rels = Array.isArray(rel) ? rel.filter((r) => !r.draft) : null;
  const weeks = Array.isArray(act) && act.length >= 12 ? act.slice(-12).map((w) => w.total || 0) : null;
  return {
    prs, issues, prsOpened, issuesOpened,
    commits30: Array.isArray(act) && act.length >= 4 ? act.slice(-4).reduce((a, w) => a + (w.total || 0), 0) : null,
    contributors30: Array.isArray(recent) ? new Set(recent.map((c) => c.author?.login || c.commit?.author?.email).filter(Boolean)).size : null,
    releases: rels ? rels.filter((r) => Date.parse(r.published_at) > now - 84 * 864e5).length : null,
    last: rels?.[0] ? { tag: String(rels[0].tag_name || '').slice(0, 40), at: Date.parse(rels[0].published_at) || 0 } : null,
    commits: weeks,
  };
}

// Any link -> "owner/repo": a GitHub link, an npm or PyPI package page, or a website that links to its GitHub repo.
export async function resolveLink(input, { fetch: f = fetch } = {}) {
  const direct = parseRepo(input);
  if (direct) return direct;
  const u = String(input || '').trim();
  const find = (s) => {
    const m = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?=["'<>\s)#?/]|$)/i.exec(String(s || ''));
    return m ? parseRepo(`https://github.com/${m[1]}/${m[2]}`) : '';
  };
  const json = async (url) => { const r = await f(url, { headers: { 'user-agent': 'flisk-ranker' } }).catch(() => null); return r?.ok ? r.json().catch(() => null) : null; };
  let m = /^https?:\/\/(?:www\.)?npmjs\.com\/package\/((?:@[\w.-]+\/)?[\w.-]+)/i.exec(u);
  if (m) { const j = await json(`https://registry.npmjs.org/${m[1].replace('/', '%2F')}`); return find(j?.repository?.url || j?.repository) || find(j?.homepage); }
  m = /^https?:\/\/(?:www\.)?pypi\.org\/project\/([\w.-]+)/i.exec(u);
  if (m) { const j = await json(`https://pypi.org/pypi/${m[1]}/json`); const i = j?.info || {}; return find(Object.values(i.project_urls || {}).join(' ')) || find(i.home_page); }
  if (/^https?:\/\/[\w.-]+\.[a-z]{2,}(?:[/?#]|$)/i.test(u) && !/\b(localhost|producthunt\.com)\b/i.test(u)) {
    const r = await f(u, { headers: { 'user-agent': 'flisk-ranker' } }).catch(() => null);
    if (r?.ok) return find((await r.text().catch(() => '')).slice(0, 400000));
  }
  return '';
}

// Cut at a word, not mid-word, and say so.
function clip(s, n) {
  if (s.length <= n) return s;
  const c = s.slice(0, n - 1), i = c.lastIndexOf(' ');
  return (i > n * 0.6 ? c.slice(0, i) : c).replace(/[\s,;:.-]+$/, '') + '\u2026';
}
