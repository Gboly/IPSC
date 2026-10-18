// CANONICAL SCENARIO REFERENCE - Model Field K-17 (Rule 5: single source of truth).
// SIMULATION ONLY - FICTIONAL FIELD - SYNTHETIC DATA - NOT REPRESENTATIVE OF ANY VERIFIED COMPANY ASSET.
//
// This file never goes to the client wholesale. Data packs are *projections* of it, released
// stage by stage (see game/packs.js). Hidden items (true constraints, planted data issues,
// true event losses) live in ./truth.js and only reach the AI reviewer.

import { iprRate, iprPwf, vlpPwf, gilbertPwhPsig, linePressureDrop } from './physics.js';

export const SEP_PSIG_SETPOINT = 150;
export const P_ATM = 14.7;

export const PVT = {
  A: { api: 30, gasSG: 0.72, pb: 2200, rsb: 420, bob: 1.24, z: 0.9, bw: 1.02 },
  B: { api: 36, gasSG: 0.75, pb: 3000, rsb: 700, bob: 1.38, z: 0.9, bw: 1.02 },
};

export const RESERVOIRS = {
  A: { name: 'Sand A (shallow)', tvdTop: 7100, pr0: 3050, declinePerYr: 125, pb: 2200 },
  B: { name: 'Sand B (deep, small gas cap)', tvdTop: 9300, pr0: 3900, declinePerYr: 95, pb: 3000 },
};

// resT: reservoir temperature degF; whT: wellhead flowing temperature degF
export const WELLS = [
  { id: 'K17-01', res: 'A', man: 'MA', tvd: 7200, md: 7900, tubingId: 2.992, resT: 188, whT: 130, j: 2.9, wc0: 0.18, wcInf: 0.70, tauDays: 1100, gorMult: 1.0, choke: 40, fl: { id: 4.026, len: 2400 } },
  { id: 'K17-02', res: 'A', man: 'MA', tvd: 7250, md: 8050, tubingId: 2.992, resT: 189, whT: 130, j: 2.2, wc0: 0.30, wcInf: 0.78, tauDays: 1000, gorMult: 1.0, choke: 36, fl: { id: 4.026, len: 3100 } },
  { id: 'K17-03', res: 'A', man: 'MA', tvd: 7150, md: 7700, tubingId: 2.992, resT: 187, whT: 130, j: 3.4, wc0: 0.12, wcInf: 0.62, tauDays: 1000, gorMult: 1.0, choke: 44, fl: { id: 4.026, len: 1800 } },
  { id: 'K17-04', res: 'A', man: 'MA', tvd: 7300, md: 8200, tubingId: 2.992, resT: 190, whT: 130, j: 1.7, wc0: 0.40, wcInf: 0.82, tauDays: 900, gorMult: 1.0, choke: 32, fl: { id: 3.068, len: 4200 } },
  { id: 'K17-05', res: 'A', man: 'MA', tvd: 7200, md: 7850, tubingId: 2.992, resT: 188, whT: 130, j: 2.6, wc0: 0.22, wcInf: 0.72, tauDays: 1100, gorMult: 1.0, choke: 38, fl: { id: 4.026, len: 2700 } },
  { id: 'K17-06', res: 'B', man: 'MB', tvd: 9400, md: 10300, tubingId: 3.958, resT: 214, whT: 135, j: 2.1, wc0: 0.06, wcInf: 0.40, tauDays: 1200, gorMult: 1.0, choke: 38, fl: { id: 4.026, len: 3300 } },
  { id: 'K17-07', res: 'B', man: 'MB', tvd: 9350, md: 10100, tubingId: 3.958, resT: 213, whT: 135, j: 2.9, wc0: 0.05, wcInf: 0.35, tauDays: 1200, gorMult: 1.0, choke: 42, fl: { id: 4.026, len: 2600 } },
  { id: 'K17-08', res: 'B', man: 'MB', tvd: 9450, md: 10500, tubingId: 3.958, resT: 215, whT: 135, j: 1.6, wc0: 0.10, wcInf: 0.50, tauDays: 1000, gorMult: 1.0, choke: 34, fl: { id: 4.026, len: 3900 } },
  { id: 'K17-09', res: 'B', man: 'MB', tvd: 9380, md: 10200, tubingId: 3.958, resT: 214, whT: 135, j: 2.4, wc0: 0.04, wcInf: 0.30, tauDays: 1500, gorMult: 1.0, choke: 40, fl: { id: 4.026, len: 2900 } },
  { id: 'K17-10', res: 'B', man: 'MB', tvd: 9420, md: 10400, tubingId: 3.958, resT: 214, whT: 135, j: 1.9, wc0: 0.08, wcInf: 0.45, tauDays: 1100, gorMult: 1.0, choke: 36, fl: { id: 4.026, len: 3500 } },
  // Non-producing wells
  { id: 'K17-11', res: 'A', man: 'MB', tvd: 7280, md: 8000, tubingId: 2.992, resT: 189, whT: 130, j: 2.4, wc0: 0.35, wcInf: 0.80, tauDays: 1000, gorMult: 1.0, choke: 36, fl: { id: 4.026, len: 4600 }, restriction: 0.6, nonProducing: 'shut-in' },
  { id: 'K17-12', res: 'B', man: 'MA', tvd: 9500, md: 10450, tubingId: 3.958, resT: 216, whT: 135, j: 0.55, wc0: 0.12, wcInf: 0.50, tauDays: 1000, gorMult: 1.0, choke: 40, fl: { id: 4.026, len: 3000 }, nonProducing: 'idle' },
];

