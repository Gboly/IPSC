import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';

import { STAGES, STAGE_BY_ID, TASK_BY_ID, LEVELS, ACHIEVEMENTS, publicStage } from './game/stages.js';
import { getPack, getPackCsv, packIndex, BANNER } from './game/packs.js';
import * as S from './game/session.js';
import { aiMode, MODEL, reviewSubmission, giveHint, supervisorChat, offlineReview, offlineHint } from './ai/claude.js';
import { checkMetric, checkEventLoss, METRICS, loadData } from './engine/data.js';
import { WELLS, wellState, wellCurves, PVT } from './engine/field.js';
import { dayIndex } from './engine/generate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const DEV_UNLOCK = process.env.DEV_UNLOCK_ALL === '1';
// Promise.resolve().then() so errors thrown synchronously also become JSON responses, not Express HTML pages.
const wrap = (fn) => (req, res) => Promise.resolve().then(() => fn(req, res)).catch((e) => {
  console.error('[err]', req.method, req.path, e.message);
  res.status(e.status || 500).json({ error: e.message });
});
const sess = async (req) => {
  const s = await S.loadSession(req.params.sid);
  if (!s) throw Object.assign(new Error('Unknown session'), { status: 404 });
  return s;
};

app.get('/api/health', (_req, res) => res.json({ ok: true, ai: aiMode(), model: MODEL, devUnlock: DEV_UNLOCK, storage: S.storageMode(), banner: BANNER }));

app.get('/api/campaign', (_req, res) => res.json({ banner: BANNER, levels: LEVELS, achievements: ACHIEVEMENTS, stages: STAGES.map(publicStage), metrics: METRICS, packs: packIndex() }));

// ----------------------------------------------------------------------------- sessions
app.post('/api/sessions', wrap(async (_req, res) => res.json(S.publicSession(await S.createSession()))));
app.get('/api/sessions/:sid', wrap(async (req, res) => res.json(S.publicSession(await sess(req)))));

// ----------------------------------------------------------------------------- data room
app.get('/api/sessions/:sid/packs/:pid', wrap(async (req, res) => {
  const s = await sess(req);
  if (!DEV_UNLOCK && !S.packsVisible(s).includes(req.params.pid)) return res.status(403).json({ error: 'This pack has not been released yet.' });
  const p = getPack(req.params.pid);
  if (!p) return res.status(404).json({ error: 'Unknown pack' });
  res.json(p);
}));
app.get('/api/sessions/:sid/packs/:pid/files/:file', wrap(async (req, res) => {
  const s = await sess(req);
  if (!DEV_UNLOCK && !S.packsVisible(s).includes(req.params.pid)) return res.status(403).json({ error: 'This pack has not been released yet.' });
  const csv = getPackCsv(req.params.pid, req.params.file);
  if (csv === null) return res.status(404).json({ error: 'Unknown file' });
  res.type('text/csv').set('Content-Disposition', `attachment; filename="K17_PACK${req.params.pid}_${req.params.file}"`).send(csv);
}));

// ----------------------------------------------------------------------------- tasks
app.put('/api/sessions/:sid/tasks/:tid/draft', wrap(async (req, res) => {
  const s = await sess(req);
  if (!TASK_BY_ID[req.params.tid]) return res.status(404).json({ error: 'Unknown task' });
  s.drafts[req.params.tid] = req.body.answer || {};
  await S.save(s);
  res.json({ ok: true });
}));

