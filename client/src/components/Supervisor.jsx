import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Md from './Md.jsx';

export default function Supervisor({ session, health, stage }) {
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef();
  useEffect(() => { api.chatHistory(session.id).then(setChat).catch(() => {}); }, [session.id]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat.length, busy]);
  const send = async () => {
    const m = msg.trim(); if (!m || busy) return;
    setMsg(''); setErr(''); setBusy(true); setChat((c) => [...c, { role: 'user', content: m }]);
    try { const r = await api.chat(session.id, m); setChat(r.chat); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div>
      <h2>Supervisor</h2>
      <p className="muted">Ask about concepts, methods, or how to approach {stage.id}. I coach rather than hand over answers, and I only discuss data you have been given.{health.ai === 'offline' && <b> (Offline mode: no API key.)</b>}</p>
      <div className="card">
        <div className="chat" aria-live="polite">
          {chat.length === 0 && <div className="muted">Try: “What's the difference between a calendar-day average and an on-stream rate?”</div>}
          {chat.map((m, i) => <div key={i} className={'bubble ' + m.role}><Md>{m.content}</Md></div>)}
          {busy && <div className="bubble assistant muted">Thinking…</div>}
          <div ref={end} />
        </div>
        {err && <div className="err">{err}</div>}
        <div className="row" style={{ marginTop: 10 }}>
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask your supervisor…  (Enter to send)" style={{ flex: 1, minHeight: 44 }} />
          <button className="btn primary" onClick={send} disabled={busy}>Send</button>
        </div>
      </div>
    </div>
  );
}
