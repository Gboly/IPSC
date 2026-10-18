// Session store and game rules (XP, gates, achievements, state record).
//
// Storage backends (picked from the environment, see storageMode()):
//   redis     - Upstash Redis REST API (KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN). Use this on Vercel.
//   file      - JSON files in K17_SESSION_DIR or server/data/sessions (local development, tests).
//   ephemeral - JSON files in /tmp on a serverless host with no Redis configured: works, but sessions are lost
//               whenever the function instance is recycled. /api/health reports this so the UI can warn.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { STAGES, STAGE_BY_ID, TASK_BY_ID, ACHIEVEMENTS } from './stages.js';
import { packIdsForStage } from './packs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export function storageMode() {
  if (REDIS_URL && REDIS_TOKEN) return 'redis';
  return SERVERLESS && !process.env.K17_SESSION_DIR ? 'ephemeral' : 'file';
}

const cleanId = (id) => String(id).replace(/[^a-z0-9-]/gi, '');

async function redis(cmd) {
  const r = await fetch(REDIS_URL, { method: 'POST', headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(cmd) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new Error(`Session store error: ${body.error || r.status}`);
  return body.result;
}

let dirReady = false;
function sessionDir() {
  const dir = process.env.K17_SESSION_DIR || (storageMode() === 'ephemeral' ? path.join(os.tmpdir(), 'k17-sessions') : path.join(__dirname, '../../data/sessions'));
  if (!dirReady) { fs.mkdirSync(dir, { recursive: true }); dirReady = true; }
  return dir;
}
const file = (id) => path.join(sessionDir(), `${cleanId(id)}.json`);

export async function createSession() {
  const id = crypto.randomUUID();
  const s = {
    id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    xp: 0, xpLog: [], awarded: {}, met: {}, achievements: [],
    currentStage: 'S0', completedStages: [], stageSummaries: {},
    packsReleased: { '00': '1.0' },
    drafts: {}, submissions: {}, taskStatus: {}, hints: {},
    decisions: [], notebook: { notes: '', calcs: [] }, chat: [], calcChecks: [],
  };
  await save(s);
  return s;
}

export async function loadSession(id) {
  if (storageMode() === 'redis') {
    const raw = await redis(['GET', `k17:session:${cleanId(id)}`]);
    return raw ? JSON.parse(raw) : null;
  }
  try {
    return JSON.parse(fs.readFileSync(file(id), 'utf8'));
  } catch {
    return null;
  }
}

export async function save(s) {
  s.updatedAt = new Date().toISOString();
  if (storageMode() === 'redis') await redis(['SET', `k17:session:${cleanId(s.id)}`, JSON.stringify(s)]);
  else fs.writeFileSync(file(s.id), JSON.stringify(s, null, 2));
}

// ---------------------------------------------------------------------------------------------
export function stageIndex(id) {
  return STAGES.findIndex((s) => s.id === id);
}

export function isStageUnlocked(s, stageId) {
  return stageIndex(stageId) <= stageIndex(s.currentStage);
}

export function packsVisible(s) {
  return Object.keys(s.packsReleased);
}

export function releasePacksForStage(s, stageId) {
  for (const p of packIdsForStage(stageId)) if (!s.packsReleased[p]) s.packsReleased[p] = '1.0';
}

/** Render a submission as readable text for the reviewer and the notebook. */
export function answerToText(task, answer) {
  const out = [];
  for (const f of task.fields || []) {
    const v = answer?.[f.key];
    out.push(`### ${f.label}`);
    if (f.kind === 'table') {
      const rows = (v || []).filter((r) => Object.values(r).some((x) => String(x || '').trim()));
      if (!rows.length) out.push('(empty)');
      else {
        out.push('| ' + f.columns.map((c) => c.label).join(' | ') + ' |');
        out.push('|' + f.columns.map(() => '---').join('|') + '|');
        for (const r of rows) out.push('| ' + f.columns.map((c) => String(r[c.key] ?? '').replace(/\|/g, '/').replace(/\n/g, ' ')).join(' | ') + ' |');
      }
    } else if (f.kind === 'budget') {
      const chosen = (v || []).map((id) => f.options.find((o) => o.id === id)).filter(Boolean);
      const total = chosen.reduce((a, o) => a + o.cost, 0);
      out.push(chosen.length ? chosen.map((o) => `- ${o.label} (${o.cost})`).join('\n') + `\nTotal: ${total}/${f.budget}` : '(none selected)');
    } else if (f.kind === 'rank') {
      out.push((v || f.items).map((x, i) => `${i + 1}. ${x}`).join('\n'));
    } else out.push(String(v ?? '').trim() || '(empty)');
  }
  return out.join('\n');
}

/** Validate structural requirements before spending an AI call. */
export function validateAnswer(task, answer) {
  for (const f of task.fields || []) {
    const v = answer?.[f.key];
    if (f.kind === 'budget') {
      const total = (v || []).reduce((a, id) => a + (f.options.find((o) => o.id === id)?.cost || 0), 0);
      if (total > f.budget) return `Over budget: ${total}/${f.budget} effort points.`;
      if (!(v || []).length) return 'Select at least one acquisition.';
    }
    if (f.kind === 'table' && f.minRows) {
      const rows = (v || []).filter((r) => Object.values(r).some((x) => String(x || '').trim()));
      if (rows.length < f.minRows) return `"${f.label}" needs at least ${f.minRows} filled rows (you have ${rows.length}).`;
    }
    if ((f.kind === 'text' || f.kind === 'textarea') && !String(v || '').trim() && task.fields.length === 1) return `Please fill in "${f.label}".`;
  }
  const filled = (task.fields || []).filter((f) => ['text', 'textarea', 'choice'].includes(f.kind) && String(answer?.[f.key] || '').trim()).length;
  const textFields = (task.fields || []).filter((f) => ['text', 'textarea', 'choice'].includes(f.kind)).length;
  if (textFields > 0 && filled === 0 && !(task.fields || []).some((f) => ['table', 'budget'].includes(f.kind))) return 'Nothing to review yet — fill in at least one field.';
  return null;
}

/** Apply a structured review to the session: XP, achievements, gate. Idempotent per criterion. */
export function applyReview(s, task, review) {
  const gained = [];
  for (const c of review.criteria || []) {
    const def = task.rubric.find((r) => r.id === c.id);
    if (!def || !c.met) continue;
    s.met[def.id] = true;
    if (!s.awarded[def.id] && def.xp > 0) {
      s.awarded[def.id] = true;
      s.xp += def.xp;
      gained.push({ id: def.id, xp: def.xp, label: def.label });
      s.xpLog.push({ at: new Date().toISOString(), task: task.id, criterion: def.id, xp: def.xp });
    }
    if (def.ach && !s.achievements.includes(def.ach)) s.achievements.push(def.ach);
  }
  const core = task.rubric.filter((r) => r.core);
  const passed = core.length ? core.every((r) => s.met[r.id]) : task.rubric.every((r) => s.met[r.id]);
  s.taskStatus[task.id] = passed ? 'passed' : 'in-progress';
  return { gained, passed };
}

export function stageProgress(s, stageId) {
  const st = STAGE_BY_ID[stageId];
  const tasks = st.tasks.map((t) => ({ id: t.id, status: s.taskStatus[t.id] || 'todo' }));
  const allPassed = st.tasks.length > 0 && tasks.every((t) => t.status === 'passed');
  return { tasks, allPassed };
}

/** Complete the current stage: summary + state record, unlock the next stage's packs. */
export function completeStage(s, stageId) {
  const st = STAGE_BY_ID[stageId];
  const prog = stageProgress(s, stageId);
  if (!prog.allPassed) throw new Error('Stage gate not met: every task needs its core criteria satisfied.');
  if (s.completedStages.includes(stageId)) return s.stageSummaries[stageId];

  const criteria = st.tasks.flatMap((t) => t.rubric);
  const stageXp = criteria.filter((c) => s.awarded[c.id]).reduce((a, c) => a + c.xp, 0);
  const comps = [...new Set(criteria.filter((c) => s.met[c.id] && c.comp).map((c) => c.comp))];
  const unmet = criteria.filter((c) => !s.met[c.id] && c.xp > 0);
  const achievements = [...new Set(criteria.filter((c) => s.met[c.id] && c.ach).map((c) => c.ach))].map((k) => ({ key: k, ...ACHIEVEMENTS[k] }));
  const idx = stageIndex(stageId);
  const next = STAGES[idx + 1];
  s.completedStages.push(stageId);
  if (next) {
    s.currentStage = next.id;
    releasePacksForStage(s, next.id);
  }
  const summary = {
    stage: stageId, title: st.title, stageXp, cumulativeXp: s.xp,
    completedMissions: st.tasks.map((t) => t.title), achievements, competencies: comps,
    lessonsForPractice: unmet.map((c) => c.id.startsWith('DQ-') ? 'A data-quality issue you did not find (revisit the data later)' : c.id.startsWith('S') ? 'Bonus-level reasoning point not yet shown in this stage' : 'Unfound item'),
    outstanding: unmet.length ? [`${unmet.length} optional XP item(s) remain; you can still resubmit tasks to earn them.`] : [],
    nextMission: next ? `${next.id}: ${next.title}${next.implemented ? '' : ' (stub — not yet implemented in this build)'}` : 'Campaign complete',
    stateRecord: stateRecord(s),
  };
  s.stageSummaries[stageId] = summary;
  return summary;
}

export function stateRecord(s) {
  return {
    campaign: 'K-17 IPSC Simulation (SIMULATION ONLY — FICTIONAL FIELD — SYNTHETIC DATA)', exportedAt: new Date().toISOString(),
    sessionId: s.id, currentStage: s.currentStage, completedStages: s.completedStages, xp: s.xp, achievements: s.achievements,
    packsReleased: s.packsReleased, referenceDate: '2026-09-30',
    decisions: s.decisions, criteriaMet: Object.keys(s.met), calcChecks: s.calcChecks.slice(-30),
    notebook: s.notebook,
  };
}

/** Log a decision (for the decision log). */
export function logDecision(s, task, answerText, review) {
  s.decisions.push({
    at: new Date().toISOString(), stage: task.stageId, task: task.id, title: task.title,
    answer: answerText.slice(0, 4000), decisionQuality: review.decision_quality, summary: (review.feedback || '').slice(0, 600),
  });
  if (s.decisions.length > 200) s.decisions.shift();
}

export function publicSession(s) {
  const { chat, ...rest } = s;
  return { ...rest, stageProgress: Object.fromEntries(STAGES.filter((x) => x.tasks.length).map((x) => [x.id, stageProgress(s, x.id)])), chatCount: chat.length };
}

export { TASK_BY_ID };
