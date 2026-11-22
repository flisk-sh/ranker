import { expect, test } from 'bun:test';
import worker from '../src/index.js';
import { shell } from '../src/page.js';

test('the shared shell declares Open Graph and Twitter card tags', () => {
  const html = shell('Ranker', '<h1>Home</h1>');
  for (const tag of [
    '<meta property="og:title" content="Ranker">',
    '<meta property="og:description"',
    '<meta property="og:type" content="website">',
    '<meta property="og:image" content="https://ranker.flisk.si/og.png">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:image" content="https://ranker.flisk.si/og.png">',
  ]) expect(html).toContain(tag);
});

test('GET /og.png returns a cached 1200x630 PNG under 200 KB', async () => {
  const res = await worker.fetch(new Request('https://ranker.flisk.si/og.png'), {}, { waitUntil() {} });
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('image/png');
  expect(res.headers.get('cache-control')).toContain('max-age=31536000');
  const bytes = new Uint8Array(await res.arrayBuffer());
  expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(bytes.length).toBeLessThan(200 * 1024);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(16)).toBe(1200);
  expect(view.getUint32(20)).toBe(630);
});
