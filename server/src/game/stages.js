// Campaign definition. SIMULATION ONLY - FICTIONAL FIELD - SYNTHETIC DATA.
//
// Public view (sent to the browser) strips `answerKey` and rubric keyword hints.
// The AI reviewer receives `answerKey` + the rubric; the browser never does.
//
// Field kinds the client can render: text | textarea | choice | multichoice | table | rank | budget
// Each rubric criterion: { id, label, xp, core?, ach?, comp?, kw? }
//   core -> must be met to pass the task (gate)   ach -> achievement unlocked when met
//   kw   -> offline fallback regexes (used only when no ANTHROPIC_API_KEY is configured)

export const LEVELS = [
  { n: 1, title: 'Asset Intelligence', blurb: 'Understand the field, scope the study, plan the data.' },
  { n: 2, title: 'Production Detective', blurb: 'Establish the baseline, find the losses, form hypotheses.' },
  { n: 3, title: 'Integrated Systems Engineer', blurb: 'Connect reservoir, wells, network, facilities; build and validate a model.' },
  { n: 4, title: 'Capacity Architect', blurb: 'Define and locate the production ceiling.' },
  { n: 5, title: 'Optimization Strategist', blurb: 'Test operational changes and debottlenecking options.' },
  { n: 6, title: 'Petroleum Economist', blurb: 'Value the gains; rank by commercial merit.' },
  { n: 7, title: 'Asset Performance Lead', blurb: 'Plan, verify, and defend to a management panel.' },
];

export const ACHIEVEMENTS = {
  'data-detective': { title: 'Data Detective', text: 'Identified a consequential data-quality issue.' },
  'mass-balance-guardian': { title: 'Mass Balance Guardian', text: 'Correctly reconciled the material balance.' },
  'pressure-sleuth': { title: 'Pressure Sleuth', text: 'Explained a network backpressure problem.' },
  'constraint-hunter': { title: 'Constraint Hunter', text: 'Proved that a component is limiting production.' },
  'model-validator': { title: 'Model Validator', text: 'Tested predictions against independent data.' },
  'value-creator': { title: 'Value Creator', text: 'Found an intervention with defensible incremental value.' },
  'commercial-realist': { title: 'Commercial Realist', text: 'Rejected an attractive-looking intervention on commercial or operational grounds.' },
  'systems-thinker': { title: 'Systems Thinker', text: 'Recognised that removing one bottleneck can activate another.' },
  'evidence-based-engineer': { title: 'Evidence-Based Engineer', text: 'Revised an initial hypothesis when the evidence contradicted it.' },
  'boundary-setter': { title: 'Boundary Setter', text: 'Defined a defensible study boundary and explained its effect on the ceiling.' },
  'voi-thinker': { title: 'Value-of-Information Thinker', text: 'Prioritised data acquisition by its effect on the decision.' },
  'loss-auditor': { title: 'Loss Auditor', text: 'Found double counting or an unlogged loss in the deferment record.' },
};

const SIM = 'Everything here is fictional and synthetic.';

