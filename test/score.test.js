import { test, expect } from 'bun:test';
import { trending, short, dayOf } from '../src/score.js';

const P = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }];
const S = [
  { slug: 'a', day: '2026-11-15', stars: 100, forks: 0 }, { slug: 'a', day: '2026-11-16', stars: 110, forks: 0 },
  { slug: 'b', day: '2026-11-15', stars: 5, forks: 0 }, { slug: 'b', day: '2026-11-16', stars: 30, forks: 0 },
  { slug: 'c', day: '2026-11-16', stars: 900, forks: 0 },
];

test('ranks by stars gained, not by total', () => {
  const r = trending(P, S, 'daily', '2026-11-16');
  expect(r.map((x) => x.slug)).toEqual(['b', 'a', 'c']);
  expect(r.map((x) => x.rank)).toEqual([1, 2, 3]);
  expect(r[0].gain).toBe(25);
});

test('a product with one snapshot is new with gain 0', () => {
  const c = trending(P, S, 'daily', '2026-11-16').find((x) => x.slug === 'c');
  expect(c.gain).toBe(0);
  expect(c.isNew).toBe(true);
});

test('products without snapshots are left out', () => {
  expect(trending(P, [], 'daily', '2026-11-16')).toEqual([]);
});

test('short and dayOf', () => {
  expect(short(950)).toBe('950');
  expect(short(1500)).toBe('1.5k');
  expect(short(25000)).toBe('25k');
  expect(dayOf(Date.UTC(2026, 10, 16, 23))).toBe('2026-11-16');
});
