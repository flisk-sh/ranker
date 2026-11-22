import { test, expect } from 'bun:test';
import { fetchRepo } from '../src/github.js';
import { product } from '../src/page.js';

const repo = (description) => async () => ({ ok: true, status: 200, json: async () => ({ full_name: 'a/b', name: 'b', description, stargazers_count: 3, forks_count: 0 }) });

test('a long description is cut at a word with an ellipsis', async () => {
  const r = await fetchRepo('a/b', { fetch: repo('word '.repeat(80)) });
  expect(r.tagline.length).toBeLessThanOrEqual(200);
  expect(r.tagline.endsWith('…')).toBe(true);
  expect(r.tagline).not.toMatch(/wor…$/);
});

test('a short description is kept as is', async () => {
  expect((await fetchRepo('a/b', { fetch: repo('Small tool') })).tagline).toBe('Small tool');
});

test('a product page without scan data shows no placeholder cards and balanced markup', () => {
  const p = { slug: 'a-b', repo: 'a/b', name: 'b', tagline: 'x', language: 'JavaScript', topics: '', license: 'MIT' };
  const html = product(p, { rank: 5, stars: 3, forks: 0, gain: 0 }, 'https://ranker.flisk.si', [], [], {}, [], null);
  expect(html).not.toContain('Coming soon');
  expect(html).not.toContain('GIT STATS');
  expect(html).not.toContain('PRICES');
  const count = (t) => (html.match(new RegExp(`<${t}[\\s>]`, 'g')) || []).length;
  const close = (html.match(/<\/div>/g) || []).length;
  expect(close).toBe(count('div'));
});

test('the product page links to Flisk Grow with the product filled in', () => {
  const base = { slug: 'a-b', repo: 'a/b', name: 'b', tagline: 'x', topics: '' };
  const row = { rank: 1, stars: 1, forks: 0, gain: 0 };
  const repoLink = product(base, row, 'https://ranker.flisk.si', [], [], {}, [], null);
  expect(repoLink).toContain('Make my grow plan');
  expect(repoLink).toContain('https://grow.flisk.si/?url=https%3A%2F%2Fgithub.com%2Fa%2Fb');
  const site = product({ ...base, homepage: 'https://b.dev' }, row, 'https://ranker.flisk.si', [], [], {}, [], null);
  expect(site).toContain('https://grow.flisk.si/?url=https%3A%2F%2Fb.dev');
});

test('the action buttons carry icons', () => {
  const html = product({ slug: 'a-b', repo: 'a/b', name: 'b', tagline: 'x', topics: '', homepage: 'https://b.dev' }, { rank: 1, stars: 1, forks: 0, gain: 0 }, 'https://ranker.flisk.si', [], [], {}, [], null);
  for (const t of ['Visit', 'View on GitHub', 'Compare', 'Make my grow plan', 'Scanned: CI health']) expect(html).toMatch(new RegExp('(</svg>|">)' + t));
  expect(html).toContain('google.com/s2/favicons?domain=b.dev');
  for (const c of ['#15803d', '#0b6b3a', '#03040B']) expect(html).toContain(c);
});
