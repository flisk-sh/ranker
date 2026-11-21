import { expect, test } from 'bun:test';
import { earned } from '../src/score.js';
import { earnedBadges, achv } from '../src/page.js';

const prods = [{ slug: 'a', language: 'Go' }, { slug: 'b', language: 'Go' }, { slug: 'c', language: 'Rust' }];
const snaps = [];
for (const [d, a, b, c] of [['2026-10-01', 10, 10, 10], ['2026-10-02', 30, 20, 50], ['2026-10-03', 60, 25, 55]])
  snaps.push({ slug: 'a', day: d, stars: a }, { slug: 'b', day: d, stars: b }, { slug: 'c', day: d, stars: c });

test('earned finds the first day a product reached its best rank, overall and in its language', () => {
  const w = earned(prods[0], prods, snaps, '2026-10-03', { minField: 1 });
  const day = w.find((x) => x.period === 'daily' && x.scope === 'language');
  expect(day).toMatchObject({ rank: 1, day: '2026-10-02' });
  expect(w.find((x) => x.period === 'daily' && x.scope === 'all')).toMatchObject({ rank: 1, day: '2026-10-03' });
});

test('earned needs a full period of history and enough products', () => {
  expect(earned(prods[0], prods, snaps, '2026-10-03')).toEqual([]);
  const w = earned(prods[0], prods, snaps, '2026-10-03', { minField: 1 });
  expect(w.some((x) => x.period === 'weekly')).toBe(false);
});

test('earned skips products that gained nothing or rank below the top', () => {
  expect(earned(prods[1], prods, snaps, '2026-10-03', { top: 1, minField: 1 })).toEqual([]);
});

test('earnedBadges draws our own Ranker badge with the date, never a Trendshift image', () => {
  const h = earnedBadges([{ rank: 1, period: 'daily', scope: 'language', day: '2026-10-02', stars: 30 }], { language: 'Go' });
  expect(h).toContain('data:image/svg+xml');
  expect(h).toContain('#1 Go Repository Of The Day');
  expect(h).toContain('first achieved 2 Oct 2026');
  expect(h).not.toContain('trendshift');
  expect(earnedBadges([], {})).toBe('');
});

test('ranker star milestones carry the day each was first reached', () => {
  const s = [{ slug: 's', day: '2026-10-01', stars: 90 }, { slug: 's', day: '2026-10-05', stars: 101 }];
  expect(achv({ slug: 's' }, { stars: 101, rank: 50 }, s)).toEqual(['100 stars · first achieved 2026-10-05']);
});

import { listedBadges } from '../src/page.js';
test('listed rankings are drawn as Ranker badges with the first-achieved date, no outside image', () => {
  const t = { id: '7', items: [{ period: 'daily', lang: 'Starlark', when: 'on 30th, Sep 2026', src: 'https://trendshift.io/x', alt: '#1 Starlark Repository Of The Day' }] };
  const h = listedBadges(t, 54);
  expect(h).toContain('data:image/svg+xml');
  expect(decodeURIComponent(h.match(/svg\+xml,([^"]+)"/)[1])).toContain('TRENDING · STARLARK');
  expect(h).toContain('#1 Starlark Repository Of The Day &middot; first achieved 30th, Sep 2026');
  expect(h).not.toContain('trendshift');
  expect(listedBadges(null)).toBe('');
});

test('long listed badge title shrinks to fit instead of being clipped', async () => {
  const { badgeSvg } = await import('../src/badge.js');
  const svg = badgeSvg({ rank: 1, period: 'daily', label: '#1 Starlark Repository Of The Day', kicker: 'TRENDING · STARLARK' });
  expect(svg).not.toContain('clip-path="url(#b)"');
  expect(svg).toMatch(/font-size="1[01]\.\d+"[^>]*>#1 Starlark Repository Of The Day/);
});
