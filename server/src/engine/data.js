// Data access, CSV serialisation and deterministic metric calculations over the K-17 history.
import fs from 'node:fs';
import { DATA_FILE, generate, dayIndex, iso, N_DAYS } from './generate.js';

let DATA = null;
export function loadData() {
  if (DATA) return DATA;
  if (!fs.existsSync(DATA_FILE)) {
    console.log('[k17] data file missing - generating (about a minute)...');
    const out = generate({ verbose: false });
    try {
      fs.mkdirSync(DATA_FILE.replace(/[^/\\]+$/, ''), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(out));
    } catch (e) {
      // read-only filesystem (serverless): keep the generated history in memory for this instance
      console.warn('[k17] could not cache the generated history:', e.message);
      DATA = out;
      return DATA;
    }
  }
  DATA = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  return DATA;
}

export function toCsv(rows, columns) {
  const cols = columns || Object.keys(rows[0] || {});
  const esc = (v) => {
    if (v === null || v === undefined) return '-999';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}

/** Released PACK 02 well-day rows with public column names. */
export const PROD_COLUMNS = ['date', 'well_id', 'status', 'hours_on', 'choke_64ths', 'whp_psig', 'oil_stb', 'water_bbl', 'gas_mscf'];
export function publicProdRows(rows) {
  return rows.map((r) => ({ date: r.date, well_id: r.well, status: r.status, hours_on: r.hours, choke_64ths: r.choke, whp_psig: r.whp, oil_stb: r.oil, water_bbl: r.water, gas_mscf: r.gas }));
}

// ---------------------------------------------------------------------------------------------
// Metrics (used by /calc/check). `clean` = engine truth, `dirty` = what the user downloaded.
// ---------------------------------------------------------------------------------------------
export const METRICS = {
  field_oil_rate: { label: 'Field oil rate (calendar-day average)', unit: 'stb/d', tol: 0.02, rel: true },
  field_liquid_rate: { label: 'Field total liquid rate (calendar-day average)', unit: 'stb/d', tol: 0.02, rel: true },
  field_water_cut: { label: 'Field water cut (water / (oil+water))', unit: '%', tol: 1.0, rel: false },
  field_gor: { label: 'Field producing GOR (wells total gas / oil)', unit: 'scf/stb', tol: 0.03, rel: true },
  field_gas_rate: { label: 'Field gas rate (calendar-day average)', unit: 'MMscf/d', tol: 0.03, rel: true },
  well_oil_rate: { label: 'Well oil rate (calendar-day average)', unit: 'stb/d', tol: 0.03, rel: true, needsWell: true },
  well_uptime: { label: 'Well uptime (hours on / calendar hours)', unit: '%', tol: 1.0, rel: false, needsWell: true },
  cum_oil: { label: 'Field cumulative oil over window', unit: 'stb', tol: 0.02, rel: true },
};

function window(rows, from, to, well) {
  return rows.filter((r) => r.date >= from && r.date <= to && (!well || r.well === well));
}

function compute(metric, rows, from, to, well) {
  const days = dayIndex(to) - dayIndex(from) + 1;
  const w = window(rows, from, to, well);
  const sum = (k) => w.reduce((a, r) => a + (r[k] || 0), 0);
  switch (metric) {
    case 'field_oil_rate': return sum('oil') / days;
    case 'field_liquid_rate': return (sum('oil') + sum('water')) / days;
    case 'field_water_cut': return (100 * sum('water')) / (sum('oil') + sum('water'));
    case 'field_gor': return (sum('gas') * 1000) / sum('oil');
    case 'field_gas_rate': return sum('gas') / 1000 / days;
    case 'well_oil_rate': return sum('oil') / days;
    case 'well_uptime': return (100 * sum('hours')) / (24 * days);
    case 'cum_oil': return sum('oil');
    default: throw new Error('unknown metric ' + metric);
  }
}

export function checkMetric({ metric, from, to, well, value }) {
  const def = METRICS[metric];
  if (!def) return { error: 'Unknown metric' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '')) return { error: 'Dates must be YYYY-MM-DD' };
  if (dayIndex(from) < 0 || dayIndex(to) >= N_DAYS || dayIndex(to) < dayIndex(from)) return { error: 'Window outside 2025-04-01..2026-09-30 or reversed' };
  if (def.needsWell && !well) return { error: 'This metric needs a well id' };
  const { clean, dirty } = loadData();
  const truth = compute(metric, clean, from, to, well);
  // "naive" = arithmetic on the raw released rows without any cleaning
  const naive = compute(metric, dirty.map((r) => ({ ...r, hours: r.hours })), from, to, well);
  const near = (a, b) => (def.rel ? Math.abs(a - b) <= def.tol * Math.abs(b) : Math.abs(a - b) <= def.tol);
  const v = Number(value);
  if (!Number.isFinite(v)) return { error: 'Enter a number' };
  const correct = near(v, truth);
  const matchesNaive = !correct && near(v, naive) && !near(naive, truth);
  return {
    metric, label: def.label, unit: def.unit, from, to, well: well || null, value: v, correct, matchesNaive,
    // never leak the true value unless correct (so the user must still do the work)
    expected: correct ? truth : undefined,
    message: correct ? 'Within tolerance of the value from cleaned data.' : matchesNaive ? 'Matches arithmetic on the raw released rows, but not the cleaned data: check the data for duplicate, missing, unit-inconsistent or faulty records inside this window.' : 'Outside tolerance. Re-check the formula, units, window and data treatment.',
    toleranceNote: def.rel ? `±${def.tol * 100}%` : `±${def.tol} ${def.unit}`,
  };
}

/** True event-loss check (user-supplied estimate vs engine counterfactual). */
export function checkEventLoss({ eventRef, value }) {
  const { truth } = loadData();
  const e = truth.events.find((x) => x.id === eventRef);
  if (!e) return { error: 'Unknown event' };
  const v = Number(value);
  if (!Number.isFinite(v)) return { error: 'Enter a number' };
  const t = e.trueLossOilStb;
  const ok = t === 0 ? Math.abs(v) < 500 : Math.abs(v - t) <= 0.3 * t;
  return {
    eventRef, value: v, correct: ok, tolerance: '±30% (counterfactual methods have real uncertainty)',
    message: ok ? 'Consistent with the engine counterfactual within tolerance.' : 'Not consistent with the engine counterfactual. Check the baseline you used and the fraction of the day lost.',
  };
}

export { iso };
