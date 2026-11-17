import { expect, test } from 'bun:test';
import worker from '../src/index.js';
import { fakeD1 } from './fake-d1.js';

const send = (path, init) => worker.fetch(new Request('https://ranker.flisk.si' + path, init), { DB: fakeD1() });

test('theme-color matches the fixed black page in either color scheme', async () => {
  const home = await (await send('/')).text();
  for (const scheme of ['light', 'dark']) {
    expect(home).toContain(`<meta name="theme-color" content="#000" media="(prefers-color-scheme: ${scheme})">`);
  }
});
