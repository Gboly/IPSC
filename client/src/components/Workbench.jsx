import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api.js';

// --- tiny safe calculator -------------------------------------------------------------------
const FN = ['sqrt', 'log', 'log10', 'exp', 'abs', 'pow', 'min', 'max', 'sin', 'cos', 'tan', 'atan', 'floor', 'ceil', 'round'];
function evaluate(expr) {
  const src = expr.replace(/\^/g, '**').replace(/\bpi\b/gi, 'Math.PI').replace(/\bln\b/g, 'log');
  if (!/^[0-9+\-*/().,\s%eE*a-zA-Z_.]*$/.test(src)) throw new Error('Unsupported character');
  const ids = src.replace(/Math\.PI/g, '').match(/[a-zA-Z_]+/g) || [];
  for (const id of ids) if (!FN.includes(id) && !/^[eE]$/.test(id)) throw new Error(`Unknown name "${id}"`);
  const body = src.replace(new RegExp(`\\b(${FN.join('|')})\\b`, 'g'), 'Math.$1');
  // eslint-disable-next-line no-new-func
  const v = new Function(`"use strict"; return (${body});`)();
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('Not a finite number');
  return v;
}

const UNITS = [
  ['stb → m³', 0.158987], ['m³ → stb', 1 / 0.158987], ['bbl → m³', 0.158987], ['Mscf → m³ (std)', 28.3168],
  ['psi → kPa', 6.894757], ['kPa → psi', 1 / 6.894757], ['psi → bar', 0.0689476], ['bar → psi', 14.5038], ['ft → m', 0.3048], ['m → ft', 3.28084], ['in → mm', 25.4], ['lb/ft³ → kg/m³', 16.0185],
];

function Calculator({ sid, notebook, saveCalcs }) {
  const [expr, setExpr] = useState('');
  const [out, setOut] = useState(null);
  const [uIdx, setU] = useState(0);
  const [uVal, setUV] = useState('');
  const run = () => { try { const v = evaluate(expr); setOut({ v }); } catch (e) { setOut({ err: e.message }); } };
  return (
    <div className="card">
      <h3>Calculator & units</h3>
      <div className="row"><input type="text" value={expr} placeholder="e.g. 4500*(1-0.28)/24  or  sqrt(2)*3^2" onChange={(e) => setExpr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} style={{ flex: 1, minWidth: 200 }} aria-label="Expression" /><button className="btn" onClick={run}>=</button></div>
      {out && (out.err ? <div className="err">{out.err}</div> : <div className="row" style={{ marginTop: 8 }}><b className="mono" style={{ fontSize: 18 }}>{out.v.toLocaleString(undefined, { maximumSignificantDigits: 10 })}</b><button className="btn sm" onClick={() => saveCalcs([...notebook.calcs, { at: new Date().toISOString(), expr, value: out.v }])}>Log to notebook</button></div>)}
      <p className="small muted">Functions: {FN.join(', ')}, pi, ^ for power. Always write units next to your result in the notebook.</p>
      <h4>Unit conversion</h4>
      <div className="row"><input type="number" value={uVal} onChange={(e) => setUV(e.target.value)} style={{ width: 130 }} aria-label="Value" /><select value={uIdx} onChange={(e) => setU(Number(e.target.value))} style={{ width: 'auto' }}>{UNITS.map((u, i) => <option key={u[0]} value={i}>{u[0]}</option>)}</select>
        <b className="mono">= {uVal === '' ? '…' : (Number(uVal) * UNITS[uIdx][1]).toLocaleString(undefined, { maximumSignificantDigits: 8 })}</b></div>
    </div>
  );
}

