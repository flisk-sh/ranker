import { expect, test } from 'bun:test';
import { LANGUAGES, slice, run } from '../scripts/languages.mjs';

test('the hourly slices cover every language in a day', () => {
  const seen = new Set();
  for (let h = 0; h < 24; h++) slice(h).forEach((l) => seen.add(l));
  expect(LANGUAGES.every((l) => seen.has(l))).toBe(true);
});

test('run searches each language of the hour, submits the finds and the extras', async () => {
  const urls = [], bodies = [];
  const fetchFn = async (url, init) => {
    urls.push(url);
    if (url.includes('api.github.com')) return new Response(JSON.stringify({ items: [{ full_name: 'a/b' }] }));
    bodies.push(init.body);
    return new Response('{}');
  };
  const r = await run({ fetchFn, base: 'http://x', hour: 0, sleep: async () => {}, log() {} });
  expect(urls.filter((u) => u.includes('api.github.com')).length).toBe(8);
  expect(bodies.join()).toContain('a/b');
  expect(bodies.join()).toContain('aaif-goose/goose');
  expect(r.failed).toBe(0);
});
