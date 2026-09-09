/* Adds surface shading data to the brain point cloud so the FOLDS read.
 *
 * The cloud as shipped is position + size only, so the fragment shader had
 * nothing structural to colour by: every point got ink, and a random 10% got
 * accent. That is why it reads as confetti in a blob rather than as a brain.
 *
 * This computes, per point, from the cloud itself (no mesh needed):
 *   normal   PCA of the k nearest neighbours (smallest eigenvector),
 *            flipped to point away from the brain centre
 *   cavity   dot(n, centroid_local - p) / R  ->  >0 inside a sulcus (valley),
 *            <0 on a gyrus (crown). This is the standard mean-offset curvature
 *            estimate and it is precisely the gyrus/sulcus separation.
 *   density  neighbours within R, normalised — a second, independent cue that
 *            deepens creases where the surface folds back on itself
 *
 * Output (assets/model/):
 *   brain-nrm.bin    int8  XYZ per point
 *   brain-shade.bin  uint8 pairs: [cavity, density] per point
 *
 * Run: node _build/brain-shade.js
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'model');

const QUANT = 1.2 / 32767;                 // matches brain-extract.py
const q = new Int16Array(fs.readFileSync(path.join(OUT, 'brain-points.bin')).buffer);
const n = q.length / 3 | 0;
const P = new Float32Array(n * 3);
for (let i = 0; i < n * 3; i++) P[i] = q[i] * QUANT;
console.log('points', n);

/* ---- bounds + uniform grid ------------------------------------------------ */
let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) {
  const v = P[i * 3 + c];
  if (v < mn[c]) mn[c] = v;
  if (v > mx[c]) mx[c] = v;
}
const span = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
// mean nearest-neighbour spacing on a surface-sampled cloud ~ sqrt(area/n).
// R at ~4.5x the spacing catches enough neighbours to be stable without
// smoothing the folds away — this is the knob that decides how crisp they read.
const spacing = Math.sqrt((span * span * 2.2) / n);
const R = spacing * (Number(process.env.RMUL) || 4.5);
console.log('span', span.toFixed(4), 'spacing~', spacing.toFixed(4), 'R', R.toFixed(4));

const cell = R;
const dim = [0, 1, 2].map(c => Math.max(1, Math.ceil((mx[c] - mn[c]) / cell) + 1));
const key = (a, b, c) => (a * dim[1] + b) * dim[2] + c;
const grid = new Map();
const cellOf = i => [0, 1, 2].map(c => Math.min(dim[c] - 1, Math.floor((P[i * 3 + c] - mn[c]) / cell)));
for (let i = 0; i < n; i++) {
  const [a, b, c] = cellOf(i);
  const k = key(a, b, c);
  let arr = grid.get(k);
  if (!arr) grid.set(k, arr = []);
  arr.push(i);
}

const ctr = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];

/* ---- symmetric 3x3 eigen: smallest eigenvector via inverse iteration ------ */
function smallestEigenvector(m) {
  // m = [xx, xy, xz, yy, yz, zz]
  const [xx, xy, xz, yy, yz, zz] = m;
  // trace-shifted power iteration on (tr*I - M): its LARGEST eigenvector is
  // M's smallest. Converges fine for a well-conditioned covariance and avoids
  // an inverse (which is singular exactly when the patch is perfectly flat).
  const tr = xx + yy + zz;
  const A = [tr - xx, -xy, -xz, tr - yy, -yz, tr - zz];
  let v = [0.5773, 0.5774, 0.5775];
  for (let it = 0; it < 48; it++) {
    const x = A[0] * v[0] + A[1] * v[1] + A[2] * v[2];
    const y = A[1] * v[0] + A[3] * v[1] + A[4] * v[2];
    const z = A[2] * v[0] + A[4] * v[1] + A[5] * v[2];
    const L = Math.hypot(x, y, z) || 1;
    v = [x / L, y / L, z / L];
  }
  return v;
}

const NRM = new Float32Array(n * 3);
const CAV = new Float32Array(n);
const DEN = new Float32Array(n);
const R2 = R * R;
let maxNb = 0;
const nb = new Int32Array(512);

