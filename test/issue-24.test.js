import { expect, test } from 'bun:test';
import worker from '../src/index.js';
import { fakeD1 } from './fake-d1.js';

const request = (path, init) => worker.fetch(new Request('https://ranker.flisk.si' + path, init), { DB: fakeD1() });

test('the home view has one main landmark after the navigation', async () => {
  const html = await (await request('/')).text();
  expect(html.match(/<main(?:\s|>)/g)).toHaveLength(1);
  expect(html).toMatch(/<\/nav><main>[^]*<\/main><\/div>/);
});
