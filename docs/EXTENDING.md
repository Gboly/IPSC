# Extending the campaign

## Add or finish a stage
1. In `server/src/game/stages.js` replace the `stub(...)` for the stage with a full object (copy `S3` as a template):
   `mission, learning, packs, theory, briefing, tasks[], gate, competencies`.
2. Each **task** has `fields` (kinds: `text | textarea | choice | table | rank | budget`), a `rubric` and an `answerKey`.
   * `rubric[].core` — must be met to open the gate. `xp` is awarded once per criterion id, by the server.
   * `rubric[].ach` — achievement key (see `ACHIEVEMENTS`). `comp` — competency label for the stage summary.
   * `kw` — regexes used only by the **offline** reviewer.
   * If a rubric label would give away an answer, add a neutral wording to `PUB` (bottom of `stages.js`).
   * `answerKey` is *hidden*: it goes to the reviewer prompt only. Put the intended reasoning, planted facts and
     "accept alternatives if …" guidance there. Never reference unreleased numbers in public text.
3. If the stage needs data, add a pack to `server/src/game/packs.js` (`title, stage, purpose, datasets[], markdown,
   tables{}, dictionary[], qualityFlags[], requiredWork, expectedOutput, completionCriteria`). Large tables go through
   `packFiles()` as CSV. Packs release automatically when the previous stage completes (`pack.stage` = unlocking stage).
4. Add a test in `server/test/game.test.js` for any new deterministic check.

## Engine hooks already built for later stages

| Stage | What exists | Where |
|---|---|---|
| 5 Well performance | `wellState`, `solveWell`, `wellCurves` (IPR/VLP, choke critical test), tubing `restriction`, productivity `jMult`. K17-11 (tubing restriction → shut-in, restoration candidate) and K17-12 (low productivity, idle) are in `WELLS`. A nodal UI is built and gated at Stage 5. | `engine/field.js`, `Workbench.jsx` |
| 6 Network | `linePressureDrop` with `kExtra`; `solveField` iterates manifold pressures; MB trunk carries a partial restriction that is **non-binding** because chokes are critical (the "large dP ≠ constraint" lesson). | `engine/field.js` |
| 7 Facilities | `FACILITY` limits, `gasCapacityScfd(psig)` (nameplate vs demonstrated), utilisation in `solveField().util`. | `engine/field.js` |
| 8 Model | The engine *is* the reference solver. Calibration exercises can fit `j`, `kExtra`, compressor derate against `fieldDaily`. | `engine/*` |
| 9–10 Capacity / constraints | `solveField({ wellOpts, trunkExtra, gasCapFactor, psigSet })` supports what-if relaxations: choke, productivity, separator set-point, compressor derate. Add an optimiser (grid / coordinate search over chokes + set-point) in a new `engine/optimise.js`. | |
| 13 Economics | `npv`, `irr`, `payback`, `incrementalCashflow`. Add PACK 10 with synthetic prices, costs, fiscal terms. | `engine/economics.js` |

## Add a metric to "Check a calculation"
Add an entry to `METRICS` and a `case` in `compute()` in `server/src/engine/data.js`. The checker compares against the
cleaned engine rows and also against raw arithmetic on the dirty rows, so planted traps teach themselves.

## Change the synthetic field
Edit `WELLS`, `PVT`, `FACILITY`, `EVENTS` or the planted issues in `generate.js`, delete `server/data/k17_v1.json`, run
`npm run gen`, then `npm test` (several tests encode physical expectations and planted issues). Rubric answer keys that
quote numbers (true event losses) must be updated to match the new `truth.events` output.

## Tuning the AI
* `CORE_RULES` in `server/src/ai/claude.js` is the condensed master-prompt operating rules for every call.
* Reviews are one forced tool call. If you see inconsistent grading, tighten the criterion wording first, then consider
  adding `temperature` (omitted for compatibility with newer models), a second reviewer pass, or few-shot examples of
  borderline answers in the task's `answerKey`.
* Chat deliberately never receives answer keys. Keep it that way.
