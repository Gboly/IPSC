# SPOILERS — hidden truth of Model Field K-17

> Do not read this if you want to play the campaign blind. It lists every planted data-quality issue, the true event losses, and the intended constraint story. Generated from `server/data/k17_v1.json` (seed 17017).

## Planted data-quality issues (PACK 02)

| ID | Kind | Well | From | To | Note |
|---|---|---|---|---|---|
| DQ-1 | unit-inconsistency | K17-03 | 2026-01-12 | 2026-01-15 | Oil/water/gas entered in m3 (x0.159) instead of stb/bbl/Mscf-equivalent; rate looks like a ~84% drop with no change in choke/WHP. |
| DQ-2 | missing-records | K17-07 | 2025-12-02 | 2025-12-07 | Six consecutive daily rows absent (not zero). Well was actually producing normally. |
| DQ-3 | duplicate-record | K17-05 | 2026-02-18 | 2026-02-18 | Row appears twice; naive summation double counts the day. |
| DQ-4 | instrument-fault | K17-09 | 2026-05-02 | 2026-05-09 | Gas meter flatlined at 0 while oil/water normal; GOR = 0 is non-physical. |
| DQ-5 | meter-factor-step | FIELD | 2026-04-20 | 2026-09-30 | Separator oil meter reads about 3.6 percentage points higher relative to summed well allocation from 2026-04-20 (meter factor change not applied to allocation). |
| DQ-6 | sentinel-value | K17-06 | 2025-10-02 | 2025-10-03 | WHP recorded as 9999 (instrument fault code) rather than blank; would corrupt averages and trend plots. |
| DQ-7 | status-inconsistency | K17-10 | 2026-03-22 | 2026-03-22 | Status says SHUT-IN but 24 h of production reported; status flag stale. |

## Events and true oil losses (engine counterfactual, PACK 06)

`trueLossOilStb` = field oil with the event removed minus actual, other events left active. The log in PACK 06 reports `trueLoss x noise (about 12 percent)`, and repeats FIELD-level events as 10 extra well-level rows (double counting). EV-015 is deliberately not logged; EV-018 has no estimate.

| Event | Category | Cause | Asset | Dates | Days | True loss (stb oil) |
|---|---|---|---|---|---|---|
| EV-001 | UNPLANNED | CHOKE-EROSION | K17-02 | 2025-05-12 to 2025-05-13 | 2 | 1,874 |
| EV-002 | UNPLANNED | POWER-GEN-TRIP | FIELD | 2025-06-03 | 1 | 9,233 |
| EV-003 | PLANNED | WORKOVER | K17-05 | 2025-07-14 to 2025-07-25 | 12 | 13,973 |
| EV-004 | UNPLANNED | COMP-TRIP | C-101 | 2025-08-09 | 1 | 6,623 |
| EV-005 | PLANNED | PIGGING | TRUNK-MB | 2025-09-20 to 2025-09-23 | 4 | 0 |
| EV-006 | EXTERNAL | EXPORT-OUTAGE | EXPORT | 2025-10-15 to 2025-10-19 | 5 | 45,756 |
| EV-007 | OPERATIONAL | SAND-RESTRICT | K17-08 | 2025-11-22 to 2025-12-31 | 40 | 17,240 |
| EV-008 | UNPLANNED | POWER-GEN-TRIP | FIELD | 2026-01-05 | 1 | 6,773 |
| EV-009 | UNPLANNED | CHOKE-EROSION | K17-02 | 2026-02-10 to 2026-02-11 | 2 | 1,375 |
| EV-010 | UNPLANNED | COMP-TRIP | C-101 | 2026-03-03 | 1 | 5,237 |
| EV-011 | UNPLANNED | FLOWLINE-LEAK | K17-04 | 2026-03-18 to 2026-03-19 | 2 | 788 |
| EV-012 | PLANNED | TURNAROUND | FIELD | 2026-04-14 to 2026-04-16 | 3 | 38,338 |
| EV-013 | UNPLANNED | CHOKE-EROSION | K17-02 | 2026-05-27 to 2026-05-28 | 2 | 1,219 |
| EV-014 | UNPLANNED | COMP-TRIP | C-101 | 2026-06-16 | 1 | 6,156 |
| EV-015 | UNPLANNED | COMP-DERATE | C-101 | 2026-07-08 to 2026-07-30 | 23 | 685 |
| EV-016 | UNPLANNED | ESD-FALSE-TRIP | K17-06 | 2026-08-19 to 2026-08-20 | 2 | 3,058 |
| EV-017 | UNPLANNED | POWER-GEN-TRIP | FIELD | 2026-09-02 | 1 | 6,466 |
| EV-018 | OPERATIONAL | GOR-CONTROL | K17-09 | 2026-09-10 to 2026-09-17 | 8 | 4,154 |

Chronic: compressor-limited backpressure (separator pressure floating above setpoint) on 106 days, total oil loss about 1147 stb (small today, a leading indicator as GOR rises).

## Intended constraint story (for Stages 5–10)

* **Reservoir-driven decline dominates.** Sand A declines about 125 psi/yr, Sand B about 95 psi/yr; water cut rises from about 14 percent to 28 percent field-wide. Much of the oil decline is *not* a system constraint.
* **Gas handling is the emerging constraint.** C-101 nameplate is 12 MMscf/d but demonstrated capacity is 9.6 MMscf/d at 150 psig suction (capacity scales with suction pressure, capped at nameplate). K17-09 gas-cap breakthrough lifts field GOR from about 590 to 830 scf/stb, so gas utilisation approaches 100 percent late in the history. When gas exceeds capacity, separator pressure floats upward (up to the 190 psig PSV-limited ceiling) and non-critical wells lose rate.
* **Constraint interaction (the Systems Thinker lesson).** Lowering separator pressure would help backpressure-sensitive A-sand wells (high water cut, sub-critical chokes) but increases gas flow to a compressor that has little spare capacity: the gain migrates to the compressor constraint.
* **Red herring: Manifold B trunk.** It has a large pressure drop (partial restriction, kExtra = 2) but B-sand wells have **critical-flow** chokes, so removing it barely changes production. Pigging (EV-005) with a larger kExtra produced **zero** oil loss for the same reason.
* **K17-11** (shut-in): tubing restriction 0.6 (scale). Restricted it would flow far less than half its clean-tubing rate; restoration needs evidence (gradient survey / caliper) before it is called a candidate.
* **K17-12** (idle): low productivity (J = 0.55); deliverability is inflow-limited.
* **Allocation:** well allocation is consistent through the history; the separator oil meter reads about 3.6 points higher from 2026-04-20 (meter factor change not propagated). Anyone comparing well sums to separator totals across that date will see a false shortfall/gain.
