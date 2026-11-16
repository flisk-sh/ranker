// A fake GitHub: repos by "owner/name" with a star count you can change between calls.
export function fakeGithub(repos = {}, readmes = {}) {
  const calls = [];
  const f = async (url) => {
    calls.push(String(url));
    let m = /api\.github\.com\/repos\/([^/]+\/[^/?]+)/.exec(url);
    if (m) {
      const r = repos[m[1].toLowerCase()];
      if (!r) return new Response('{}', { status: 404 });
      return new Response(JSON.stringify({ full_name: m[1], name: m[1].split('/')[1], description: r.description || 'A product', homepage: r.homepage || '', license: { spdx_id: 'MIT' }, language: 'TypeScript', topics: ['dev'], stargazers_count: r.stars, forks_count: r.forks || 0 }));
    }
    m = /raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/HEAD\/README\.md/.exec(url);
    if (m) return readmes[m[1].toLowerCase()] != null ? new Response(readmes[m[1].toLowerCase()]) : new Response('', { status: 404 });
    return new Response('', { status: 500 });
  };
  f.calls = calls;
  return f;
}
