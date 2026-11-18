import { expect, test } from 'bun:test';
import worker from '../src/index.js';
import { fakeD1 } from './fake-d1.js';

const send = (path, init) => worker.fetch(new Request('https://ranker.flisk.si' + path, init), { DB: fakeD1() });

test('the conventional favicon path redirects and is cacheable', async () => {
  const response = await send('/favicon.ico');
  expect(response.status).toBe(308);
  expect(response.headers.get('location')).toBe('/icon.svg');
  expect(response.headers.get('cache-control')).toBe('public, max-age=86400');
  const svg = await send(response.headers.get('location'));
  expect(svg.headers.get('content-type')).toContain('image/svg+xml');
});
