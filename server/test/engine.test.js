import test from 'node:test';
import assert from 'node:assert/strict';
import { mixture, iprRate, iprPwf, vlpPwf, rs, bo, linePressureDrop, oilDensitySC } from '../src/engine/physics.js';
import { PVT, WELLS, wellState, solveWell, solveField, FACILITY, gasCapacityScfd } from '../src/engine/field.js';
import { npv, irr, payback } from '../src/engine/economics.js';

const A = PVT.A;

test('mixture conserves mass: mass rate is independent of pressure', () => {
  const s = { qo: 1000, qw: 500, gor: 450 };
  const m1 = mixture(A, s, 3000, 180), m2 = mixture(A, s, 300, 120);
  assert.ok(Math.abs(m1.mass - m2.mass) < 1e-9);
  assert.ok(m2.vol > m1.vol * 2, 'gas expansion at low pressure must raise volume a lot');
  // sanity: mass rate in lb/d = stock-tank oil + water + gas
  const lbPerDay = m1.mass * 86400;
  const expected = 1000 * 5.615 * oilDensitySC(A.api) + 500 * 5.615 * 62.4 * 1.03 + 450 * 1000 * 0.0764 * A.gasSG;
  assert.ok(Math.abs(lbPerDay - expected) / expected < 1e-9);
});

test('Rs and Bo are continuous at bubble point and monotonic', () => {
  assert.ok(Math.abs(rs(A, A.pb) - A.rsb) < 1e-9);
  assert.ok(rs(A, 1000) < rs(A, 2000));
  assert.ok(Math.abs(bo(A, A.pb - 0.001) - bo(A, A.pb + 0.001)) < 0.005);
});

test('IPR: zero at Pr, monotonic, inverse consistent', () => {
  const res = { pr: 3000, pb: 2200, j: 3 };
  assert.equal(iprRate(res, 3000), 0);
  let prev = -1;
  for (let p = 3000; p >= 14.7; p -= 100) { const q = iprRate(res, p); assert.ok(q >= prev); prev = q; }
  for (const q of [200, 1500, 3000]) assert.ok(Math.abs(iprRate(res, iprPwf(res, q)) - q) < 0.5);
  // linear region: PI definition
  assert.ok(Math.abs(iprRate(res, 2500) - 3 * 500) < 1e-9);
});

test('VLP: higher wellhead pressure needs higher bottom-hole pressure; restriction raises it', () => {
  const well = { tvd: 7200, md: 7900, tubingId: 2.992, whT: 130, resT: 188 };
  const s = { pvt: A, qo: 1500, qw: 500, gor: 450 };
  const a = vlpPwf(A, s, 300, well), b = vlpPwf(A, s, 600, well);
  assert.ok(b - a > 300 && b - a < 900, `dPwf should exceed dPwh as the gassy column densifies: ${b - a}`);
  assert.ok(vlpPwf(A, s, 300, { ...well, restriction: 0.3 }) > a);
});

test('line pressure drop increases with rate and with K-factor', () => {
  const line = { id: 8.071, len: 8000 };
  const f = (q, k = 0) => linePressureDrop([{ pvt: A, qo: q, qw: q / 3, gor: 450 }], 165, { ...line, kExtra: k });
  assert.ok(f(6000) > f(3000) * 2.5);
  assert.ok(f(6000, 5) > f(6000));
});

test('well operating point satisfies IPR = VLP and responds to backpressure', () => {
  const w = WELLS.find((x) => x.id === 'K17-04'); // A-sand, late-life, sensitive to backpressure
  const st = wellState(w, 540);
  const lo = solveWell(w, st, 165), hi = solveWell(w, st, 215);
  assert.ok(lo.flowing && hi.flowing);
  assert.ok(lo.qLiq > hi.qLiq, 'higher manifold pressure must reduce a non-critical well');
  assert.ok(lo.pwf < st.pr && lo.pwf > 14.7);
});

test('critical-flow wells are insensitive to downstream pressure (choke decoupling)', () => {
  const w = WELLS.find((x) => x.id === 'K17-07');
  const st = wellState(w, 100);
  const a = solveWell(w, st, 170), b = solveWell(w, st, 230);
  assert.ok(a.chokeCritical && b.chokeCritical);
  assert.ok(Math.abs(a.qLiq - b.qLiq) / a.qLiq < 0.005);
});

test('K17-11: tubing restriction cuts deliverability by more than half versus a clean tubing', () => {
  const w = WELLS.find((x) => x.id === 'K17-11');
  const st = wellState(w, 540);
  const restricted = solveWell(w, st, 190), clean = solveWell(w, st, 190, { restriction: 0 });
  assert.ok(restricted.flowing && clean.flowing);
  assert.ok(restricted.qLiq < 0.5 * clean.qLiq, `${restricted.qLiq} vs ${clean.qLiq}`);
});

test('K17-12: deliverability responds strongly to productivity (inflow-limited signature)', () => {
  const w = WELLS.find((x) => x.id === 'K17-12');
  const st = wellState(w, 540);
  const a = solveWell(w, st, 190), b = solveWell(w, st, 190, { jMult: 3 });
  assert.ok(b.qLiq > 1.6 * a.qLiq, `3x productivity should give a large rate gain: ${a.qLiq} -> ${b.qLiq}`);
});

test('field solve: well sum = field total; gas, water, liquid mass balance; PSV ceiling respected', () => {
  const on = WELLS.filter((w) => !w.nonProducing).map((w) => w.id);
  const f = solveField({ tDays: 300, onWells: on });
  const sum = (k) => Object.values(f.results).reduce((a, r) => a + r[k], 0);
  assert.ok(Math.abs(sum('qo') - f.qo) < 1e-6 && Math.abs(sum('qw') - f.qw) < 1e-6 && Math.abs(sum('qg') - f.qg) < 1e-3);
  for (const r of Object.values(f.results)) { assert.ok(r.qo <= r.qLiq + 1e-9); assert.ok(r.qw >= 0); assert.ok(Math.abs(r.qo + r.qw - r.qLiq) < 1e-6); }
  assert.ok(f.psig <= FACILITY.sepPsigMax + 1e-6);
});

test('compressor derate raises separator pressure (constraint coupling)', () => {
  const on = WELLS.filter((w) => !w.nonProducing).map((w) => w.id);
  const base = solveField({ tDays: 530, onWells: on });
  const derated = solveField({ tDays: 530, onWells: on, gasCapFactor: 0.9 });
  assert.ok(derated.psig > base.psig + 5, `psig ${base.psig} -> ${derated.psig}`);
  assert.ok(gasCapacityScfd(190) > gasCapacityScfd(150));
});

test('economics: NPV, IRR, payback', () => {
  const flows = [-1000, 400, 400, 400, 400];
  assert.ok(Math.abs(npv(0.1, flows) - 268) < 1);
  const r = irr(flows);
  assert.ok(Math.abs(npv(r, flows)) < 1e-6 && r > 0.2 && r < 0.23);
  assert.ok(Math.abs(payback(flows) - 2.5) < 1e-9);
  assert.equal(irr([100, 100]), null);
});