app.post('/api/sessions/:sid/tasks/:tid/submit', wrap(async (req, res) => {
  const s = await sess(req);
  const task = TASK_BY_ID[req.params.tid];
  if (!task) return res.status(404).json({ error: 'Unknown task' });
  const stage = STAGE_BY_ID[task.stageId];
  if (!DEV_UNLOCK && !S.isStageUnlocked(s, task.stageId)) return res.status(403).json({ error: 'Stage not unlocked yet.' });
  const answer = req.body.answer || {};
  const bad = S.validateAnswer(task, answer);
  if (bad) return res.status(400).json({ error: bad });

  const answerText = S.answerToText(task, answer);
  s.drafts[task.id] = answer;
  const priorMet = task.rubric.filter((c) => s.met[c.id]).map((c) => c.id);
  const decisionsSummary = s.decisions.slice(-6).map((d) => `${d.task}: ${d.answer.slice(0, 200).replace(/\n/g, ' ')}`).join('\n');

  let review;
  if (aiMode() === 'live') {
    try {
      review = await reviewSubmission({ stage, task, answerText, releasedPacks: S.packsVisible(s), priorMet, decisionsSummary });
    } catch (e) {
      return res.status(502).json({ error: `AI review failed: ${e.message}` });
    }
  } else review = offlineReview({ task, answerText });

  const { gained, passed } = S.applyReview(s, task, review);
  (s.submissions[task.id] ||= []).push({ at: new Date().toISOString(), answer, aiMode: aiMode(), decisionQuality: review.decision_quality, feedback: review.feedback, gained: gained.map((g) => g.id) });
  S.logDecision(s, task, answerText, review);
  await S.save(s);

  // Only unfound-issue counts leak, never identities.
  const remaining = task.rubric.filter((c) => c.id.startsWith('DQ-') && !s.met[c.id]).length;
  res.json({
    aiMode: aiMode(), passed, gained, xp: s.xp, decisionQuality: review.decision_quality, feedback: review.feedback, challenge: review.challenge_question, gaps: review.gaps,
    criteria: review.criteria.map((c) => ({ id: c.id, met: !!c.met || !!s.met[c.id], evidence: c.met ? c.evidence : undefined })),
    hiddenIssuesRemaining: task.id === 'S3-T1' ? remaining : undefined,
    achievements: s.achievements, taskStatus: s.taskStatus[task.id],
  });
}));

app.post('/api/sessions/:sid/tasks/:tid/hint', wrap(async (req, res) => {
  const s = await sess(req);
  const task = TASK_BY_ID[req.params.tid];
  if (!task) return res.status(404).json({ error: 'Unknown task' });
  const level = Math.min(3, (s.hints[task.id] || 0) + 1);
  s.hints[task.id] = level;
  const answerText = S.answerToText(task, req.body.answer || s.drafts[task.id] || {});
  let hint;
  if (aiMode() === 'live') {
    try {
      hint = await giveHint({ stage: STAGE_BY_ID[task.stageId], task, level, answerText });
    } catch (e) {
      s.hints[task.id] = level - 1;
      return res.status(502).json({ error: `Hint failed: ${e.message}` });
    }
  } else hint = offlineHint(level);
  await S.save(s);
  res.json({ level, hint, aiMode: aiMode() });
}));

// ----------------------------------------------------------------------------- calculations
app.post('/api/sessions/:sid/calc/check', wrap(async (req, res) => {
  const s = await sess(req);
  const r = checkMetric(req.body);
  if (r.error) return res.status(400).json(r);
  s.calcChecks.push({ at: new Date().toISOString(), ...r, expected: undefined });
  // XP: the first correct check for each metric type earns 10 XP, capped to stage-3 maths
  const key = `calc:${r.metric}`;
  let xp = 0;
  if (r.correct && !s.awarded[key] && S.stageIndex(s.currentStage) >= S.stageIndex('S3')) {
    s.awarded[key] = true;
    xp = 10;
    s.xp += xp;
    s.xpLog.push({ at: new Date().toISOString(), task: 'calc', criterion: key, xp });
  }
  await S.save(s);
  res.json({ ...r, xp });
}));

app.post('/api/sessions/:sid/calc/event-loss', wrap(async (req, res) => {
  const s = await sess(req);
  if (!DEV_UNLOCK && S.stageIndex(s.currentStage) < S.stageIndex('S4')) return res.status(403).json({ error: 'Pack 06 is not released yet.' });
  const r = checkEventLoss(req.body);
  if (r.error) return res.status(400).json(r);
  const key = `loss:${r.eventRef}`;
  let xp = 0;
  if (r.correct && !s.awarded[key]) {
    s.awarded[key] = true;
    xp = 10;
    s.xp += xp;
    s.xpLog.push({ at: new Date().toISOString(), task: 'calc', criterion: key, xp });
  }
  s.calcChecks.push({ at: new Date().toISOString(), metric: 'event_loss', ...r });
  await S.save(s);
  res.json({ ...r, xp });
}));

