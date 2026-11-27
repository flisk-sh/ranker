import { expect, test } from 'bun:test';
import worker from '../src/index.js';
import { fakeD1 } from './fake-d1.js';

const SITE = 'https://ranker.flisk.si';
const get = (path, env) => worker.fetch(new Request(SITE + path), env, { waitUntil() {} });

function envWithProducts() {
  const env = { DB: fakeD1() };
  env.DB.raw.run(
    "INSERT INTO products (slug, repo, name, tagline, created) VALUES ('acme-tool', 'acme/tool', 'Acme', '', 1)",
  );
  return env;
}

test('GET /sitemap.xml lists the home, static pages and every product', async () => {
  const res = await get('/sitemap.xml', envWithProducts());
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('application/xml');
  const xml = await res.text();
  expect(xml).toContain(`<loc>${SITE}/</loc>`);
  expect(xml).toContain(`<loc>${SITE}/submit</loc>`);
  expect(xml).toContain(`<loc>${SITE}/badges</loc>`);
  expect(xml).toContain(`<loc>${SITE}/acme/tool</loc>`);
  expect(xml.match(/<url>/g)?.length).toBe(4);
});

test('robots.txt points crawlers at the sitemap', async () => {
  const res = await get('/robots.txt', envWithProducts());
  expect(res.status).toBe(200);
  expect(await res.text()).toContain(`Sitemap: ${SITE}/sitemap.xml`);
});

test('a product page declares its canonical URL', async () => {
  const res = await get('/acme/tool', envWithProducts());
  expect(res.status).toBe(200);
  expect(await res.text()).toContain(`<link rel="canonical" href="${SITE}/acme/tool">`);
});
