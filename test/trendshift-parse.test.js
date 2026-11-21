import { expect, test } from 'bun:test';
import { idFromReadme, parseAchievements, fetchTrendshift } from '../src/trendshift.js';

const blk = (k, date, kind, alt) => `"$","div","${k}",{"children":[["$","p",null,{"children":["First achieved ","${kind}"," ",["$","span",null,{"className":"x","children":"${date}"}]," ","for Starlark"]}],["$","$L21",null,{"src":"https://trendshift.io/api/badge/trendshift/repositories/7/${k.split('-')[0]}?language=Starlark","alt":"${alt}"}]]}`;
const page = (`[${blk('daily-Starlark', '30th, Sep 2026', 'on', '#1 Day')},${blk('weekly-Starlark', 'Week 40, 2026', 'in', '#1 Week')}]`).replace(/"/g, '\\"');

test('idFromReadme reads the Trendshift id from a badge or link', () => {
  expect(idFromReadme('<img src="https://trendshift.io/api/badge/trendshift/repositories/266432/weekly?language=Starlark">')).toBe('266432');
  expect(idFromReadme('[x](https://trendshift.io/repositories/12?utm=1)')).toBe('12');
  expect(idFromReadme('no badge')).toBeNull();
});

test('parseAchievements returns each badge with the date first achieved', () => {
  expect(parseAchievements(page, '7')).toEqual([
    { period: 'daily', lang: 'Starlark', when: 'on 30th, Sep 2026', src: 'https://trendshift.io/api/badge/trendshift/repositories/7/daily?language=Starlark', alt: '#1 Day' },
    { period: 'weekly', lang: 'Starlark', when: 'in Week 40, 2026', src: 'https://trendshift.io/api/badge/trendshift/repositories/7/weekly?language=Starlark', alt: '#1 Week' },
  ]);
  expect(parseAchievements(page, '8')).toEqual([]);
});

test('fetchTrendshift is null without a README badge, and reads the page with one', async () => {
  const f = (readme) => async (u) => u.includes('raw.githubusercontent') ? new Response(readme) : new Response(page);
  expect(await fetchTrendshift('a/b', { fetch: f('nothing') })).toBeNull();
  const r = await fetchTrendshift('a/b', { fetch: f('trendshift.io/repositories/7') });
  expect(r.id).toBe('7');
  expect(r.items).toHaveLength(2);
  expect(await fetchTrendshift('a/b', { fetch: async () => ({ ok: false }) })).toBeNull();
});