// ----------------------------------------------------------------------------- STAGE 0
const S0 = {
  id: 'S0', level: 1, title: 'Campaign onboarding and project charter', implemented: true,
  mission: 'Establish the objectives, boundaries and rules of the simulation.',
  learning: ['Distinguish production optimisation, production capacity determination, and economic optimisation.', 'Write a testable study objective with a boundary hypothesis.'],
  packs: ['00'],
  theory: `### Minimum theory
**IPS** — the Integrated Production System: everything the produced fluids pass through from the reservoir to the point where oil, gas and water leave the asset's responsibility.

**IPSC** — the *capacity* of that system: the highest rate it can sustain **under stated constraints and a stated time basis**. It is a property of the *system as configured*, not of any one component.

Three questions often get blurred:
1. **Production optimisation** — within today's system, which settings give the best output *now*?
2. **Capacity determination** — what is the ceiling, and what sets it?
3. **Economic optimisation** — which actions create the most *value*, which may not be the highest rate.

Maximum oil rate, maximum total fluid, maximum sustainable annual oil and maximum NPV can all point to different answers: more total fluid can mean more water to treat and dispose of; the highest rate today may deplete faster or need costly capacity that never pays back.`,
  briefing: `## Campaign briefing

Welcome, engineer. You lead a study of **Model Field K-17**. ${SIM} Every dataset is released progressively, stage by stage, just as in a real project. Nothing in here is a verified company asset.

**How this works.** I act as your supervisor, study team, data-room coordinator, tutor and reviewer. You investigate, calculate, decide and defend. I won't mark you down for choosing differently from my preference — I will test your reasoning against the evidence. Ask for hints any time; they come in three levels, from "which principle?" to "here's part of the calculation".

**Open PACK 00 in the Data Room**, then complete the Stage 0 tasks.`,
  tasks: [
    {
      id: 'S0-T1', title: 'Definitions and the problem to solve', type: 'form',
      prompt: 'In your own words: (1) what are the IPS and IPSC for Field K-17, (2) what is the main problem the sponsor wants solved, and (3) how do production optimisation, capacity determination and economic optimisation differ for this field?',
      fields: [
        { key: 'defs', label: 'IPS and IPSC (your definitions)', kind: 'textarea' },
        { key: 'problem', label: 'The main problem the study must solve', kind: 'textarea' },
        { key: 'three', label: 'Optimisation vs capacity vs economics — how they differ here', kind: 'textarea' },
      ],
      rubric: [
        { id: 'S0-T1-a', label: 'Identifies the purpose of the dataset (PACK 00) as scoping, not analysis', xp: 5, kw: ['scop', 'charter', 'qualitative'] },
        { id: 'S0-T1-b', label: 'IPS defined as the whole chain from reservoir to a stated delivery point', xp: 5, core: true, kw: ['reservoir', 'wells?', 'separat|facilit|export'] },
        { id: 'S0-T1-c', label: 'IPSC defined as maximum sustainable throughput under stated constraints and time basis', xp: 5, core: true, kw: ['capacity|ceiling|maximum', 'constraint'] },
        { id: 'S0-T1-d', label: 'Correctly distinguishes optimisation, capacity determination and economic optimisation', xp: 10, core: true, comp: 'Framing the engineering question', kw: ['optimi[sz]', 'capacity', 'econom|npv|value'] },
      ],
      answerKey: 'Good answers define IPS reservoir→wells→chokes→flowlines→manifolds→trunk→separator→gas/oil/water handling→delivery points. IPSC = maximum rate the system as configured can sustain, subject to named constraints and a time basis (e.g. steady-state vs sustainable annual). Optimisation = best settings now within current system; capacity = the ceiling and what sets it; economics = value, which may select a lower rate. The sponsor problem: declining oil, tight gas, disruptive events -> find the real ceiling, what limits it, and which improvements pay.',
    },
    {
      id: 'S0-T2', title: 'Project charter and the primary objective (decision)', type: 'form',
      prompt: `**Decision point.** Define what success means and which production objective is *primary*. Compare:
- **A.** Maximise oil rate
- **B.** Maximise total fluid rate
- **C.** Maximise sustainable annual oil production
- **D.** Maximise net economic value (NPV)

Explain why these can give different answers *for K-17* (what is in PACK 00), then complete the charter.`,
      fields: [
        { key: 'primary', label: 'Primary objective', kind: 'choice', options: ['A. Maximise oil rate', 'B. Maximise total fluid rate', 'C. Maximise sustainable annual oil production', 'D. Maximise net economic value'] },
        { key: 'why', label: 'Why this objective, and why the others can give different answers here', kind: 'textarea' },
        { key: 'boundary', label: 'Boundary hypothesis (where your IPS starts and stops)', kind: 'textarea' },
        { key: 'metrics', label: 'Metrics you will evaluate', kind: 'textarea' },
        { key: 'refdate', label: 'Reference date and study horizon', kind: 'text' },
        { key: 'assump', label: 'Initial assumptions and exclusions', kind: 'textarea' },
      ],
      rubric: [
        { id: 'S0-T2-a', label: 'Chooses a primary objective and supports it with relevant evidence from PACK 00', xp: 10, core: true, comp: 'Decision-making under uncertainty', kw: ['because|since|given'] },
        { id: 'S0-T2-b', label: 'Explains why the candidate objectives diverge in this system (e.g. water handling, gas limit, depletion, cost)', xp: 10, core: true, comp: 'Objective trade-offs', kw: ['water', 'gas|compress', 'cost|npv|value|deplet'] },
        { id: 'S0-T2-c', label: 'States a boundary hypothesis that can be tested in Stage 1', xp: 5, core: true, ach: 'boundary-setter', kw: ['boundary|separator|export|sales|dispos'] },
        { id: 'S0-T2-d', label: 'Lists measurable metrics with units (oil, gas, water, fluid, uptime, utilisation)', xp: 5, kw: ['stb|bbl|oil', 'uptime|availab|utili'] },
        { id: 'S0-T2-e', label: 'Gives a coherent reference date (2026-09-30 is the history end) and horizon', xp: 5, core: true, kw: ['2026', 'horizon|year|month|day'] },
        { id: 'S0-T2-f', label: 'States at least two assumptions or exclusions', xp: 5, kw: ['assum', 'exclu|out of scope|not includ'] },
        { id: 'S0-T2-g', label: 'Complete, traceable stage deliverable (all charter parts present and consistent)', xp: 20, comp: 'Traceable deliverables', kw: ['.'] },
      ],
      answerKey: `There is no single correct primary objective. Reasonable: C or D (sustainable oil / NPV) because (i) water is already 14->28% and water treatment/disposal has cost and capacity limits so maximising total fluid (B) can be counter-productive; (ii) gas is "tight" so max oil rate today (A) may push against gas handling or deplete faster; (iii) NPV (D) accounts for capex/opex/time value. A is acceptable if the reasoning accepts rate is a capacity metric with value check later. Flag as flawed: choosing B without discussing water handling; choosing an objective with no reference to constraints. Boundary hypothesis must be testable (separator-only vs through gas, export and water). Reference date: history ends 2026-09-30; horizon should be explicit (e.g. 12-24 months). Deliverable XP only if every charter part is present.`,
    },
  ],
  gate: 'Do not proceed until the project has a coherent objective and boundary.',
  competencies: ['Framing the engineering question', 'Objective trade-offs'],
};

