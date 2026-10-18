// Generates the synthetic history for Model Field K-17 by running the physics engine day by day.
// SIMULATION ONLY - FICTIONAL FIELD - SYNTHETIC DATA.
//
// Output (server/data/k17_v1.json):
//   clean    - engine-truth daily well rows (no data-quality issues)
//   dirty    - rows as released in PACK 02 (planted issues applied)
//   fieldDaily, eventsLog (what the data room shows), truth (hidden: true losses + issue registry)
// Run:  npm run gen   (takes ~1-2 min; result is cached)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WELLS, solveField, FACILITY, gasCapacityScfd } from './field.js';
import { mulberry32, gauss } from './rng.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_FILE = path.join(__dirname, '../../data/k17_v1.json');
export const T0 = Date.UTC(2025, 3, 1); // 2025-04-01
export const N_DAYS = 548; // through 2026-09-30
export const REFERENCE_DATE = '2026-09-30';

export const iso = (d) => new Date(T0 + d * 86400000).toISOString().slice(0, 10);
export const dayIndex = (s) => Math.round((Date.parse(s + 'T00:00:00Z') - T0) / 86400000);

const PRODUCERS = WELLS.filter((w) => !w.nonProducing).map((w) => w.id);
const MB_WELLS = WELLS.filter((w) => w.man === 'MB' && !w.nonProducing).map((w) => w.id);

// ---------------------------------------------------------------------------------------------
// TRUE EVENT SET (drives the history - Rule 5). effect fields:
//   shut: [wellIds] | 'ALL'; down: fraction of day lost for shut wells (1 = full day)
//   choke: {wellId: S64}; trunkExtra: {MB: K}; gasCapFactor: number
// ---------------------------------------------------------------------------------------------
export const EVENTS = [
  { id: 'EV-001', start: '2025-05-12', end: '2025-05-13', cat: 'UNPLANNED', cause: 'CHOKE-EROSION', asset: 'K17-02', desc: 'Choke bean washout, replaced', shut: ['K17-02'] },
  { id: 'EV-002', start: '2025-06-03', end: '2025-06-03', cat: 'UNPLANNED', cause: 'POWER-GEN-TRIP', asset: 'FIELD', desc: 'Main generator trip, all wells ESD', shut: 'ALL', down: 0.6 },
  { id: 'EV-003', start: '2025-07-14', end: '2025-07-25', cat: 'PLANNED', cause: 'WORKOVER', asset: 'K17-05', desc: 'Tubing leak repair workover', shut: ['K17-05'] },
  { id: 'EV-004', start: '2025-08-09', end: '2025-08-09', cat: 'UNPLANNED', cause: 'COMP-TRIP', asset: 'C-101', desc: 'Compressor C-101 trip: suction scrubber high-high level', shut: 'ALL', down: 0.45 },
  { id: 'EV-005', start: '2025-09-20', end: '2025-09-23', cat: 'PLANNED', cause: 'PIGGING', asset: 'TRUNK-MB', desc: 'Manifold B trunk-line pigging, debris pushed to separator', trunkExtra: { MB: 14 } },
  { id: 'EV-006', start: '2025-10-15', end: '2025-10-19', cat: 'EXTERNAL', cause: 'EXPORT-OUTAGE', asset: 'EXPORT', desc: 'Third-party export pipeline shutdown', shut: 'ALL', down: 0.65 },
  { id: 'EV-007', start: '2025-11-22', end: '2025-12-31', cat: 'OPERATIONAL', cause: 'SAND-RESTRICT', asset: 'K17-08', desc: 'Choked back after sand production observed', choke: { 'K17-08': 24 } },
  { id: 'EV-008', start: '2026-01-05', end: '2026-01-05', cat: 'UNPLANNED', cause: 'POWER-GEN-TRIP', asset: 'FIELD', desc: 'Main generator trip, all wells ESD', shut: 'ALL', down: 0.5 },
  { id: 'EV-009', start: '2026-02-10', end: '2026-02-11', cat: 'UNPLANNED', cause: 'CHOKE-EROSION', asset: 'K17-02', desc: 'Choke bean washout, replaced', shut: ['K17-02'] },
  { id: 'EV-010', start: '2026-03-03', end: '2026-03-03', cat: 'UNPLANNED', cause: 'COMP-TRIP', asset: 'C-101', desc: 'Compressor C-101 trip: suction scrubber high-high level', shut: 'ALL', down: 0.4 },
  { id: 'EV-011', start: '2026-03-18', end: '2026-03-19', cat: 'UNPLANNED', cause: 'FLOWLINE-LEAK', asset: 'K17-04', desc: 'Flowline clamp leak, isolated and repaired', shut: ['K17-04'] },
  { id: 'EV-012', start: '2026-04-14', end: '2026-04-16', cat: 'PLANNED', cause: 'TURNAROUND', asset: 'FIELD', desc: 'Planned facilities shutdown: separator inspection', shut: 'ALL' },
  { id: 'EV-013', start: '2026-05-27', end: '2026-05-28', cat: 'UNPLANNED', cause: 'CHOKE-EROSION', asset: 'K17-02', desc: 'Choke bean washout, replaced', shut: ['K17-02'] },
  { id: 'EV-014', start: '2026-06-16', end: '2026-06-16', cat: 'UNPLANNED', cause: 'COMP-TRIP', asset: 'C-101', desc: 'Compressor C-101 trip: suction scrubber high-high level', shut: 'ALL', down: 0.5 },
  { id: 'EV-015', start: '2026-07-08', end: '2026-07-30', cat: 'UNPLANNED', cause: 'COMP-DERATE', asset: 'C-101', desc: 'Compressor performance degradation (cooler fouling), capacity reduced', gasCapFactor: 0.9, unlogged: true },
  { id: 'EV-016', start: '2026-08-19', end: '2026-08-20', cat: 'UNPLANNED', cause: 'ESD-FALSE-TRIP', asset: 'K17-06', desc: 'Wellhead ESD false trip (instrument fault)', shut: ['K17-06'] },
  { id: 'EV-017', start: '2026-09-02', end: '2026-09-02', cat: 'UNPLANNED', cause: 'POWER-GEN-TRIP', asset: 'FIELD', desc: 'Main generator trip, all wells ESD', shut: 'ALL', down: 0.55 },
  { id: 'EV-018', start: '2026-09-10', end: '2026-09-17', cat: 'OPERATIONAL', cause: 'GOR-CONTROL', asset: 'K17-09', desc: 'Choke reduced to manage rising GOR', choke: { 'K17-09': 32 } },
];

