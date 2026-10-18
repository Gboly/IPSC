// Data packs: what the user is allowed to see, projected from the canonical field record.
// SIMULATION ONLY - FICTIONAL FIELD - SYNTHETIC DATA - NOT REPRESENTATIVE OF ANY VERIFIED COMPANY ASSET.
import { WELLS } from '../engine/field.js';
import { loadData, publicProdRows, toCsv, PROD_COLUMNS } from '../engine/data.js';

export const BANNER = 'SIMULATION ONLY — FICTIONAL FIELD — SYNTHETIC DATA — NOT REPRESENTATIVE OF ANY VERIFIED COMPANY ASSET.';

const FIRST_OIL = { 'K17-01': '2009-11', 'K17-02': '2010-02', 'K17-03': '2010-06', 'K17-04': '2011-03', 'K17-05': '2011-09', 'K17-06': '2013-01', 'K17-07': '2013-05', 'K17-08': '2014-08', 'K17-09': '2015-02', 'K17-10': '2016-04', 'K17-11': '2012-07', 'K17-12': '2017-10' };

function wellInventory() {
  return WELLS.map((w) => ({
    well_id: w.id, reservoir: w.res === 'A' ? 'Sand A' : 'Sand B', manifold: w.man === 'MA' ? 'Manifold A' : 'Manifold B',
    status_at_2026_09_30: w.nonProducing === 'shut-in' ? 'SHUT-IN' : w.nonProducing === 'idle' ? 'IDLE' : 'PRODUCING',
    lift: 'Natural flow', tubing_nominal_in: w.tubingId > 3.5 ? 4.5 : 3.5, tvd_ft: w.tvd, md_ft: w.md, first_oil: FIRST_OIL[w.id],
  }));
}

const SCHEMATIC = {
  nodes: [
    { id: 'SA', label: 'Sand A\n(K17-01…05, 11)', kind: 'reservoir', x: 70, y: 70 },
    { id: 'SB', label: 'Sand B\n(K17-06…10, 12)', kind: 'reservoir', x: 70, y: 250 },
    { id: 'WA', label: 'Wellheads + chokes\nA-sand wells', kind: 'well', x: 250, y: 70 },
    { id: 'WB', label: 'Wellheads + chokes\nB-sand wells', kind: 'well', x: 250, y: 250 },
    { id: 'MA', label: 'Manifold A', kind: 'manifold', x: 430, y: 70 },
    { id: 'MB', label: 'Manifold B', kind: 'manifold', x: 430, y: 250 },
    { id: 'V100', label: 'V-100\nProduction separator', kind: 'process', x: 610, y: 160 },
    { id: 'V102', label: 'V-102 scrubber\n+ C-101 compressor', kind: 'process', x: 790, y: 60 },
    { id: 'GAS', label: 'Gas sales / fuel gas\n(+ flare FL-1)', kind: 'boundary', x: 970, y: 60 },
    { id: 'TK', label: 'T-301 tanks +\nP-301 export pumps', kind: 'process', x: 790, y: 160 },
    { id: 'EXP', label: 'Third-party export\npipeline', kind: 'boundary', x: 970, y: 160 },
    { id: 'WT', label: 'V-120 water treatment\n+ disposal pumps', kind: 'process', x: 790, y: 270 },
    { id: 'WDW', label: 'Disposal well WDW-1', kind: 'boundary', x: 970, y: 270 },
    { id: 'PWR', label: 'Power: GEN-A / GEN-B', kind: 'utility', x: 610, y: 330 },
  ],
  edges: [
    ['SA', 'WA', 'inflow'], ['SB', 'WB', 'inflow'], ['WA', 'MA', 'flowlines'], ['WB', 'MB', 'flowlines'],
    ['MA', 'V100', 'trunk A'], ['MB', 'V100', 'trunk B'], ['V100', 'V102', 'gas'], ['V102', 'GAS', 'gas'],
    ['V100', 'TK', 'oil'], ['TK', 'EXP', 'oil'], ['V100', 'WT', 'water'], ['WT', 'WDW', 'water'],
  ],
};

