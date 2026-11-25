// Moment scaling of BTW avalanches: <s^q> ~ L^sigma(q). Simple finite-size scaling predicts sigma(q) = D(q + 1 - tau),
// a straight line for q > tau - 1. Multiscaling (De Menech, Stella & Tebaldi 1998) shows up as a slope sigma'(q) that keeps changing.
// node tools/sandpile-moments.js [quick|full] [out.json]
//   quick: L = 16, 32, 64 (seconds; run by check.sh)   full: L = 32 ... 512 (~10 min on 4 cores)
const fs = require('fs'), path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const core = () => new Function(fs.readFileSync(path.join(__dirname, '../projects/sandpile/sandpile-core.js'), 'utf8') +
  '\nreturn { Pile, rng, driveOnce };')();
const QS = Array.from({ length: 19 }, (_, k) => 0.5 + k * 0.25);   // q = 0.5 ... 5
const BLOCKS = 16;

function measure(L, n, seed) {
  const { Pile, rng, driveOnce } = core();
  const p = new Pile(L, L), r = rng(seed);
  p.h.fill(3);                                    // all-3s is recurrent, so the walk starts inside the stationary set
  for (let i = 0; i < 2 * p.n; i++) driveOnce(p, r);   // then mix
  const per = Math.ceil(n / BLOCKS), lnL = Math.log(L);
  // Sums of (x / L^2)^q per block, scaled so that s^5 at L=512 stays far from overflow.
  const S = Array.from({ length: BLOCKS }, () => ({ size: new Float64Array(QS.length), area: new Float64Array(QS.length), n: 0 }));
  let maxS = 0;
  for (let i = 0; i < BLOCKS * per; i++) {
    const { size, area } = driveOnce(p, r), b = S[(i / per) | 0]; b.n++;
    if (!size) continue;
    if (size > maxS) maxS = size;
    const ls = Math.log(size) - 2 * lnL, la = Math.log(area) - 2 * lnL;
    for (let k = 0; k < QS.length; k++) { b.size[k] += Math.exp(QS[k] * ls); b.area[k] += Math.exp(QS[k] * la); }
  }
  // ln <x^q> per block (undoing the L^2 scaling), then mean and standard error over blocks.
  const stat = key => QS.map((q, k) => {
    const v = S.map(b => Math.log(b[key][k] / b.n) + 2 * q * lnL);
    const m = v.reduce((u, w) => u + w) / BLOCKS, sd = Math.sqrt(v.reduce((u, w) => u + (w - m) ** 2, 0) / (BLOCKS - 1));
    return { m, se: sd / Math.sqrt(BLOCKS) };
  });
  return { L, n: BLOCKS * per, maxS, size: stat('size'), area: stat('area') };
}

// Weighted least-squares slope of y against x, with its standard error.
function slope(xs, ys, ses) {
  const w = ses.map(s => 1 / Math.max(s, 1e-9) ** 2), W = w.reduce((u, v) => u + v);
  const mx = xs.reduce((u, x, i) => u + w[i] * x, 0) / W, my = ys.reduce((u, y, i) => u + w[i] * y, 0) / W;
  let sxx = 0, sxy = 0; xs.forEach((x, i) => { sxx += w[i] * (x - mx) ** 2; sxy += w[i] * (x - mx) * (ys[i] - my); });
  return { b: sxy / sxx, se: Math.sqrt(1 / sxx) };
}

function analyse(runs) {
  const out = { q: QS, L: runs.map(r => r.L), n: runs.map(r => r.n), maxS: runs.map(r => r.maxS) };
  for (const key of ['size', 'area']) {
    const lx = runs.map(r => Math.log(r.L));
    // sigma(q) from all sizes, and the local exponent from each consecutive pair of sizes (to see whether it drifts with L).
    const all = QS.map((q, k) => slope(lx, runs.map(r => r[key][k].m), runs.map(r => r[key][k].se)));
    const pairs = runs.slice(1).map((r, j) => QS.map((q, k) => {
      const a = runs[j][key][k], b = r[key][k];
      return { b: (b.m - a.m) / (lx[j + 1] - lx[j]), se: Math.hypot(a.se, b.se) / (lx[j + 1] - lx[j]) };
    }));
    // sigma'(q) by central differences on the all-sizes fit.
    const dsig = QS.map((q, k) => k === 0 || k === QS.length - 1 ? null : (all[k + 1].b - all[k - 1].b) / (QS[k + 1] - QS[k - 1]));
    out[key] = { sigma: all, pairs, dsig };
  }
  return out;
}

function report(a) {
  const f = (v, d = 3) => v == null ? '  -  ' : v.toFixed(d);
  console.log(`grids ${a.L.join(', ')} | avalanches per grid ${a.n.map(v => v.toLocaleString()).join(', ')} | largest ${a.maxS.join(', ')}`);
  for (const key of ['size', 'area']) {
    const D = key === 'size' ? 'D' : 'D_a';
    console.log(`\n${key === 'size' ? 'size s (topplings)' : 'area a (distinct sites)'}: sigma(q), the slope of ln<x^q> vs ln L`);
    console.log(`   q   sigma(all L)    ${a.L.slice(1).map((L, j) => `${a.L[j]}->${L}`.padStart(9)).join('')}   sigma'(q)~${D}`);
    a.q.forEach((q, k) => {
      if (k % 2) return;
      const s = a[key].sigma[k];
      console.log(` ${q.toFixed(2)}  ${f(s.b)} ±${f(s.se)}  ${a[key].pairs.map(p => f(p[k].b).padStart(9)).join('')}   ${f(a[key].dsig[k])}`);
    });
  }
}

if (!isMainThread) {
  parentPort.postMessage(measure(workerData.L, workerData.n, workerData.seed));
} else {
  const full = process.argv[2] === 'full', outFile = process.argv[3];
  const plan = full
    ? [[32, 4e6], [64, 4e6], [128, 4e6], [256, 3e6], [512, 1.2e6]]
    : [[16, 4e5], [32, 4e5], [64, 2e5]];
  const t0 = Date.now();
  Promise.all(plan.map(([L, n]) => new Promise((res, rej) => {
    const w = new Worker(__filename, { workerData: { L, n, seed: 1000 + L } });
    w.on('message', m => { console.error(`  L=${L} done after ${((Date.now() - t0) / 1000).toFixed(0)} s`); res(m); }); w.on('error', rej);
  }))).then(runs => {
    const a = analyse(runs);
    report(a);
    // Exact anchor: <s> = mean of Dhar's Green function, which grows like L^2, so sigma(1) must approach 2.
    const k1 = QS.indexOf(1), s1 = a.size.sigma[k1], last = a.size.pairs[a.size.pairs.length - 1][k1];
    console.log(`\nsigma_size(1) = ${s1.b.toFixed(3)} over all grids, ${last.b.toFixed(3)} between the two largest (exact: tends to 2)`);
    if (outFile) fs.writeFileSync(outFile, JSON.stringify(a, (k, v) => typeof v === 'number' ? +v.toPrecision(5) : v));
    if (!full) {   // sanity bounds for CI
      const ok = last.b > 1.7 && last.b < 2.2 && a.size.sigma.every((s, k) => !k || s.b > a.size.sigma[k - 1].b);
      console.log(ok ? 'ok   moment exponents: sigma(1) near 2 and sigma(q) increasing' : 'FAIL moment exponents out of range');
      if (!ok) process.exit(1);
    }
  });
}