export const MANIFOLDS = {
  MA: { name: 'Manifold A', trunk: { id: 8.071, len: 8200 } },
  MB: { name: 'Manifold B', trunk: { id: 8.071, len: 7600, kExtra: 2.0 } }, // kExtra: partial restriction (hidden detail)
};

export const FACILITY = {
  sepPsigSetpoint: SEP_PSIG_SETPOINT,
  sepPsigMax: 190, // PSV-limited operating ceiling (do not exceed)
  liquidCapStbd: 26000, // production separator liquid handling, nameplate
  compressorNameplateMMscfd: 12.0,
  compressorDemoAt150MMscfd: 9.6, // demonstrated at 150 psig suction
  waterTreatBwpd: 15000,
  exportStbd: 22000, // pipeline/pump nameplate
  flarePermitMMscfd: 1.0,
};

/** compressor gas handling capacity (scf/d) at separator pressure (psig) */
export function gasCapacityScfd(psig) {
  const demo = FACILITY.compressorDemoAt150MMscfd * 1e6;
  const nameplate = FACILITY.compressorNameplateMMscfd * 1e6;
  return Math.min(nameplate, demo * ((psig + P_ATM) / (SEP_PSIG_SETPOINT + P_ATM)));
}

/** reservoir / fluid state of a well at time t (days since t0) */
export function wellState(w, tDays, overrides = {}) {
  const r = RESERVOIRS[w.res];
  const yrs = tDays / 365.25;
  const pr = r.pr0 - r.declinePerYr * yrs;
  const wc = w.wc0 + (w.wcInf - w.wc0) * (1 - Math.exp(-tDays / w.tauDays));
  let gorMult = w.gorMult;
  if (w.id === 'K17-09') gorMult *= 1 + 1.9 * Math.max(0, Math.min(1, (tDays - 200) / 300)); // gas-cap breakthrough
  const gor = PVT[w.res].rsb * gorMult;
  return { pr, pb: r.pb, wc, gor, ...overrides };
}

const Q_SCAN = 22;

/**
 * Solve one well's operating point against a given manifold pressure (psia).
 * opts: { choke (64ths override), restriction, jMult, pm }
 */
function wellEvaluator(w, st, pm, opts = {}) {
  const pvt = PVT[w.res];
  const S = opts.choke ?? w.choke;
  const jEff = w.j * (opts.jMult ?? 1);
  const res = { pr: st.pr, pb: st.pb, j: jEff };
  const wellGeom = { tvd: w.tvd, md: w.md, tubingId: w.tubingId, whT: w.whT, resT: w.resT, restriction: opts.restriction ?? w.restriction ?? 0 };
  const qMax = iprRate(res, P_ATM);
  const mk = (q) => ({ pvt, qo: q * (1 - st.wc), qw: q * st.wc, gor: st.gor });
  const glr = (st.gor * (1 - st.wc)) / 1000; // Mscf/stb liquid

  const evalAt = (q) => {
    const stream = mk(q);
    const dpFl = linePressureDrop([stream], pm, w.fl, w.whT - 10);
    const pdown = pm + dpFl;
    const pwhChoke = gilbertPwhPsig(q, glr, S) + P_ATM;
    const critical = pdown <= 0.55 * pwhChoke;
    const pwh = Math.max(pwhChoke, pdown + 15);
    const pwfVlp = vlpPwf(pvt, stream, pwh, wellGeom);
    const pwfIpr = iprPwf(res, q);
    return { f: pwfIpr - pwfVlp, pwh, pwf: pwfIpr, pwfVlp, pdown, dpFl, critical, pwhChoke };
  };
  return { evalAt, qMax, S };
}

/** IPR and VLP curves for the nodal workbench (Stage 5+). */
export function wellCurves(w, st, pm, opts = {}, n = 40) {
  const { evalAt, qMax } = wellEvaluator(w, st, pm, opts);
  const pts = [];
  for (let i = 1; i <= n; i++) {
    const q = (qMax * i) / n;
    const e = evalAt(q);
    pts.push({ q: +q.toFixed(0), ipr: +e.pwf.toFixed(0), vlp: +e.pwfVlp.toFixed(0), pwh: +e.pwh.toFixed(0), critical: e.critical });
  }
  return { points: pts, operating: solveWell(w, st, pm, opts) };
}

