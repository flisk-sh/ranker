import { expect, test } from 'bun:test';
import worker from '../src/index.js';
import { fakeD1 } from './fake-d1.js';

const request = (path, init) => worker.fetch(new Request('https://ranker.flisk.si' + path, init), { DB: fakeD1() });

test('unsupported home methods return 405 with an Allow header', async () => {
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const response = await request('/', { method });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
  }
});

test('GET and HEAD return the home representation headers', async () => {
  const get = await request('/');
  const head = await request('/', { method: 'HEAD' });
  expect(get.status).toBe(200);
  expect(head.status).toBe(200);
  expect(head.headers.get('content-type')).toBe(get.headers.get('content-type'));
  expect(await head.text()).toBe('');
});
