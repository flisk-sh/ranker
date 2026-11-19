import { expect, test } from 'bun:test';
import worker from '../src/index.js';
import { fakeD1 } from './fake-d1.js';

test('GET / declares light and dark theme colors', async () => {
  const res = await worker.fetch(new Request('https://ranker.flisk.si/'), { DB: fakeD1() }, { waitUntil() {} });
  const body = await res.text();
  expect(body).toContain('<meta name="theme-color" content="#000000">');
  expect(body).toContain('<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">');
});