const PACKS = {
  '00': {
    title: 'Simulation Charter and Initial Asset Overview', stage: 'S0',
    purpose: 'Give you just enough to write the project charter: what the asset is, why the study is requested, and what is not yet known.',
    datasets: [
      { id: 'P00-OVERVIEW', name: 'Asset overview (narrative)', source: 'Fictional asset team', resolution: 'n/a', units: 'n/a', records: 1, limitations: 'Qualitative. No rates or pressures yet.' },
      { id: 'P00-FAC', name: 'High-level facility description', source: 'Fictional facilities group', resolution: 'n/a', units: 'n/a', records: 8, limitations: 'No capacities released at this stage.' },
      { id: 'P00-UNK', name: 'Initial unknowns list', source: 'Study sponsor', resolution: 'n/a', units: 'n/a', records: 4, limitations: 'Sponsor perception, not verified.' },
    ],
    markdown: `
**Model Field K-17** is a mature onshore oil field in a fictional Niger-Delta-like setting. First oil was in 2009. Production comes from two stacked sandstone reservoirs (**Sand A**, shallow; **Sand B**, deeper, with a small gas cap) by natural flow.

- **Wells:** 12 drilled — 10 producing, 1 shut-in, 1 idle.
- **Gathering:** wells flow through chokes and individual flowlines to two manifolds (A and B). Each manifold feeds one trunk line to the central production station.
- **Processing:** a single production separator (V-100). Gas is scrubbed, compressed (C-101) and sold or used as fuel; a small flare is permitted. Oil goes to tanks and is exported through a third-party pipeline. Produced water is treated and re-injected in a disposal well.
- **Utilities:** on-site gas-turbine power generation.

**Sponsor's concern.** Oil production has been declining faster than management expected, gas handling is said to be "tight", and several operational events have disrupted output. Management wants to know **what the existing system can really produce, what stops it producing more, and which improvements are worth doing.**`,
    tables: {
      facility_overview: [
        { area: 'Wells', description: '12 natural-flow wells in two reservoirs' },
        { area: 'Gathering', description: 'Chokes, flowlines, two manifolds, two trunk lines' },
        { area: 'Separation', description: 'One production separator (V-100); test separator available' },
        { area: 'Gas', description: 'Scrubber + compressor C-101; gas sales; permitted flare' },
        { area: 'Oil handling', description: 'Tanks and export pumps; third-party export pipeline' },
        { area: 'Water', description: 'Treatment vessel and disposal well' },
        { area: 'Power', description: 'Gas-turbine generators' },
        { area: 'Control/safety', description: 'ESD and instrumented protection (details later)' },
      ],
      initial_unknowns: [
        { id: 'U1', unknown: 'How much of the observed decline is reservoir depletion versus system limitation?' },
        { id: 'U2', unknown: 'What is the real capacity of the gas-handling system, compared with what the nameplate says?' },
        { id: 'U3', unknown: 'Which wells are under-performing, and why?' },
        { id: 'U4', unknown: 'How much of the lost production is recoverable, and at what cost?' },
      ],
    },
    dictionary: [['IPS', 'Integrated Production System — reservoir to custody-transfer point (for you to define precisely)'], ['IPSC', 'Integrated Production System Capacity (for you to define precisely)']],
    qualityFlags: ['Qualitative pack: no measured-like data are released at Stage 0.'],
    requiredWork: 'Draft the project charter: problem statement, definitions, objective, boundary hypothesis, metrics, reference date, horizon, assumptions, exclusions.',
    expectedOutput: 'A preliminary charter (Stage 0 form) and your reasoning for the primary production objective.',
    completionCriteria: 'A coherent, testable objective with a boundary hypothesis you can defend, and unknowns that map to data you will later request.',
  },

  '01': {
    title: 'Field Development, Reservoir and Well Inventory', stage: 'S1',
    purpose: 'Let you map the hydrocarbon pathway and identify which components, controls and boundaries can influence the production objective.',
    datasets: [
      { id: 'P01-WELLS', name: 'Well inventory', source: 'Fictional well file', resolution: 'static', units: 'ft, in', records: 12, limitations: 'No productivity or pressure data yet.' },
      { id: 'P01-RES', name: 'Reservoir summary', source: 'Fictional subsurface team', resolution: 'static', units: 'ft', records: 2, limitations: 'Qualitative; no pressures.' },
      { id: 'P01-EQUIP', name: 'Facility equipment list', source: 'Fictional facilities group', resolution: 'static', units: 'n/a', records: 16, limitations: 'Function and tag only. Capacities are not released (see Stage 7).' },
      { id: 'P01-SCHEM', name: 'Process block schematic', source: 'Fictional facilities group', resolution: 'static', units: 'n/a', records: 1, limitations: 'Simplified. No instrumentation shown.' },
    ],
    markdown: 'This pack supports **mapping**, not calculation. You will build the reservoir→sales/disposal pathway, then decide where your study boundary sits.',
    tables: {
      well_inventory: wellInventory(),
      reservoir_summary: [
        { reservoir: 'Sand A', tvd_range_ft: '7,100–7,400', drive: 'Natural depletion, weak aquifer support', wells: 'K17-01…05, K17-11', note: 'Shallower; water production rising' },
        { reservoir: 'Sand B', tvd_range_ft: '9,300–9,600', drive: 'Natural depletion, small gas cap', wells: 'K17-06…10, K17-12', note: 'Deeper; higher gas-oil ratio' },
      ],
      facility_equipment: [
        { tag: 'MAN-A', item: 'Manifold A', function: 'Commingles K17-01…05 and K17-12' },
        { tag: 'MAN-B', item: 'Manifold B', function: 'Commingles K17-06…11' },
        { tag: 'TL-A', item: 'Trunk line A (8 in)', function: 'Manifold A → separator' },
        { tag: 'TL-B', item: 'Trunk line B (8 in)', function: 'Manifold B → separator' },
        { tag: 'V-100', item: 'Production separator', function: 'Three-phase separation (oil/water/gas)' },
        { tag: 'V-110', item: 'Test separator', function: 'Well testing' },
        { tag: 'V-102', item: 'Compressor suction scrubber', function: 'Liquid knock-out ahead of C-101' },
        { tag: 'C-101', item: 'Gas compressor', function: 'Compresses separator gas to sales pressure' },
        { tag: 'FL-1', item: 'Flare', function: 'Permitted relief/excess gas disposal' },
        { tag: 'T-301', item: 'Oil storage tanks', function: 'Buffer ahead of export' },
        { tag: 'P-301', item: 'Export pumps', function: 'Pump oil into third-party pipeline' },
        { tag: 'EXP-1', item: 'Third-party export pipeline', function: 'Custody transfer of oil (not operated by the asset)' },
        { tag: 'V-120', item: 'Produced water treatment', function: 'Oil-in-water clean-up before disposal' },
        { tag: 'WDW-1', item: 'Water disposal well', function: 'Re-injection of treated produced water' },
        { tag: 'GEN-A/B', item: 'Gas-turbine generators', function: 'Site power' },
        { tag: 'ESD', item: 'Emergency shutdown system', function: 'Shuts in wells/facilities on safety trips' },
      ],
    },
    schematic: SCHEMATIC,
    dictionary: [['TVD / MD', 'True vertical / measured depth, ft'], ['Choke', 'Surface bean controlling flow (size in 64ths of an inch, released in Pack 02)'], ['Boundary condition', 'A fixed or externally set condition at the edge of your study']],
    qualityFlags: ['Equipment capacities are intentionally withheld until Stage 7.', 'Schematic is block-level; elevation and routing detail come with Pack 04 (Stage 6).'],
    requiredWork: 'Build the hydrocarbon pathway, inventory, interface register and an initial list of suspected constraints.',
    expectedOutput: 'Asset description, component/interface register, boundary decision and preliminary constraint map.',
    completionCriteria: 'The principal flow path and the major interfaces are identified, with each element classified as component, control variable, boundary condition or constraint.',
  },

  CAT: {
    title: 'Data Catalog and Available-Data Inventory', stage: 'S2',
    purpose: 'Show what data exist, what must be requested, what has known quality concerns and what needs new measurement, so you can plan acquisition under a limited effort allowance.',
    datasets: [{ id: 'CAT-INV', name: 'Data inventory', source: 'Fictional data room', resolution: 'n/a', units: 'n/a', records: 14, limitations: 'Availability states are as of the reference date.' }],
    markdown: 'You have a **100-point effort allowance** for additional acquisition (tests, studies, audits). Not everything is worth buying. The value of a dataset is how much it reduces uncertainty about the production ceiling or prevents a wrong investment.',
    tables: {
      data_inventory: [
        { id: 'D01', dataset: 'Daily well production and status', availability: 'Available now', source_dept: 'Production operations / allocation', note: 'Allocated volumes, not directly metered per well' },
        { id: 'D02', dataset: 'Separator and compressor daily data', availability: 'Available now', source_dept: 'Facilities / control room', note: 'Daily averages' },
        { id: 'D03', dataset: 'Operations event & deferment log', availability: 'Available now (Stage 4)', source_dept: 'Production operations', note: 'Compiled from shift reports' },
        { id: 'D04', dataset: 'Well test results (rate, GOR, WC, pressures)', availability: 'Partly available; last campaign dated', source_dept: 'Production technology', note: 'Several wells not tested for many months' },
        { id: 'D05', dataset: 'Static / flowing pressure surveys', availability: 'Must be requested; limited coverage', source_dept: 'Reservoir engineering', note: 'Sparse and old for several wells' },
        { id: 'D06', dataset: 'PVT reports', availability: 'Available (Stage 5)', source_dept: 'Reservoir engineering', note: 'One sample per sand, years old' },
        { id: 'D07', dataset: 'Flowline and manifold pressure surveys', availability: 'Needs new measurement', source_dept: 'Operations / instrumentation', note: 'Only manifold gauges exist' },
        { id: 'D08', dataset: 'Compressor C-101 performance data (capacity vs suction pressure)', availability: 'Needs new test', source_dept: 'Facilities / vendor', note: 'Only nameplate data on file' },
        { id: 'D09', dataset: 'Production allocation / metering audit', availability: 'Needs audit', source_dept: 'Allocation & metering', note: 'Meter changes may not have been propagated' },
        { id: 'D10', dataset: 'Facility equipment datasheets', availability: 'Available (Stage 7)', source_dept: 'Facilities engineering', note: 'Nameplate values' },
        { id: 'D11', dataset: 'Tubing/completion integrity & caliper logs', availability: 'Needs new measurement', source_dept: 'Well services', note: 'Expensive; wells must be intervened' },
        { id: 'D12', dataset: 'Reprocessed 3D seismic', availability: 'Needs new study', source_dept: 'Geosciences', note: 'Long lead time' },
        { id: 'D13', dataset: 'Economic assumptions (prices, costs, fiscal)', availability: 'Available (Stage 13)', source_dept: 'Commercial', note: 'Synthetic placeholders' },
        { id: 'D14', dataset: 'Separator internals inspection report', availability: 'Needs shutdown', source_dept: 'Inspection', note: 'Last internal inspection dated' },
      ],
      acquisition_options: [
        { option: 'A1', activity: 'Well test campaign on all producers (rate, WC, GOR, FBHP/WHP)', effort_points: 35 },
        { option: 'A2', activity: 'Static + flowing gradient surveys on 4 wells', effort_points: 30 },
        { option: 'A3', activity: 'Portable-gauge flowline & manifold pressure survey', effort_points: 15 },
        { option: 'A4', activity: 'Compressor C-101 performance test across suction pressures', effort_points: 25 },
        { option: 'A5', activity: 'Production allocation and meter-proving audit', effort_points: 15 },
        { option: 'A6', activity: 'New PVT sampling and lab analysis (both sands)', effort_points: 30 },
        { option: 'A7', activity: 'Reprocessing of 3D seismic', effort_points: 40 },
        { option: 'A8', activity: 'Separator V-100 internals inspection (needs shutdown)', effort_points: 20 },
        { option: 'A9', activity: 'Tubing caliper logs on all producers', effort_points: 35 },
        { option: 'A10', activity: 'Review historical event/deferment logs (already in hand)', effort_points: 5 },
      ],
    },
    dictionary: [['Effort points', 'Abstract unit combining cost, time and operational disruption']],
    qualityFlags: ['Availability labels are the data room\'s own; whether an "available" dataset is fit for purpose is for you to test (Stage 3).'],
    requiredWork: 'Create the data request register, then choose acquisitions under the 100-point allowance.',
    expectedOutput: 'Prioritised acquisition register, data-gap register, plan for resolving critical uncertainties.',
    completionCriteria: 'Each important dataset has a purpose, source, quality check and priority; selections are justified by value of information, not by completeness.',
  },

  '02': {
    title: 'Production History and Allocation Data', stage: 'S3',
    purpose: 'Establish what the field has actually been doing: well-level daily volumes and status, plus independent separator measurements, to build a traceable baseline.',
    datasets: [
      { id: 'P02-WELL-DAILY', name: 'Well daily production', file: 'production_daily.csv', source: 'Allocation system', resolution: 'daily', units: 'stb, bbl, Mscf (daily volumes)', records: 0, limitations: 'Allocated, not metered per well. Not guaranteed clean.' },
      { id: 'P02-FIELD-DAILY', name: 'Separator / field daily', file: 'field_daily.csv', source: 'Control room historian', resolution: 'daily', units: 'stb, bbl, Mscf, psig', records: 0, limitations: 'Metered at the separator; pressures are daily averages.' },
    ],
    markdown: `**History window:** 2025-04-01 to 2026-09-30 (reference date 2026-09-30).

Read the volumes carefully: **daily volumes are production on that day, not rates**. A well on for 12 hours produced half a day of volume. Calendar-day average rate, on-stream rate, uptime and cumulative production are all different things — which one a question needs is part of the exercise.`,
    tables: {},
    dictionary: [
      ['date', 'Calendar date (YYYY-MM-DD)'], ['well_id', 'Well identifier'], ['status', 'PRODUCING / SHUT-IN / IDLE as recorded that day'],
      ['hours_on', 'Hours on stream that day (0–24)'], ['choke_64ths', 'Choke size in 64ths of an inch'], ['whp_psig', 'Wellhead flowing pressure, psig'],
      ['oil_stb', 'Oil produced that day, stock-tank barrels'], ['water_bbl', 'Water produced that day, barrels'], ['gas_mscf', 'Gas produced that day, thousand standard cubic feet'],
      ['sep_psig', 'Production separator operating pressure, psig'], ['comp_suction_psig', 'Compressor C-101 suction pressure, psig'], ['man_a_psig / man_b_psig', 'Manifold pressures, psig'],
      ['sep_oil_stb / sep_water_bbl / sep_gas_mscf', 'Separator-metered daily totals'], ['flare_mscf', 'Gas flared, Mscf'], ['-999', 'Missing-value indicator used by the export'],
    ],
    qualityFlags: ['Well volumes are allocated from tests; they can differ from separator meters by a few percent.', 'The export tool was run by several people; consistency of units and codes has not been verified.', 'Treat the data as you would a real data pull: assume nothing is clean until you have checked it.'],
    requiredWork: 'Check structure/units; find data problems; compute field totals from well rows; trend oil, water cut and GOR; evaluate well contribution and availability; choose and defend a baseline period.',
    expectedOutput: 'Data-quality log, verified metrics, trend plots, baseline decision, short baseline report.',
    completionCriteria: 'Every baseline number is traceable to cleaned data and a documented window; adjustments are stated; incompatible operating periods are not mixed silently.',
  },

  '06': {
    title: 'Operations, Downtime and Deferment Records', stage: 'S4',
    purpose: 'Separate actual production from achievable production by classifying and quantifying losses, and by reconciling the log against independent evidence.',
    datasets: [{ id: 'P06-EVENTS', name: 'Operations event and deferment log', file: 'events_log.csv', source: 'Shift reports compiled by operations', resolution: 'event', units: 'stb (oil deferment)', records: 0, limitations: 'Estimates are the log\'s own. Not every event is logged; entries from different sources may overlap.' }],
    markdown: `The deferment column is **what the log claims**, not an independently calculated number. Your task is to decide what it means, what it misses, and what it double counts. Use Pack 02 as your independent evidence.`,
    tables: {},
    dictionary: [
      ['log_id', 'Log entry id'], ['event_ref', 'Reference of the underlying event (entries sharing a ref describe the same event)'], ['start_date / end_date', 'Inclusive dates'],
      ['duration_days', 'Calendar days spanned'], ['asset', 'Well, equipment, or FIELD'], ['category', 'PLANNED / UNPLANNED / EXTERNAL / OPERATIONAL'], ['cause_code', 'Short cause code'],
      ['recorded_deferment_stb', 'Operator\'s estimate of oil deferred, stb; -999 when not estimated'], ['comment', 'Free text'],
    ],
    qualityFlags: ['Some events appear as both a field-level entry and well-level entries.', 'Some conditions that cost production may have no log entry at all.', 'Recorded deferment methods are not documented.'],
    requiredWork: 'Build the loss tree and register; classify and quantify; identify overlaps; separate recorded deferment from calculated potential; rank loss opportunities.',
    expectedOutput: 'Loss register, reconciliation, efficiency assessment, prioritised opportunities.',
    completionCriteria: 'Every loss estimate is traceable to evidence or an explicit assumption; double counting is identified; limitations of the counterfactual method are stated.',
  },
};

