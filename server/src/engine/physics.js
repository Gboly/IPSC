// Screening-level production physics for Model Field K-17.
// SIMULATION ONLY - FICTIONAL FIELD - SYNTHETIC DATA.
//
// Units (field units): pressure psia unless stated, rate stb/d, gas scf/d, T in degF,
// length ft, diameter in. Everything here is deterministic and mass-conserving:
// the mixture mass rate is fixed by stock-tank rates, only the volume changes with P.
//
// KNOWN SIMPLIFICATIONS (state these in the model register, Rule 7):
//  - Homogeneous no-slip mixture (no holdup/slip correlation) -> pressure gradient is
//    approximate; Beggs-Brill / mechanistic models would be needed for PIPESIM-grade work.
//  - Constant Z-factor, constant mixture viscosity, simple Rs(P)/Bo(P) black-oil model.
//  - Steady state only; no slugging, no terrain-induced hold-up.

export const G = 32.174; // ft/s2
export const RHO_W_SC = 62.4 * 1.03; // lb/ft3 formation water (SG 1.03)
const AIR_RHO_SC = 0.0764; // lb/scf at 60F, 14.7 psia

/** PVT description object: { api, gasSG, pb, rsb, bob, z, bw } */
export function oilDensitySC(api) {
  return (141.5 / (131.5 + api)) * 62.4; // lb/ft3
}

export function rs(pvt, p) {
  if (p >= pvt.pb) return pvt.rsb;
  return pvt.rsb * Math.pow(Math.max(p, 14.7) / pvt.pb, 1.2);
}

export function bo(pvt, p) {
  if (p >= pvt.pb) return pvt.bob * (1 - 1.2e-5 * (p - pvt.pb)); // mild compressibility
  return 1 + (pvt.bob - 1) * (rs(pvt, p) / pvt.rsb);
}

/** gas formation volume factor, ft3/scf */
export function bg(pvt, p, tF) {
  return (0.02827 * pvt.z * (tF + 459.67)) / Math.max(p, 14.7);
}

/**
 * Mixture state at pressure p (psia) and temperature tF.
 * Stream is defined by stock-tank oil and water rates and produced GOR.
 * Returns mass rate (lb/s), volumetric rate (ft3/s), density (lb/ft3), free gas fraction.
 */
export function mixture(pvt, { qo, qw, gor }, p, tF) {
  const rsP = rs(pvt, p);
  const freeGasScf = Math.max(gor - rsP, 0) * qo; // scf/d
  const oilVol = qo * bo(pvt, p) * 5.615; // ft3/d
  const watVol = qw * pvt.bw * 5.615;
  const gasVol = freeGasScf * bg(pvt, p, tF);
  const vol = (oilVol + watVol + gasVol) / 86400; // ft3/s
  const mass =
    (qo * 5.615 * oilDensitySC(pvt.api) +
      qw * 5.615 * RHO_W_SC +
      gor * qo * AIR_RHO_SC * pvt.gasSG) /
    86400; // lb/s (gas dissolved + free all counted: total produced gas)
  return { mass, vol, rho: vol > 0 ? mass / vol : 0, gasFrac: vol > 0 ? gasVol / 86400 / vol : 0 };
}

/** Swamee-Jain friction factor */
export function frictionFactor(re, roughIn, dIn) {
  if (re < 2100) return 64 / Math.max(re, 1);
  const rel = roughIn / dIn;
  return 0.25 / Math.pow(Math.log10(rel / 3.7 + 5.74 / Math.pow(re, 0.9)), 2);
}

/** friction gradient psi/ft for mixture state in a pipe of diameter dIn */
export function frictionGradient(mix, dIn, roughIn = 0.0006, muCp = 1.5) {
  const dFt = dIn / 12;
  const area = (Math.PI * dFt * dFt) / 4;
  const v = mix.vol / area; // ft/s
  const re = (1488 * mix.rho * v * dFt) / muCp;
  const f = frictionFactor(re, roughIn, dIn);
  return (f * mix.rho * v * v) / (2 * G * dFt) / 144; // psi/ft
}

