// The HTML of Ranker, drawn from the design: black, hairlines, a blue glow. Pure functions returning strings.
import { badgeSvg, embed, BODIES, RANKS, bodyOf, rankOf } from './badge.js';
import { short, history } from './score.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#03040B"/><path d="M32 10L36.5 27.5L54 32L36.5 36.5L32 54L27.5 36.5L10 32L27.5 27.5Z" fill="#F5C451"/></svg>';

const CSS = `*{box-sizing:border-box}body{margin:0;background:#000;color:#fff;font:300 16px/1.55 Inter,system-ui,sans-serif}
a{color:#fff;text-decoration:none}.mono{font-family:'Geist Mono',ui-monospace,Menlo,monospace}
.w{position:relative;max-width:1280px;margin:0 auto;padding:0 40px 56px}@media(max-width:640px){.w{padding:0 16px 40px}}
nav{display:flex;flex-wrap:wrap;gap:12px 26px;align-items:center;padding:20px 0;font-size:13px}nav a{color:#C9CDD3;font-weight:400}
nav .l{font:500 17px 'Geist Mono',ui-monospace,monospace;color:#fff}nav .s{flex:1}nav .cta{background:#fff;color:#000;border-radius:8px;padding:8px 14px;font-weight:500}nav .me{border:1px solid #2A2F38;border-radius:8px;padding:8px 14px;background:#0B0D11;color:#fff}
.hero{position:relative;overflow:hidden;padding:44px 0 36px}.hero:before{content:'';position:absolute;right:-150px;top:-250px;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,rgba(60,120,255,.25),rgba(0,0,0,0) 65%)}.hero>*{position:relative;max-width:760px}
h1{font-size:clamp(36px,6vw,64px);font-weight:200;letter-spacing:-.045em;line-height:1.03;margin:14px 0 16px}
.sub{color:#B8BDC6;font-size:18px;line-height:1.5;max-width:680px;margin:0}.lbl{font:400 11px 'Geist Mono',ui-monospace,monospace;color:#8A8F98;letter-spacing:.08em;text-transform:uppercase}
.pill{display:inline-block;border:1px solid #2A2F38;border-radius:99px;padding:4px 11px;font:400 12px Inter,sans-serif;color:#C9CDD3}.pill.on{background:#fff;color:#000;border-color:#fff}.pill.ok{border-color:#1F5A3E;color:#5BE49B}
.card,.box{border:1px solid #2A2F38;border-radius:16px;background:#07090C;padding:24px}
.btn,button{border:1px solid #2A2F38;background:#0B0D11;color:#fff;border-radius:8px;padding:10px 16px;font:400 13px Inter,sans-serif;display:inline-block;cursor:pointer}.btn.p,button{background:#fff;color:#000;font-weight:500;border-color:#fff}
.stats{display:flex;flex-wrap:wrap;border-top:1px solid #1E2229;border-bottom:1px solid #1E2229}.stats>div{flex:1 1 200px;padding:18px 0 18px 24px;border-left:1px solid #1E2229}.stats b{display:block;font-size:30px;font-weight:200;letter-spacing:-.03em}
.cols{display:flex;flex-wrap:wrap;gap:36px;padding-top:32px;align-items:flex-start}.cols>.a{flex:3 1 620px;min-width:0}.cols>.b{flex:1 1 320px;min-width:0;display:flex;flex-direction:column;gap:20px}
.row{display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:16px 0;border-top:1px solid #1E2229}
.mk{flex:none;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font:500 18px Inter,sans-serif}
.row .n{width:30px;font:500 14px 'Geist Mono',monospace;color:#6B7079}.row .m{flex:1 1 240px;min-width:0}.row .m b{font-weight:500;font-size:16px}.row .m p{margin:2px 0 0;color:#8A8F98;font-size:13px}
.g{font:500 15px 'Geist Mono',monospace;color:#5BE49B;text-align:right}.g small{display:block;font-size:10px;color:#6B7079;letter-spacing:.08em}
code,pre{font:12px/1.7 'Geist Mono',ui-monospace,Menlo,monospace;color:#9AA0AA;background:#000;border:1px solid #1E2229;border-radius:10px;padding:12px;display:block;word-break:break-all;white-space:pre-wrap;margin:8px 0}
input,select{width:100%;background:#0B0D11;border:1px solid #2A2F38;border-radius:10px;color:#fff;font:16px Inter,system-ui,sans-serif;padding:14px}
.grid{display:flex;flex-wrap:wrap;gap:18px}.grid>*{flex:1 1 300px}small{color:#6B7079}.ok{color:#5BE49B}
.steps{display:flex;flex-wrap:wrap;border-top:1px solid #1E2229;border-bottom:1px solid #1E2229}.steps>div{flex:1 1 220px;padding:18px 0 18px 24px;border-left:1px solid #1E2229}
.live{border-color:#1F5A3E;background:linear-gradient(160deg,#08170F,#07090C)}.blue{background:linear-gradient(160deg,#0C1424,#07090C)}
.kv{display:flex;flex-direction:column;gap:12px;font-size:14px;line-height:1.5;color:#D5D8DD}.kv div{display:flex;gap:10px}.kv i{font-style:normal;color:#5BE49B}`;

