import { expect, test } from 'bun:test';
import { handle } from '../src/index.js';

const empty = { results: [] };
const stmt = { all: async () => empty, bind: () => stmt };
const env = { DB: { prepare: () => stmt } };

test.each(['POST', 'PUT', 'DELETE', 'PATCH'])('%s on the home page is rejected with 405', async (method) => {
  const res = await handle(new Request('https://ranker.flisk.si/', { method }), env);
  expect(res.status).toBe(405);
  expect(res.headers.get('allow')).toBe('GET, HEAD');
});
