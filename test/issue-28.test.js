import { expect, test } from 'bun:test';
import worker from '../src/index.js';
import { fakeD1 } from './fake-d1.js';

const send = (path, init) => worker.fetch(new Request('https://ranker.flisk.si' + path, init), { DB: fakeD1() });

test('trending caches each period and serves conditional GETs', async () => {
  const fixture = fakeD1();
  await fixture.prepare('INSERT INTO products (slug, repo, name, created) VALUES (?, ?, ?, ?)').bind('test', 'o/test', 'Test', 1).run();
  await fixture.prepare('INSERT INTO snapshots (slug, day, stars) VALUES (?, ?, ?)').bind('test', new Date().toISOString().slice(0, 10), 1).run();
  const fetchPeriod = (period, init) => worker.fetch(new Request('https://ranker.flisk.si/api/trending?period=' + period, init), { DB: fixture });
  const response = await fetchPeriod('daily');
  const tag = response.headers.get('etag');
  expect(response.headers.get('cache-control')).toBe('public, max-age=300, stale-while-revalidate=600');
  expect(tag).toMatch(/^"[0-9a-f]{64}"$/);
  expect((await response.json())[0].period).toBe('daily');
  const cached = await fetchPeriod('daily', { headers: { 'If-None-Match': '"other", W/' + tag } });
  expect(cached.status).toBe(304);
  expect(await cached.text()).toBe('');
  const weekly = await fetchPeriod('weekly', { headers: { 'If-None-Match': tag } });
  expect(weekly.status).toBe(200);
  expect(weekly.headers.get('etag')).not.toBe(tag);
});
