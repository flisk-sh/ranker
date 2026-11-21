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
