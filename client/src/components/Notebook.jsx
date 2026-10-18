import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Md from './Md.jsx';

export default function Notebook({ camp, session, notebook, setNotebook }) {
  const [notes, setNotes] = useState(notebook.notes || '');
  const t = useRef();
  useEffect(() => setNotes(notebook.notes || ''), [session.id]);
  const onChange = (v) => { setNotes(v); clearTimeout(t.current); t.current = setTimeout(() => { setNotebook({ ...notebook, notes: v }); api.notebook(session.id, { notes: v }); }, 900); };
  const rec = { stage: session.currentStage, xp: session.xp, completed: session.completedStages, achievements: session.achievements, packs: session.packsReleased, decisions: session.decisions.map((d) => ({ task: d.task, quality: d.decisionQuality })) };
  return (
    <div>
      <h2>Engineering notebook</h2>
      <div className="grid2">
        <div className="card"><h4>Status</h4>
          <dl className="kv"><dt>Current stage</dt><dd>{session.currentStage}</dd><dt>Cumulative XP</dt><dd className="xp">{session.xp}</dd><dt>Completed</dt><dd>{session.completedStages.join(', ') || 'none yet'}</dd><dt>Packs released</dt><dd>{Object.entries(session.packsReleased).map(([k, v]) => `${k} v${v}`).join(', ')}</dd></dl>
          <p className="small muted">XP is a motivational device, not a professional competency certification.</p>
          <div className="row"><a className="btn" href={api.stateRecordUrl(session.id)} download>⬇ Download state record (JSON)</a><button className="btn" onClick={() => navigator.clipboard?.writeText(JSON.stringify(rec, null, 2))}>Copy checkpoint</button></div>
        </div>
        <div className="card"><h4>Achievements</h4>
          {session.achievements.length ? <ul>{session.achievements.map((a) => <li key={a}><b>{camp.achievements[a]?.title}</b> — {camp.achievements[a]?.text}</li>)}</ul> : <p className="muted">None unlocked yet.</p>}
        </div>
      </div>
      <div className="card"><h4>Working notes (assumptions, units, hypotheses)</h4><textarea value={notes} onChange={(e) => onChange(e.target.value)} style={{ minHeight: 160 }} placeholder="Variables and units · key calculations · assumptions · hypotheses and evidence · open questions" /></div>
      <div className="card"><h4>Calculation log</h4>
        {notebook.calcs?.length ? <table className="t"><thead><tr><th>Expression</th><th className="num">Result</th><th>When</th></tr></thead><tbody>{notebook.calcs.slice().reverse().map((c, i) => <tr key={i}><td className="mono">{c.expr}</td><td className="num">{Number(c.value).toLocaleString(undefined, { maximumSignificantDigits: 10 })}</td><td className="small muted">{c.at.slice(0, 16).replace('T', ' ')}</td></tr>)}</tbody></table> : <p className="muted">Log results from the Workbench calculator.</p>}
      </div>
      <div className="card"><h4>Decision log</h4>
        {session.decisions.length ? session.decisions.slice().reverse().map((d, i) => (
          <details key={i} style={{ marginBottom: 8 }}><summary><b>{d.task}</b> · {d.title} <span className="chip">{(d.decisionQuality || '').replace(/_/g, ' ')}</span> <span className="small muted">{d.at.slice(0, 16).replace('T', ' ')}</span></summary>
            <Md>{d.summary}</Md><pre className="scroll" style={{ whiteSpace: 'pre-wrap', padding: 10 }}>{d.answer}</pre></details>
        )) : <p className="muted">Decisions you submit are logged here with the reviewer's assessment.</p>}
      </div>
      <div className="card"><h4>XP log</h4>
        {session.xpLog.length ? <table className="t"><tbody>{session.xpLog.slice().reverse().map((x, i) => <tr key={i}><td className="mono">{x.criterion}</td><td>{x.task}</td><td className="num">+{x.xp}</td></tr>)}</tbody></table> : <p className="muted">No XP yet.</p>}
      </div>
    </div>
  );
}