const TONES = ['#1D4ED8', '#7C3AED', '#B45309', '#0F766E', '#BE185D', '#334155'];
const toneOf = (slug) => TONES[[...String(slug)].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
const mark = (r, n = 44) => `<span class="mk" aria-hidden="true" style="width:${n}px;height:${n}px;background:${toneOf(r.slug)};font-size:${Math.round(n * .42)}px">${esc((r.name || '?')[0].toUpperCase())}</span>`;

export function userBox(who) {
  return who ? `<a class="me" href="/logout" title="Sign out">${esc(who)} &middot; signed in</a>` : '<a class="cta" href="/login">Sign in with GitHub</a>';
}

export function shell(title, body, { desc = 'Flisk Ranker ranks products by what happened on GitHub and gives each one a live README badge.', script = '' } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="icon" href="/icon.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet"><style>${CSS}</style></head><body><div class="w"><nav><a class="l" href="/">&gt;_ flisk.ranker</a><a href="/">Trending</a><a href="/compare">Compare</a><a href="/live">Live mentions</a><a href="/badges">Badges</a><a href="/submit">Submit</a><span class="s"></span><!--USER--></nav>${body}</div>${script ? `<script>${script}</script>` : ''}</body></html>`;
}

const PER = [['daily', 'Today'], ['weekly', 'This week'], ['monthly', 'This month'], ['yearly', 'This year']];
const PLAB = { daily: 'STARS TODAY', weekly: 'STARS THIS WEEK', monthly: 'STARS THIS MONTH', yearly: 'STARS THIS YEAR' };

function line(vals, w = 120, h = 34, color = '#5BE49B') {
  if (!vals || vals.length < 2) return '';
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const pts = vals.map((v, i) => `${Math.round((i / (vals.length - 1)) * w)},${Math.round(h - 2 - ((v - lo) / span) * (h - 4))}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6"/></svg>`;
}
const starsOf = (snaps, slug, n = 30) => snaps.filter((x) => x.slug === slug).sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-n).map((x) => x.stars);

