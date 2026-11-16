// The HTML of Ranker: dark, a twinkling sky behind. Pure functions returning strings.
import { badgeSvg, embed, BODIES, RANKS, bodyOf, rankOf } from './badge.js';
import { short } from './score.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#03040B"/><path d="M32 10L36.5 27.5L54 32L36.5 36.5L32 54L27.5 36.5L10 32L27.5 27.5Z" fill="#F5C451"/></svg>';

const CSS = `*{box-sizing:border-box}body{margin:0;background:#02030a;color:#fff;font:300 16px/1.55 Inter,system-ui,sans-serif}
canvas#sky{position:fixed;inset:0;width:100%;height:100%;z-index:0}
.w{position:relative;z-index:1;max-width:1040px;margin:0 auto;padding:0 20px 60px}
a{color:#fff;text-decoration:none}nav{display:flex;flex-wrap:wrap;gap:8px 24px;align-items:center;padding:20px 0;font-size:14px}
nav .l{font:500 17px ui-monospace,Menlo,monospace}nav .s{flex:1}nav .cta{background:#fff;color:#000;border-radius:8px;padding:8px 14px;font-weight:500}
h1{font-size:clamp(34px,6vw,64px);font-weight:200;letter-spacing:-.04em;line-height:1.05;margin:36px 0 14px}
.sub{color:#B8BDC6;font-size:18px;max-width:640px}.lbl{font:400 11px ui-monospace,Menlo,monospace;color:#8A8F98;letter-spacing:.08em;text-transform:uppercase}
.tabs{display:flex;gap:8px;margin:28px 0 10px;flex-wrap:wrap}.tabs a{border:1px solid #2A2F38;border-radius:99px;padding:5px 14px;font-size:13px;color:#C9CDD3}.tabs a.on{background:#fff;color:#000;border-color:#fff}
.row{display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:14px 0;border-top:1px solid rgba(255,255,255,.1)}
.row .n{width:34px;font:500 15px ui-monospace,monospace;color:#8A8F98}.row .m{flex:1 1 220px;min-width:0}.row .m b{font-weight:500}.row .m p{margin:0;color:#8A8F98;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.g{font:500 14px ui-monospace,monospace;color:#7ee2a8}.box{border:1px solid #2A2F38;border-radius:14px;background:rgba(5,7,12,.82);padding:22px}
code,pre{font:12px/1.7 ui-monospace,Menlo,monospace;color:#9AA0AA;background:#000;border:1px solid #1E2229;border-radius:10px;padding:12px;display:block;word-break:break-all;white-space:pre-wrap;margin:8px 0}
input{width:100%;background:#000;border:1px solid #2A2F38;border-radius:10px;color:#fff;font:16px Inter,system-ui,sans-serif;padding:14px}
button,.btn{background:#fff;color:#000;border:0;border-radius:8px;padding:11px 18px;font:500 14px Inter,system-ui,sans-serif;cursor:pointer;display:inline-block}
.grid{display:flex;flex-wrap:wrap;gap:18px}.grid>*{flex:1 1 300px}small{color:#6B7079}`;

const SKY = `const c=document.getElementById('sky'),x=c.getContext('2d');let S=[],W,H;function z(){const d=devicePixelRatio||1;W=c.width=innerWidth*d;H=c.height=innerHeight*d;S=[];for(let i=0;i<Math.min(400,innerWidth*innerHeight/3000);i++)S.push({x:Math.random()*W,y:Math.random()*H,r:(.4+Math.random())*d,p:Math.random()*6.3,v:.6+Math.random()*2})}z();addEventListener('resize',z);
(function f(t){x.clearRect(0,0,W,H);for(const s of S){x.fillStyle='rgba(255,255,255,'+(.15+.85*(.5+.5*Math.sin(t/1000*s.v+s.p)))+')';x.beginPath();x.arc(s.x,s.y,s.r,0,6.3);x.fill()}requestAnimationFrame(f)})(0)`;