/** Pack tables that are large are served as CSV files only. */
export function packFiles(packId) {
  const d = loadData();
  if (packId === '02') {
    return {
      'production_daily.csv': toCsv(publicProdRows(d.dirty), PROD_COLUMNS),
      'field_daily.csv': toCsv(d.fieldDaily, ['date', 'sep_psig', 'comp_suction_psig', 'man_a_psig', 'man_b_psig', 'sep_oil_stb', 'sep_water_bbl', 'sep_gas_mscf', 'flare_mscf']),
    };
  }
  if (packId === '06') {
    const rows = d.eventsLog.map((r) => ({ ...r, recorded_deferment_stb: r.recorded_deferment_stb ?? -999 }));
    return { 'events_log.csv': toCsv(rows, ['log_id', 'event_ref', 'start_date', 'end_date', 'duration_days', 'asset', 'category', 'cause_code', 'description', 'recorded_deferment_stb', 'comment']) };
  }
  const p = PACKS[packId];
  const files = {};
  if (p) for (const [name, rows] of Object.entries(p.tables)) if (rows.length) files[`${name}.csv`] = toCsv(rows);
  return files;
}

export function packIndex() {
  return Object.entries(PACKS).map(([id, p]) => ({ id, title: p.title, stage: p.stage, version: '1.0' }));
}

export function getPack(packId) {
  const p = PACKS[packId];
  if (!p) return null;
  const files = packFiles(packId);
  const datasets = p.datasets.map((ds) => {
    if (!ds.file) return ds;
    const csv = files[ds.file] || '';
    return { ...ds, records: Math.max(0, csv.split('\n').length - 2) };
  });
  return { id: packId, version: '1.0', banner: BANNER, ...p, datasets, files: Object.keys(files) };
}

export function getPackCsv(packId, file) {
  return packFiles(packId)[file] || null;
}

export function packIdsForStage(stageId) {
  return Object.entries(PACKS).filter(([, p]) => p.stage === stageId).map(([id]) => id);
}
