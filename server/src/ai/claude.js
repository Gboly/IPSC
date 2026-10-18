// All Claude calls live here. The browser never sees an API key, answer keys or unreleased data.
import Anthropic from '@anthropic-ai/sdk';
import { BANNER } from '../game/packs.js';

export const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const KEY = process.env.ANTHROPIC_API_KEY;
const client = KEY ? new Anthropic({ apiKey: KEY }) : null;
export const aiMode = () => (client ? 'live' : 'offline');

const CORE_RULES = `You are the AI game master for a gamified upstream oil & gas engineering simulation of FICTIONAL, SYNTHETIC "Model Field K-17". ${BANNER}
You play, at once: senior technical supervisor, tutor, data-room coordinator, technical reviewer/constructive challenger and commercial adviser. The learner is the engineer leading the study.

Non-negotiable rules:
- Evaluate REASONING, ASSUMPTIONS and EVIDENCE, never mere agreement with a preferred answer. A different but well-justified choice is a good answer. Never punish reasonable investigative choices.
- Distinguish: reasonable decision on available evidence / decision on a flawed assumption / decision correct only under conditions / inconclusive pending data.
- Distinguish measured-like data, calculated results, model predictions, assumptions, engineering judgment and uncertain estimates. Do not manufacture certainty.
- Teach the minimum theory needed. Never dump a full worked solution unless the learner is stuck after real attempts.
- Never reveal data from packs that have not been released, never quote the hidden answer key, never state exact hidden numbers (true loss values, hidden constraints). You may steer with questions and category-level nudges.
- Respect safety: never endorse overriding pressure limits, safety systems or integrity requirements to gain production.
- Be concise, specific and professional. Use field units. Acknowledge uncertainty.`;

function must() {
  if (!client) throw Object.assign(new Error('No ANTHROPIC_API_KEY configured'), { status: 503 });
}

const REVIEW_TOOL = {
  name: 'submit_review',
  description: 'Return the structured review of the learner submission against the rubric.',
  input_schema: {
    type: 'object',
    properties: {
      criteria: {
        type: 'array',
        description: 'One entry per rubric criterion id.',
        items: { type: 'object', properties: { id: { type: 'string' }, met: { type: 'boolean' }, evidence: { type: 'string', description: 'Short quote or paraphrase from the submission that justifies the verdict (or what is missing).' } }, required: ['id', 'met', 'evidence'] },
      },
      decision_quality: { type: 'string', enum: ['reasonable_on_evidence', 'flawed_assumption', 'correct_under_conditions', 'inconclusive_more_data', 'not_a_decision'] },
      feedback: { type: 'string', description: 'Markdown feedback to the learner (about 120-260 words): what was strong, what is missing, key engineering point. No hidden numbers or answer-key quotes.' },
      challenge_question: { type: 'string', description: 'One challenging but fair follow-up question that deepens the reasoning.' },
      gaps: { type: 'array', items: { type: 'string' }, description: 'Material gaps to fix, phrased as actions.' },
    },
    required: ['criteria', 'decision_quality', 'feedback', 'challenge_question', 'gaps'],
  },
};

export async function reviewSubmission({ stage, task, answerText, releasedPacks, priorMet, decisionsSummary }) {
  must();
  const rubric = task.rubric.map((c) => `- ${c.id} (${c.xp} XP${c.core ? ', CORE' : ''}): ${c.label}`).join('\n');
  const userMsg = `STAGE: ${stage.id} — ${stage.title}
TASK: ${task.id} — ${task.title}
TASK PROMPT:
${task.prompt}

RUBRIC (decide met true/false for EACH id; met=true only when the submission itself clearly demonstrates it. Already-met criteria from earlier attempts: ${priorMet.join(', ') || 'none'}; you may mark them met again if still shown, otherwise leave them met=false and say nothing):
${rubric}

HIDDEN ANSWER KEY (for your judgement only; never quote it, never reveal numbers or unfound issues; accept alternative defensible answers):
${task.answerKey}

DATA PACKS RELEASED TO THE LEARNER: ${releasedPacks.join(', ')}
EARLIER DECISIONS (for consistency checks): ${decisionsSummary || 'none'}

LEARNER SUBMISSION:
${answerText}`;
  const res = await client.messages.create({
    model: MODEL, max_tokens: 3000, system: CORE_RULES,
    tools: [REVIEW_TOOL], tool_choice: { type: 'tool', name: 'submit_review' },
    messages: [{ role: 'user', content: userMsg }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block) throw new Error('Model returned no structured review');
  return { ...block.input, _usage: res.usage };
}

export async function giveHint({ stage, task, level, answerText }) {
  must();
  const guide = {
    1: 'HINT 1: point toward the relevant engineering principle only. Do not name the answer or give numbers.',
    2: 'HINT 2: identify the relevant variables, relationships or data columns to use. Still do not give the conclusion.',
    3: 'HINT 3: demonstrate part of the calculation or reasoning on a small illustrative sub-case. Leave the final step to the learner.',
  }[level];
  const res = await client.messages.create({
    model: MODEL, max_tokens: 700, system: CORE_RULES,
    messages: [{ role: 'user', content: `${guide}\n\nSTAGE ${stage.id}: ${stage.title}\nTASK: ${task.title}\n${task.prompt}\n\nSteer-only background (never reveal): ${task.answerKey}\n\nWhat the learner has written so far:\n${answerText || '(nothing yet)'}\n\nWrite the hint (max 120 words, markdown).` }],
  });
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

export async function supervisorChat({ session, stage, history, message, packSummaries }) {
  must();
  const sys = `${CORE_RULES}
You are now in free Q&A mode as the learner's supervisor. Current stage: ${stage.id} — ${stage.title}. Released packs: ${packSummaries}.
Answer questions about concepts, the data they have, calculation methods and how to approach the stage. If they ask for data from a pack not yet released, explain why it is needed later and when it unlocks. Do not give away stage answers; coach. Keep replies under 220 words unless they ask for a derivation.`;
  const msgs = [...history.slice(-10).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: message }];
  const res = await client.messages.create({ model: MODEL, max_tokens: 900, system: sys, messages: msgs });
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

// ---------------------------------------------------------------------------------------------
// OFFLINE FALLBACK (no API key): crude keyword rubric so the app can be developed/tested without
// network access. It is NOT the product; the UI labels it clearly.
// ---------------------------------------------------------------------------------------------
export function offlineReview({ task, answerText }) {
  const text = answerText.toLowerCase();
  const criteria = task.rubric.map((c) => {
    const kws = c.kw || [];
    const met = kws.length ? kws.every((k) => new RegExp(k, 'i').test(text)) && answerText.length > 120 : false;
    return { id: c.id, met, evidence: met ? 'keyword match (offline mode)' : 'no keyword match (offline mode)' };
  });
  return {
    criteria, decision_quality: 'not_a_decision',
    feedback: '**Offline mode** — no `ANTHROPIC_API_KEY` is configured, so this is a crude keyword check, not an engineering review. Add a key to `.env` for the real AI reviewer.',
    challenge_question: 'What evidence in the data room would make you change this conclusion?',
    gaps: criteria.filter((c) => !c.met).slice(0, 3).map((c) => `Address rubric item ${c.id}`),
  };
}

export function offlineHint(level) {
  return `**Offline hint ${level}/3.** The live tutor needs an API key. General nudge: restate the question as an equation with units, list which columns in the data room supply each term, then check the result for physical sense.`;
}