// ----------------------------------------------------------------------------- STAGE 1
const S1 = {
  id: 'S1', level: 1, title: 'Asset familiarization and system mapping', implemented: true,
  mission: 'Understand how the fictional field operates and map the principal flow path and interfaces.',
  learning: ['Construct the hydrocarbon pathway.', 'Distinguish component, control variable, boundary condition, constraint.', 'Decide the study boundary and explain how it can move the ceiling.'],
  packs: ['01'],
  theory: `### Minimum theory
- **Physical component** — a real piece of equipment (a well, a flowline, a separator).
- **Control variable** — something operators can change (choke size, separator pressure set-point, which wells are on).
- **Boundary condition** — something fixed *from the study's point of view* at the edge (e.g. a third-party pipeline pressure, a market demand).
- **Constraint** — a limit that bounds what is feasible (a vessel rating, a permit, a relief valve ceiling).

The same thing can be a constraint inside one boundary and a boundary condition in another. **Where you draw the line changes the ceiling you compute.**`,
  briefing: `## Stage 1 — Asset mapping

PACK 01 contains the well inventory, reservoir summary, equipment list and a block schematic. No capacities or rates yet — that is deliberate. Trace the molecule from rock to delivery point and decide where your study ends.`,
  tasks: [
    {
      id: 'S1-T1', title: 'Hydrocarbon pathway and classification', type: 'form',
      prompt: 'Describe the K-17 asset and trace the principal flow path for oil, gas and water from reservoir to each delivery or disposal point. Then give two K-17 examples each of: physical component, control variable, boundary condition, constraint.',
      fields: [
        { key: 'asset', label: 'Asset description (what it is, how it operates)', kind: 'textarea' },
        { key: 'path', label: 'Pathway: oil / gas / water, element by element', kind: 'textarea' },
        { key: 'classes', label: 'Two examples each: component, control variable, boundary condition, constraint', kind: 'textarea' },
      ],
      rubric: [
        { id: 'S1-T1-a', label: 'Complete oil/gas/water pathway including wells, chokes, flowlines, manifolds, trunk lines, separator and downstream handling', xp: 10, core: true, comp: 'Systems mapping', kw: ['choke', 'manifold', 'trunk', 'separator', 'compress', 'export|pipeline', 'dispos|inject'] },
        { id: 'S1-T1-b', label: 'Correctly distinguishes component / control variable / boundary condition / constraint with sensible K-17 examples', xp: 10, core: true, kw: ['control', 'boundary', 'constraint'] },
      ],
      answerKey: 'Path: Sand A/B -> well (tubing) -> wellhead choke -> individual flowline -> Manifold A or B -> trunk A/B -> V-100 separator -> (gas) V-102 scrubber -> C-101 -> sales/fuel/flare; (oil) tanks -> export pumps -> third-party pipeline; (water) V-120 -> disposal pumps -> WDW-1. Controls: choke sizes, wells on/off, separator set-point, compressor loading. Boundary conditions: third-party export pipeline acceptance/pressure, gas sales demand, reservoir pressure (from a short-term perspective). Constraints: PSV/separator rating, permit for flare, vessel capacities (not yet released). Do not require precise numbers.',
    },
    {
      id: 'S1-T2', title: 'Component and interface register', type: 'form',
      prompt: 'Build the preliminary register. At least **8 rows** covering the pathway. Mark each item\'s type and whether it can influence your primary objective.',
      fields: [
        {
          key: 'register', label: 'Component / interface register', kind: 'table', minRows: 8,
          columns: [
            { key: 'item', label: 'Item / interface' },
            { key: 'type', label: 'Type', options: ['Component', 'Control variable', 'Boundary condition', 'Constraint'] },
            { key: 'role', label: 'Role in the flow path' },
            { key: 'influence', label: 'Can it limit the objective? (y/n/?)' },
            { key: 'note', label: 'Notes' },
          ],
        },
      ],
      rubric: [
        { id: 'S1-T2-a', label: 'Register has ≥8 correctly classified items spanning wells→disposal', xp: 10, core: true, comp: 'Component registers', kw: ['.'] },
        { id: 'S1-T2-b', label: 'Interfaces are explicit (e.g. separator to compressor, export pumps to third-party pipeline, water to disposal)', xp: 5, kw: ['interface|export|dispos|sales'] },
      ],
      answerKey: 'Check variety of types: at least one of each class. Interfaces expected: wellhead->flowline, trunk->separator, separator->compressor suction, separator->tank/export pumps, export pump->third-party pipeline (boundary), water treatment->disposal well, power->all rotating equipment. Do not require every item.',
    },
    {
      id: 'S1-T3', title: 'Study boundary (decision) and suspected constraints', type: 'form',
      prompt: `**Decision point.** Should the study boundary **stop at the separator**, or **extend through gas handling, oil export and produced-water disposal**? Explain how your choice could change the calculated ceiling, then list your initial suspected constraints with the mechanism for each.`,
      fields: [
        { key: 'choice', label: 'Boundary choice', kind: 'choice', options: ['Stop at the separator', 'Extend through gas handling, oil export and water disposal', 'Another boundary (explain)'] },
        { key: 'reason', label: 'Reasoning, and how this choice can change the ceiling', kind: 'textarea' },
        {
          key: 'suspects', label: 'Suspected constraints (≥4)', kind: 'table', minRows: 4,
          columns: [{ key: 'where', label: 'Where' }, { key: 'mechanism', label: 'Mechanism (how it limits production)' }, { key: 'evidence', label: 'What evidence would confirm it?' }],
        },
      ],
      rubric: [
        { id: 'S1-T3-a', label: 'Chooses a boundary and defends it with the production objective in mind', xp: 10, core: true, ach: 'boundary-setter', comp: 'Boundary definition', kw: ['because|since'] },
        { id: 'S1-T3-b', label: 'Explains how the boundary can change the ceiling (e.g. separator-only ignores gas/water/export limits that can cap throughput)', xp: 10, core: true, kw: ['gas|water|export', 'ceiling|capacity|limit'] },
        { id: 'S1-T3-c', label: 'Lists ≥4 plausible suspected constraints, each with a physical mechanism and confirming evidence', xp: 10, comp: 'Hypothesis building', kw: ['.'] },
        { id: 'S1-T3-d', label: 'Notes at least one interaction between constraints (e.g. separator pressure ↔ gas compression ↔ well deliverability)', xp: 10, ach: 'systems-thinker', kw: ['interact|couple|knock-on|depend|trade'] },
        { id: 'S1-T3-e', label: 'Complete, traceable stage deliverable (schematic understood, register, boundary, constraint map)', xp: 20, kw: ['.'] },
      ],
      answerKey: 'Either boundary can be defended. Through-the-plant boundary is more complete because gas handling (compressor), water treatment/disposal and export can cap field throughput even if wells and network could deliver more; separator-only is cleaner for network/well modelling but can overstate the ceiling. Best answers may say: model wells+network to separator in detail, but include gas, water and export as constraints/boundary conditions with stated limits. Hidden truth for later stages (do not reveal): compressor C-101 demonstrated capacity ~9.6 MMscf/d vs 12 nameplate and gas utilisation near 100% late in history; Manifold B trunk has a partial restriction (large pressure drop) that does NOT limit production because chokes are critical; A-sand wells at high water cut are no longer critical-flow and are sensitive to separator pressure.',
    },
  ],
  gate: 'The principal flow path and the major production interfaces must be understood before quantitative capacity analysis begins.',
  competencies: ['Systems mapping', 'Component registers', 'Boundary definition', 'Hypothesis building'],
};

