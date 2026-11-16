import { expect, test } from 'bun:test';
import { rowHtml, shell } from '../src/page.js';

const r = { rank: 1, slug: 'a-b', name: 'b', repo: 'a/b', tagline: 't', topics: '', language: 'Go', license: 'MIT', stars: 5, forks: 1, gain: 2 };

test('every card carries its repo and an empty slot for the Cilytics OSS and GEL chip', () => {
  const html = rowHtml(r, [], [], 'day');
  expect(html).toContain('data-r="a/b"');
  expect(html).toContain('<span data-sc></span>');
});

test('the page loads Cilytics scores and the filler script is valid JavaScript', () => {
  const page = shell('x', '');
  expect(page).toContain('https://cilytics.flisk.si/featured-scores.json');
  const js = page.split('<script>').map((x) => x.split('</script>')[0]).find((x) => x.includes('featured-scores.json'));
  expect(() => new Function(js)).not.toThrow();
});
