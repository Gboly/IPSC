export default function Sidebar({ camp, session, viewStage, onPick }) {
  const cur = camp.stages.findIndex((s) => s.id === session.currentStage);
  return (
    <aside className="side" aria-label="Campaign map">
      <h4>Campaign map</h4>
      {camp.levels.map((lv) => {
        const stages = camp.stages.filter((s) => s.level === lv.n);
        return (
          <div className="level" key={lv.n}>
            <div className="level-title">L{lv.n} {lv.title}</div>
            <div className="small muted" style={{ padding: '0 6px 4px' }}>{lv.blurb}</div>
            {stages.map((s) => {
              const idx = camp.stages.findIndex((x) => x.id === s.id);
              const done = session.completedStages.includes(s.id);
              const unlocked = idx <= cur;
              return (
                <button key={s.id} className={'stage-btn' + (viewStage === s.id ? ' active' : '')} disabled={!unlocked} onClick={() => onPick(s.id)} title={unlocked ? s.mission : 'Locked until the previous stage is completed'}>
                  <span className={'dot' + (done ? ' done' : s.id === session.currentStage ? ' cur' : '')}>{done ? '✓' : unlocked ? '' : '🔒'}</span>
                  <span>{s.id.replace('S', '')}. {s.title}{!s.implemented && <span className="muted"> (stub)</span>}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}
