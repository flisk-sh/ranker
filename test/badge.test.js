import { test, expect } from 'bun:test';
import { badgeSvg, bodyOf, rankOf, embed, BODIES, RANKS } from '../src/badge.js';

test('there are 25 bodies and 25 ranks, so 625 looks', () => {
  expect(BODIES.length).toBe(25);
  expect(RANKS.length).toBe(25);
});

test('body grows with stars, rank climbs with position', () => {
  expect(bodyOf(0)).toBe(0);
  expect(bodyOf(100000)).toBeGreaterThan(bodyOf(100));
  expect(bodyOf(1e12)).toBe(24);
  expect(rankOf(1)).toBe(24);
  expect(rankOf(5000)).toBe(0);
  expect(rankOf(0)).toBe(0);
});

test('large badge is 250x55 and says Flisk Ranker', () => {
  const s = badgeSvg({ rank: 3, stars: 5000, period: 'weekly' });
  expect(s).toContain('width="250" height="55"');
  expect(s).toContain('FLISK RANKER');
  expect(s).toContain('#3 Trending this week');
});

test('small badge is 20 px high and says ranker', () => {
  const s = badgeSvg({ rank: 1, stars: 10, size: 'small' });
  expect(s).toContain('height="20"');
  expect(s).toContain('ranker</tspan>');
});

test('unranked badge and custom label are escaped', () => {
  expect(badgeSvg({})).toContain('Listed on Ranker');
  expect(badgeSvg({ label: '<b>' })).not.toContain('<b>');
});

test('embed snippets point at the badge and the page', () => {
  const e = embed('https://ranker.flisk.si', 'a-b', { size: 'small' });
  expect(e.markdown).toBe('[![Flisk Ranker](https://ranker.flisk.si/badge/a-b.svg?size=small)](https://ranker.flisk.si/p/a-b)');
  expect(e.html).toContain('height="20"');
});

test('long text scrolls inside the box, short text stays still', () => {
  const long = badgeSvg({ label: 'A very long label that will not fit', rank: 1, stars: 9e4 });
  expect(long).toContain('clip-path');
  expect(long).toContain('animateTransform attributeName="transform" type="translate"');
  expect(badgeSvg({ rank: 3, stars: 5, size: 'large' })).not.toContain('type="translate"');
});
