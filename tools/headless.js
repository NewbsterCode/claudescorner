// Run a sim page headless: node tools/headless.js projects/tidepool/index.html [ticks] [reportEvery] [query]
// query is the page's URL params, e.g. 'seed=3&world=open' (see the config block in the page).
const fs = require('fs');
const page = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : '';
const m = page.match(/<script>([\s\S]*?)<\/script>/);
let src = m ? m[1] : '';
src = src.replace(/\nloop\(\);\s*$/, '\n');
const el = () => ({ getContext: () => new Proxy({}, { get: () => () => {} }), clientWidth: 1000, clientHeight: 700,
  addEventListener() {}, style: {}, set textContent(v) {}, set onclick(v) {}, set oninput(v) {} });
global.document = { getElementById: el }; global.location = { search: process.argv[5] ? '?' + process.argv[5].replace(/^\?/, '') : '' }; global.addEventListener = () => {}; global.requestAnimationFrame = () => {};
if (!/function step\(/.test(src)) { console.error('Usage: node tools/headless.js <page.html> [ticks] [every]. The page needs an inline <script> defining step().'); process.exit(1); }
const N = +(process.argv[3] || 60000), EVERY = +(process.argv[4] || 10000);
src += `
// mean brain-weight distance between creatures in different pools / within the same pool (1 = well mixed)
function divergence(pools) {
  const d = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s); };
  const pick = a => a[(Math.random() * a.length) | 0];
  const live = pools.filter(p => p.length > 1);
  if (live.length < 2) return NaN;
  let wi = 0, bt = 0;
  for (let k = 0; k < 400; k++) {
    const p = pick(live); wi += d(pick(p).g.w, pick(p).g.w);
    const a = pick(live); let b; do b = pick(live); while (b === a); bt += d(pick(a).g.w, pick(b).g.w);
  }
  return bt / wi;
}
const q = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor(p * (a.length - 1))];
for (let t = 1; t <= ${N}; t++) { step(); if (t % ${EVERY} === 0) {
  const sz = creatures.map(c => c.g.size), gut = creatures.map(c => c.g.gut);
  const carn = creatures.filter(c => c.g.gut < 0.85).length, herb = creatures.filter(c => c.g.gut > 1.15).length;
  console.log(String(t).padStart(6), 'pop', String(creatures.length).padStart(4), 'food', String(food.length).padStart(4),
    'gen', Math.max(...creatures.map(c => c.gen)),
    '| size p10/50/90', q(sz,.1).toFixed(1), q(sz,.5).toFixed(1), q(sz,.9).toFixed(1),
    '| herb/omni/carn', herb, creatures.length - herb - carn, carn,
    '| kills', creatures.reduce((s, c) => s + (c.kills || 0), 0));
  if (typeof zones !== 'undefined' && zones.length > 1) {
    const pools = zones.map((_, i) => creatures.filter(c => zoneOf(c.x) === i));
    console.log('       pools', pools.map((p, i) => {
      if (!p.length) return i + ': empty';
      const m = k => q(p.map(c => c.g[k]), .5);
      return i + ': pop ' + p.length + ' size ' + m('size').toFixed(1) + ' sense ' + m('sense').toFixed(0) + ' gut ' + m('gut').toFixed(2) + ' lin ' + new Set(p.map(c => c.lineage)).size;
    }).join(' | '), '| migrations', migrations, '| div', divergence(pools).toFixed(2));
  }
  if (typeof invaderLineages !== 'undefined' && invaderLineages.size) {
    const inv = creatures.filter(c => invaderLineages.has(c.lineage));
    console.log('       invaders alive', inv.length, 'max gen', inv.length ? Math.max(...inv.map(c => c.gen)) : '-',
      inv.length ? '| size ' + q(inv.map(c => c.g.size), .5).toFixed(1) + ' gut ' + q(inv.map(c => c.g.gut), .5).toFixed(2) + ' kills ' + inv.reduce((s, c) => s + c.kills, 0) + ' carn ' + inv.filter(c => c.g.gut < 0.85).length : '',
      '| lineages released', invaderLineages.size);
  }
}}`;
new Function(src)();