/**
 * VLP: bottom-hole flowing pressure required to lift stream to wellhead pressure pwh (psia).
 * well: { tvd, md, tubingId, whT, resT, rough?, restriction? } restriction in (0..1) reduces ID
 * (scale / deposits) -> used for Stage 5 diagnosis.
 */
export function vlpPwf(pvt, stream, pwh, well, nSeg = 24) {
  const idEff = well.tubingId * (1 - (well.restriction || 0));
  const dTvd = well.tvd / nSeg;
  const dMd = well.md / nSeg;
  let p = pwh;
  for (let i = 0; i < nSeg; i++) {
    const tMid = well.whT + ((well.resT - well.whT) * (i + 0.5)) / nSeg;
    // predictor
    let m = mixture(pvt, stream, p, tMid);
    let dp = (m.rho / 144) * dTvd + frictionGradient(m, idEff, well.rough ?? 0.0006) * dMd;
    // corrector at mid-point pressure
    m = mixture(pvt, stream, p + dp / 2, tMid);
    dp = (m.rho / 144) * dTvd + frictionGradient(m, idEff, well.rough ?? 0.0006) * dMd;
    p += dp;
  }
  return p;
}

/**
 * Composite IPR (linear above bubble point, Vogel below) - liquid rate stb/d at Pwf.
 * res: { pr, pb, j }  j in stb/d/psi (liquid, includes skin effect).
 */
export function iprRate(res, pwf) {
  const { pr, pb, j } = res;
  if (pwf >= pr) return 0;
  if (pr <= pb) {
    // saturated reservoir: pure Vogel
    const qmax = (j * pr) / 1.8;
    const x = pwf / pr;
    return qmax * (1 - 0.2 * x - 0.8 * x * x);
  }
  if (pwf >= pb) return j * (pr - pwf);
  const qb = j * (pr - pb);
  const x = pwf / pb;
  return qb + ((j * pb) / 1.8) * (1 - 0.2 * x - 0.8 * x * x);
}

/** inverse IPR: Pwf for a given liquid rate (bisection; IPR monotonic) */
export function iprPwf(res, q) {
  let lo = 14.7,
    hi = res.pr;
  if (q >= iprRate(res, lo)) return lo;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (iprRate(res, mid) > q) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Gilbert-type choke correlation (critical flow). Pwh psig. R = GLR in Mscf/stb. S in 64ths. */
export function gilbertPwhPsig(qLiq, glrMscfPerStb, s64) {
  return (435 * Math.pow(Math.max(glrMscfPerStb, 1e-4), 0.546) * qLiq) / Math.pow(s64, 1.89);
}

/** Combine several streams (each with its own PVT) at one pressure/temperature. */
export function mixtureMulti(streams, p, tF) {
  let mass = 0, vol = 0;
  for (const s of streams) {
    if (s.qo + s.qw <= 0) continue;
    const m = mixture(s.pvt, s, p, tF);
    mass += m.mass;
    vol += m.vol;
  }
  return { mass, vol, rho: vol > 0 ? mass / vol : 0 };
}

/**
 * Pressure drop (psi) through a horizontal line carrying one or more streams,
 * evaluated from the outlet pressure pOut (psia). Iterates on mean pressure.
 * streams: [{ pvt, qo, qw, gor }]; line: { id (in), len (ft), rough?, kExtra? }
 * kExtra = additional K-factor (partial blockage / restriction).
 */
export function linePressureDrop(streams, pOut, line, tF = 120) {
  const list = Array.isArray(streams) ? streams : [streams];
  if (!list.some((s) => s.qo + s.qw > 0)) return 0;
  let dp = 0;
  for (let it = 0; it < 4; it++) {
    const pMean = pOut + dp / 2;
    const m = mixtureMulti(list, pMean, tF);
    const fric = frictionGradient(m, line.id, line.rough ?? 0.0007, 1.8) * line.len;
    const dFt = line.id / 12;
    const v = m.vol / ((Math.PI * dFt * dFt) / 4);
    const minor = ((line.kExtra || 0) * m.rho * v * v) / (2 * G) / 144;
    dp = fric + minor;
  }
  return dp;
}
