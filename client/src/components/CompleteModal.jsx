import Md from './Md.jsx';

export default function CompleteModal({ summary, onClose }) {
  const json = JSON.stringify(summary.stateRecord, null, 2);
  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-label="Stage complete" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Stage {summary.stage.replace('S', '')} complete — {summary.title}</h2>
        <div className="row"><span className="chip accent">+{summary.stageXp} XP this stage</span><span className="chip">Cumulative {summary.cumulativeXp} XP</span></div>
        <h4>Completed missions</h4><ul>{summary.completedMissions.map((m) => <li key={m}>{m}</li>)}</ul>
        {summary.achievements.length > 0 && (<><h4>Achievements unlocked</h4><ul>{summary.achievements.map((a) => <li key={a.key}><b>{a.title}</b> — {a.text}</li>)}</ul></>)}
        {summary.competencies.length > 0 && (<><h4>Competencies demonstrated</h4><ul>{summary.competencies.map((c) => <li key={c}>{c}</li>)}</ul></>)}
        {summary.lessonsForPractice.length > 0 && (<><h4>Lessons for further practice</h4><ul>{summary.lessonsForPractice.map((c, i) => <li key={i}>{c}</li>)}</ul></>)}
        {summary.outstanding.length > 0 && (<><h4>Outstanding issues</h4><ul>{summary.outstanding.map((c, i) => <li key={i}>{c}</li>)}</ul></>)}
        <h4>Next mission</h4><Md>{summary.nextMission}</Md>
        <h4>Copyable state record</h4>
        <textarea readOnly value={json} style={{ minHeight: 150, fontFamily: 'var(--mono)', fontSize: 12 }} onFocus={(e) => e.target.select()} />
        <p className="small muted">XP is a motivational device, not a professional competency certification.</p>
        <div className="row"><button className="btn" onClick={() => navigator.clipboard?.writeText(json)}>Copy state record</button><span className="spacer" /><button className="btn primary" onClick={onClose}>Continue</button></div>
      </div>
    </div>
  );
}
