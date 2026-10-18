// Thin fetch wrapper. All secrets and hidden game data stay on the server.
async function call(method, url, body) {
  const r = await fetch(url, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!r.ok) throw Object.assign(new Error(data?.error || r.statusText), { status: r.status, data });
  return data;
}
export const api = {
  health: () => call('GET', '/api/health'),
  campaign: () => call('GET', '/api/campaign'),
  newSession: () => call('POST', '/api/sessions'),
  session: (sid) => call('GET', `/api/sessions/${sid}`),
  pack: (sid, pid) => call('GET', `/api/sessions/${sid}/packs/${pid}`),
  packFileUrl: (sid, pid, f) => `/api/sessions/${sid}/packs/${pid}/files/${f}`,
  packFileText: (sid, pid, f) => fetch(`/api/sessions/${sid}/packs/${pid}/files/${f}`).then((r) => (r.ok ? r.text() : Promise.reject(new Error('download failed')))),
  saveDraft: (sid, tid, answer) => call('PUT', `/api/sessions/${sid}/tasks/${tid}/draft`, { answer }),
  submit: (sid, tid, answer) => call('POST', `/api/sessions/${sid}/tasks/${tid}/submit`, { answer }),
  hint: (sid, tid, answer) => call('POST', `/api/sessions/${sid}/tasks/${tid}/hint`, { answer }),
  calcCheck: (sid, body) => call('POST', `/api/sessions/${sid}/calc/check`, body),
  eventLoss: (sid, body) => call('POST', `/api/sessions/${sid}/calc/event-loss`, body),
  nodal: (sid, body) => call('POST', `/api/sessions/${sid}/workbench/nodal`, body),
  notebook: (sid, body) => call('PUT', `/api/sessions/${sid}/notebook`, body),
  chat: (sid, message) => call('POST', `/api/sessions/${sid}/chat`, { message }),
  chatHistory: (sid) => call('GET', `/api/sessions/${sid}/chat`),
  complete: (sid, stid) => call('POST', `/api/sessions/${sid}/stages/${stid}/complete`),
  stateRecordUrl: (sid) => `/api/sessions/${sid}/state-record`,
};
