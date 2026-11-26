// Checks the sandpile page's core against facts that must hold, then measures it.
// node tools/sandpile-test.js [quick|full]
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../projects/sandpile/sandpile-core.js'), 'utf8');
const S = new Function(src + '\nreturn { Pile, identityPile, EXACT, Hist, rng, driveOnce };')();
const { Pile, identityPile, EXACT, Hist, rng, driveOnce } = S;
const full = process.argv[2] === 'full';
let failed = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed++; };
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const sumOf = (W, H, a, b) => { const p = new Pile(W, H); for (let i = 0; i < p.n; i++) p.h[i] = a[i] + b[i]; return p.stabilize().h; };

// 1. Abelian: the same grains dropped in a different order end in the same pile.
{
  const r = rng(7), W = 41, H = 29, drops = Array.from({ length: 6000 }, () => (r() * W * H) | 0);
  const a = new Pile(W, H), b = new Pile(W, H);
  for (const i of drops) { a.add(i); a.relax(); }
  for (const i of drops.slice().reverse()) { b.add(i); b.relax(); }
  const c = new Pile(W, H); for (const i of drops) c.h[i]++; c.stabilize();   // all at once
  check(same(a.h, b.h) && same(a.h, c.h), 'abelian: forward, reversed and all-at-once drops give the same pile');
  check(a.added === a.grains() + a.lost, 'conservation: grains added = grains on grid + grains lost');
  check(a.h.every(v => v >= 0 && v < 4), 'stable piles have 0-3 grains everywhere');
}
// 2. Identity element: e + e = e, and e + c = c for recurrent c.
for (const [W, H] of [[1, 1], [2, 3], [30, 20], [64, 64]]) {
  const e = identityPile(W, H).h;
  const r = rng(W * 31 + H), c0 = new Pile(W, H);
  for (let i = 0; i < c0.n; i++) c0.h[i] = 3 + ((r() * 4) | 0);   // 3 + anything stabilizes to a recurrent pile
  const c = c0.stabilize().h;
  check(same(sumOf(W, H, e, e), e) && same(sumOf(W, H, e, c), c), `identity ${W}x${H}: e+e = e and e+c = c`);
}
// Known small case: the 2x2 identity is all 2s.
check(same(identityPile(2, 2).h, [2, 2, 2, 2]), 'identity 2x2 is all 2s');
// 3. Centre pile of 2^14 grains is symmetric under the square's 8 symmetries.
{
  const L = 101, p = new Pile(L, L), c = 50 * L + 50; p.add(c, 1 << 14); p.relax();
  let sym = true;
  for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) {
    const v = p.h[y * L + x];
    if (v !== p.h[x * L + y] || v !== p.h[y * L + (L - 1 - x)] || v !== p.h[(L - 1 - y) * L + x]) sym = false;
  }
  check(sym && p.lost === 0, 'centre pile of 16384 grains: 8-fold symmetric, nothing lost');
}
// Dhar (1990): a grain dropped on i causes G(i,j) topplings at j on average, with G the inverse of the grid
// Laplacian (open edges). So the mean avalanche size for uniform drops is mean(x) where Laplacian x = 1.
function exactMean(L) {
  const n = L * L, A = v => { const o = new Float64Array(n); for (let i = 0; i < n; i++) { const x = i % L, y = (i - x) / L;
    let s = 4 * v[i]; if (x > 0) s -= v[i - 1]; if (x < L - 1) s -= v[i + 1]; if (y > 0) s -= v[i - L]; if (y < L - 1) s -= v[i + L]; o[i] = s; } return o; };
  const x = new Float64Array(n), r = new Float64Array(n).fill(1), d = r.slice(); let rr = n;   // conjugate gradient
  for (let it = 0; it < 20 * L && rr > 1e-18 * n; it++) {
    const Ad = A(d); let dAd = 0; for (let i = 0; i < n; i++) dAd += d[i] * Ad[i];
    const al = rr / dAd; let nr = 0; for (let i = 0; i < n; i++) { x[i] += al * d[i]; r[i] -= al * Ad[i]; nr += r[i] * r[i]; }
    const be = nr / rr; rr = nr; for (let i = 0; i < n; i++) d[i] = r[i] + be * d[i];
  }
  return x.reduce((u, v) => u + v) / n;
}
// 4. Measurements (printed; loose sanity bounds).
const sizes = full ? [32, 64, 128, 256] : [64];
for (const L of sizes) {
  const p = new Pile(L, L), r = rng(L), warm = 3 * p.n, n = full ? Math.max(400000, 40 * p.n) : 150000;
  for (let i = 0; i < warm; i++) driveOnce(p, r);
  const hs = new Hist(), ha = new Hist(), hc = [0, 0, 0, 0], a = L >> 2, b = L - a;
  let zero = 0, maxS = 0, sumS = 0;
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const { size, area } = driveOnce(p, r);
    hs.add(size); ha.add(area); if (!size) zero++; if (size > maxS) maxS = size; sumS += size;
    if (i % 100 === 0) for (let y = a; y < b; y++) for (let x = a; x < b; x++) hc[p.h[y * L + x]]++;
  }
  const tot = hc.reduce((u, v) => u + v), fr = hc.map(v => v / tot);
  const fs_ = hs.fit(10, p.n / 8), fa = ha.fit(10, p.n / 8);
  console.log(`L=${L}: ${n} grains in ${Date.now() - t0} ms | no-topple ${(zero / n * 100).toFixed(1)}% | mean size ${(sumS / n).toFixed(1)} (exact ${exactMean(L).toFixed(1)}) | max ${maxS}`);
  console.log(`       tau(size) ${fs_ ? fs_.tau.toFixed(3) : '-'} | tau(area) ${fa ? fa.tau.toFixed(3) : '-'} | mean height ${(p.grains() / p.n).toFixed(3)}`);
  console.log(`       interior heights ${fr.map(v => (v * 100).toFixed(2)).join(' / ')} %  vs exact ${EXACT.map(v => (v * 100).toFixed(2)).join(' / ')} %`);
  if (L === 64) {
    check(fr.every((v, k) => Math.abs(v - EXACT[k]) < 0.02), 'L=64 interior height frequencies within 2 points of the exact values');
    check(Math.abs(sumS / n / exactMean(L) - 1) < 0.1, 'L=64 mean avalanche size within 10% of the exact (Dhar) value');
    check(fs_ && fs_.tau > 0.9 && fs_.tau < 1.4, 'L=64 avalanche size exponent between 0.9 and 1.4');
  }
}
if (failed) { console.log(failed + ' check(s) failed'); process.exit(1); }
console.log('All sandpile checks passed.');