export function home(rows, period, snaps = []) {
  const stars = rows.reduce((a, r) => a + r.stars, 0), gain = rows.reduce((a, r) => a + Math.max(0, r.gain), 0), ver = rows.filter((r) => r.verified).length;
  const tabs = PER.map(([k, l]) => `<a href="/?period=${k}" class="pill ${k === period ? 'on' : ''}">${l}</a>`).join(' ');
  const list = rows.length
    ? rows.slice(0, 100).map((r) => `<div class="row"><span class="n">${r.rank}</span>${mark(r)}<div class="m"><b><a href="/p/${esc(r.slug)}">${esc(r.name)}</a></b> <span class="pill">Repo</span>${r.verified ? ' <span class="pill ok">&#10003; VERIFIED</span>' : ''}${r.isNew ? ' <span class="pill">NEW</span>' : ''}<p>${esc(r.tagline)}</p><div style="margin-top:6px">${[r.license, r.language].filter(Boolean).map((x) => `<span class="pill">${esc(x)}</span>`).join(' ')} <span class="pill">&#9733; ${short(r.stars)}</span> <span class="pill">&#9095; ${short(r.forks || 0)}</span></div></div>${line(starsOf(snaps, r.slug))}<div class="g">${r.gain >= 0 ? '+' : ''}${short(r.gain)}<small>${PLAB[period]}</small></div></div>`).join('')
    : '<p class="sub" style="padding:24px 0">No products yet. <a href="/submit" style="text-decoration:underline">Be the first</a>.</p>';
  const sample = rows[0]?.slug || 'sample';
  const body = `<div class="hero"><div class="lbl">FLISK RANKER &middot; RANKED BY STARS GAINED</div><h1>Where products rise.</h1><p class="sub">Every product on GitHub, ranked the same way for everyone. Submit yours, wear the live badge in your README.</p><p style="margin-top:24px"><a class="btn p" href="/submit" style="padding:12px 20px">Submit your product, free</a> <a class="btn" href="/badges" style="padding:12px 20px">How the badge works</a></p></div>
<div class="stats"><div><b>${rows.length}</b><span class="lbl">Products listed</span></div><div><b>${short(stars)}</b><span class="lbl">Stars in total</span></div><div><b>+${short(gain)}</b><span class="lbl">${PLAB[period].toLowerCase()}</span></div><div><b>${ver}</b><span class="lbl">Verified by makers</span></div></div>
<div class="cols"><div class="a"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px"><span class="lbl">TRENDING</span><span style="flex:1"></span>${tabs}</div>${list}</div>
<div class="b"><div class="card"><div class="lbl">YOUR BADGE</div><p style="margin:12px 0"><img src="/badge/${esc(sample)}.svg" width="250" height="55" alt="Badge"></p><a class="btn" href="/badges">See all badges</a></div>
<div class="card"><div class="lbl">LIVE MENTIONS</div><p style="margin:10px 0 14px;font-size:14px;color:#9AA0AA">Who talks about listed products, from Flisk Grow. Coming soon.</p><a class="btn" href="/live">Open live mentions</a></div>
<div class="card blue"><div class="lbl">FOR MAKERS</div><p style="margin:10px 0 14px;font-size:14px;color:#B8BDC6">Paste one link. We read GitHub every day and give you a live badge. Nobody can buy a rank.</p><a class="btn p" href="/submit">Submit your product</a></div></div></div>`;
  return shell('Flisk Ranker', body);
}

export function embedBox(origin, slug) {
  const L = embed(origin, slug), S = embed(origin, slug, { size: 'small' });
  return `<div class="card"><div class="lbl">COPY THIS INTO YOUR README</div><code id="md">${esc(L.markdown)}</code><div class="lbl" style="margin-top:14px">Small, 20 px</div><code>${esc(S.markdown)}</code><div class="lbl" style="margin-top:14px">HTML</div><code>${esc(L.html)}</code><button type="button" onclick="navigator.clipboard.writeText(document.getElementById('md').textContent);this.textContent='Copied'">Copy</button></div>`;
}