function effectsAt(d, excludeId) {
  const eff = { off: new Set(), down: {}, choke: {}, trunkExtra: {}, gasCapFactor: 1 };
  const date = iso(d);
  for (const e of EVENTS) {
    if (e.id === excludeId) continue;
    if (date < e.start || date > e.end) continue;
    if (e.shut) {
      const list = e.shut === 'ALL' ? PRODUCERS : e.shut;
      const frac = e.down ?? 1;
      for (const w of list) {
        eff.down[w] = Math.min(1, (eff.down[w] || 0) + frac);
        if (frac >= 1) eff.off.add(w);
      }
    }
    if (e.choke) Object.assign(eff.choke, e.choke);
    if (e.trunkExtra) Object.assign(eff.trunkExtra, e.trunkExtra);
    if (e.gasCapFactor) eff.gasCapFactor *= e.gasCapFactor;
  }
  return eff;
}

const cache = new Map();
function solveDay(d, eff) {
  const on = PRODUCERS.filter((w) => !eff.off.has(w));
  const key = JSON.stringify([Math.floor(d / 4), on, eff.choke, eff.trunkExtra, eff.gasCapFactor]);
  if (cache.has(key)) return cache.get(key);
  const wellOpts = {};
  for (const [w, S] of Object.entries(eff.choke)) wellOpts[w] = { choke: S };
  const sol = solveField({ tDays: Math.floor(d / 4) * 4 + 2, onWells: on, wellOpts, trunkExtra: eff.trunkExtra, gasCapFactor: eff.gasCapFactor });
  cache.set(key, sol);
  return sol;
}

