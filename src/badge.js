// The Ranker badge: a live SVG, 250x55 (large) or 20 px high (small). Pure, no I/O.
// 625 looks: 25 bodies (rows, by total stars) x 25 navy ranks (columns, by rank position).
export const BODIES = ['Dust', 'Pebble', 'Asteroid', 'Moon', 'Rocky planet', 'Ice dwarf', 'Ice giant', 'Gas giant', 'Ringed giant', 'Brown dwarf', 'Red dwarf', 'Orange star', 'Yellow star', 'Blue star', 'Red giant', 'White dwarf', 'Pulsar', 'Neutron star', 'Magnetar', 'Nova', 'Supernova', 'Black hole', 'Quasar', 'Nebula', 'Galaxy'];
export const RANKS = ['Recruit', 'Seaman', 'Able seaman', 'Leading seaman', 'Senior seaman', 'Petty officer', 'Senior petty officer', 'Chief petty officer', 'Senior chief', 'Master chief', 'Warrant officer', 'Midshipman', 'Ensign', 'Sub-lieutenant', 'Lieutenant', 'Lt commander', 'Commander', 'Captain', 'Commodore', 'Rear admiral', 'Vice admiral', 'Admiral', 'Fleet admiral', 'Admiral of the fleet', 'Grand admiral'];
export const METALS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
const METAL = ['#D08A4C', '#C3CAD6', '#F5C451', '#7FE3FF', '#B58CFF'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "on 16 Nov", "week of 9 Nov", "in Nov 2026", "in 2026"; the old words when no day is given.
function whenOf(period, day) {
  const t = Date.parse(`${day}T00:00:00Z`);
  if (!day || Number.isNaN(t)) return WORDS[period] || WORDS.daily;
  const d = new Date(t), dm = (x) => `${x.getUTCDate()} ${MON[x.getUTCMonth()]}`;
  if (period === 'weekly') return `week of ${dm(new Date(t - 6 * 864e5))}`;
  if (period === 'monthly') return `in ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  if (period === 'yearly') return `in ${d.getUTCFullYear()}`;
  return `on ${dm(d)}`;
}
const WORDS = { daily: 'today', weekly: 'this week', monthly: 'this month', yearly: 'this year' };

// Row from total stars: 0 stars is dust, about 100k stars is a galaxy.
export const bodyOf = (stars) => Math.max(0, Math.min(24, Math.floor(Math.log2(Math.max(0, stars) + 1) * 1.45)));
// Column from rank position: #1 is grand admiral, rank 1000 and below is recruit.
export const rankOf = (rank) => (rank > 0 ? Math.max(0, 24 - Math.floor(Math.log2(rank) * 2.4)) : 0);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const f2 = (n) => Math.round(n * 100) / 100;

// The body on a 26x26 grid, centre (13,10), plus the chevrons at the bottom.
function figure(r, c) {
  const f = Math.floor(r / 5), s = r % 5, n = (c % 5) + 1, m = METAL[Math.floor(c / 5)], w = '#E8ECF2', x = 13, y = 10, rad = 2 + s * 1.15;
  const rot = (d, dir = 1) => `<animateTransform attributeName="transform" type="rotate" values="0 ${x} ${y};${360 * dir} ${x} ${y}" dur="${d}s" repeatCount="indefinite"/>`;
  let g = '';
  if (f === 0) g = `<circle cx="${x}" cy="${y}" r="${f2(rad + 1)}" fill="${w}"/><circle cx="${f2(x - rad * 0.3)}" cy="${f2(y - rad * 0.2)}" r="${f2(rad * 0.3)}" fill="#03040B" opacity=".5"/>`;
  else if (f === 1) g = `<circle cx="${x}" cy="${y}" r="${f2(rad + 0.5)}" fill="${w}"/><ellipse cx="${x}" cy="${y}" rx="${f2(rad * 2 + 1)}" ry="${f2(rad * 0.55 + 0.5)}" fill="none" stroke="${m}" stroke-width="1" transform="rotate(-20 ${x} ${y})"/>`;
  else if (f === 2) {
    const k = rad + 2.5;
    g = `<g>${rot(8 + s)}<path d="M${x} ${f2(y - k)}L${f2(x + k * 0.2)} ${f2(y - k * 0.2)}L${f2(x + k)} ${y}L${f2(x + k * 0.2)} ${f2(y + k * 0.2)}L${x} ${f2(y + k)}L${f2(x - k * 0.2)} ${f2(y + k * 0.2)}L${f2(x - k)} ${y}L${f2(x - k * 0.2)} ${f2(y - k * 0.2)}Z" fill="${w}"/></g>`;
  } else if (f === 3) {
    const k = rad + 3;
    g = `<circle cx="${x}" cy="${y}" r="${f2(rad * 0.7 + 1)}" fill="${w}"/><g>${rot(5)}<path d="M${x} ${f2(y - k)}V${f2(y + k)}M${f2(x - k)} ${y}H${f2(x + k)}M${f2(x - k * 0.7)} ${f2(y - k * 0.7)}L${f2(x + k * 0.7)} ${f2(y + k * 0.7)}M${f2(x + k * 0.7)} ${f2(y - k * 0.7)}L${f2(x - k * 0.7)} ${f2(y + k * 0.7)}" stroke="${m}" stroke-width=".8"/></g>`;
  } else {
    g = `<circle cx="${x}" cy="${y}" r="1.5" fill="${w}"/>`;
    for (let k = 0; k < 3; k++) {
      const rr = f2((k + 1) * (1.8 + s * 0.6));
      g += `<circle cx="${x}" cy="${y}" r="${rr}" fill="none" stroke="${w}" stroke-width=".5" opacity=".35"/><g>${rot(3 + k * 2, k % 2 ? -1 : 1)}<circle cx="${f2(x + rr)}" cy="${y}" r="1" fill="${m}"/></g>`;
    }
  }
  let ch = '';
  for (let i = 0; i < n; i++) ch += `<path d="M8 ${f2(24.5 - i * 2.3)}L13 ${f2(22 - i * 2.3)}L18 ${f2(24.5 - i * 2.3)}" fill="none" stroke="${m}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`;
  return g + ch;
}

const STARS = [[70, 9, 0.8, 3], [118, 47, 0.7, 2.4], [176, 8, 0.8, 3.6], [205, 44, 0.7, 2.2], [236, 10, 0.7, 3.2], [150, 50, 0.6, 2.6]];
const twinkle = (x, y, r, d, i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"><animate attributeName="opacity" values="1;.1;1" dur="${d}s" begin="-${f2(i * 0.4)}s" repeatCount="indefinite"/></circle>`;

// input: { rank, stars, period, label? }. Returns the SVG text.
export function badgeSvg({ rank = 0, stars = 0, period = 'daily', size = 'large', label, lang, day, kicker } = {}) {
  const r = bodyOf(stars), c = rankOf(rank), m = METAL[Math.floor(c / 5)];
  const when = whenOf(period, day);
  const scope = lang || 'all languages';
  const long = rank > 0 ? `#${rank} Trending ${when}` : '';
  const main = label || (rank > 0 ? (long.length * 8.2 > 180 ? `#${rank} ${when}` : long) : 'Listed on Ranker');
  const smallMain = label || (rank > 0 ? `${long} \u00b7 ${scope}` : 'Listed on Ranker');
  const title = `Flisk Ranker: ${rank > 0 ? `#${rank} by stars gained ${when}, ${scope}` : main}. ${RANKS[c]}, ${BODIES[r]}.`;
  if (size === 'small') {
    const w = Math.ceil((smallMain.length + 7) * 6.3) + 56;
    const n = (c % 5) + 1;
    let ch = '';
    for (let i = 0; i < n; i++) ch += `<path d="M${w - 14} ${14 - i * 3}l3.5 -2l3.5 2" fill="none" stroke="${m}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    const k = 6;
    const star = `<g transform="translate(11 10)"><g><animateTransform attributeName="transform" type="rotate" values="0;90" dur="8s" repeatCount="indefinite"/><path d="M0 -${k}L${f2(k * 0.22)} -${f2(k * 0.22)}L${k} 0L${f2(k * 0.22)} ${f2(k * 0.22)}L0 ${k}L-${f2(k * 0.22)} ${f2(k * 0.22)}L-${k} 0L-${f2(k * 0.22)} -${f2(k * 0.22)}Z" fill="${m}"><animate attributeName="opacity" values="1;.4;1" dur="2.4s" repeatCount="indefinite"/></path></g></g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" viewBox="0 0 ${w} 20" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><rect x=".5" y=".5" width="${w - 1}" height="19" rx="4" fill="#03040B" stroke="#2f3646"/>${twinkle(34, 5, 0.6, 2, 0)}${twinkle(w - 26, 16, 0.6, 2.5, 1)}${twinkle(60, 15, 0.6, 3, 2)}${star}<text x="23" y="14" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" fill="#fff"><tspan fill="${m}">ranker</tspan> ${esc(smallMain)}</text>${ch}</svg>`;
  }
  const stars6 = STARS.map(([x, y, rr, d], i) => twinkle(x, y, rr, d, i)).join('');
  const lab = kicker || `STARS GAINED \u00b7 ${scope.toUpperCase()}`;
  const line = (id, text, est, y, attrs) => {
    const avail = 182, over = est - avail;
    if (over <= 0) return `<text x="62" y="${y}" ${attrs}>${esc(text)}</text>`;
    const d = f2(over + 8), dur = f2(4 + d / 18);
    return `<clipPath id="${id}"><rect x="62" y="${y - 16}" width="${avail}" height="22"/></clipPath><g clip-path="url(#${id})"><text x="62" y="${y}" ${attrs}>${esc(text)}<animateTransform attributeName="transform" type="translate" values="0 0;0 0;-${d} 0;-${d} 0;0 0" keyTimes="0;.15;.6;.8;1" dur="${dur}s" repeatCount="indefinite"/></text></g>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="55" viewBox="0 0 250 55" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><rect x=".5" y=".5" width="249" height="54" rx="10" fill="#03040B" stroke="#2f3646"/>${stars6}<g transform="translate(2 1.5) scale(2)">${figure(r, c)}</g>${line('a', lab, lab.length * 6.4, 21, `font-family="ui-monospace,Menlo,monospace" font-size="9" letter-spacing=".6" fill="${m}"`)}${line('b', main, main.length * 8.2, 40, 'font-family="Inter,system-ui,sans-serif" font-size="16" font-weight="500" fill="#fff"')}</svg>`;
}

// The snippets a maker pastes into a README.
export function embed(origin, slug, { size = 'large', period = 'daily', scope, repo } = {}) {
  const q = [period !== 'daily' && `period=${period}`, scope === 'language' && 'scope=language', size === 'small' && 'size=small'].filter(Boolean).join('&');
  const img = `${origin}/badge/${slug}.svg${q ? '?' + q : ''}`;
  const page = repo ? `${origin}/${repo}` : `${origin}/p/${slug}`;
  const h = size === 'small' ? 20 : 55;
  return {
    markdown: `[![Flisk Ranker](${img})](${page})`,
    html: `<a href="${page}"><img src="${img}" alt="Flisk Ranker" height="${h}"></a>`,
    url: img,
  };
}
