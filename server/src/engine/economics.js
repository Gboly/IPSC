// Incremental economics helpers (used from Stage 13). All inputs are synthetic.
// cashflows: array of annual (or periodic) net cash flows, index 0 = time 0 (undiscounted).

export function npv(rate, flows) {
  return flows.reduce((a, cf, t) => a + cf / Math.pow(1 + rate, t), 0);
}

/** IRR by bisection; returns null when there is no sign change (IRR not meaningful). */
export function irr(flows, lo = -0.99, hi = 10) {
  const f = (r) => npv(r, flows);
  if (f(lo) * f(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/** simple payback in periods (linear interpolation within the crossing period), null if never */
export function payback(flows) {
  let cum = 0;
  for (let t = 0; t < flows.length; t++) {
    const prev = cum;
    cum += flows[t];
    if (t > 0 && prev < 0 && cum >= 0) return t - 1 + -prev / flows[t];
  }
  return null;
}

/**
 * Incremental project cash flow.
 * p: { capex, opexPerYr, incOilStbd[], netbackUsdPerStb, royaltyFrac, taxFrac, lostProdStb, yearsOfIncOil[] ... }
 * Kept deliberately simple: pre-tax and post-tax lines are separated so Stage 13 can discuss fiscal terms.
 */
export function incrementalCashflow({ capex, deferralLossStb = 0, netbackUsdPerStb, incOilStbdByYear, opexPerYear = 0, royaltyFrac = 0, taxFrac = 0 }) {
  const flows = [-capex - deferralLossStb * netbackUsdPerStb];
  incOilStbdByYear.forEach((q) => {
    const rev = q * 365 * netbackUsdPerStb;
    const afterRoy = rev * (1 - royaltyFrac);
    const pre = afterRoy - opexPerYear;
    flows.push(pre * (1 - taxFrac));
  });
  return flows;
}
