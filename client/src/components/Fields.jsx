import { useState } from 'react';

export function FieldInput({ f, value, onChange, labelId }) {
  if (f.kind === 'text') return <input type="text" aria-labelledby={labelId} value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  if (f.kind === 'textarea') return <textarea aria-labelledby={labelId} value={value || ''} onChange={(e) => onChange(e.target.value)} rows={4} />;
  if (f.kind === 'choice')
    return (
      <div role="radiogroup" aria-labelledby={labelId}>
        {f.options.map((o) => (
          <label key={o} className={'choice' + (value === o ? ' on' : '')}>
            <input type="radio" checked={value === o} onChange={() => onChange(o)} /> <span>{o}</span>
          </label>
        ))}
      </div>
    );
  if (f.kind === 'table') return <div role="group" aria-labelledby={labelId}><EditTable f={f} rows={value} onChange={onChange} /></div>;
  if (f.kind === 'rank') return <div role="group" aria-labelledby={labelId}><Rank f={f} value={value} onChange={onChange} /></div>;
  if (f.kind === 'budget') return <div role="group" aria-labelledby={labelId}><Budget f={f} value={value} onChange={onChange} /></div>;
  return null;
}

function EditTable({ f, rows, onChange }) {
  const data = rows?.length ? rows : Array.from({ length: Math.max(f.minRows || 3, 3) }, () => ({}));
  const set = (i, k, v) => onChange(data.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const filled = data.filter((r) => Object.values(r).some((x) => String(x || '').trim())).length;
  return (
    <div>
      <div className="scroll" style={{ maxHeight: 'none' }}>
        <table className="t edit-table">
          <thead><tr><th style={{ width: 28 }}>#</th>{f.columns.map((c) => <th key={c.key}>{c.label}</th>)}<th /></tr></thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i}>
                <td className="muted">{i + 1}</td>
                {f.columns.map((c) => (
                  <td key={c.key}>
                    {c.options ? (
                      <select aria-label={`${c.label}, row ${i + 1}`} value={r[c.key] || ''} onChange={(e) => set(i, c.key, e.target.value)}><option value="">—</option>{c.options.map((o) => <option key={o}>{o}</option>)}</select>
                    ) : (
                      <textarea aria-label={`${c.label}, row ${i + 1}`} value={r[c.key] || ''} onChange={(e) => set(i, c.key, e.target.value)} />
                    )}
                  </td>
                ))}
                <td><button className="btn sm" title="Remove row" onClick={() => onChange(data.filter((_, j) => j !== i))}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn sm" onClick={() => onChange([...data, {}])}>+ Add row</button>
        <span className="small muted">{filled} filled{f.minRows ? ` · at least ${f.minRows} required` : ''}</span>
      </div>
    </div>
  );
}

function Rank({ f, value, onChange }) {
  const items = value?.length === f.items.length ? value : f.items;
  const move = (i, d) => { const a = [...items]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div>
      {items.map((it, i) => (
        <div className="rank-item" key={it}>
          <span className="n">{i + 1}</span><span style={{ flex: 1 }}>{it}</span>
          <button className="btn sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">▲</button>
          <button className="btn sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">▼</button>
        </div>
      ))}
      <div className="small muted">1 = investigate first. Reorder with the arrows.</div>
    </div>
  );
}

function Budget({ f, value, onChange }) {
  const sel = value || [];
  const total = sel.reduce((a, id) => a + (f.options.find((o) => o.id === id)?.cost || 0), 0);
  const toggle = (id) => onChange(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  return (
    <div>
      {f.options.map((o) => (
        <label key={o.id} className={'choice' + (sel.includes(o.id) ? ' on' : '')}>
          <input type="checkbox" checked={sel.includes(o.id)} onChange={() => toggle(o.id)} />
          <span style={{ flex: 1 }}>{o.label}</span><span className="chip">{o.cost} pts</span>
        </label>
      ))}
      <div className={'chip ' + (total > f.budget ? 'bad' : 'accent')} style={{ marginTop: 6 }}>Spent {total} / {f.budget}</div>
    </div>
  );
}

export function useDebounced(fn, ms) {
  const [t, setT] = useState(null);
  return (...a) => { clearTimeout(t); setT(setTimeout(() => fn(...a), ms)); };
}