// ----------------------------------------------------------------------------- STAGE 2
const S2 = {
  id: 'S2', level: 1, title: 'Data acquisition planning and data-quality strategy', implemented: true,
  mission: 'Become responsible for assembling the data needed to answer the capacity question — within a limited effort allowance.',
  learning: ['Build a data request register with purpose, source, quality checks.', 'Prioritise by value of information, not by completeness.'],
  packs: ['CAT'],
  theory: `### Minimum theory
**Value of information (VOI)** — a measurement is worth buying when its possible outcomes would *change a decision*, or would remove an uncertainty that could otherwise lead to a wrong investment. A test that confirms what you already do is cheap to skip; a test that could reveal your capacity ceiling is 40% lower than the nameplate is very valuable.

**Acceptance criteria** — before data enter a model, define what "good enough" means (units consistent? timestamps unique? values physical? totals reconcile within x%?).`,
  briefing: `## Stage 2 — Data planning

The data catalog lists what exists, what must be requested, and what needs new work. You have **100 effort points**. Choose well.`,
  tasks: [
    {
      id: 'S2-T1', title: 'Data request register', type: 'form',
      prompt: 'Create the data request register for the datasets you consider important (≥6): purpose, likely source department, quality check with an acceptance criterion, and priority.',
      fields: [{
        key: 'register', label: 'Data request register', kind: 'table', minRows: 6,
        columns: [{ key: 'dataset', label: 'Dataset' }, { key: 'purpose', label: 'Purpose (which question it answers)' }, { key: 'source', label: 'Source dept/system' }, { key: 'check', label: 'Quality check + acceptance criterion' }, { key: 'priority', label: 'Priority', options: ['High', 'Medium', 'Low'] }],
      }],
      rubric: [
        { id: 'S2-T1-a', label: 'Every dataset has a purpose tied to the capacity question', xp: 5, core: true, kw: ['.'] },
        { id: 'S2-T1-b', label: 'Quality checks have testable acceptance criteria (units, duplicates, mass balance, reconciliation tolerance)', xp: 10, core: true, comp: 'Data quality strategy', kw: ['unit|duplicate|reconcil|tolerance|within|%'] },
        { id: 'S2-T1-c', label: 'Identifies missing data that could change the outcome (e.g. compressor demonstrated capacity, meter/allocation integrity, flowline pressures)', xp: 10, kw: ['compress', 'alloc|meter'] },
      ],
      answerKey: 'Any sensible list. Strong answers include allocation vs separator reconciliation, compressor demonstrated capacity (nameplate only on file), well tests, flowline pressure survey, PVT, equipment datasheets. Acceptance criteria like "well sum reconciles to separator within 2-3%" or "no duplicate (date,well) keys".',
    },
    {
      id: 'S2-T2', title: 'Spend the effort allowance (decision)', type: 'form',
      prompt: 'Select which acquisitions to purchase (**≤100 effort points**) and justify each choice by what uncertainty it reduces and what decision it protects. Say what you deliberately skipped and why.',
      fields: [
        { key: 'picks', label: 'Acquisitions chosen', kind: 'budget', budget: 100, options: [
          { id: 'A1', label: 'A1 Well test campaign on all producers', cost: 35 }, { id: 'A2', label: 'A2 Static + flowing gradient surveys (4 wells)', cost: 30 },
          { id: 'A3', label: 'A3 Flowline & manifold pressure survey', cost: 15 }, { id: 'A4', label: 'A4 Compressor C-101 performance test', cost: 25 },
          { id: 'A5', label: 'A5 Allocation & meter-proving audit', cost: 15 }, { id: 'A6', label: 'A6 New PVT sampling (both sands)', cost: 30 },
          { id: 'A7', label: 'A7 3D seismic reprocessing', cost: 40 }, { id: 'A8', label: 'A8 Separator internals inspection', cost: 20 },
          { id: 'A9', label: 'A9 Tubing caliper logs, all producers', cost: 35 }, { id: 'A10', label: 'A10 Review historical event logs (in hand)', cost: 5 },
        ] },
        { key: 'voi', label: 'Value-of-information reasoning for your picks', kind: 'textarea' },
        { key: 'skipped', label: 'What you skipped and why; remaining risk', kind: 'textarea' },
      ],
      rubric: [
        { id: 'S2-T2-a', label: 'Stays within budget and ties each pick to a specific uncertainty about the ceiling', xp: 10, core: true, kw: ['uncertain|ceiling|capacity'] },
        { id: 'S2-T2-b', label: 'Prioritises data that could change the production-ceiling conclusion or prevent a wrong investment (e.g. compressor capacity, allocation integrity, well tests, flowline pressures)', xp: 15, core: true, ach: 'voi-thinker', comp: 'Value of information', kw: ['compress|A4', 'alloc|A5|A1|test'] },
        { id: 'S2-T2-c', label: 'Justifies skipping low-value items (seismic, PVT resampling now) without ignoring their risk', xp: 10, kw: ['skip|defer|not now|low'] },
        { id: 'S2-T2-d', label: 'Recognises dependencies/sequencing (e.g. allocation audit before using well rates; tests feeding the model)', xp: 10, kw: ['before|first|depend|sequenc|feed'] },
        { id: 'S2-T2-e', label: 'Complete, traceable stage deliverable (register, gaps, plan)', xp: 20, kw: ['.'] },
      ],
      answerKey: 'No unique optimum. High-VOI set: A4 compressor test (nameplate 12 vs demonstrated 9.6 MMscf/d is the single biggest unknown for the ceiling), A1 well tests (needed for calibration and potential), A5 allocation audit (a meter factor change from 2026-04-20 is present in the data), A3 flowline survey (network calibration) = 90 points. Moderate: A2 (30), A8 (20). Low for this question now: A7 seismic (40), A6 PVT resample (30), A9 caliper (35; becomes relevant at Stage 5 for specific wells). Accept different packages if reasoning is evidence-based. Penalise nothing for asking questions. Flawed: picking seismic or PVT first with no link to the ceiling.',
    },
  ],
  gate: 'The next phase may proceed if sufficient data exist to construct a credible baseline. Do not demand every possible dataset where it adds little value.',
  competencies: ['Data quality strategy', 'Value of information'],
};

