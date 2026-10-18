import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Md from './Md.jsx';
import { FieldInput } from './Fields.jsx';

const DQ_LABEL = { reasonable_on_evidence: 'Reasonable on the evidence', flawed_assumption: 'Rests on a flawed assumption', correct_under_conditions: 'Correct under certain conditions', inconclusive_more_data: 'Inconclusive — more data needed', not_a_decision: 'Not a decision task' };
const DQ_TONE = { reasonable_on_evidence: 'ok', flawed_assumption: 'bad', correct_under_conditions: 'warn', inconclusive_more_data: 'info', not_a_decision: '' };

export default function TaskForm({ task, session, refresh, locked, onToast }) {
  const [answer, setAnswer] = useState(() => session.drafts[task.id] || {});
  const [review, setReview] = useState(null);
  const [hints, setHints] = useState([]);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const saveT = useRef();
  const status = session.taskStatus[task.id];

  useEffect(() => { setAnswer(session.drafts[task.id] || {}); setReview(null); setHints([]); setErr(''); }, [task.id]);

  const set = (k, v) => {
    const next = { ...answer, [k]: v };
    setAnswer(next);
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => api.saveDraft(session.id, task.id, next).catch(() => {}), 1000);
  };

  const submit = async () => {
    setBusy('submit'); setErr('');
    try {
      const r = await api.submit(session.id, task.id, answer);
      setReview(r);
      if (r.gained.length) onToast(`+${r.gained.reduce((a, g) => a + g.xp, 0)} XP`);
      await refresh();
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  const hint = async () => {
    setBusy('hint'); setErr('');
    try { const r = await api.hint(session.id, task.id, answer); setHints((h) => [...h, r]); await refresh(); } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };

  const metIds = new Set(Object.keys(session.met || {}));
  return (
    <section className="card accent" aria-labelledby={`t-${task.id}`}>
      <div className="row">
        <h3 id={`t-${task.id}`} style={{ margin: 0 }}>{task.title}</h3>
        <span className={'chip ' + (status === 'passed' ? 'ok' : status === 'in-progress' ? 'warn' : '')}>{status === 'passed' ? 'Gate met' : status === 'in-progress' ? 'In progress' : 'To do'}</span>
      </div>
      <Md>{task.prompt}</Md>

      {task.fields.map((f) => (
        <div key={f.key}>
          <label className="f" id={`${task.id}-${f.key}-l`}>{f.label}</label>
          <FieldInput f={f} labelId={`${task.id}-${f.key}-l`} value={answer[f.key]} onChange={(v) => set(f.key, v)} />
        </div>
      ))}

      <details style={{ marginTop: 14 }}>
        <summary className="small"><b>What a defensible answer shows</b> (rubric · {task.rubric.reduce((a, c) => a + c.xp, 0)} XP available)</summary>
        <ul className="rubric">
          {task.rubric.map((c) => (
            <li key={c.id}><span className={'tick' + (metIds.has(c.id) ? ' met' : '') + (c.core ? ' core' : '')}>✓</span><span style={{ flex: 1 }}>{c.label}{c.core && <span className="chip accent" style={{ marginLeft: 6 }}>core</span>}</span><span className="muted small">{c.xp ? `${c.xp} XP` : ''}</span></li>
          ))}
        </ul>
      </details>

      {err && <div className="err" role="alert">{err}</div>}
      {hints.map((h, i) => <div className="hint" key={i}><b>Hint {h.level}/3</b><Md>{h.hint}</Md></div>)}

      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn primary" disabled={busy || locked} onClick={submit}>{busy === 'submit' ? 'Reviewing…' : 'Submit for review'}</button>
        <button className="btn" disabled={busy || locked || (session.hints[task.id] || 0) >= 3} onClick={hint}>{busy === 'hint' ? 'Thinking…' : `Hint (${session.hints[task.id] || 0}/3 used)`}</button>
        <span className="small muted">Drafts autosave. You can resubmit as often as you like; XP is awarded once per criterion.</span>
      </div>

      {review && (
        <div className={'card review soft' + (review.passed ? ' pass' : '')} style={{ marginTop: 16 }}>
          <div className="row">
            <h4 style={{ margin: 0 }}>Review</h4>
            {review.decisionQuality && <span className={'chip ' + (DQ_TONE[review.decisionQuality] || '')}>{DQ_LABEL[review.decisionQuality]}</span>}
            <span className={'chip ' + (review.passed ? 'ok' : 'warn')}>{review.passed ? 'Core criteria met' : 'Core criteria not yet met'}</span>
            {review.gained.length > 0 && <span className="chip accent">+{review.gained.reduce((a, g) => a + g.xp, 0)} XP</span>}
            {review.aiMode === 'offline' && <span className="chip bad">OFFLINE keyword check</span>}
          </div>
          <Md>{review.feedback}</Md>
          {review.hiddenIssuesRemaining !== undefined && <p className="small"><b>{review.hiddenIssuesRemaining}</b> of 7 hidden data-quality issues still unfound.</p>}
          {review.gaps?.length > 0 && (<><h4>Gaps to close</h4><ul>{review.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul></>)}
          {review.challenge && <div className="card" style={{ marginBottom: 0 }}><b>Reviewer's challenge:</b> {review.challenge}</div>}
        </div>
      )}
    </section>
  );
}