function CheckCalc({ camp, session, refresh, onToast }) {
  const m = camp.metrics;
  const [f, setF] = useState({ metric: 'field_oil_rate', from: '2026-05-01', to: '2026-06-30', well: 'K17-03', value: '' });
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const def = m[f.metric];
  const go = async () => {
    setErr(''); setRes(null);
    try { const r = await api.calcCheck(session.id, { ...f, well: def.needsWell ? f.well : undefined, value: f.value }); setRes(r); if (r.xp) onToast(`+${r.xp} XP`); refresh(); } catch (e) { setErr(e.message); }
  };
  return (
    <div className="card">
      <h3>Check a calculation</h3>
      <p className="small muted">Do the arithmetic yourself on the data you downloaded, then enter your number. The server compares it with the <b>cleaned</b> data and tells you if you fell into a trap. It will not give you the answer.</p>
      <div className="grid2">
        <div><label className="f">Metric<select value={f.metric} onChange={(e) => setF({ ...f, metric: e.target.value })}>{Object.entries(m).map(([k, v]) => <option key={k} value={k}>{v.label} [{v.unit}]</option>)}</select></label></div>
        {def.needsWell && <div><label className="f">Well<input type="text" value={f.well} onChange={(e) => setF({ ...f, well: e.target.value })} /></label></div>}
        <div><label className="f">From<input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></label></div>
        <div><label className="f">To<input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></label></div>
        <div><label className="f">Your value ({def.unit})<input type="number" step="any" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></label></div>
      </div>
      <div className="row" style={{ marginTop: 10 }}><button className="btn primary" onClick={go}>Check</button></div>
      {err && <div className="err">{err}</div>}
      {res && <div className={'card ' + (res.correct ? '' : 'soft')} style={{ marginTop: 10, marginBottom: 0 }}><span className={'chip ' + (res.correct ? 'ok' : res.matchesNaive ? 'warn' : 'bad')}>{res.correct ? 'Within tolerance' : res.matchesNaive ? 'Matches raw rows — not clean data' : 'Outside tolerance'}</span> <span className="small muted">tolerance {res.toleranceNote}</span><p style={{ marginBottom: 0 }}>{res.message}</p>{res.xp > 0 && <span className="chip accent">+{res.xp} XP</span>}</div>}
    </div>
  );
}

function EventLoss({ session, refresh, onToast }) {
  const [ev, setEv] = useState('EV-001');
  const [val, setVal] = useState('');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const go = async () => { setErr(''); setRes(null); try { const r = await api.eventLoss(session.id, { eventRef: ev, value: val }); setRes(r); if (r.xp) onToast(`+${r.xp} XP`); refresh(); } catch (e) { setErr(e.message); } };
  return (
    <div className="card">
      <h3>Check an event loss estimate</h3>
      <p className="small muted">Estimate the oil lost to an event in PACK 06 (stb) from the production data, state your method, and test it against the engine's counterfactual (±30 %). Available from Stage 4.</p>
      <div className="row"><input type="text" value={ev} onChange={(e) => setEv(e.target.value.toUpperCase())} style={{ width: 120 }} aria-label="Event ref" /><input type="number" value={val} placeholder="your estimate, stb" onChange={(e) => setVal(e.target.value)} style={{ width: 200 }} /><button className="btn primary" onClick={go}>Check</button></div>
      {err && <div className="err">{err}</div>}
      {res && <p><span className={'chip ' + (res.correct ? 'ok' : 'bad')}>{res.correct ? 'Consistent' : 'Not consistent'}</span> {res.message} {res.xp > 0 && <span className="chip accent">+{res.xp} XP</span>}</p>}
    </div>
  );
}