app.get('/api/sessions/:sid/calc/metrics', (_req, res) => res.json(METRICS));

// ----------------------------------------------------------------------------- notebook / chat / export
app.put('/api/sessions/:sid/notebook', wrap(async (req, res) => {
  const s = await sess(req);
  s.notebook.notes = String(req.body.notes ?? s.notebook.notes).slice(0, 50000);
  if (Array.isArray(req.body.calcs)) s.notebook.calcs = req.body.calcs.slice(-200);
  await S.save(s);
  res.json({ ok: true });
}));

app.post('/api/sessions/:sid/chat', wrap(async (req, res) => {
  const s = await sess(req);
  const message = String(req.body.message || '').slice(0, 4000);
  if (!message.trim()) return res.status(400).json({ error: 'Empty message' });
  let reply;
  if (aiMode() === 'live') {
    try {
      const packs = S.packsVisible(s).map((p) => `${p}`).join(', ');
      reply = await supervisorChat({ session: s, stage: STAGE_BY_ID[s.currentStage], history: s.chat, message, packSummaries: packs });
    } catch (e) {
      return res.status(502).json({ error: `Chat failed: ${e.message}` });
    }
  } else reply = '_Offline mode: set `ANTHROPIC_API_KEY` in `.env` to talk to the supervisor._';
  s.chat.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
  await S.save(s);
  res.json({ reply, chat: s.chat.slice(-40) });
}));
app.get('/api/sessions/:sid/chat', wrap(async (req, res) => res.json((await sess(req)).chat.slice(-40))));

app.get('/api/sessions/:sid/state-record', wrap(async (req, res) => {
  const s = await sess(req);
  res.type('application/json').set('Content-Disposition', 'attachment; filename="k17-state-record.json"').send(JSON.stringify(S.stateRecord(s), null, 2));
}));

app.post('/api/sessions/:sid/stages/:stid/complete', wrap(async (req, res) => {
  const s = await sess(req);
  if (s.currentStage !== req.params.stid) return res.status(400).json({ error: 'That is not your current stage.' });
  try {
    const summary = S.completeStage(s, req.params.stid);
    await S.save(s);
    res.json({ summary, session: S.publicSession(s) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}));

// ----------------------------------------------------------------------------- workbench: nodal (gated to Stage 5+)
app.post('/api/sessions/:sid/workbench/nodal', wrap(async (req, res) => {
  const s = await sess(req);
  if (!DEV_UNLOCK && S.stageIndex(s.currentStage) < S.stageIndex('S5')) return res.status(403).json({ error: 'The nodal workbench unlocks at Stage 5 (well performance).' });
  const { well, date = '2026-09-30', chokeS, manifoldPsig = 170, restriction, jMult } = req.body;
  const w = WELLS.find((x) => x.id === well);
  if (!w) return res.status(400).json({ error: 'Unknown well' });
  const t = dayIndex(date);
  const st = wellState(w, t);
  const opts = {};
  if (chokeS) opts.choke = Number(chokeS);
  if (restriction !== undefined) opts.restriction = Number(restriction);
  if (jMult) opts.jMult = Number(jMult);
  const out = wellCurves(w, st, Number(manifoldPsig) + 14.7, opts);
  res.json({ well, date, state: { pr: st.pr, wc: st.wc, gor: st.gor, pb: st.pb }, ...out, notes: ['Screening-level model: homogeneous no-slip multiphase flow, constant Z, Gilbert choke correlation.', 'Pressures psia. q is liquid rate (stb/d).'] });
}));

// ----------------------------------------------------------------------------- static client
const dist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  // API-only deployment (e.g. the backend project on Vercel): say so instead of "Cannot GET /".
  app.get('/', (_req, res) => res.json({ ok: true, service: 'K-17 IPSC API', health: '/api/health' }));
}

export default app;

const PORT = process.env.PORT || 8787;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loadData(); // generates the history on first run
  app.listen(PORT, () => console.log(`K-17 server on http://localhost:${PORT}  (AI: ${aiMode()}, model ${MODEL}${DEV_UNLOCK ? ', DEV_UNLOCK_ALL' : ''})`));
}
