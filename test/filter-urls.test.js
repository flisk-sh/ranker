import { test, expect } from 'bun:test';
import { home } from '../src/page.js';

const rows = [
  { slug: 'a', name: 'Alpha', tagline: 't', repo: 'x/a', stars: 20000, gain: 5, rank: 1, verified: 1, language: 'Go', topics: 'cli,dev', forks: 1 },
  { slug: 'b', name: 'Beta', tagline: 't', repo: 'x/b', stars: 10, gain: 0, rank: 2, verified: 0, language: 'Rust', topics: 'web', forks: 1 },
];
const script = () => [...home(rows, 'daily').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((x) => x.includes("getElementById('q')"));

// A minimal DOM: just the elements the filter script touches.
function run(search) {
  const el = (o = {}) => ({ value: '', checked: false, dataset: {}, classList: { toggle() {} }, style: {}, hidden: false, firstChild: { textContent: '' }, lastChild: {}, remove() {}, ...o });
  const q = el(), fl = el({ options: [{ value: '' }, { value: 'Go' }, { value: 'Rust' }] }), fs = el({ value: '0', options: [{ value: '0', text: 'any' }, { value: '1000' }, { value: '10000' }], selectedIndex: 0 });
  const fv = el(), fg = el(), st = el();
  const ids = { q, fl, fs, fv, fg, fst: st, globe: null, lm: null };
  const cats = [el({ dataset: { cat: '' } }), el({ dataset: { cat: 'cli' } }), el({ dataset: { cat: 'web' } })];
  const rowEls = rows.map((r) => el({ dataset: { t: r.name.toLowerCase(), c: r.topics, l: r.language, v: String(r.verified), s: String(r.stars), g: r.gain > 0 ? '1' : '0' } }));
  const document = {
    getElementById: (i) => ids[i] ?? null,
    querySelectorAll: (s) => (s === '.row[data-t]' ? rowEls : s === '[data-cat]' ? cats : []),
    querySelector: (s) => (s === '[data-cat]' ? cats[0] : null),
    body: { classList: { remove() {} } },
    hidden: true,
  };
  let url = '/' + search;
  const location = { get search() { return url.includes('?') ? '?' + url.split('?')[1].split('#')[0] : ''; }, pathname: '/', hash: '' };
  const history = { replaceState: (_a, _b, u) => { url = u; } };
  const fetch = () => new Promise(() => {});
  new Function('document', 'location', 'history', 'fetch', 'URLSearchParams', 'window', 'devicePixelRatio', 'addEventListener', 'requestAnimationFrame', 'setInterval', 'Date', script())(document, location, history, fetch, URLSearchParams, {}, 1, () => {}, () => {}, () => 0, Date);
  return { q, fl, fs, fv, fg, rowEls, cats, url: () => url };
}

test('filters picked on the page are written to the URL', () => {
  const t = run('');
  t.fl.value = 'Go'; t.fl.onchange();
  expect(t.url()).toBe('/?lang=Go');
  t.fv.checked = true; t.fv.onchange();
  t.fs.value = '10000'; t.fs.onchange();
  t.cats[1].onclick();
  expect(new URLSearchParams(t.url().split('?')[1]).toString()).toBe('lang=Go&verified=1&stars=10000&cat=cli');
  t.fl.value = ''; t.fl.onchange(); t.fv.checked = false; t.fv.onchange(); t.fs.value = '0'; t.fs.onchange(); t.cats[0].onclick();
  expect(t.url()).toBe('/');
});

test('opening a filtered URL restores the filters and narrows the list', () => {
  const t = run('?lang=Rust&rising=0&cat=web');
  expect(t.fl.value).toBe('Rust');
  expect(t.rowEls.map((r) => r.style.display)).toEqual(['none', '']);
  const u = run('?verified=1&stars=10000');
  expect(u.fv.checked).toBe(true);
  expect(u.fs.value).toBe('10000');
  expect(u.rowEls.map((r) => r.style.display)).toEqual(['', 'none']);
});

test('unknown filter values in the URL are ignored', () => {
  const t = run('?lang=Cobol&stars=7&cat=nope');
  expect(t.fl.value).toBe('');
  expect(t.fs.value).toBe('0');
  expect(t.rowEls.map((r) => r.style.display)).toEqual([undefined, undefined]);
});
