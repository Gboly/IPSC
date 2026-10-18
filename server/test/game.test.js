import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

process.env.K17_SESSION_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'k17-'));
delete process.env.ANTHROPIC_API_KEY; // force offline reviewer
delete process.env.DEV_UNLOCK_ALL;

let server, base, sid;
before(async () => {
  const { app } = await import('../src/index.js');
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const api = async (method, url, body) => {
  const r = await fetch(base + url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, body: ct.includes('json') ? await r.json() : await r.text() };
};

test('campaign payload never leaks answer keys or hidden-issue labels', async () => {
  const { body } = await api('GET', '/api/campaign');
  const txt = JSON.stringify(body);
  assert.ok(!txt.includes('answerKey') && !txt.includes('Hidden registry') && !txt.includes('K17-03 2026-01-12'));
  assert.ok(!/unit inconsistency/i.test(txt), 'DQ rubric labels must be masked');
  assert.equal(body.stages.length, 17);
});

test('session starts with only PACK 00 released; later packs are 403', async () => {
  const r = await api('POST', '/api/sessions');
  sid = r.body.id;
  assert.deepEqual(Object.keys(r.body.packsReleased), ['00']);
  assert.equal((await api('GET', `/api/sessions/${sid}/packs/00`)).status, 200);
  assert.equal((await api('GET', `/api/sessions/${sid}/packs/02`)).status, 403);
  assert.equal((await api('GET', `/api/sessions/${sid}/packs/02/files/production_daily.csv`)).status, 403);
});

test('validation rejects empty and over-budget submissions before any AI call', async () => {
  const empty = await api('POST', `/api/sessions/${sid}/tasks/S0-T1/submit`, { answer: {} });
  assert.equal(empty.status, 400);
  const over = await api('POST', `/api/sessions/${sid}/tasks/S2-T2/submit`, { answer: { picks: ['A1', 'A2', 'A3', 'A4'], voi: 'x', skipped: 'y' } });
  assert.ok([400, 403].includes(over.status));
});

const T1 = { defs: 'The IPS is the whole chain from the reservoir through wells, chokes, flowlines, manifolds, the separator and export. The IPSC is the maximum sustainable capacity or ceiling the system can deliver under named constraint limits and a stated time basis.', problem: 'Find the real ceiling and what limits it.', three: 'Production optimisation tunes current settings; capacity determination finds the ceiling; economic optimisation maximises value (NPV), which can differ from the highest rate.' };
const T2 = { primary: 'D. Maximise net economic value', why: 'I choose NPV because water handling costs and the gas limit mean maximum total fluid or oil can destroy value; depletion and cost matter since a higher rate today may need capital.', boundary: 'Boundary: wellhead to separator plus gas sales, export and disposal.', metrics: 'Oil stb/d, gas, water bbl/d, uptime and utilisation.', refdate: 'Reference 2026-09-30, horizon 24 months (year 1-2).', assump: 'Assumption: steady state. Exclusion: reservoir simulation is not included; out of scope.' };

test('stage 0 flows through submit -> XP once -> gate -> complete -> PACK 01 unlocks', async () => {
  const a = await api('POST', `/api/sessions/${sid}/tasks/S0-T1/submit`, { answer: T1 });
  assert.equal(a.status, 200); assert.equal(a.body.aiMode, 'offline'); assert.ok(a.body.passed, JSON.stringify(a.body.criteria));
  const xp1 = a.body.xp;
  assert.ok(xp1 >= 15);
  const again = await api('POST', `/api/sessions/${sid}/tasks/S0-T1/submit`, { answer: T1 });
  assert.equal(again.body.xp, xp1, 'XP must not be awarded twice for the same criterion');
  assert.equal((await api('POST', `/api/sessions/${sid}/stages/S0/complete`)).status, 400, 'gate not met until T2 passes');
  const b = await api('POST', `/api/sessions/${sid}/tasks/S0-T2/submit`, { answer: T2 });
  assert.ok(b.body.passed, JSON.stringify(b.body.criteria));
  const done = await api('POST', `/api/sessions/${sid}/stages/S0/complete`);
  assert.equal(done.status, 200);
  assert.equal(done.body.session.currentStage, 'S1');
  assert.ok(done.body.session.packsReleased['01']);
  assert.ok(done.body.summary.stateRecord.decisions.length >= 2);
  assert.equal((await api('GET', `/api/sessions/${sid}/packs/01`)).status, 200);
});

test('calc check: cleaned value accepted, raw arithmetic over a dirty window flagged; truth not leaked on a miss', async () => {
  // DEV: jump the session to stage 3 so calc XP rules apply
  const f = path.join(process.env.K17_SESSION_DIR, `${sid}.json`);
  const s = JSON.parse(fs.readFileSync(f)); s.currentStage = 'S3'; s.packsReleased['02'] = '1.0'; fs.writeFileSync(f, JSON.stringify(s));
  const { loadData } = await import('../src/engine/data.js');
  const d = loadData();
  // window containing the K17-03 unit error and the K17-05 duplicate-free days
  const from = '2026-01-08', to = '2026-01-20';
  const sum = (rows, k) => rows.filter((r) => r.date >= from && r.date <= to).reduce((a, r) => a + r[k], 0);
  const days = 13;
  const truth = sum(d.clean, 'oil') / days, naive = sum(d.dirty, 'oil') / days;
  assert.ok(Math.abs(naive - truth) / truth > 0.02, 'planted unit error must be material in this window');
  const ok = await api('POST', `/api/sessions/${sid}/calc/check`, { metric: 'field_oil_rate', from, to, value: truth });
  assert.ok(ok.body.correct && ok.body.xp === 10);
  const ok2 = await api('POST', `/api/sessions/${sid}/calc/check`, { metric: 'field_oil_rate', from, to, value: truth });
  assert.equal(ok2.body.xp, 0, 'calc XP only once per metric');
  const trap = await api('POST', `/api/sessions/${sid}/calc/check`, { metric: 'field_oil_rate', from, to, value: naive });
  assert.ok(!trap.body.correct && trap.body.matchesNaive && trap.body.expected === undefined);
  assert.equal((await api('POST', `/api/sessions/${sid}/calc/check`, { metric: 'field_oil_rate', from: '2030-01-01', to: '2030-01-02', value: 1 })).status, 400);
});

test('engine truth reconciles: sum of wells vs separator within meter bias before the meter step', async () => {
  const { loadData } = await import('../src/engine/data.js');
  const d = loadData();
  const pre = (rows, k, from, to) => rows.filter((r) => r.date >= from && r.date <= to).reduce((a, r) => a + r[k], 0);
  const wells = pre(d.clean, 'oil', '2025-05-01', '2026-03-31');
  const sep = d.fieldDaily.filter((r) => r.date >= '2025-05-01' && r.date <= '2026-03-31').reduce((a, r) => a + r.sep_oil_stb, 0);
  assert.ok(Math.abs(sep / wells - 1) < 0.01, `pre-step ratio ${sep / wells}`);
  const wells2 = pre(d.clean, 'oil', '2026-05-01', '2026-09-30');
  const sep2 = d.fieldDaily.filter((r) => r.date >= '2026-05-01').reduce((a, r) => a + r.sep_oil_stb, 0);
  assert.ok(sep2 / wells2 > 1.025 && sep2 / wells2 < 1.04, `post-step ratio ${sep2 / wells2}`);
  // every planted issue is present in the released rows
  const dirty = d.dirty;
  assert.equal(dirty.filter((r) => r.well === 'K17-05' && r.date === '2026-02-18').length, 2);
  assert.equal(dirty.filter((r) => r.well === 'K17-07' && r.date >= '2025-12-02' && r.date <= '2025-12-07').length, 0);
  assert.ok(dirty.some((r) => r.well === 'K17-06' && r.whp === 9999));
  // physical consistency of the truth rows: non-negative, oil+water > 0 only when hours > 0
  for (const r of d.clean) { assert.ok(r.oil >= 0 && r.water >= 0 && r.gas >= 0); if (r.hours === 0) assert.ok(r.oil === 0 && r.water === 0); }
});

test('nodal workbench is locked before stage 5', async () => {
  const r = await api('POST', `/api/sessions/${sid}/workbench/nodal`, { well: 'K17-01' });
  assert.equal(r.status, 403);
});
