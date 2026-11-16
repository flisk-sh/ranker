import { test, expect } from 'bun:test';
import { fetchFacts } from '../src/github.js';

test('reads merged PRs, closed issues, releases and weekly commits', async () => {
  const now = Date.parse('2026-11-16T00:00:00Z');
  const f = async (u) => {
    const j = u.includes('is%3Apr') ? { total_count: 7 } : u.includes('search/issues') ? { total_count: 3 }
      : u.includes('/releases') ? [{ tag_name: 'v2', published_at: '2026-11-10T00:00:00Z' }, { tag_name: 'v1', published_at: '2026-01-01T00:00:00Z' }]
      : Array.from({ length: 52 }, (_, i) => ({ total: i }));
    return { ok: true, json: async () => j };
  };
  const x = await fetchFacts('a/b', { fetch: f, now });
  expect(x).toMatchObject({ prs: 7, issues: 3, releases: 1, last: { tag: 'v2' } });
  expect(x.commits.length).toBe(12);
  expect(x.commits30).toBe(48 + 49 + 50 + 51);
});

test('keeps fields empty when GitHub does not answer', async () => {
  const x = await fetchFacts('a/b', { fetch: async () => ({ ok: false }) });
  expect(x).toEqual({ prs: null, issues: null, prsOpened: null, issuesOpened: null, commits30: null, contributors30: null, releases: null, last: null, commits: null });
});