// ----------------------------------------------------------------------------- STAGE 3
const S3 = {
  id: 'S3', level: 2, title: 'Production history and baseline performance', implemented: true,
  mission: 'Determine what the field is currently doing before trying to improve it.',
  learning: ['Check data structure and units; find inconsistencies.', 'Calculate field totals and trends from well data.', 'Distinguish rate, cumulative, uptime, calendar-day vs on-stream averages.', 'Choose and defend a baseline period.'],
  packs: ['02'],
  theory: `### Minimum theory
- **Daily volume** (stb in a day) ≠ **rate** (stb/d). A well on for 12 h produced half a day of volume.
- **Calendar-day average rate** = total volume ÷ number of calendar days (includes downtime). **On-stream rate** = total volume ÷ (hours on / 24). The first is what the field *delivered*; the second approximates what the well *can do when running*.
- **Uptime** = hours on ÷ calendar hours.
- **Cumulative production** = sum of daily volumes over a window.
- **Water cut** = water ÷ (oil + water). **GOR** = gas ÷ oil (scf/stb).
- **Observed vs potential:** observed is what the meters recorded; potential is what the system could have produced — an *inference*.

A baseline must be **traceable** to cleaned data and must not silently mix incompatible operating conditions.`,
  briefing: `## Stage 3 — Baseline

PACK 02 holds 18 months of well-day records plus separator data. Download the CSVs from the Data Room (or use the built-in plot builder). Then:
1. Hunt for data problems and log them.
2. Compute metrics — use **Check a calculation** to verify them against the cleaned dataset.
3. Choose a baseline window and defend it.`,
  tasks: [
    {
      id: 'S3-T1', title: 'Data-quality log', type: 'form',
      prompt: 'Log every data problem you find in PACK 02. For each: where (well/date), what is wrong, the evidence, and how you will treat it. You can resubmit as you find more — XP is awarded once per issue.',
      fields: [{
        key: 'log', label: 'Data-quality log', kind: 'table', minRows: 3,
        columns: [{ key: 'where', label: 'Well / dates' }, { key: 'issue', label: 'What is wrong' }, { key: 'evidence', label: 'Evidence' }, { key: 'treatment', label: 'Treatment (fix / exclude / flag)' }],
      }],
      rubric: [
        { id: 'DQ-1', label: 'Found: unit inconsistency (volumes in the wrong units for a few days)', xp: 10, ach: 'data-detective', comp: 'Data forensics', kw: ['K17-03', 'm3|cubic|unit'] },
        { id: 'DQ-2', label: 'Found: block of missing daily records for one well', xp: 10, kw: ['K17-07', 'missing|gap|absent'] },
        { id: 'DQ-3', label: 'Found: duplicate row', xp: 10, kw: ['K17-05', 'duplic'] },
        { id: 'DQ-4', label: 'Found: gas meter flatline (GOR = 0)', xp: 10, kw: ['K17-09', 'gas', 'zero|flat|0'] },
        { id: 'DQ-5', label: 'Found: separator oil meter vs well-sum step change', xp: 10, ach: 'mass-balance-guardian', kw: ['separator|meter', 'step|bias|shift|reconcil'] },
        { id: 'DQ-6', label: 'Found: sentinel value (9999) in wellhead pressure', xp: 10, kw: ['K17-06', '9999|sentinel'] },
        { id: 'DQ-7', label: 'Found: status flag inconsistent with production', xp: 10, kw: ['K17-10', 'status'] },
        { id: 'S3-T1-core', label: 'Logs ≥4 genuine issues with evidence and a defensible treatment for each', xp: 0, core: true, kw: ['.'] },
      ],
      answerKey: 'Hidden registry (planted): DQ-1 K17-03 2026-01-12..15 values in m3 (x0.159); DQ-2 K17-07 2025-12-02..07 six rows missing; DQ-3 K17-05 2026-02-18 duplicate row; DQ-4 K17-09 2026-05-02..09 gas = 0 (meter flatline) while oil/water normal; DQ-5 separator oil meter reads ~3.6 pts high relative to well sum from 2026-04-20 (allocation not updated); DQ-6 K17-06 WHP = 9999 on 2025-10-02..03; DQ-7 K17-10 2026-03-22 status SHUT-IN but 24 h production. Award each DQ criterion ONLY if the user clearly identified that specific issue (well and approximate date or clear description). Do NOT reveal un-found issues; say how many remain and give at most a category-level nudge if asked. Do not penalise treatments you disagree with if reasoned. S3-T1-core is met if >=4 issues found with sound treatments.',
    },
    {
      id: 'S3-T2', title: 'Baseline period (decision) and trends', type: 'form',
      prompt: `**Decision point.** Which period should represent the baseline, and why? Trade-offs: a stable short period, a longer historical average, or a representative operating condition. Also summarise the trends you found (oil, water cut, GOR, gas), the main contributors, and what is *observed* versus *inferred potential*. Use "Check a calculation" for numeric claims.`,
      fields: [
        { key: 'from', label: 'Baseline start (YYYY-MM-DD)', kind: 'text' },
        { key: 'to', label: 'Baseline end (YYYY-MM-DD)', kind: 'text' },
        { key: 'why', label: 'Why this window? What did you exclude or adjust for, and why?', kind: 'textarea' },
        { key: 'values', label: 'Baseline values (oil rate, water cut, GOR, gas rate, uptime) and how you calculated them', kind: 'textarea' },
        { key: 'trends', label: 'Trends and material changes in operating performance', kind: 'textarea' },
        { key: 'contrib', label: 'Well contribution / availability / variability', kind: 'textarea' },
        { key: 'obsVsPot', label: 'Observed performance vs inferred potential', kind: 'textarea' },
      ],
      rubric: [
        { id: 'S3-T2-a', label: 'Baseline window is defensible for the current configuration (not mixing the pre-meter-change period, the turnaround, or major outages without adjustment)', xp: 10, core: true, comp: 'Baseline construction', kw: ['because|since', 'outage|turnaround|event|meter|adjust'] },
        { id: 'S3-T2-b', label: 'Calculations are traceable: uses cleaned data and states the treatment of the data issues inside the window', xp: 10, core: true, kw: ['clean|exclud|correct|treat|dedup|duplic'] },
        { id: 'S3-T2-c', label: 'Identifies the material trends (oil falling, water cut rising, GOR rising with gas approaching capacity, composition shift)', xp: 10, kw: ['water cut', 'GOR|gas'] },
        { id: 'S3-T2-d', label: 'Separates observed from inferred potential and explains calendar-day vs on-stream averages', xp: 10, ach: 'evidence-based-engineer', kw: ['potential', 'on-stream|uptime|calendar'] },
        { id: 'S3-T2-e', label: 'Complete, traceable stage deliverable (baseline report with definitions, data findings, base case)', xp: 20, kw: ['.'] },
      ],
      answerKey: 'There is no unique baseline. Considerations the user should weigh: (1) separator oil meter reads ~3.6 pts high from 2026-04-20 so separator-vs-well comparisons are inconsistent across that date; well allocation is the same basis throughout; (2) EV-012 planned turnaround 2026-04-14..16; (3) EV-015 compressor derate 2026-07-08..30 raised separator pressure and trimmed rates slightly; (4) EV-017 outage 2026-09-02, EV-018 K17-09 choke-back 2026-09-10..17; (5) K17-05 returned after workover in July 2025; (6) oil decline ~ -2.6%/month early, flatter later; GOR rising (K17-09 gas-cap breakthrough, GOR from ~700 to ~1,500+), water cut 14% -> 28%. Good baselines: e.g. 2026-05-01..2026-06-30 (post-turnaround, pre-derate; contains one compressor trip which is representative of normal unplanned losses) or a rolling 90-day window with explicit adjustments. Accept longer windows only if a trend adjustment is documented. Flawed: using entire 18 months unadjusted for an end-state baseline; using a window with unremoved DQ issues. Do not state specific "correct numbers" in feedback; point to the Check-a-calculation tool.',
    },
  ],
  gate: 'The base case must be traceable to the synthetic data and must not mix incompatible operating periods without documenting the adjustment.',
  competencies: ['Data forensics', 'Baseline construction'],
};