export function generate({ seed = 17017, verbose = true } = {}) {
  const rnd = mulberry32(seed);
  const clean = []; // per well-day, engine truth
  const fieldTrue = []; // per day, engine truth
  const t00 = Date.now();

  for (let d = 0; d < N_DAYS; d++) {
    const eff = effectsAt(d);
    const sol = solveDay(d, eff);
    const date = iso(d);
    let sumO = 0, sumW = 0, sumG = 0;
    for (const id of PRODUCERS) {
      const w = WELLS.find((x) => x.id === id);
      const r = sol.results[id] || { flowing: false, qo: 0, qw: 0, qg: 0, pwh: 0 };
      const downFrac = eff.off.has(id) ? 1 : Math.min(1, eff.down[id] || 0);
      const up = 1 - downFrac;
      const n = 1 + gauss(rnd) * 0.012; // allocation / test-scaling noise
      const choke = eff.choke[id] ?? w.choke;
      const row = {
        date, well: id, status: up === 0 ? 'SHUT-IN' : 'PRODUCING', hours: +(24 * up).toFixed(1), choke,
        whp: r.flowing && up > 0 ? +(r.pwh - 14.7 + gauss(rnd) * 3).toFixed(0) : null,
        oil: r.flowing ? Math.round(r.qo * up * n) : 0,
        water: r.flowing ? Math.round(r.qw * up * n) : 0,
        gas: r.flowing ? Math.round((r.qg * up * n) / 1000) : 0, // Mscf
      };
      sumO += row.oil; sumW += row.water; sumG += row.gas;
      clean.push(row);
    }
    // non-producing wells: zero rows
    for (const w of WELLS.filter((x) => x.nonProducing)) {
      clean.push({ date, well: w.id, status: w.nonProducing === 'shut-in' ? 'SHUT-IN' : 'IDLE', hours: 0, choke: 0, whp: null, oil: 0, water: 0, gas: 0 });
    }
    fieldTrue.push({
      date, sepPsig: +(sol.psig + gauss(rnd) * 0.8).toFixed(1), manA: +(sol.pm.MA - 14.7 + gauss(rnd) * 1).toFixed(1), manB: +(sol.pm.MB - 14.7 + gauss(rnd) * 1).toFixed(1),
      sumO, sumW, sumG, gasCapMscf: Math.round(sol.gasCapScfd / 1000), flareMscf: Math.round(sol.gasExcessScfd / 1000),
      compSuctionPsig: +(sol.psig - 4 + gauss(rnd) * 0.6).toFixed(1),
    });
    if (verbose && d % 60 === 0) console.log(`  day ${d}/${N_DAYS} (${((Date.now() - t00) / 1000).toFixed(0)}s)`);
  }

  // ------------------------------------------------------------------------------------
  // Separator meter totals: independent measurement of the same production, with noise and a
  // planted meter-factor step (Q5)
  // ------------------------------------------------------------------------------------
  const STEP_DATE = '2026-04-20';
  const fieldDaily = fieldTrue.map((f) => {
    const bias = f.date >= STEP_DATE ? 0.032 : -0.004;
    const n = () => 1 + gauss(rnd) * 0.004;
    return {
      date: f.date, sep_psig: f.sepPsig, comp_suction_psig: f.compSuctionPsig, man_a_psig: f.manA, man_b_psig: f.manB,
      sep_oil_stb: Math.round(f.sumO * (1 + bias) * n()), sep_water_bbl: Math.round(f.sumW * (1 - 0.006) * n()), sep_gas_mscf: Math.round(f.sumG * (1 + 0.002) * n()),
      flare_mscf: f.flareMscf,
    };
  });

  // ------------------------------------------------------------------------------------
  // Planted data-quality issues (hidden registry; rows released are "dirty")
  // ------------------------------------------------------------------------------------
  const dirty = clean.map((r) => ({ ...r }));
  const issues = [];
  const find = (well, date) => dirty.find((r) => r.well === well && r.date === date);
  // Q1 unit error: K17-03 reported in m3 for 4 days
  for (const date of ['2026-01-12', '2026-01-13', '2026-01-14', '2026-01-15']) {
    const r = find('K17-03', date);
    r.oil = Math.round(r.oil * 0.159); r.water = Math.round(r.water * 0.159); r.gas = Math.round(r.gas * 0.159);
  }
  issues.push({ id: 'DQ-1', kind: 'unit-inconsistency', well: 'K17-03', from: '2026-01-12', to: '2026-01-15', note: 'Oil/water/gas entered in m3 (x0.159) instead of stb/bbl/Mscf-equivalent; rate looks like a ~84% drop with no change in choke/WHP.' });
  // Q2 missing rows: K17-07 six days
  const miss = ['2025-12-02', '2025-12-03', '2025-12-04', '2025-12-05', '2025-12-06', '2025-12-07'];
  for (const date of miss) dirty.splice(dirty.findIndex((r) => r.well === 'K17-07' && r.date === date), 1);
  issues.push({ id: 'DQ-2', kind: 'missing-records', well: 'K17-07', from: miss[0], to: miss[5], note: 'Six consecutive daily rows absent (not zero). Well was actually producing normally.' });
  // Q3 duplicate row
  const dup = find('K17-05', '2026-02-18');
  dirty.push({ ...dup });
  issues.push({ id: 'DQ-3', kind: 'duplicate-record', well: 'K17-05', from: '2026-02-18', to: '2026-02-18', note: 'Row appears twice; naive summation double counts the day.' });
  // Q4 gas meter flatline
  for (let k = 0; k < 8; k++) find('K17-09', iso(dayIndex('2026-05-02') + k)).gas = 0;
  issues.push({ id: 'DQ-4', kind: 'instrument-fault', well: 'K17-09', from: '2026-05-02', to: '2026-05-09', note: 'Gas meter flatlined at 0 while oil/water normal; GOR = 0 is non-physical.' });
  // Q5 separator meter step change (applied in fieldDaily above)
  issues.push({ id: 'DQ-5', kind: 'meter-factor-step', well: 'FIELD', from: STEP_DATE, to: REFERENCE_DATE, note: 'Separator oil meter reads about 3.6 percentage points higher relative to summed well allocation from 2026-04-20 (meter factor change not applied to allocation).' });
  // Q6 missing-value code in WHP
  for (const date of ['2025-10-02', '2025-10-03']) find('K17-06', date).whp = 9999;
  issues.push({ id: 'DQ-6', kind: 'sentinel-value', well: 'K17-06', from: '2025-10-02', to: '2025-10-03', note: 'WHP recorded as 9999 (instrument fault code) rather than blank; would corrupt averages and trend plots.' });
  // Q7 stale status flag
  const st = find('K17-10', '2026-03-22');
  st.status = 'SHUT-IN';
  issues.push({ id: 'DQ-7', kind: 'status-inconsistency', well: 'K17-10', from: '2026-03-22', to: '2026-03-22', note: 'Status says SHUT-IN but 24 h of production reported; status flag stale.' });

  // ------------------------------------------------------------------------------------
  // True event losses (marginal: all other events active) and chronic hidden losses
  // ------------------------------------------------------------------------------------
  const truthEvents = EVENTS.map((e) => {
    let lossO = 0, lossG = 0;
    const d0 = dayIndex(e.start), d1 = dayIndex(e.end);
    for (let d = d0; d <= d1; d++) {
      const effAct = effectsAt(d);
      const solAct = solveDay(d, effAct);
      const effCf = effectsAt(d, e.id);
      const solCf = solveDay(d, effCf);
      const actO = actualOil(solAct, effAct), cfO = actualOil(solCf, effCf);
      lossO += cfO - actO;
      lossG += (counterGas(solCf, effCf) - counterGas(solAct, effAct));
    }
    return { ...e, trueLossOilStb: Math.round(lossO), trueLossGasMscf: Math.round(lossG / 1000), days: d1 - d0 + 1 };
  });

  // compressor-limited backpressure (unlogged chronic loss): days where separator pressure floated up
  let chronicLoss = 0, chronicDays = 0;
  for (let d = 0; d < N_DAYS; d++) {
    const eff = effectsAt(d);
    const sol = solveDay(d, eff);
    if (sol.psig > 151) {
      chronicDays++;
      const base = solveFieldAtSetpoint(d, eff);
      chronicLoss += Math.max(0, base - actualOil(sol, effectsAt(d)));
    }
  }

  const eventsLog = buildEventsLog(truthEvents, rnd);
  const out = {
    meta: { field: 'Model Field K-17', seed, version: '1.0', referenceDate: REFERENCE_DATE, startDate: iso(0), nDays: N_DAYS, generatedAt: new Date().toISOString() },
    dirty, clean, fieldDaily, eventsLog,
    truth: { issues, events: truthEvents, chronic: { name: 'compressor-limited backpressure (separator pressure floating above setpoint)', days: chronicDays, oilLossStb: Math.round(chronicLoss) } },
  };
  return out;
}

