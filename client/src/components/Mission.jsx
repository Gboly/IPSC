import Md from './Md.jsx';
import TaskForm from './TaskForm.jsx';

export default function Mission({ stage, session, refresh, onComplete, onToast, goTab }) {
  const unlocked = true;
  const prog = session.stageProgress?.[stage.id];
  const isCurrent = session.currentStage === stage.id;
  const done = session.completedStages.includes(stage.id);
  return (
    <div>
      <div className="row" style={{ marginBottom: 6 }}>
        <span className="chip info">Level {stage.level}</span>
        <h2 style={{ margin: 0 }}>{stage.id.replace('S', 'Stage ')} — {stage.title}</h2>
        {done && <span className="chip ok">Completed</span>}
      </div>
      <p className="muted" style={{ marginTop: 0 }}>{stage.mission}</p>

      <div className="card">
        <Md>{stage.briefing}</Md>
        {stage.packs.length > 0 && <p className="small">Data for this stage: {stage.packs.map((p) => <button key={p} className="btn sm" style={{ marginRight: 6 }} onClick={() => goTab('data', p)}>PACK {p}</button>)}</p>}
        {stage.learning.length > 0 && (<><h4>Learning objectives</h4><ul>{stage.learning.map((l) => <li key={l}>{l}</li>)}</ul></>)}
      </div>

      {stage.theory && (
        <details className="card soft" open={!done}>
          <summary><b>Minimum theory for this stage</b></summary>
          <Md>{stage.theory}</Md>
        </details>
      )}

      {!stage.implemented && (
        <div className="card">
          <p><b>Not yet implemented in this build.</b> The stage definition is taken from the master prompt; tasks, data packs and rubrics are for you to add.</p>
          <p className="small">Gate (from the spec): {stage.gate}</p>
          <p className="small muted">See <code>docs/EXTENDING.md</code> — adding a stage means a stage object in <code>server/src/game/stages.js</code> plus (if needed) a pack in <code>packs.js</code>.</p>
        </div>
      )}

      {stage.tasks.map((t) => <TaskForm key={t.id} task={t} session={session} refresh={refresh} locked={!unlocked} onToast={onToast} />)}

      {stage.tasks.length > 0 && (
        <div className="card soft">
          <div className="row">
            <b>Stage gate</b><span className="muted small">{stage.gate}</span>
            <span className="spacer" />
            {isCurrent && <button className="btn primary" disabled={!prog?.allPassed} onClick={() => onComplete(stage.id)}>{prog?.allPassed ? 'Complete stage →' : 'Core criteria outstanding'}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
