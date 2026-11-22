import { expect, test } from 'bun:test';
import worker from '../src/index.js';
import { fakeD1 } from './fake-d1.js';

const request = (path, init) => worker.fetch(new Request('https://ranker.flisk.si' + path, init), { DB: fakeD1() });

test('the first body control skips the navigation to main content', async () => {
  const html = await (await request('/')).text();
  expect(html).toMatch(/<body>\s*<a class="skip-link" href="#main-content">Skip to content<\/a>/);
  expect(html).toContain('<main id="main-content" tabindex="-1">');
  expect(html).toContain('.skip-link:focus{transform:none}');
});