export function solveWell(w, st, pm, opts = {}) {
  const { evalAt, qMax, S } = wellEvaluator(w, st, pm, opts);

  let prevQ = qMax * 0.002,
    prev = evalAt(prevQ);
  if (prev.f < 0) return deadWell(w, st, pm);
  let root = null;
  for (let i = 1; i <= Q_SCAN; i++) {
    const q = qMax * (0.002 + (0.998 * i) / Q_SCAN);
    const cur = evalAt(q);
    if (cur.f < 0 && prev.f >= 0) root = [prevQ, q]; // keep last sign change = stable intersection
    prevQ = q;
    prev = cur;
  }
  if (!root) return deadWell(w, st, pm);
  let [lo, hi] = root;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (evalAt(mid).f >= 0) lo = mid;
    else hi = mid;
  }
  const q = (lo + hi) / 2;
  const e = evalAt(q);
  const qo = q * (1 - st.wc);
  return {
    id: w.id,
    flowing: true,
    qLiq: q,
    qo,
    qw: q * st.wc,
    qg: qo * st.gor,
    wc: st.wc,
    gor: st.gor,
    pwf: e.pwf,
    pwh: e.pwh,
    pdown: e.pdown,
    dpFlowline: e.dpFl,
    chokeCritical: e.critical,
    choke: S,
    pr: st.pr,
  };
}

function deadWell(w, st, pm) {
  return { id: w.id, flowing: false, qLiq: 0, qo: 0, qw: 0, qg: 0, wc: st.wc, gor: st.gor, pwf: st.pr, pwh: null, pdown: pm, dpFlowline: 0, chokeCritical: false, choke: w.choke, pr: st.pr };
}

/**
 * Solve the gathering network + separator pressure for a set of operating wells.
 * cfg: { tDays, onWells: [ids], wellOpts: {id:{choke,restriction,jMult}}, psigSet, trunkK: {MA,MB} }
 * Returns per-well results, manifold pressures, separator pressure, and field totals.
 * Separator pressure floats upward from the setpoint when compressor capacity is insufficient.
 */
export function solveField(cfg) {
  const { tDays, onWells, wellOpts = {}, psigSet = SEP_PSIG_SETPOINT, trunkExtra = {}, gasCapFactor = 1 } = cfg;
  const capAt = (psig) => gasCapacityScfd(psig) * gasCapFactor;
  const wells = WELLS.filter((w) => onWells.includes(w.id));
  const states = Object.fromEntries(wells.map((w) => [w.id, wellState(w, tDays, wellOpts[w.id]?.state)]));

  const network = (psig) => {
    const psep = psig + P_ATM;
    const pm = { MA: psep + 30, MB: psep + 30 };
    let results = {};
    for (let iter = 0; iter < 25; iter++) {
      results = {};
      for (const w of wells) results[w.id] = solveWell(w, states[w.id], pm[w.man], wellOpts[w.id] || {});
      let maxDelta = 0;
      for (const m of Object.keys(MANIFOLDS)) {
        const streams = wells
          .filter((w) => w.man === m && results[w.id].flowing)
          .map((w) => ({ pvt: PVT[w.res], qo: results[w.id].qo, qw: results[w.id].qw, gor: states[w.id].gor }));
        const trunk = { ...MANIFOLDS[m].trunk };
        if (trunkExtra[m] !== undefined) trunk.kExtra = trunkExtra[m];
        const dp = linePressureDrop(streams, psep, trunk, 110);
        const target = psep + dp;
        const next = 0.5 * pm[m] + 0.5 * target;
        maxDelta = Math.max(maxDelta, Math.abs(next - pm[m]));
        pm[m] = next;
      }
      if (maxDelta < 0.6) break;
    }
    const tot = totals(Object.values(results));
    return { psig, psep, pm: { ...pm }, results, ...tot };
  };

  // float separator pressure up until the compressor can take the gas (or hit the PSV ceiling)
  let sol = network(psigSet);
  let gasCap = capAt(sol.psig);
  if (sol.qg > gasCap) {
    let lo = psigSet,
      hi = FACILITY.sepPsigMax;
    let top = network(hi);
    if (top.qg > capAt(hi)) {
      sol = top; // cannot be satisfied: excess gas must be flared / wells choked back
    } else {
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        const s = network(mid);
        if (s.qg > capAt(mid)) lo = mid;
        else {
          hi = mid;
          sol = s;
        }
      }
      sol = network(hi);
    }
    gasCap = capAt(sol.psig);
  }
  const gasExcess = Math.max(0, sol.qg - gasCap);
  return {
    ...sol,
    states,
    gasCapScfd: gasCap,
    gasExcessScfd: gasExcess,
    util: {
      liquid: (sol.qo + sol.qw) / FACILITY.liquidCapStbd,
      water: sol.qw / FACILITY.waterTreatBwpd,
      gas: sol.qg / gasCap,
      export: sol.qo / FACILITY.exportStbd,
    },
  };
}

function totals(list) {
  let qo = 0, qw = 0, qg = 0;
  for (const r of list) {
    qo += r.qo;
    qw += r.qw;
    qg += r.qg;
  }
  return { qo, qw, qg, qLiq: qo + qw };
}