function actualOil(sol, eff) {
  let s = 0;
  for (const [id, r] of Object.entries(sol.results)) s += r.qo * (1 - Math.min(1, eff.down[id] || 0) * (eff.off.has(id) ? 0 : 1));
  return s;
}
function counterGas(sol, eff) {
  let s = 0;
  for (const [id, r] of Object.entries(sol.results)) s += r.qg * (1 - Math.min(1, eff.down[id] || 0) * (eff.off.has(id) ? 0 : 1));
  return s;
}
function solveFieldAtSetpoint(d, eff) {
  const on = PRODUCERS.filter((w) => !eff.off.has(w));
  const wellOpts = {};
  for (const [w, S] of Object.entries(eff.choke)) wellOpts[w] = { choke: S };
  const sol = solveField({ tDays: Math.floor(d / 4) * 4 + 2, onWells: on, wellOpts, trunkExtra: eff.trunkExtra, gasCapFactor: 1e6 });
  return actualOil(sol, eff);
}

// What the operator's deferment log claims (noisy, double-counted for facility events)
function buildEventsLog(truthEvents, rnd) {
  const rows = [];
  let n = 1;
  const add = (e, asset, est, note = '') => rows.push({
    log_id: `L-${String(n++).padStart(3, '0')}`, event_ref: e.id, start_date: e.start, end_date: e.end, duration_days: e.days,
    asset, category: e.cat, cause_code: e.cause, description: e.desc, recorded_deferment_stb: est, comment: note,
  });
  for (const e of truthEvents) {
    if (e.unlogged) continue; // compressor derate: nobody logged it
    const noise = 1 + gauss(rnd) * 0.12;
    const est = Math.round((e.trueLossOilStb * noise) / 10) * 10;
    if (e.shut === 'ALL') {
      add(e, 'FIELD', est, 'Field-level entry');
      // per-well entries repeat the same loss (double counting trap)
      const share = PRODUCERS.map((w) => ({ w, f: 1 / PRODUCERS.length }));
      for (const { w, f } of share) add(e, w, Math.round((est * f * (1 + gauss(rnd) * 0.2)) / 10) * 10, 'Well-level entry from shift report');
    } else if (e.cat === 'OPERATIONAL' && e.cause === 'GOR-CONTROL') {
      add(e, e.asset, null, 'Operator choke-back: deferment not estimated');
    } else {
      add(e, e.asset, est);
    }
  }
  return rows;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Generating K-17 history (this takes a minute or two)...');
  const out = generate();
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(out));
  console.log('Wrote', DATA_FILE, 'rows:', out.dirty.length, 'events:', out.eventsLog.length);
  for (const e of out.truth.events) console.log(e.id, e.cause.padEnd(15), String(e.trueLossOilStb).padStart(7), 'stb oil');
  console.log('chronic', out.truth.chronic);
}
