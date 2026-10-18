import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function parseCsv(text) {
  const lines = text.trim().split('\n');
  const head = lines[0].split(',');
  return lines.slice(1).map((ln) => {
    const cells = []; let cur = '', q = false;
    for (let i = 0; i < ln.length; i++) {
      const c = ln[i];
      if (c === '"') { if (q && ln[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === ',' && !q) { cells.push(cur); cur = ''; } else cur += c;
    }
    cells.push(cur);
    const o = {};
    head.forEach((h, i) => { const v = cells[i]; o[h] = v !== '' && v !== undefined && !isNaN(Number(v)) && h !== 'date' && h !== 'well_id' ? Number(v) : v; });
    return o;
  });
}

const COLORS = ['#b4670b', '#1f5f99', '#1f7a4d', '#9b3d8a', '#b3322b', '#4a5360', '#c49a00', '#00808a', '#7a4fb3', '#d1568a', '#6a8f00', '#8a5a2b'];

/** Plot builder over the raw (uncleaned) PACK 02 well-day file: what you see is what you were given. */
export function WellPlot({ rows }) {
  const wells = useMemo(() => [...new Set(rows.map((r) => r.well_id))].sort(), [rows]);
  const [sel, setSel] = useState(['FIELD']);
  const [metric, setMetric] = useState('oil_rate');
  const [roll, setRoll] = useState(1);
  const metrics = {
    oil_rate: ['Oil volume (stb/d, calendar day)', (a) => a.oil], water_rate: ['Water volume (bbl/d)', (a) => a.water], gas_rate: ['Gas volume (Mscf/d)', (a) => a.gas],
    liquid: ['Liquid volume (stb+bbl/d)', (a) => a.oil + a.water], wc: ['Water cut (%)', (a) => (a.oil + a.water ? (100 * a.water) / (a.oil + a.water) : null)],
    gor: ['GOR (scf/stb)', (a) => (a.oil ? (a.gas * 1000) / a.oil : null)], whp: ['Wellhead pressure (psig; FIELD = mean of reporting wells)', (a) => (a.whpN ? a.whpSum / a.whpN : null)], hours: ['Hours on', (a) => a.hours],
  };
  const data = useMemo(() => {
    const by = new Map();
    for (const r of rows) {
      const key = r.date;
      if (!by.has(key)) by.set(key, { date: key, agg: {} });
      const bucket = by.get(key).agg;
      const add = (k) => { const a = (bucket[k] ||= { oil: 0, water: 0, gas: 0, hours: 0, whpSum: 0, whpN: 0, n: 0 }); a.oil += r.oil_stb; a.water += r.water_bbl; a.gas += r.gas_mscf; a.hours += r.hours_on; if (r.whp_psig > -999) { a.whpSum += r.whp_psig; a.whpN++; } a.n++; };
      add('FIELD'); add(r.well_id);
    }
    const days = [...by.values()].sort((x, y) => x.date.localeCompare(y.date));
    const f = metrics[metric][1];
    let out = days.map((d) => { const o = { date: d.date }; for (const s of sel) if (d.agg[s]) o[s] = f(d.agg[s]); return o; });
    if (roll > 1) out = out.map((d, i) => { const o = { date: d.date }; for (const s of sel) { const w = out.slice(Math.max(0, i - roll + 1), i + 1).map((x) => x[s]).filter((v) => v != null); o[s] = w.length ? w.reduce((a, b) => a + b, 0) / w.length : null; } return o; });
    return out;
  }, [rows, sel, metric, roll]);
  const toggle = (w) => setSel((s) => (s.includes(w) ? s.filter((x) => x !== w) : [...s, w]));
  return (
    <div>
      <div className="row">
        <select value={metric} onChange={(e) => setMetric(e.target.value)} style={{ width: 'auto' }} aria-label="Metric">{Object.entries(metrics).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select>
        <label className="small">Rolling mean <select value={roll} onChange={(e) => setRoll(Number(e.target.value))} style={{ width: 'auto' }}>{[1, 7, 14, 30].map((n) => <option key={n} value={n}>{n === 1 ? 'off' : n + ' d'}</option>)}</select></label>
      </div>
      <div className="row" style={{ margin: '8px 0' }}>
        {['FIELD', ...wells].map((w) => <button key={w} className={'btn sm' + (sel.includes(w) ? ' primary' : '')} onClick={() => toggle(w)}>{w}</button>)}
      </div>
      <div style={{ width: '100%', height: 340 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} minTickGap={50} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--ink-3)' }} width={60} />
            <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 12 }} />
            <Legend />
            {sel.map((s, i) => <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.6} connectNulls={false} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="small muted">This plots the data exactly as released (no cleaning). If a line looks wrong, ask why before you trust it.</p>
    </div>
  );
}

export function FieldPlot({ rows }) {
  const cols = ['sep_psig', 'comp_suction_psig', 'man_a_psig', 'man_b_psig', 'sep_oil_stb', 'sep_water_bbl', 'sep_gas_mscf', 'flare_mscf'];
  const [sel, setSel] = useState(['sep_psig']);
  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>{cols.map((c) => <button key={c} className={'btn sm' + (sel.includes(c) ? ' primary' : '')} onClick={() => setSel((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))}>{c}</button>)}</div>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} minTickGap={50} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--ink-3)' }} width={60} />
            <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 12 }} />
            <Legend />
            {sel.map((s, i) => <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.6} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
