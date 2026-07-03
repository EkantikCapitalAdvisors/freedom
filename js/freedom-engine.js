/* ============================================================
   FREEDOM ENGINE — pure financial math for the calculator suite
   Zero UI deps, zero side effects. Every function is unit-tested
   against the golden vectors in freedom-engine.test.js (spec §8).
   Usable in the browser (window.FreedomEngine) and in Node (require).
   ============================================================ */
(function (global) {
  'use strict';

  // --- CORE --------------------------------------------------
  // Future value of a lump sum.
  function fv(pv, rate, years) {
    return pv * Math.pow(1 + rate, years);
  }

  // Future value of a level contribution stream. timing: 'end' (ordinary) | 'begin' (due).
  function fvAnnuity(pmt, rate, years, timing) {
    timing = timing || 'end';
    if (rate === 0) return pmt * years;
    var f = pmt * ((Math.pow(1 + rate, years) - 1) / rate);
    if (timing === 'begin') f *= (1 + rate);
    return f;
  }

  // CAGR required to grow pv -> fvTarget over `years`.
  function requiredRate(pv, fvTarget, years) {
    return Math.pow(fvTarget / pv, 1 / years) - 1;
  }

  // Level annual contribution required to reach fvTarget over `years` (inverse of fvAnnuity).
  function requiredContribution(fvTarget, rate, years, timing) {
    return fvTarget / fvAnnuity(1, rate, years, timing || 'end');
  }

  // Gain required to recover a drawdown: L / (1 - L). `loss` is a magnitude fraction (0.30 = -30%).
  function recoveryGain(loss) {
    var L = Math.abs(loss);
    return L / (1 - L);
  }

  // Geometric mean of a return series (fractions). The volatility-drag engine.
  function geoMean(returns) {
    var prod = returns.reduce(function (a, r) { return a * (1 + r); }, 1);
    return Math.pow(prod, 1 / returns.length) - 1;
  }

  // Required-contribution multiplier from delaying d years of an n-year plan.
  // [(1+r)^n - 1] / [(1+r)^(n-d) - 1]
  function waitingMultiplier(rate, n, d) {
    return (Math.pow(1 + rate, n) - 1) / (Math.pow(1 + rate, n - d) - 1);
  }

  // Capital needed to throw off `income` at a given yield fraction.
  function capitalForIncome(income, yieldFrac) {
    return income / yieldFrac;
  }

  // Freedom Coverage Ratio: support income / expenses.
  function fcr(supportIncome, expenses) {
    return supportIncome / expenses;
  }

  // AUM-fee path. Net return = gross - feePct (fee assessed on assets).
  // Returns terminal, cumulative fees (on start-of-year balance), and the
  // opportunity cost of those fees (lost compounding).
  function feePathAUM(pv, gross, feePct, years) {
    var net = gross - feePct;
    var terminal = pv * Math.pow(1 + net, years);
    var cumFees = 0, bal = pv;
    for (var k = 0; k < years; k++) {
      cumFees += feePct * bal;   // fee on beginning-of-year balance
      bal *= (1 + net);
    }
    var noFee = pv * Math.pow(1 + gross, years);
    var lostCompounding = (noFee - terminal) - cumFees;
    return { terminal: terminal, cumFees: cumFees, lostCompounding: lostCompounding };
  }

  // Flat-fee path. Grow at gross, subtract flatFee at year end.
  function feePathFlat(pv, gross, flatFee, years) {
    var bal = pv;
    for (var k = 0; k < years; k++) {
      bal = bal * (1 + gross) - flatFee;
    }
    var cumFees = flatFee * years;
    var noFee = pv * Math.pow(1 + gross, years);
    var lostCompounding = (noFee - bal) - cumFees;
    return { terminal: bal, cumFees: cumFees, lostCompounding: lostCompounding };
  }

  // Sequence-of-returns engine. Grow then withdraw each year. Returns terminal
  // plus the year-by-year balance path (for charting).
  function sequencePath(pv, returns, withdrawal) {
    var bal = pv, path = [pv];
    for (var k = 0; k < returns.length; k++) {
      bal = bal * (1 + returns[k]) - withdrawal;
      path.push(bal);
    }
    return { terminal: bal, path: path };
  }

  // --- FORMAT (port of roi_calculator.jsx fmt/fmtD/fmtPct) ----
  function fmtD(x) {
    return '$' + Math.round(x).toLocaleString('en-US');
  }
  function fmt(x, dp) {
    dp = dp == null ? 0 : dp;
    return Number(x).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  function fmtPct(frac, dp) {
    dp = dp == null ? 2 : dp;
    return (frac * 100).toFixed(dp) + '%';
  }

  var FreedomEngine = {
    fv: fv, fvAnnuity: fvAnnuity, requiredRate: requiredRate, requiredContribution: requiredContribution,
    recoveryGain: recoveryGain, geoMean: geoMean, waitingMultiplier: waitingMultiplier,
    capitalForIncome: capitalForIncome, fcr: fcr,
    feePathAUM: feePathAUM, feePathFlat: feePathFlat, sequencePath: sequencePath,
    fmtD: fmtD, fmt: fmt, fmtPct: fmtPct
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FreedomEngine;
  } else {
    global.FreedomEngine = FreedomEngine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
