// Find the top repos in unusual languages (Starlark, Lobster, Zig, Gleam ...) and submit them to Flisk Ranker.
// Each run covers one slice of the list, chosen by the hour, so a day covers every language.
// GITHUB_TOKEN=... bun scripts/languages.mjs     RANKER=http://localhost:8820 to test locally
export const LANGUAGES = ['Starlark', 'Lobster', 'Zig', 'Nim', 'Crystal', 'Gleam', 'Odin', 'V', 'Janet', 'Racket', 'Haskell', 'OCaml', 'Elixir', 'Erlang', 'Clojure', 'Julia', 'Prolog', 'Forth', 'Idris', 'Lean', 'Agda', 'Raku', 'Pony', 'Mojo', 'Roc', 'Vala', 'D', 'Fortran', 'COBOL', 'Brainfuck', 'LOLCODE', 'Jsonnet', 'Nix', 'Dhall', 'CUE', 'HCL', 'Cairo', 'Move', 'Solidity', 'Hack', 'Wren', 'Red', 'Factor', 'Elm', 'PureScript', 'ReScript', 'Grain', 'Ballerina', 'Common Lisp', 'Scheme', 'Smalltalk', 'Ada', 'Assembly', 'WebAssembly', 'Verilog', 'VHDL', 'GLSL', 'Typst', 'Just', 'Dockerfile'];
// Projects people call by name that are not a language on GitHub.
export const EXTRA = ['aaif-goose/goose', 'aardappel/lobster'];

export const slice = (hour, per = 8, list = LANGUAGES) => Array.from({ length: Math.min(per, list.length) }, (_, i) => list[(hour * per + i) % list.length]);

export async function run({ fetchFn = fetch, base = process.env.RANKER || 'https://ranker.flisk.si', token = process.env.GITHUB_TOKEN, hour = new Date().getUTCHours(), perLang = 5, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), log = console.log } = {}) {
  const gh = { accept: 'application/vnd.github+json', 'user-agent': 'flisk-ranker-seed', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const since = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10);
  const repos = new Set(EXTRA);
  for (const lang of slice(hour)) {
    const q = encodeURIComponent(`language:"${lang}" stars:>50 pushed:>${since}`);
    const res = await fetchFn(`https://api.github.com/search/repositories?q=${q}&sort=stars&per_page=${perLang}`, { headers: gh }).catch(() => null);
    if (res?.ok) for (const i of (await res.json()).items || []) repos.add(i.full_name);
    else log(`${lang}: search failed ${res?.status ?? 'network'}`);
    await sleep(2200);
  }
  let ok = 0, failed = 0;
  for (const repo of repos) {
    const res = await fetchFn(`${base}/api/submit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: `https://github.com/${repo}` }) });
    if (res.ok) ok++;
    else { failed++; log(`${repo}: ${res.status}`); if (res.status === 429) break; }
  }
  log(`${repos.size} repos found, ${ok} submitted or already listed, ${failed} failed`);
  return { found: repos.size, ok, failed };
}

if (import.meta.main) await run();
