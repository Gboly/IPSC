// Verifies the LIVE-AI code path (request shape + parsing) against a local mock of the Anthropic
// Messages API. This tests our integration, not model quality. Run in its own process.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const seen = [];
let mock, app, server, base, sid;

before(async () => {
  mock = http.createServer((req, res) => {
    let b = ''; req.on('data', (c) => (b += c));
    req.on('end', () => {
      const body = JSON.parse(b); seen.push({ url: req.url, headers: req.headers, body });
      let content;
      if (body.tool_choice?.name === 'submit_review') {
        const ids = [...body.messages[0].content.matchAll(/^- (S\d+-T\d+-[a-z]|DQ-\d)(?= \()/gm)].map((m) => m[1]);
        content = [{ type: 'tool_use', id: 'tu_1', name: 'submit_review', input: { criteria: ids.map((id, i) => ({ id, met: i % 2 === 0, evidence: 'mock' })), decision_quality: 'reasonable_on_evidence', feedback: 'Mock feedback.', challenge_question: 'Mock question?', gaps: ['Mock gap'] } }];
      } else content = [{ type: 'text', text: 'Mock text reply.' }];
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ id: 'msg_1', type: 'message', role: 'assistant', model: body.model, content, stop_reason: body.tool_choice ? 'tool_use' : 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 } }));
    });
  });
  await new Promise((r) => mock.listen(0, r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${mock.address().port}`;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.K17_SESSION_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'k17live-'));
  ({ app } = await import('../src/index.js'));
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); mock.close(); });

const api = async (m, u, b) => { const r = await fetch(base + u, { method: m, headers: { 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await r.json() }; };

test('live mode: review uses forced tool call, sends rubric + answer key server-side only, applies XP once', async () => {
  assert.equal((await api('GET', '/api/health')).body.ai, 'live');
  sid = (await api('POST', '/api/sessions')).body.id;
  const r = await api('POST', `/api/sessions/${sid}/tasks/S0-T1/submit`, { answer: { defs: 'IPS...', problem: 'p', three: 't' } });
  assert.equal(r.status, 200); assert.equal(r.body.aiMode, 'live');
  assert.equal(r.body.feedback, 'Mock feedback.');
  const call = seen.find((c) => c.body.tool_choice);
  assert.equal(call.url, '/v1/messages');
  assert.equal(call.headers['x-api-key'], 'test-key');
  assert.equal(call.body.tools[0].name, 'submit_review');
  assert.ok(call.body.system.includes('FICTIONAL, SYNTHETIC'));
  assert.ok(call.body.messages[0].content.includes('HIDDEN ANSWER KEY'));
  assert.ok(call.body.messages[0].content.includes('DATA PACKS RELEASED TO THE LEARNER: 00'));
  // mock marks criteria a and c as met (even indices): XP = 5 + 5
  assert.equal(r.body.xp, 10);
  const r2 = await api('POST', `/api/sessions/${sid}/tasks/S0-T1/submit`, { answer: { defs: 'IPS...', problem: 'p', three: 't' } });
  assert.equal(r2.body.xp, 10, 'no double award');
  // the client-facing response must not contain the answer key
  assert.ok(!JSON.stringify(r.body).includes('Hidden'));
});

test('live mode: hints escalate 1..3 then stop; chat works; no answer key in chat prompt', async () => {
  for (const lvl of [1, 2, 3]) { const h = await api('POST', `/api/sessions/${sid}/tasks/S0-T1/hint`, { answer: {} }); assert.equal(h.body.level, lvl); assert.equal(h.body.hint, 'Mock text reply.'); }
  const hintCalls = seen.filter((c) => !c.body.tool_choice && c.body.messages[0].content.startsWith('HINT'));
  assert.deepEqual(hintCalls.map((c) => c.body.messages[0].content.slice(0, 7)), ['HINT 1:', 'HINT 2:', 'HINT 3:']);
  const c = await api('POST', `/api/sessions/${sid}/chat`, { message: 'What is IPSC?' });
  assert.equal(c.body.reply, 'Mock text reply.');
  const chatCall = seen[seen.length - 1];
  assert.ok(!JSON.stringify(chatCall.body).includes('HIDDEN ANSWER KEY') && !chatCall.body.system.includes('Hidden registry'));
});

test('live mode: upstream failure surfaces as 502 and does not award XP', async () => {
  const before = (await api('GET', `/api/sessions/${sid}`)).body.xp;
  const s2 = (await api('POST', '/api/sessions')).body.id;
  mock.close(); // kill upstream
  const r = await api('POST', `/api/sessions/${s2}/tasks/S0-T1/submit`, { answer: { defs: 'x', problem: 'y', three: 'z' } });
  assert.equal(r.status, 502);
  assert.equal((await api('GET', `/api/sessions/${s2}`)).body.xp, 0);
  assert.equal((await api('GET', `/api/sessions/${sid}`)).body.xp, before);
});
