import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Sidebar from './components/Sidebar.jsx';
import Mission from './components/Mission.jsx';
import DataRoom from './components/DataRoom.jsx';
import Workbench from './components/Workbench.jsx';
import Notebook from './components/Notebook.jsx';
import Supervisor from './components/Supervisor.jsx';
import CompleteModal from './components/CompleteModal.jsx';

const TABS = [['mission', 'Mission'], ['data', 'Data room'], ['bench', 'Workbench'], ['notebook', 'Notebook'], ['sup', 'Supervisor']];

export default function App() {
  const [health, setHealth] = useState(null);
  const [camp, setCamp] = useState(null);
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('mission');
  const [viewStage, setViewStage] = useState(null);
  const [dataPack, setDataPack] = useState(null);
  const [summary, setSummary] = useState(null);
  const [toast, setToast] = useState('');
  const [fatal, setFatal] = useState('');

  const refresh = useCallback(async () => {
    const sid = localStorage.getItem('k17-sid');
    if (!sid) return;
    setSession(await api.session(sid));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [h, c] = await Promise.all([api.health(), api.campaign()]);
        setHealth(h); setCamp(c);
        let sid = null;
        try { sid = localStorage.getItem('k17-sid'); } catch {}
        let s = null;
        if (sid) { try { s = await api.session(sid); } catch { s = null; } }
        if (!s) { s = await api.newSession(); try { localStorage.setItem('k17-sid', s.id); } catch {} }
        setSession(s); setViewStage(s.currentStage);
      } catch (e) { setFatal(e.message); }
    })();
  }, []);

  const toastMsg = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };
  const newCampaign = async () => {
    if (!confirm('Start a brand-new campaign? Your current session stays on disk but this browser will switch to the new one.')) return;
    const s = await api.newSession();
    try { localStorage.setItem('k17-sid', s.id); } catch {}
    setSession(s); setViewStage(s.currentStage); setTab('mission');
  };
  const complete = async (stid) => {
    try { const r = await api.complete(session.id, stid); setSummary(r.summary); setSession(r.session); setViewStage(r.session.currentStage); } catch (e) { toastMsg(e.message); }
  };

  if (fatal) return <div className="main"><div className="err">Cannot reach the game server: {fatal}. Locally, check that <code>npm run dev</code> is running; on a hosted site, check that the backend deployment is up and that <code>/api</code> requests reach it.</div></div>;
  if (!camp || !session) return <div className="main muted">Loading campaign…</div>;

  const stage = camp.stages.find((s) => s.id === (viewStage || session.currentStage));
  const notebook = session.notebook;
  const setNotebook = (nb) => setSession((s) => ({ ...s, notebook: nb }));
  const saveCalcs = (calcs) => { setNotebook({ ...notebook, calcs }); api.notebook(session.id, { calcs }); };

  return (
    <>
      <div className="sim-banner" role="note">{camp.banner}</div>
      <div className="app">
        <header className="topbar">
          <div className="brand"><svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#161b22" /><path d="M16 5c4 6 7 9 7 13a7 7 0 0 1-14 0c0-4 3-7 7-13z" fill="#f2a93b" /></svg><span>K-17 IPSC Simulation</span></div>
          <span className="chip info">Stage {session.currentStage.replace('S', '')} of 16</span>
          <span className="spacer" />
          <span className={'chip ' + (health.ai === 'live' ? 'ok' : 'bad')} title={health.ai === 'live' ? 'Reviews, hints and chat are generated live by Claude' : 'No ANTHROPIC_API_KEY on the server: keyword rubric only'}>{health.ai === 'live' ? `AI live · ${health.model}` : 'AI OFFLINE · keyword rubric'}</span>
          {health.storage === 'ephemeral' && <span className="chip bad" title="The server has no persistent session store configured, so progress can disappear at any time. Configure Redis (Upstash) on the backend.">Progress not saved permanently</span>}
          <span className="chip accent" title="Experience points: a motivational device, not a competency certificate">XP <span className="xp">{session.xp}</span></span>
          <button className="btn sm" onClick={newCampaign}>New campaign</button>
        </header>

        <Sidebar camp={camp} session={session} viewStage={viewStage} onPick={(id) => { setViewStage(id); setTab('mission'); }} />

        <main className="main">
          <nav className="tabs" aria-label="Sections">{TABS.map(([k, label]) => <button key={k} className={'tab' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>{label}</button>)}</nav>
          {tab === 'mission' && <Mission stage={stage} session={session} refresh={refresh} onComplete={complete} onToast={toastMsg} goTab={(t, p) => { setTab(t); if (p) setDataPack(p); }} />}
          {tab === 'data' && <DataRoom camp={camp} session={session} initialPack={dataPack} />}
          {tab === 'bench' && <Workbench camp={camp} session={session} notebook={notebook} saveCalcs={saveCalcs} refresh={refresh} onToast={toastMsg} devUnlock={health.devUnlock} />}
          {tab === 'notebook' && <Notebook camp={camp} session={session} notebook={notebook} setNotebook={setNotebook} />}
          {tab === 'sup' && <Supervisor session={session} health={health} stage={camp.stages.find((s) => s.id === session.currentStage)} />}
        </main>
      </div>
      {summary && <CompleteModal summary={summary} onClose={() => { setSummary(null); setTab('mission'); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
