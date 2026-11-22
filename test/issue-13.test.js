import { expect, test } from 'bun:test';
import worker from '../src/index.js';
import { fakeD1 } from './fake-d1.js';

const request = (path, init) => worker.fetch(new Request('https://ranker.flisk.si' + path, init), { DB: fakeD1() });

test('robots.txt is publicly cached', async () => {
  const response = await request('/robots.txt');
  expect(response.headers.get('cache-control')).toBe('public, max-age=86400');
  expect(response.headers.get('content-type')).toBe('text/plain');
  expect(await response.text()).toBe('User-agent: *\nAllow: /\n');
});
