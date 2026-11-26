// Sandpile core (no DOM). The page loads it, and tools/sandpile-test.js and tools/sandpile-moments.js load it in Node.
"use strict";
// A W×H Abelian sandpile with open edges. Sites with h >= 4 topple; toppling k times at once is the same as one at a time.
function Pile(W, H) {
  const n = W * H;
  this.W = W; this.H = H; this.n = n;
  this.h = new Int32Array(n);
  this.stack = new Int32Array(n); this.inS = new Uint8Array(n); this.sp = 0;   // unstable sites waiting to topple (each at most once)
  this.mark = new Int32Array(n); this.av = 0;                               // mark[i] == av: site toppled in the current avalanche
  this.size = 0; this.area = 0;                                             // current avalanche: topplings, distinct sites
  this.added = 0; this.lost = 0; this.topples = 0;
}
Pile.prototype.push = function (i) { if (!this.inS[i] && this.h[i] >= 4) { this.inS[i] = 1; this.stack[this.sp++] = i; } };
Pile.prototype.add = function (i, k = 1) { this.av++; this.size = 0; this.area = 0; this.h[i] += k; this.added += k; this.push(i); };
Pile.prototype.scan = function () { this.av++; this.size = 0; this.area = 0; for (let i = 0; i < this.n; i++) this.push(i); };
// Topple until stable or until `budget` site visits are used. Returns true when stable.
Pile.prototype.relax = function (budget = Infinity) {
  const { W, H, h, stack, inS, mark } = this, av = this.av;
  let sp = this.sp, visits = 0, size = this.size, area = this.area, lost = this.lost;
  const push = j => { if (!inS[j] && h[j] >= 4) { inS[j] = 1; stack[sp++] = j; } };
  while (sp && visits < budget) {
    const i = stack[--sp]; inS[i] = 0;
    const k = h[i] >> 2; if (!k) continue;
    h[i] &= 3; size += k; visits++;
    if (mark[i] !== av) { mark[i] = av; area++; }
    const x = i % W, y = (i - x) / W;
    if (x > 0) { h[i - 1] += k; push(i - 1); } else lost += k;
    if (x < W - 1) { h[i + 1] += k; push(i + 1); } else lost += k;
    if (y > 0) { h[i - W] += k; push(i - W); } else lost += k;
    if (y < H - 1) { h[i + W] += k; push(i + W); } else lost += k;
  }
  this.topples += size - this.size;
  this.sp = sp; this.size = size; this.area = area; this.lost = lost;
  return sp === 0;
};
Pile.prototype.stabilize = function () { this.scan(); this.relax(); return this; };
Pile.prototype.grains = function () { let s = 0; for (let i = 0; i < this.n; i++) s += this.h[i]; return s; };

// Identity of the sandpile group (the recurrent configurations under "add, then stabilize"):
// e = stab(6 - stab(6)), where 6 means six grains on every site.
function identityPile(W, H) {
  const p = new Pile(W, H); p.h.fill(6); p.stabilize();
  for (let i = 0; i < p.n; i++) p.h[i] = 6 - p.h[i];
  return p.stabilize();
}

// Exact single-site height probabilities on the infinite square lattice.
const EXACT = (() => {
  const pi = Math.PI, p0 = 2 / pi ** 2 - 4 / pi ** 3;
  const p1 = 1 / 4 - 1 / (2 * pi) - 3 / pi ** 2 + 12 / pi ** 3;
  const p2 = 3 / 8 + 1 / pi - 12 / pi ** 3;
  return [p0, p1, p2, 1 - p0 - p1 - p2];
})();

// Log-binned avalanche-size histogram (bins of width 2^(1/4)) and a least-squares slope of the density.
function Hist() { this.c = new Float64Array(160); this.total = 0; }
Hist.prototype.bin = s => Math.floor(4 * Math.log2(s));
Hist.prototype.add = function (s) { if (s > 0) { this.c[this.bin(s)]++; } this.total++; };
// Returns tau where P(s) ~ s^-tau, fitted over sizes in [lo, hi]. Density = count / integers in the bin.
Hist.prototype.fit = function (lo, hi) {
  const xs = [], ys = [];
  for (let b = 0; b < this.c.length; b++) {
    const a = Math.ceil(2 ** (b / 4)), z = Math.ceil(2 ** ((b + 1) / 4)) - 1;
    if (z < a || a < lo || z > hi || this.c[b] < 5) continue;
    const mid = Math.sqrt(a * z);
    xs.push(Math.log(mid)); ys.push(Math.log(this.c[b] / (z - a + 1) / this.total));
  }
  if (xs.length < 3) return null;
  const mx = xs.reduce((u, v) => u + v) / xs.length, my = ys.reduce((u, v) => u + v) / ys.length;
  let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
  return { tau: -sxy / sxx, points: xs.length };
};

// Seeded PRNG so runs repeat (mulberry32).
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// One driven step: drop a grain on a random site and relax fully. Returns the avalanche {size, area}.
function driveOnce(p, rand) { p.add((rand() * p.n) | 0); p.relax(); return { size: p.size, area: p.area }; }
