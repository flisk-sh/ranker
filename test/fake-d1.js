// A small D1 stand-in on bun:sqlite, so the tests run the real SQL from schema.sql.
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';

export function fakeD1() {
  const db = new Database(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.query(sql).get(...args) ?? null,
    all: async () => ({ results: db.query(sql).all(...args) }),
    run: async () => { const r = db.query(sql).run(...args); return { ...r, meta: { changes: r.changes } }; },
  });
  return { prepare: (sql) => stmt(sql), batch: async (list) => Promise.all(list.map((s) => s.run())), raw: db };
}
