import { Fragment, useEffect, useState } from 'react';
import { api } from '../api.js';
import Md from './Md.jsx';
import Schematic from './Schematic.jsx';
import { FieldPlot, WellPlot, parseCsv } from './Plot.jsx';

function DataTable({ rows, max = 200 }) {
  if (!rows?.length) return <div className="muted small">No rows.</div>;
  const cols = Object.keys(rows[0]);
  return (
    <div className="scroll">
      <table className="t">
        <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{rows.slice(0, max).map((r, i) => <tr key={i}>{cols.map((c) => <td key={c} className={typeof r[c] === 'number' ? 'num' : ''}>{String(r[c] ?? '')}</td>)}</tr>)}</tbody>
      </table>
      {rows.length > max && <div className="small muted" style={{ padding: 8 }}>Showing {max} of {rows.length} rows — download the CSV for the full file.</div>}
    </div>
  );
}

function CsvFile({ sid, pid, file, onRows }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const load = async () => { try { const t = await api.packFileText(sid, pid, file); const r = parseCsv(t); setRows(r); onRows?.(file, r); } catch (e) { setErr(e.message); } };
  return (
    <div className="card soft">
      <div className="row"><b className="mono">{file}</b><span className="spacer" />
        <a className="btn sm" href={api.packFileUrl(sid, pid, file)} download>⬇ Download CSV</a>
        <button className="btn sm" onClick={load}>{rows ? 'Reload preview' : 'Preview first rows'}</button>
      </div>
      {err && <div className="err">{err}</div>}
      {rows && <div style={{ marginTop: 8 }}><DataTable rows={rows} max={60} /><div className="small muted">{rows.length.toLocaleString()} data rows. -999 is the export's missing-value code.</div></div>}
    </div>
  );
}

export default function DataRoom({ camp, session, initialPack }) {
  const [pid, setPid] = useState(initialPack || '00');
  const [pack, setPack] = useState(null);
  const [err, setErr] = useState('');
  const [wellRows, setWellRows] = useState(null);
  const [fieldRows, setFieldRows] = useState(null);
  const released = Object.keys(session.packsReleased);
  useEffect(() => { if (initialPack) setPid(initialPack); }, [initialPack]);
  useEffect(() => {
    setPack(null); setErr('');
    api.pack(session.id, pid).then(setPack).catch((e) => setErr(e.message));
  }, [pid, session.id, released.length]);

  const need = (f, setter) => async () => { const r = parseCsv(await api.packFileText(session.id, '02', f)); setter(r); };

  return (
    <div className="layout-2">
      <nav className="pack-list" aria-label="Data packs">
        <h4>Data room</h4>
        {camp.packs.map((p) => {
          const ok = released.includes(p.id);
          return <button key={p.id} className={'pack-btn' + (pid === p.id ? ' on' : '')} disabled={!ok} onClick={() => setPid(p.id)}><b>PACK {p.id}</b> <span className="muted small">v{p.version}</span><br /><span className="small">{ok ? p.title : '🔒 Released in ' + p.stage}</span></button>;
        })}
        <p className="small muted">Packs unlock as you complete stages. Later packs (03, 04, 05, 07…12) are defined in the master prompt but not yet built.</p>
      </nav>

      <div>
        {err && <div className="err">{err}</div>}
        {!pack && !err && <div className="muted">Loading…</div>}
        {pack && (
          <div>
            <div className="chip bad" style={{ marginBottom: 8 }}>{pack.banner}</div>
            <h2>PACK {pack.id}, Version {pack.version} — {pack.title}</h2>
            <div className="card"><h4>Purpose</h4><p>{pack.purpose}</p><Md>{pack.markdown}</Md></div>

            <div className="card">
              <h4>Dataset register</h4>
              <div className="scroll" style={{ maxHeight: 'none' }}><table className="t"><thead><tr><th>ID</th><th>Dataset</th><th>Source</th><th>Resolution</th><th>Units</th><th className="num">Records</th><th>Known limitations</th></tr></thead>
                <tbody>{pack.datasets.map((d) => <tr key={d.id}><td className="mono">{d.id}</td><td>{d.name}</td><td>{d.source}</td><td>{d.resolution}</td><td>{d.units}</td><td className="num">{d.records}</td><td>{d.limitations}</td></tr>)}</tbody></table></div>
            </div>

            {pack.schematic && <div className="card"><h4>Block schematic</h4><Schematic data={pack.schematic} /></div>}

            {Object.entries(pack.tables || {}).map(([name, rows]) => (
              <div className="card" key={name}>
                <div className="row"><h4 style={{ margin: 0 }}>{name.replace(/_/g, ' ')}</h4><span className="spacer" /><a className="btn sm" href={api.packFileUrl(session.id, pack.id, name + '.csv')} download>⬇ CSV</a></div>
                <DataTable rows={rows} />
              </div>
            ))}

            {pack.files.length > 0 && pack.datasets.some((d) => d.file) && (
              <div>{pack.files.filter((f) => pack.datasets.some((d) => d.file === f)).map((f) => <CsvFile key={f} sid={session.id} pid={pack.id} file={f} />)}</div>
            )}

            {pack.id === '02' && (
              <div className="card">
                <h4>Plot builder (raw, uncleaned data)</h4>
                {!wellRows ? <button className="btn" onClick={need('production_daily.csv', setWellRows)}>Load well-day data into the plot builder</button> : <WellPlot rows={wellRows} />}
                <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '16px 0' }} />
                <h4>Separator & facility daily</h4>
                {!fieldRows ? <button className="btn" onClick={need('field_daily.csv', setFieldRows)}>Load separator data</button> : <FieldPlot rows={fieldRows} />}
              </div>
            )}

            <div className="card">
              <h4>Data dictionary</h4>
              <dl className="kv">{pack.dictionary.map(([k, v]) => <Fragment key={k}><dt className="mono">{k}</dt><dd>{v}</dd></Fragment>)}</dl>
            </div>
            <div className="card"><h4>Quality flags</h4><ul>{pack.qualityFlags.map((q, i) => <li key={i}>{q}</li>)}</ul></div>
            <div className="grid2">
              <div className="card"><h4>Required work</h4><p>{pack.requiredWork}</p></div>
              <div className="card"><h4>Expected output</h4><p>{pack.expectedOutput}</p></div>
            </div>
            <div className="card"><h4>Completion criteria</h4><p>{pack.completionCriteria}</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