export function shell(title, body, { desc = 'Flisk Ranker ranks products by what happened on GitHub and gives each one a live README badge.', script = '' } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="icon" href="/icon.svg"><style>${CSS}</style></head><body><canvas id="sky"></canvas><div class="w"><nav><a class="l" href="/">&gt;_ flisk.ranker</a><a href="/">Trending</a><a href="/badges">Badges</a><a href="/submit">Submit</a><span class="s"></span><a class="cta" href="/submit">Submit your product</a></nav>${body}</div><script>${SKY}</script>${script ? `<script>${script}</script>` : ''}</body></html>`;
}

const PER = [['daily', 'Today'], ['weekly', 'This week'], ['monthly', 'This month'], ['yearly', 'This year']];

export function home(rows, period) {
  const tabs = PER.map(([k, l]) => `<a href="/?period=${k}" class="${k === period ? 'on' : ''}">${l}</a>`).join('');
  const list = rows.length
    ? rows.slice(0, 100).map((r) => `<div class="row"><span class="n">${r.rank}</span><div class="m"><b><a href="/p/${esc(r.slug)}">${esc(r.name)}</a></b>${r.verified ? ' <small>verified</small>' : ''}<p>${esc(r.tagline)}</p></div><span class="g">${r.gain >= 0 ? '+' : ''}${short(r.gain)}</span><span class="lbl">${short(r.stars)} stars</span></div>`).join('')
    : '<p class="sub">No products yet. <a href="/submit" style="text-decoration:underline">Be the first</a>.</p>';
  return shell('Flisk Ranker', `<h1>Where products rise.</h1><p class="sub">Ranked by stars gained, counted the same way for everyone. Every product gets a live README badge.</p><div class="tabs">${tabs}</div>${list}`);
}

export function embedBox(origin, slug) {
  const L = embed(origin, slug), S = embed(origin, slug, { size: 'small' });
  return `<div class="box"><div class="lbl">Copy this into your README</div><code>${esc(L.markdown)}</code><div class="lbl" style="margin-top:14px">Small, 20 px</div><code>${esc(S.markdown)}</code><div class="lbl" style="margin-top:14px">HTML</div><code>${esc(L.html)}</code></div>`;
}

export function product(p, row, origin) {
  const rank = row?.rank || 0, stars = row?.stars || 0;
  const body = `<div class="lbl" style="margin-top:36px">${esc(p.repo)}</div><h1 style="margin-top:8px">${esc(p.name)}</h1><p class="sub">${esc(p.tagline)}</p>
<div class="grid" style="margin-top:26px"><div><div class="lbl" style="margin-bottom:10px">Your badge, live</div><img src="/badge/${esc(p.slug)}.svg" width="250" height="55" alt="Flisk Ranker badge"><div style="margin-top:10px"><img src="/badge/${esc(p.slug)}.svg?size=small" height="20" alt="Small Flisk Ranker badge"></div>
<p class="sub" style="font-size:14px;margin-top:18px">${rank ? `#${rank} today, ${RANKS[rankOf(rank)]}. ${BODIES[bodyOf(stars)]} with ${short(stars)} stars.` : 'Not ranked yet.'}</p>
<p style="margin-top:6px">${p.verified ? '<span class="g">Verified: the badge is in the README.</span>' : '<small>Not verified yet. Put the badge in your README, then press the button.</small><br><br><button id="v">Check my README</button> <small id="vm"></small>'}</p></div>${embedBox(origin, p.slug)}</div>
<div class="box" style="margin-top:18px"><div class="lbl">Facts, from GitHub</div><p style="margin:8px 0 0">${[p.license, p.language, short(stars) + ' stars'].filter(Boolean).map(esc).join(' · ')}${p.homepage ? ` · <a style="text-decoration:underline" href="${esc(p.homepage)}" rel="nofollow">website</a>` : ''}</p></div>`;
  const script = p.verified ? '' : `document.getElementById('v').onclick=async()=>{const m=document.getElementById('vm');m.textContent='Checking...';const r=await fetch('/api/verify/${esc(p.slug)}',{method:'POST'}).then(r=>r.json()).catch(()=>({}));m.textContent=r.verified?'Verified.':'Badge not found in the README yet.';if(r.verified)location.reload()}`;
  return shell(`${p.name} on Flisk Ranker`, body, { desc: p.tagline || undefined, script });
}

export function submit() {
  const script = `document.getElementById('f').onsubmit=async e=>{e.preventDefault();const m=document.getElementById('m');m.textContent='Importing...';const r=await fetch('/api/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:document.getElementById('u').value})}).then(r=>r.json()).catch(()=>({error:'No answer. Try again.'}));if(r.slug)location.href='/p/'+r.slug;else m.textContent=r.error||'Something went wrong.'}`;
  return shell('Submit your product', `<h1>One link.</h1><p class="sub">Paste your GitHub link. We import the name, description, license and stars. Nothing to fill in.</p><form id="f" class="box" style="margin-top:24px"><input id="u" placeholder="https://github.com/you/your-product" required><br><br><button>Get my badge</button> <small id="m"></small></form>`, { script });
}

export function badges(rows, origin) {
  const list = rows.slice(0, 50).map((r) => `<div class="row"><div class="m"><b><a href="/p/${esc(r.slug)}">${esc(r.name)}</a></b><p>${esc(origin)}/badge/${esc(r.slug)}.svg</p></div><img src="/badge/${esc(r.slug)}.svg" width="250" height="55" loading="lazy" alt=""></div>`).join('');
  return shell('Badges', `<h1>Show your rank where people look.</h1><p class="sub">Every listed product gets a live badge. It updates by itself and links to its Ranker page. Nobody can buy a rank.</p><div style="margin:26px 0"><img src="/badge/sample.svg" width="250" height="55" alt="Sample badge"></div>${list}`);
}

export const sampleBadge = (size) => badgeSvg({ rank: 1, stars: 40000, size });
