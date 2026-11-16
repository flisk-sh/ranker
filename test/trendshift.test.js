import { expect, test } from 'bun:test';
import { parseRepos, run } from '../scripts/trendshift.mjs';
import { mark } from '../src/page.js';

test('parseRepos finds unique repos in page order', () => {
  const html = '<a href="https://github.com/a/b">x</a><a href="https://github.com/A/B">y</a><a href="https://github.com/c/d.git">z</a> github.com/ not/';
  expect(parseRepos(html)).toEqual(['a/b', 'c/d']);
});

test('run submits every repo and counts failures', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push(url);
    if (url.startsWith('https://trendshift.io')) return new Response('github.com/a/b github.com/c/d');
    return new Response(JSON.stringify({}), { status: calls.length === 4 ? 422 : 200 });
  };
  const r = await run({ fetchFn, base: 'http://x', log() {} });
  expect(r).toEqual({ seen: 2, added: 1, failed: 1 });
  expect(calls.filter((u) => u === 'http://x/api/submit').length).toBe(2);
});

test('run fails when Trendshift gives nothing', async () => {
  await expect(run({ fetchFn: async () => new Response('', { status: 500 }), log() {} })).rejects.toThrow();
});

test('mark shows the owner avatar over the letter tile, and skips a bad owner', () => {
  const m = mark({ slug: 'facebook-react', name: 'react', repo: 'facebook/react' }, 38);
  expect(m).toContain('https://github.com/facebook.png?size=76');
  expect(m).toContain('>R<');
  expect(mark({ slug: 'x', name: 'x', repo: '"><script>/y' })).not.toContain('<img');
});