// ----------------------------------------------------------------------------- STAGE 4
const S4 = {
  id: 'S4', level: 2, title: 'Production losses and operational efficiency', implemented: true,
  mission: 'Separate actual production from achievable production and identify where performance is being lost.',
  learning: ['Build a production-loss tree.', 'Estimate lost production without direct counterfactual measurement; state limits.', 'Find double counting and unlogged losses.', 'Rank loss opportunities.'],
  packs: ['06'],
  theory: `### Minimum theory — estimating a loss you cannot measure
You never observe the production that would have occurred. Typical approaches:
1. **Pre-event baseline** — average rate of the days before the event × fraction of the lost period. Simple; wrong if there is a trend or interacting wells.
2. **Offset / sister-well method** — compare with unaffected wells' behaviour.
3. **Model counterfactual** — run the model with the event removed (later stages).

**Limitations:** all three assume the system would have continued as before; a declining field makes a flat baseline overstate the loss; shutting a well in changes other wells' operating points (backpressure) so the loss is not simply that well's rate.

**Overlaps:** one physical event can appear several times in a log (field-level and well-level entries). Summing a log without checking overlaps double counts.

**Loss tree levels (example):** Potential → deferments (planned / unplanned / external) → causes → components.`,
  briefing: `## Stage 4 — Losses

PACK 06 holds the operator's deferment log. Cross-check it against PACK 02 and decide what is real, what is duplicated, and what is missing. Use **Check an event loss** in the Workbench to test your own estimates against the engine's counterfactual.`,
  tasks: [
    {
      id: 'S4-T1', title: 'Loss register and reconciliation', type: 'form',
      prompt: 'Build the loss register for the events you analyse (≥8 rows): category, recorded loss, your estimate, method, overlap/double-count flag, confidence. Then reconcile: total recorded vs total your analysis supports, and list losses you believe are **not** in the log.',
      fields: [
        {
          key: 'register', label: 'Loss register', kind: 'table', minRows: 8,
          columns: [{ key: 'event', label: 'Event ref(s)' }, { key: 'asset', label: 'Asset' }, { key: 'category', label: 'Category', options: ['Planned', 'Unplanned', 'External', 'Well restriction / operational', 'Other'] }, { key: 'recorded', label: 'Recorded (stb)' }, { key: 'estimate', label: 'Your estimate (stb)' }, { key: 'method', label: 'Method + limitation' }, { key: 'overlap', label: 'Double count? (y/n)' }, { key: 'conf', label: 'Confidence', options: ['High', 'Medium', 'Low'] }],
        },
        { key: 'tree', label: 'Production-loss tree (describe levels and branches)', kind: 'textarea' },
        { key: 'recon', label: 'Reconciliation: recorded vs calculated, overlaps removed, unlogged losses', kind: 'textarea' },
        { key: 'patterns', label: 'Recurring events and possible common causes', kind: 'textarea' },
      ],
      rubric: [
        { id: 'S4-T1-a', label: 'Builds a coherent loss tree separating planned, unplanned, external and operational/well-restriction losses', xp: 10, core: true, comp: 'Loss analysis', kw: ['planned', 'unplanned', 'external'] },
        { id: 'S4-T1-b', label: 'Identifies double counting (field-level entries plus well-level entries for the same event)', xp: 15, core: true, ach: 'loss-auditor', kw: ['double|overlap|duplicate', 'field-level|FIELD|well-level'] },
        { id: 'S4-T1-c', label: 'Finds recurring events and plausible common causes (K17-02 choke erosion x3, compressor trips x3 [scrubber level], power trips x3)', xp: 10, kw: ['recurr|repeat|three|3', 'common cause|root cause|scrubber|erosion|sand'] },
        { id: 'S4-T1-d', label: 'Identifies a loss that is NOT in the log (compressor derate visible as separator pressure rising in July 2026; or GOR-control choke-back not estimated)', xp: 15, ach: 'evidence-based-engineer', comp: 'Independent evidence', kw: ['not logged|unlogged|missing|not in the log|no entry', 'derate|pressure|compress|GOR'] },
        { id: 'S4-T1-e', label: 'Distinguishes recorded deferment from independently calculated potential, and states method limitations (trend, interaction, assumption of continuation)', xp: 10, core: true, kw: ['recorded', 'calculated|counterfactual|baseline', 'limitation|assum|trend|decline'] },
        { id: 'S4-T1-f', label: 'Complete, traceable stage deliverable', xp: 20, kw: ['.'] },
      ],
      answerKey: `Truth (hidden): events and true oil losses (stb): EV-001 K17-02 choke erosion 1,874; EV-002 power trip 9,233 (field, 0.6 day); EV-003 K17-05 workover 13,973 (planned, 12 d); EV-004 compressor trip 6,623; EV-005 MB pigging 0 (chokes critical so trunk pressure bump had no production effect, instructive); EV-006 external export outage 45,756; EV-007 K17-08 sand restriction 17,240 (operational, ~40 d); EV-008 power trip 6,773; EV-009 K17-02 erosion 1,375; EV-010 comp trip 5,237; EV-011 K17-04 flowline leak 788; EV-012 planned turnaround 38,338; EV-013 K17-02 erosion 1,219; EV-014 comp trip 6,156; EV-015 compressor derate 685 (UNLOGGED: visible only as separator pressure rising to ~168 psig average in July); EV-016 K17-06 ESD false trip 3,058; EV-017 power trip 6,466; EV-018 K17-09 GOR-control choke back 4,154 (log shows no estimate). Log double counting: for events EV-002,004,006,008,010,012,014,017 the log has a field-level entry plus 10 well-level entries each that repeat the same loss. Common causes: K17-02 choke erosion x3 (sand/erosion; choke trim material), compressor trips x3 (same scrubber high-high level cause), generator trips x3. Chronic compressor-limited backpressure (separator pressure above set-point) cost ~1,150 stb in total — small now but a leading indicator as GOR rises. Award credit for sound reasoning even if numbers differ; method limitations should include declining baseline, interacting wells, partial-day shutdowns. Do not leak true numbers in feedback; direct the user to the 'Check an event loss' tool.`,
    },
    {
      id: 'S4-T2', title: 'Rank the apparent losses (decision)', type: 'form',
      prompt: `**Decision point.** Six apparent losses, some with incomplete evidence. Rank them by **investigation priority** using magnitude, frequency, avoidability, confidence in the estimate and likely intervention cost.

1. Compressor C-101 trips (3 events, scrubber high-high level)
2. K17-02 choke washouts (3 events)
3. Planned facilities turnaround (April 2026)
4. Third-party export pipeline outage (Oct 2025)
5. K17-08 choke-back after sand production (Nov–Dec 2025)
6. Compressor C-101 performance in July 2026 (supporting evidence is incomplete)`,
      fields: [
        { key: 'rank', label: 'Your ranking (1 = investigate first)', kind: 'rank', items: ['Compressor C-101 trips', 'K17-02 choke washouts', 'Planned turnaround', 'Export pipeline outage (third party)', 'K17-08 sand choke-back', 'Compressor C-101 performance, July 2026'] },
        { key: 'why', label: 'Reasoning for the order, using the five criteria', kind: 'textarea' },
        { key: 'next', label: 'What additional evidence would change your ranking?', kind: 'textarea' },
      ],
      rubric: [
        { id: 'S4-T2-a', label: 'Applies magnitude, frequency, avoidability, confidence and cost explicitly', xp: 10, core: true, comp: 'Prioritisation', kw: ['magnitude', 'frequen', 'avoid', 'confiden', 'cost'] },
        { id: 'S4-T2-b', label: 'Treats planned and external losses appropriately (low avoidability) instead of ranking by size alone', xp: 10, kw: ['planned|external|third.party', 'avoid|control'] },
        { id: 'S4-T2-c', label: 'Links the compressor items to the wider gas-handling question and the later capacity study', xp: 10, ach: 'systems-thinker', kw: ['compress', 'gas|capacity|GOR'] },
        { id: 'S4-T2-d', label: 'States what evidence would change the ranking (e.g. compressor test, root-cause data, sand-control cost)', xp: 10, kw: ['evidence|test|data|would change'] },
      ],
      answerKey: 'No unique order. Defensible: compressor trips (recurring, same cause, avoidable, links to gas constraint) and compressor degradation (small now but leading indicator; incomplete evidence -> cheap investigation via compressor test) rank high; K17-08 sand (large but avoidance may be costly/uncertain) medium-high; choke washouts (small, cheap fix, recurrent) are quick-win; turnaround is planned/necessary (optimise scope/duration, low priority for avoidance); export outage external and unavoidable by the asset (low priority; note mitigation like storage). Accept different orders when reasoned. Flawed: ranking purely by size (export outage first) with no avoidability consideration.',
    },
  ],
  gate: 'The loss estimates must be traceable to the evidence or to clearly documented assumptions.',
  competencies: ['Loss analysis', 'Independent evidence', 'Prioritisation'],
};

