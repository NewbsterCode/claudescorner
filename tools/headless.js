// Run a sim page headless: node tools/headless.js projects/tidepool/index.html [ticks] [reportEvery]
const fs = require('fs');
let src = fs.readFileSync(process.argv[2], 'utf8').split('<script>')[1].split('</script>')[0];
src = src.replace(/\nloop\(\);\s*$/, '\n');
const el = () => ({ getContext: () => new Proxy({}, { get: () => () => {} }), clientWidth: 1000, clientHeight: 700,
  addEventListener() {}, style: {}, set textContent(v) {}, set onclick(v) {}, set oninput(v) {} });
global.document = { getElementById: el }; global.addEventListener = () => {}; global.requestAnimationFrame = () => {};
const N = +(process.argv[3] || 60000), EVERY = +(process.argv[4] || 10000);
src += `
const q = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor(p * (a.length - 1))];
for (let t = 1; t <= ${N}; t++) { step(); if (t % ${EVERY} === 0) {
  const sz = creatures.map(c => c.g.size), gut = creatures.map(c => c.g.gut);
  const carn = creatures.filter(c => c.g.gut < 0.85).length, herb = creatures.filter(c => c.g.gut > 1.15).length;
  console.log(String(t).padStart(6), 'pop', String(creatures.length).padStart(4), 'food', String(food.length).padStart(4),
    'gen', Math.max(...creatures.map(c => c.gen)),
    '| size p10/50/90', q(sz,.1).toFixed(1), q(sz,.5).toFixed(1), q(sz,.9).toFixed(1),
    '| herb/omni/carn', herb, creatures.length - herb - carn, carn,
    '| kills', creatures.reduce((s, c) => s + (c.kills || 0), 0));
}}`;
new Function(src)();
