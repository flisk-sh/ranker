import { expect, test } from 'bun:test';
import worker from '../src/index.js';
import { fakeD1 } from './fake-d1.js';

const request = (path, init) => worker.fetch(new Request('https://ranker.flisk.si' + path, init), { DB: fakeD1() });

test('unknown pages return a compact 404 with a home link', async () => {
  const response = await request('/not-a-route');
  const body = await response.text();
  expect(response.status).toBe(404);
  expect(new TextEncoder().encode(body).length).toBeLessThan(4096);
  expect(body).toContain('name="robots" content="noindex"');
  expect(body).toContain('href="/"');
  expect(body).not.toContain('<nav>');
});