// ----------------------------------------------------------------------------- STUBS 5-16 (from master prompt)
function stub(id, level, title, mission, packs, decision, gate) {
  return { id, level, title, mission, learning: [], packs, tasks: [], implemented: false, decisionPoint: decision, gate, theory: '', briefing: `## ${title}\n\n${mission}\n\n*This stage is defined in the master prompt but not yet implemented in this build. See docs/EXTENDING.md for how to add it.*\n\n**Decision point (from the spec):** ${decision}` };
}

const STUBS = [
  stub('S5', 3, 'Well performance and deliverability diagnosis', 'Establish what each well can produce and whether the limit is subsurface, wellbore/lift, or downstream backpressure.', ['03', '07'], 'Several underperforming wells with different symptoms: choose the most appropriate additional test or calculation for each.', 'Do not label a well a restoration candidate solely because it is shut in or below average. (Engine ready: K17-11 tubing restriction; K17-12 reservoir-limited.)'),
  stub('S6', 3, 'Network hydraulics and production interaction', 'Understand how wells interact through the shared gathering system.', ['04'], 'Adding a well raises total flow but may reduce existing wells\' rates: predict the response and name the extra information needed.', 'A large pressure drop alone does not prove that modifying that component will raise optimum production. (Engine ready: MB trunk dP vs critical-flow chokes.)'),
  stub('S7', 3, 'Facilities capacity and operating-envelope assessment', 'Determine constraints imposed by processing and utility systems.', ['05'], 'Two or more potential constraints: which first, and would added capacity actually raise the ceiling?', 'Capacity must be evaluated at relevant operating conditions; high utilisation vs nameplate is not proof of a bottleneck.'),
  stub('S8', 3, 'Build and validate the integrated engineering model', 'Connect reservoir, wells, network and facilities to predict system behaviour.', ['08'], 'A validation case where some predictions match and others do not: credible enough, recalibrate, or get more data?', 'Do not claim a definitive ceiling from a model that failed material validation. (Engine: server/src/engine/field.js is the reference solver to calibrate against.)'),
  stub('S9', 4, 'Define and calculate IPS capacity', 'Determine what the existing system can achieve under its operating limits.', [], 'Distinguish actual, highest feasible, sustainable, constraint-removed, and long-term economic potential.', 'State precisely what is maximised, under which constraints and over what time basis.'),
  stub('S10', 4, 'Constraint diagnosis and bottleneck verification', 'Determine which constraints genuinely prevent higher production.', [], 'Prioritise candidate bottlenecks, some of which look important but barely move the optimised rate.', 'A constraint is controlling only with evidence or a model experiment showing its effect.'),
  stub('S11', 5, 'Develop the intervention portfolio', 'Convert verified constraints into technically justified actions.', ['09'], 'Select opportunities to advance under a limited engineering budget.', 'Every shortlisted intervention must address a specific constraint or defensible opportunity.'),
  stub('S12', 5, 'Scenario modelling and optimization', 'Quantify the benefits of interventions and their combinations.', [], 'Compare at least two technically feasible options for economic evaluation.', 'Benefits are calculated against the same clearly defined base case.'),
  stub('S13', 6, 'Commercial and economic evaluation', 'Determine whether technical gains are commercially attractive.', ['10'], 'Rank competing projects with a clearly stated commercial criterion. (Engine: economics.js has NPV/IRR/payback.)', 'Do not use NPV/IRR/payback as a substitute for checking feasibility.'),
  stub('S14', 6, 'Uncertainty, risk and robustness', 'Establish how strongly the recommendations depend on uncertain assumptions.', ['11'], 'A plausible downside threatens a leading option: proceed, redesign, defer or reject?', 'Separate uncertainties that change magnitude from those that could reverse the decision.'),
  stub('S15', 7, 'Implementation planning and production assurance', 'Translate the recommendation into an executable, measurable plan.', ['12'], 'Sequence interventions that compete for the same shutdown window or resources.', 'Every recommendation needs an execution pathway and a way to verify the benefit.'),
  stub('S16', 7, 'Final management review and technical defence', 'Defend the completed study as to an asset management committee.', [], 'Answer challenging but fair review-panel questions.', 'Distinguish simulation findings from claims needing fresh verification on a real field.'),
];