for (let i = 0; i < n; i++) {
  const px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2];
  const [ca, cb, cc] = cellOf(i);
  let cnt = 0;
  for (let a = ca - 1; a <= ca + 1; a++) {
    if (a < 0 || a >= dim[0]) continue;
    for (let b = cb - 1; b <= cb + 1; b++) {
      if (b < 0 || b >= dim[1]) continue;
      for (let c = cc - 1; c <= cc + 1; c++) {
        if (c < 0 || c >= dim[2]) continue;
        const arr = grid.get(key(a, b, c));
        if (!arr) continue;
        for (let t = 0; t < arr.length; t++) {
          const j = arr[t];
          const dx = P[j * 3] - px, dy = P[j * 3 + 1] - py, dz = P[j * 3 + 2] - pz;
          if (dx * dx + dy * dy + dz * dz <= R2) { if (cnt < nb.length) nb[cnt++] = j; }
        }
      }
    }
  }
  if (cnt > maxNb) maxNb = cnt;
  DEN[i] = cnt;

  // local centroid + covariance
  let mx0 = 0, my0 = 0, mz0 = 0;
  for (let t = 0; t < cnt; t++) { const j = nb[t]; mx0 += P[j * 3]; my0 += P[j * 3 + 1]; mz0 += P[j * 3 + 2]; }
  mx0 /= cnt; my0 /= cnt; mz0 /= cnt;
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (let t = 0; t < cnt; t++) {
    const j = nb[t];
    const dx = P[j * 3] - mx0, dy = P[j * 3 + 1] - my0, dz = P[j * 3 + 2] - mz0;
    xx += dx * dx; xy += dx * dy; xz += dx * dz; yy += dy * dy; yz += dy * dz; zz += dz * dz;
  }
  let v = cnt >= 5 ? smallestEigenvector([xx, xy, xz, yy, yz, zz]) : [px - ctr[0], py - ctr[1], pz - ctr[2]];
  let L = Math.hypot(v[0], v[1], v[2]) || 1;
  v = [v[0] / L, v[1] / L, v[2] / L];
  // orient outward: away from the brain's centre
  if (v[0] * (px - ctr[0]) + v[1] * (py - ctr[1]) + v[2] * (pz - ctr[2]) < 0) v = [-v[0], -v[1], -v[2]];
  NRM[i * 3] = v[0]; NRM[i * 3 + 1] = v[1]; NRM[i * 3 + 2] = v[2];

  // mean-offset curvature: how far the local centroid sits along the normal
  CAV[i] = ((mx0 - px) * v[0] + (my0 - py) * v[1] + (mz0 - pz) * v[2]) / R;
}

/* ---- normalise cavity by percentile so the mapping is not hostage to a few
       outliers, and so the mid-grey lands on the actual median surface ------ */
const sorted = Float32Array.from(CAV).sort();
const pct = p => sorted[Math.min(n - 1, Math.max(0, Math.round(p * (n - 1))))];
const lo = pct(0.02), hi = pct(0.98);
console.log('cavity p2', lo.toFixed(4), 'p50', pct(0.5).toFixed(4), 'p98', hi.toFixed(4), 'maxNeighbours', maxNb);

const nrmOut = Buffer.alloc(n * 3);
const shadeOut = Buffer.alloc(n * 2);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
for (let i = 0; i < n; i++) {
  for (let c = 0; c < 3; c++) nrmOut.writeInt8(clamp(Math.round(NRM[i * 3 + c] * 127), -127, 127), i * 3 + c);
  const cav = clamp((CAV[i] - lo) / (hi - lo || 1), 0, 1);
  const den = clamp(DEN[i] / (maxNb || 1), 0, 1);
  shadeOut.writeUInt8(Math.round(cav * 255), i * 2);
  shadeOut.writeUInt8(Math.round(den * 255), i * 2 + 1);
}
const SUF = process.env.SUF || '';
fs.writeFileSync(path.join(OUT, SUF + 'brain-nrm.bin'), nrmOut);
fs.writeFileSync(path.join(OUT, SUF + 'brain-shade.bin'), shadeOut);
console.log('wrote brain-nrm.bin', nrmOut.length, 'brain-shade.bin', shadeOut.length);

// sanity: cavity must actually vary, or the shader gains nothing
let below = 0, above = 0;
for (let i = 0; i < n; i++) { if (CAV[i] < pct(0.5)) below++; else above++; }
console.log('split around median:', below, '/', above);
