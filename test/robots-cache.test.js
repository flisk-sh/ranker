import { expect, test } from 'bun:test';
import { handle } from '../src/index.js';

test('GET /robots.txt is publicly cacheable for a day', async () => {
  const res = await handle(new Request('https://ranker.flisk.si/robots.txt'), {});
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toMatch(/^text\/plain/);
  expect(res.headers.get('cache-control')).toContain('max-age=86400');
});