function momentum(snaps, slug) {
  const s = snaps.filter((x) => x.slug === slug).sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-90);
  if (s.length < 2) return '<p style="color:#8A8F98;font-size:14px;margin:10px 0 0">The chart fills in as we read GitHub each day. Check back tomorrow.</p>';
  const v = s.map((x) => x.stars), lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1, W = 800, H = 160;
  const pts = v.map((y, i) => `${Math.round((i / (v.length - 1)) * W)},${Math.round(H - 8 - ((y - lo) / span) * (H - 16))}`);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;margin-top:12px" preserveAspectRatio="none" aria-label="Stars, last ${s.length} days"><polygon points="0,${H} ${pts.join(' ')} ${W},${H}" fill="rgba(60,120,255,.18)"/><polyline points="${pts.join(' ')}" fill="none" stroke="#7DA7FF" stroke-width="2"/></svg><div class="lbl" style="display:flex;justify-content:space-between;margin-top:6px"><span>${esc(s[0].day)} &middot; ${short(lo)}</span><span>${esc(s[s.length - 1].day)} &middot; ${short(hi)}</span></div>`;
}

export function product(p, row, origin, snaps = [], all = []) {
  const rank = row?.rank || 0, stars = row?.stars || 0;
  const alts = all.filter((r) => r.slug !== p.slug && (!p.language || r.language === p.language)).slice(0, 4);
  const body = `<div style="padding:24px 0 8px"><span class="lbl"><a href="/">TRENDING</a> / ${esc(p.repo)}</span></div>
<div style="display:flex;flex-wrap:wrap;gap:22px;align-items:center;padding:12px 0 24px">${mark(p, 92)}<div style="flex:1 1 380px;min-width:0"><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><h1 style="margin:0;font-size:clamp(30px,5vw,48px)">${esc(p.name)}</h1><span class="pill">Repo</span>${p.verified ? '<span class="pill ok">&#10003; VERIFIED BY THE MAKER</span>' : ''}</div><p class="sub" style="margin-top:8px">${esc(p.tagline)}</p><div style="margin-top:12px">${[p.license, p.language].filter(Boolean).map((x) => `<span class="pill">${esc(x)}</span>`).join(' ')}</div><p style="margin-top:14px">${p.homepage ? `<a class="btn p" href="${esc(p.homepage)}" rel="nofollow">Visit</a> ` : ''}<a class="btn" href="https://github.com/${esc(p.repo)}" rel="nofollow">View on GitHub</a> <a class="btn" href="/compare?p=${esc(p.slug)}">Compare</a></p></div></div>
<div class="stats"><div><b>${rank ? '#' + rank : '-'}</b><span class="lbl">Rank today</span></div><div><b>${short(stars)}</b><span class="lbl">Stars</span></div><div><b>${short(row?.forks || 0)}</b><span class="lbl">Forks</span></div><div><b>${row ? (row.gain >= 0 ? '+' : '') + short(row.gain) : '-'}</b><span class="lbl">Stars today</span></div></div>
<div class="cols"><div class="a"><div class="card"><div class="lbl">MOMENTUM &middot; STARS, LAST 90 DAYS</div>${momentum(snaps, p.slug)}</div>
<div class="card" style="margin-top:20px"><div class="lbl">MENTIONS</div><p style="margin:10px 0 0;font-size:14px;color:#9AA0AA">Where people talk about ${esc(p.name)} will show here when Flisk Grow is connected.</p></div></div>
<div class="b"><div class="card"><div class="lbl">YOUR BADGE, LIVE</div><p style="margin:14px 0 8px"><img src="/badge/${esc(p.slug)}.svg" width="250" height="55" alt="Flisk Ranker badge"></p><img src="/badge/${esc(p.slug)}.svg?size=small" height="20" alt="Small badge"><p style="font-size:13px;color:#9AA0AA;margin:12px 0">${rank ? `#${rank} today, ${RANKS[rankOf(rank)]}. ${BODIES[bodyOf(stars)]} with ${short(stars)} stars.` : 'Not ranked yet.'}</p>${p.verified ? '<span class="ok">Verified: the badge is in the README.</span>' : '<small>Not verified yet. Put the badge in your README, then press the button.</small><br><br><button id="v">Check my README</button> <small id="vm"></small>'}</div>${embedBox(origin, p.slug)}
${alts.length ? `<div class="card"><div class="lbl">ALTERNATIVES</div>${alts.map((r) => `<div style="display:flex;gap:10px;align-items:center;padding-top:12px">${mark(r, 30)}<a href="/p/${esc(r.slug)}">${esc(r.name)}</a><span style="flex:1"></span><span class="lbl">${short(r.stars)} &#9733;</span></div>`).join('')}</div>` : ''}</div></div>`;
  const script = p.verified ? '' : `document.getElementById('v').onclick=async()=>{const m=document.getElementById('vm');m.textContent='Checking...';const r=await fetch('/api/verify/${esc(p.slug)}',{method:'POST'}).then(r=>r.json()).catch(()=>({}));m.textContent=r.verified?'Verified.':'Badge not found in the README yet.';if(r.verified)location.reload()}`;
  return shell(`${p.name} on Flisk Ranker`, body, { desc: p.tagline || undefined, script });
}

export function submit(who = '') {
  const script = `document.getElementById('f').onsubmit=async e=>{e.preventDefault();const m=document.getElementById('m');m.textContent='Importing...';const r=await fetch('/api/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:document.getElementById('u').value})}).then(r=>r.json()).catch(()=>({error:'No answer. Try again.'}));if(r.slug)location.href='/p/'+r.slug;else m.textContent=r.error||'Something went wrong.'}`;
  const step = (n, t, c, on) => `<div><div class="mono" style="font-size:12px;color:${c}">${n}</div><div style="font-size:16px;font-weight:400;margin-top:6px;color:${on ? '#fff' : '#8A8F98'}">${t}</div></div>`;
  const body = `<div class="hero"><div class="lbl">SUBMIT YOUR PRODUCT &middot; FREE &middot; TWO MINUTES</div><h1>Get listed, get ranked, wear the badge.</h1><p class="sub">Paste one link. We read GitHub every day and give you a live badge to put in your README.</p></div>
<div class="steps">${step(who ? '01 &middot; DONE' : '01', who ? `Signed in as ${esc(who)}` : 'Sign in with GitHub', who ? '#5BE49B' : '#fff', true)}${step('02 &middot; NOW', 'Paste one link', '#fff', true)}${step('03', 'Add the badge', '#6B7079', false)}${step('04', 'Go live', '#6B7079', false)}</div>
<div class="cols"><div class="a"><div class="card"><div class="lbl">STEP 2 &middot; PASTE ONE LINK. WE DO THE REST.</div><form id="f" style="margin-top:16px"><input id="u" placeholder="https://github.com/you/your-product" required><p style="margin:14px 0 0"><button>Import</button> <small id="m"></small></p></form><p style="font-size:12px;color:#6B7079;margin:12px 0 0">Works with a GitHub repo link. Name, line, licence, language and stars all come from the link.</p>${who ? '' : '<p style="margin:14px 0 0"><a class="btn" href="/login">Sign in with GitHub</a> <small>to see your products here later</small></p>'}</div>
<div class="card" style="margin-top:20px"><div class="lbl">STEP 3 &middot; ADD THE BADGE TO PROVE IT IS YOURS</div><p style="margin:12px 0 0;font-size:14px;color:#B8BDC6">After you import, your page shows the line to paste in your README. When we find it there, your page turns <span class="ok">verified</span>.</p><p style="margin:16px 0 0"><img src="/badge/sample.svg" width="250" height="55" alt="Sample badge"></p></div></div>
<div class="b"><div class="card"><div class="lbl">WHAT YOU GET, FREE</div><div class="kv" style="margin-top:14px"><div><i>&#10003;</i>A page with your live rank and star history</div><div><i>&#10003;</i>Stars and forks read every day</div><div><i>&#10003;</i>Rank badges for your README, big and small</div><div><i>&#10003;</i>A spot in compare and alternatives</div></div></div>
<div class="card"><div class="lbl">HOW THE RANK WORKS</div><p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#9AA0AA">Stars gained, counted the same way for everyone. Paying never changes a rank.</p></div></div></div>`;
  return shell('Submit your product', body, { script });
}

export function badges(rows, origin) {
  const kinds = [['Rank today', 'daily'], ['Rank this week', 'weekly'], ['Rank this month', 'monthly'], ['Rank this year', 'yearly']];
  const top = rows[0]?.slug;
  const gallery = top ? kinds.map(([n, per]) => `<div class="card" style="flex:1 1 300px"><img src="/badge/${esc(top)}.svg?period=${per}" width="250" height="55" alt=""><div style="font-size:15px;font-weight:500;margin:14px 0 4px">${n}</div><div style="font-size:13px;color:#8A8F98">Add ?period=${per} to the badge address.</div></div>`).join('') : '';
  const list = rows.slice(0, 50).map((r) => `<div class="row">${mark(r, 38)}<div class="m"><b><a href="/p/${esc(r.slug)}">${esc(r.name)}</a></b><p class="mono" style="font-size:11px">${esc(origin)}/badge/${esc(r.slug)}.svg</p></div><img src="/badge/${esc(r.slug)}.svg" width="250" height="55" loading="lazy" alt=""></div>`).join('');
  const body = `<div class="hero"><div class="lbl">BADGES &middot; LIVE IMAGES FOR YOUR README</div><h1>Show your rank where people look.</h1><p class="sub">Every listed product gets live badges. They update by themselves, link back to your Ranker page, and nobody can buy a rank.</p><p style="margin-top:24px"><a class="btn p" href="/submit" style="padding:12px 20px">Get my badge, free</a></p></div>
<div style="border-top:1px solid #1E2229;padding-top:28px"><div class="lbl">THE BADGES</div><div class="grid" style="margin-top:18px"><div class="card" style="flex:1 1 300px"><img src="/badge/sample.svg" width="250" height="55" alt="Sample badge"><div style="font-size:15px;font-weight:500;margin:14px 0 4px">Large, 250 px</div><div style="font-size:13px;color:#8A8F98">Body by total stars, rank colour by position: 625 looks.</div></div><div class="card" style="flex:1 1 300px"><img src="/badge/sample.svg?size=small" height="20" alt=""><div style="font-size:15px;font-weight:500;margin:14px 0 4px">Small, 20 px</div><div style="font-size:13px;color:#8A8F98">For tight READMEs.</div></div>${gallery}</div></div>
<div class="cols"><div class="a"><div class="lbl" style="margin-bottom:12px">EVERY LISTED PRODUCT HAS ONE &middot; ${rows.length}</div>${list}</div><div class="b"><div class="card blue"><div class="lbl">WHY PUT IT THERE</div><div class="kv" style="margin-top:14px"><div>Every visitor to your README sees proof people use you.</div><div>Each click lands on your Ranker page.</div><div>It changes by itself. Rise in the ranking and the badge shows it.</div></div></div></div></div>`;
  return shell('Badges', body);
}

export const sampleBadge = (size) => badgeSvg({ rank: 1, stars: 40000, size });

// Compare up to four products side by side, only numbers we really have.
export function compare(rows, snaps, all) {
  const cols = rows.slice(0, 4);
  const opts = all.filter((r) => !cols.find((c) => c.slug === r.slug)).slice(0, 100).map((r) => `<option value="${esc(r.slug)}">${esc(r.name)}</option>`).join('');
  const spark = (slug) => {
    const s = snaps.filter((x) => x.slug === slug).sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-90);
    if (s.length < 2) return '<small>Not enough days yet</small>';
    const lo = Math.min(...s.map((x) => x.stars)), hi = Math.max(...s.map((x) => x.stars)), span = hi - lo || 1;
    const pts = s.map((x, i) => `${Math.round((i / (s.length - 1)) * 160)},${Math.round(42 - ((x.stars - lo) / span) * 40)}`).join(' ');
    return `<svg viewBox="0 0 160 44" style="width:100%;height:44px" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="#7ee2a8" stroke-width="2"/></svg>`;
  };
  const best = (f) => { const v = cols.map(f); const m = Math.max(...v); return v.map((x) => (x === m && v.filter((y) => y === m).length === 1 ? 'g' : '')); };
  const stars = best((c) => c.stars), gain = best((c) => c.gain);
  const line = (l, cells) => `<tr><th class="lbl" style="text-align:left;padding:14px 12px;font-weight:400">${l}</th>${cells.map((c) => `<td style="padding:14px 12px;border-left:1px solid rgba(255,255,255,.1)">${c}</td>`).join('')}</tr>`;
  const table = cols.length
    ? `<div class="box" style="overflow-x:auto;margin-top:24px"><table style="border-collapse:collapse;width:100%;min-width:560px"><tr><th></th>${cols.map((c) => `<th style="padding:14px 12px;text-align:left;border-left:1px solid rgba(255,255,255,.1)"><a href="/p/${esc(c.slug)}" style="font-size:18px;font-weight:500">${esc(c.name)}</a>${c.verified ? '<br><small>verified</small>' : ''} <a href="/compare?p=${esc(cols.filter((x) => x.slug !== c.slug).map((x) => x.slug).join(','))}" aria-label="Remove ${esc(c.name)}" style="color:#8A8F98">&times;</a></th>`).join('')}</tr>
${line('Trending rank today', cols.map((c) => '#' + c.rank))}${line('Stars', cols.map((c, i) => `<span class="${stars[i]}">${short(c.stars)}</span>`))}${line('Stars gained today', cols.map((c, i) => `<span class="${gain[i]}">${c.gain >= 0 ? '+' : ''}${short(c.gain)}</span>`))}${line('Licence', cols.map((c) => esc(c.license || 'None listed')))}${line('Language', cols.map((c) => esc(c.language || '-')))}${line('Stars, 90 days', cols.map((c) => spark(c.slug)))}</table></div>`
    : '<p class="sub" style="margin-top:24px">Pick two to four products below.</p>';
  const add = cols.length < 4 && opts ? `<form method="get" action="/compare" class="box" style="margin-top:18px"><input type="hidden" name="p" value="${esc(cols.map((c) => c.slug).join(','))}"><div class="lbl">Add a product</div><select id="add" style="margin:10px 0;width:100%;background:#000;color:#fff;border:1px solid #2A2F38;border-radius:10px;padding:12px;font:16px Inter,sans-serif">${opts}</select><button type="submit" onclick="var f=this.form,h=f.p;h.value=(h.value?h.value+',':'')+f.querySelector('select').value">Add</button></form>` : '';
  return shell('Compare products', `<div class="lbl" style="margin-top:36px">Compare</div><h1 style="margin-top:8px">${cols.length ? cols.map((c) => esc(c.name)).join(' vs ') : 'Compare products'}</h1><p class="sub">The same live GitHub numbers for every product. Add up to four.</p>${table}${add}`);
}

// Live mentions need Flisk Grow; until it is connected the page says so and shows no made-up posts.
export function live() {
  return shell('Live mentions', `<div class="lbl" style="margin-top:36px">Live mentions</div><h1 style="margin-top:8px">Who is talking about what, right now.</h1><p class="sub">Mentions of listed products on X, Hacker News, Reddit, Bluesky and YouTube, found by Flisk Grow and matched to the right product.</p><div class="box" style="margin-top:26px"><div class="lbl">Coming soon</div><p style="margin:10px 0 0;color:#B8BDC6">The feed is not connected yet. When it is, every product page shows its mentions too. Submit your product now and it is matched from day one.</p><p style="margin-top:16px"><a class="btn" href="/submit">Submit your product</a></p></div>`);
}
