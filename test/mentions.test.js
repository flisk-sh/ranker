import { test, expect } from 'bun:test';
import { refreshMentions, matches } from '../src/mentions.js';
import { fakeD1 } from './fake-d1.js';

test('matches needs the repo name as written', () => {
  expect(matches('Try acme/run today', ['acme/run'])).toBe(true);
  expect(matches('acme runner is different', ['acme/run'])).toBe(false);
});

test('refresh stores real hits, skips near misses, and waits an hour', async () => {
  const env = { DB: fakeD1() };
  await env.DB.prepare("INSERT INTO products (slug, repo, name, created) VALUES ('acme-run','acme/run','run',1)").run();
  const NOW = Date.UTC(2026, 10, 16, 12);
  let calls = 0;
  const fetch = async (url) => {
    calls++;
    const body = url.includes('algolia')
      ? { hits: [{ objectID: '1', title: 'Show HN: acme/run', author: 'bob', created_at_i: NOW / 1000 - 60 }, { objectID: '2', title: 'acme running', author: 'x', created_at_i: NOW / 1000 - 60 }] }
      : { posts: [] };
    return new Response(JSON.stringify(body));
  };
  expect(await refreshMentions(env, { fetch, now: () => NOW })).toBe(1);
  const n = calls;
  expect(await refreshMentions(env, { fetch, now: () => NOW + 1000 })).toBe(0);
  expect(calls).toBe(n);
  const r = await env.DB.prepare('SELECT source, author FROM mentions').all();
  expect(r.results).toEqual([{ source: 'Hacker News', author: 'bob' }]);
});