function Nodal({ session, unlocked }) {
  const [f, setF] = useState({ well: 'K17-04', date: '2026-09-30', chokeS: '', manifoldPsig: 165, restriction: '', jMult: '' });
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  if (!unlocked) return <div className="card soft"><h3>Nodal workbench 🔒</h3><p className="muted">Unlocks at Stage 5 (well performance), after you have well tests and PVT. Building it first would hand you the answer to Stage 5. (Developers: set <code>DEV_UNLOCK_ALL=1</code> on the server.)</p></div>;
  const run = async () => {
    setErr('');
    try { setData(await api.nodal(session.id, { ...f, chokeS: f.chokeS || undefined, restriction: f.restriction === '' ? undefined : f.restriction, jMult: f.jMult || undefined })); } catch (e) { setErr(e.message); }
  };
  const op = data?.operating;
  return (
    <div className="card">
      <h3>Nodal workbench (screening model)</h3>
      <div className="grid2">
        <div><label className="f">Well<select value={f.well} onChange={(e) => setF({ ...f, well: e.target.value })}>{Array.from({ length: 12 }, (_, i) => `K17-${String(i + 1).padStart(2, '0')}`).map((w) => <option key={w}>{w}</option>)}</select></label></div>
        <div><label className="f">Date<input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label></div>
        <div><label className="f">Choke (64ths) — blank = as installed<input type="number" value={f.chokeS} onChange={(e) => setF({ ...f, chokeS: e.target.value })} /></label></div>
        <div><label className="f">Manifold pressure (psig)<input type="number" value={f.manifoldPsig} onChange={(e) => setF({ ...f, manifoldPsig: e.target.value })} /></label></div>
        <div><label className="f">Tubing restriction 0–0.9 — blank = as is<input type="number" step="0.05" value={f.restriction} onChange={(e) => setF({ ...f, restriction: e.target.value })} /></label></div>
        <div><label className="f">Productivity multiplier (what-if)<input type="number" step="0.1" value={f.jMult} onChange={(e) => setF({ ...f, jMult: e.target.value })} /></label></div>
      </div>
      <div className="row" style={{ marginTop: 10 }}><button className="btn primary" onClick={run}>Solve & plot</button></div>
      {err && <div className="err">{err}</div>}
      {data && (
        <div style={{ marginTop: 12 }}>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={data.points} margin={{ top: 8, right: 16, bottom: 18, left: 8 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                <XAxis dataKey="q" type="number" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} label={{ value: 'Liquid rate (stb/d)', position: 'insideBottom', offset: -8, fontSize: 11, fill: 'var(--ink-3)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-3)' }} width={60} label={{ value: 'Pwf (psia)', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--ink-3)' }} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', fontSize: 12 }} />
                <Legend verticalAlign="top" />
                <Line dataKey="ipr" name="Inflow (IPR)" stroke="#1f5f99" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line dataKey="vlp" name="Outflow (VLP + choke + line)" stroke="#b4670b" dot={false} strokeWidth={2} isAnimationActive={false} />
                {op?.flowing && <ReferenceDot x={op.qLiq} y={op.pwf} r={6} fill="#b3322b" stroke="none" />}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {op?.flowing ? <dl className="kv"><dt>Operating point</dt><dd><b>{op.qLiq.toFixed(0)} stb/d liquid</b> · oil {op.qo.toFixed(0)} · water {op.qw.toFixed(0)} · gas {(op.qg / 1000).toFixed(0)} Mscf/d</dd><dt>Pwf / Pwh</dt><dd>{op.pwf.toFixed(0)} psia / {(op.pwh - 14.7).toFixed(0)} psig</dd><dt>Choke</dt><dd>{op.chokeCritical ? 'critical flow (downstream pressure cannot propagate upstream)' : 'sub-critical (sensitive to downstream pressure)'}</dd><dt>Reservoir state</dt><dd>Pr {data.state.pr.toFixed(0)} psia · WC {(data.state.wc * 100).toFixed(0)} % · GOR {data.state.gor.toFixed(0)} scf/stb</dd></dl> : <div className="err">No stable natural-flow intersection for these settings.</div>}
          <ul className="small muted">{data.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export default function Workbench({ camp, session, notebook, saveCalcs, refresh, onToast, devUnlock }) {
  const idx = (id) => camp.stages.findIndex((s) => s.id === id);
  const cur = idx(session.currentStage);
  return (
    <div>
      <h2>Workbench</h2>
      <Calculator sid={session.id} notebook={notebook} saveCalcs={saveCalcs} />
      {cur >= idx('S3') || devUnlock ? <CheckCalc camp={camp} session={session} refresh={refresh} onToast={onToast} /> : <div className="card soft"><h3>Check a calculation 🔒</h3><p className="muted">Opens with the production history (Stage 3).</p></div>}
      {cur >= idx('S4') || devUnlock ? <EventLoss session={session} refresh={refresh} onToast={onToast} /> : <div className="card soft"><h3>Check an event loss estimate 🔒</h3><p className="muted">Opens with the deferment log (Stage 4).</p></div>}
      <Nodal session={session} unlocked={cur >= idx('S5') || devUnlock} />
    </div>
  );
}
