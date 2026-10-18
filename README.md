# K-17 IPSC Simulation — gamified Integrated Production System Capacity study

> **SIMULATION ONLY — FICTIONAL FIELD — SYNTHETIC DATA — NOT REPRESENTATIVE OF ANY VERIFIED COMPANY ASSET.**

A web game that turns the *Master Prompt* (IPSC, constraint diagnosis, production & operations efficiency) into an
interactive engineering campaign on the fictional **Model Field K-17**. The engineering is **deterministic code**;
the supervision, review, hints and challenge are **generated live by Claude** from a hidden answer key and a rubric.
Nothing the reviewer says is pre-written.

**Status of this build (v0.1):** Stages **0–4 are playable** (charter → asset mapping → data planning → baseline →
losses). Stages 5–16 are defined (title, mission, gate, decision point from the master prompt) as **stubs**; the engine
pieces they need (nodal, network, compressor coupling, economics) already exist and are tested. See `docs/EXTENDING.md`.

## Run it

```bash
npm install
cp server/.env.example server/.env      # add ANTHROPIC_API_KEY (optional, see below)
npm run build                           # builds the React client into client/dist
npm start                               # http://localhost:8787  (API + built client)

# development with hot reload (API :8787, Vite :5173 proxied)
npm run dev
npm test                                # 22 tests: physics, mass balance, game rules, mocked live-AI path
```

* **No API key?** The app still runs in **OFFLINE mode**: a crude keyword rubric stands in for the reviewer and is
  labelled as such everywhere. It exists so you can develop and test without network or cost. It is *not* the product.
* **With a key:** set `ANTHROPIC_API_KEY` (and optionally `CLAUDE_MODEL`, default `claude-sonnet-5-5`) in `server/.env`.
* `DEV_UNLOCK_ALL=1` unlocks every pack, stage and the nodal workbench. **Spoils the game** — for developing only.
* First start generates the synthetic history if `server/data/k17_v1.json` is missing (~40 s, deterministic by seed).
  The generated file ships in the zip.

## Deploy on Vercel (two projects)

| Project | Root Directory | Framework preset | Notes |
|---|---|---|---|
| Backend (`ipsc-backend.vercel.app`) | `server` | Other | `server/vercel.json` sends every request to `api/index.js` (the Express app) and bundles `data/k17_v1.json`. |
| Frontend (`ipsc-alpha.vercel.app`) | `client` | Vite | `client/vercel.json` proxies `/api/*` to the backend, so the browser talks to one origin (no CORS). Change the URL there if the backend moves. |

Backend environment variables (Project → Settings → Environment Variables):

* **Session storage (required for real use):** add an Upstash Redis store from the Vercel Marketplace (Storage tab) and connect
  it to the backend project; it sets `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `_TOKEN`).
  Without it the server falls back to `/tmp`, which Vercel wipes whenever it recycles the function: progress disappears.
  `/api/health` reports `"storage": "redis" | "file" | "ephemeral"` and the UI shows a warning in the ephemeral case.
* `ANTHROPIC_API_KEY` (and optionally `CLAUDE_MODEL`) for the live reviewer.

Check the backend with `https://<backend>/api/health`, and the frontend wiring with `https://<frontend>/api/health`
(it should return the same JSON through the proxy).

## Architecture

```
client/ (React + Vite)                      server/ (Node + Express, ESM)
  Mission  · Data room · Workbench            src/engine/        <- source of truth, no AI
  Notebook · Supervisor chat                    physics.js       PVT, mixture, VLP, IPR, Gilbert choke, line dP
        │  /api                                 field.js         canonical K-17 record; well + network + separator/compressor solver
        ▼                                       generate.js      18-month history from the engine + events + planted DQ issues
  fetch ───────────────────────────────►       data.js          loaders, CSV, metric checks (clean vs raw), event-loss check
                                                economics.js     NPV / IRR / payback
                                              src/game/
                                                stages.js        campaign: stages, tasks, rubrics, hidden answer keys
                                                packs.js         data packs = projections of the canonical record
                                                session.js       file-backed sessions, XP, gates, state record
                                              src/ai/claude.js   review (forced tool-call JSON), hints, chat, offline fallback
```

### How the "AI thinks it through" without breaking the master-prompt rules

| Master-prompt rule | How it is enforced |
|---|---|
| Rule 5 consistent field, no silent changes | One canonical record + seeded generator. History is produced *by running the physics*; events drive well status, so every number is traceable. |
| Rule 7 real engineering | Mixture mass is conserved; wells solve IPR = VLP; network pressure couples to the separator; the compressor curve floats separator pressure. Unit tests assert these. |
| Rule 2 progressive release | Packs return 403 until the stage unlocks. Rubric labels that would reveal an answer are masked in the public payload. |
| Rules 3/4 reasoning not answers, hints | Reviewer prompt scores *reasoning against a rubric*; three-level hints are generated from the task and the learner's draft. |
| Rule 6 no invented certainty | Numbers are checked by **code** (`/calc/check`), not by the model. The checker detects when you matched the *raw, dirty* data. |
| Hidden facts (true losses, planted issues, constraint story) | Live only on the server (`stages.js` answer keys, `generate.js` truth). The browser and the chat endpoint never receive them; only the reviewer call does, instructed never to quote them. |

### Review call (`server/src/ai/claude.js`)
`messages.create` with a **forced tool call** (`submit_review`) so the output is schema-valid JSON: per-criterion
`met/evidence`, a decision-quality label (reasonable / flawed assumption / correct under conditions / inconclusive),
markdown feedback, a challenge question and gaps. XP is awarded **by the server** from the `met` flags, once per
criterion (idempotent); the model never sets XP. A stage gate opens when all `core` criteria have been met across attempts.

### API (all under `/api`)
`GET /health` · `GET /campaign` · `POST /sessions` · `GET /sessions/:sid` · `GET /sessions/:sid/packs/:pid` ·
`GET /sessions/:sid/packs/:pid/files/:file` · `PUT /sessions/:sid/tasks/:tid/draft` · `POST /sessions/:sid/tasks/:tid/{submit|hint}` ·
`POST /sessions/:sid/calc/{check|event-loss}` · `POST /sessions/:sid/workbench/nodal` · `POST|GET /sessions/:sid/chat` ·
`POST /sessions/:sid/stages/:stid/complete` · `GET /sessions/:sid/state-record` · `PUT /sessions/:sid/notebook`

## Known limits (honest list)

* **The live Claude path is verified against a mocked Anthropic endpoint** (request shape, forced tool call, parsing,
  XP idempotence, 502 handling) but was **not** run against the real API when this was built — no key was available.
  First thing to do on your side: play Stage 0 with a key and read the review critically. Tune `CORE_RULES` and the rubrics.
* AI judgement varies run to run. Mitigations in place: specific rubric items, server-side XP, core-gate semantics,
  unlimited resubmission. Consider a second-opinion call for the high-value criteria.
* Hydraulics are **screening level** (homogeneous no-slip multiphase, constant Z, Gilbert choke, constant viscosity):
  good for teaching interactions, not PIPESIM-grade. The Stage 8 model register should say so explicitly.
* Sessions are local JSON files with **no authentication**. Fine on localhost; add auth and a database before hosting.
* The client bundle is one ~700 kB chunk (Recharts). Split it if that matters to you.
* `docs/SPOILERS.md` documents the planted issues, true event losses and the intended constraint story.
  **Don't open it if you want to play the game blind.**
