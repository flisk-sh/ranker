import { expect, test } from 'bun:test';
import worker from '../src/index.js';
import { fakeD1 } from './fake-d1.js';

test('a second isolate reads the catalog from the shared cache, not D1', async () => {
  const store = new Map();
  globalThis.caches = { default: {
    match: async (k) => (store.has(k) ? new Response(store.get(k)) : undefined),
    put: async (k, r) => { store.set(k, await r.text()); },
    delete: async (k) => store.delete(k),
  } };
  try {
    const get = (db) => worker.fetch(new Request('https://ranker.flisk.si/api/trending'), { DB: db }, { waitUntil() {} });
    await get(fakeD1());
    await new Promise((r) => setTimeout(r, 0));
    expect(store.size).toBe(1);
    const cold = fakeD1();
    cold.prepare = () => { throw new Error('D1 was read'); };
    expect((await get(cold)).status).toBe(200);
  } finally { delete globalThis.caches; }
});