export const STAGES = [S0, S1, S2, S3, S4, ...STUBS];
export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));
export const TASK_BY_ID = Object.fromEntries(STAGES.flatMap((s) => s.tasks.map((t) => [t.id, { ...t, stageId: s.id }])));

// Neutral wording shown to the browser for criteria whose real label would give away an answer.
const PUB = {
  'S0-T2-b': 'Explains why the candidate objectives can diverge in this system',
  'S1-T3-b': 'Explains how the boundary choice can change the calculated ceiling',
  'S1-T3-d': 'Recognises an interaction between constraints',
  'S2-T1-c': 'Identifies missing data that could change the study outcome',
  'S2-T2-b': 'Prioritises data by its effect on the ceiling conclusion or on avoiding a wrong investment',
  'S2-T2-c': 'Justifies what is skipped without ignoring its risk',
  'DQ-1': 'Data-quality issue 1 of 7 (find it)', 'DQ-2': 'Data-quality issue 2 of 7 (find it)', 'DQ-3': 'Data-quality issue 3 of 7 (find it)',
  'DQ-4': 'Data-quality issue 4 of 7 (find it)', 'DQ-5': 'Data-quality issue 5 of 7 (find it)', 'DQ-6': 'Data-quality issue 6 of 7 (find it)', 'DQ-7': 'Data-quality issue 7 of 7 (find it)',
  'S3-T1-core': 'Logs at least four genuine issues with evidence and a defensible treatment',
  'S3-T2-a': 'Baseline window is defensible for the current configuration',
  'S3-T2-c': 'Identifies the material trends',
  'S4-T1-c': 'Finds recurring events and plausible common causes',
  'S4-T1-d': 'Identifies a loss that is not captured by the log',
  'S4-T2-c': 'Connects individual losses to the broader capacity question',
  'S4-T2-b': 'Treats avoidability sensibly rather than ranking by size alone',
};

/** Strip hidden fields for the browser. */
export function publicStage(s) {
  return {
    id: s.id, level: s.level, title: s.title, mission: s.mission, learning: s.learning, packs: s.packs, implemented: s.implemented,
    theory: s.theory, briefing: s.briefing, gate: s.gate, competencies: s.competencies || [], decisionPoint: s.decisionPoint,
    tasks: s.tasks.map((t) => ({
      id: t.id, title: t.title, type: t.type, prompt: t.prompt, fields: t.fields,
      rubric: t.rubric.map((c) => ({ id: c.id, label: PUB[c.id] || c.label, xp: c.xp, core: !!c.core })),
    })),
  };
}
