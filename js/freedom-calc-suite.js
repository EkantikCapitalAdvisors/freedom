/* ============================================================
   FREEDOM CALCULATOR SUITE — widget controllers
   CALC-01 · Volatility Tax Meter (+ G2 Asymmetry Seesaw)
   Sits on the tested FreedomEngine (js/freedom-engine.js).
   ============================================================ */
(function () {
  'use strict';
  var E = window.FreedomEngine;
  if (!E) { console.error('FreedomEngine not loaded'); return; }

  var $ = function (id) { return document.getElementById(id); };
  function map(x, a, b, c, d) { return c + (d - c) * (x - a) / (b - a); }

  // ---------- CALC-01 · Volatility Tax Meter ----------
  function initVolatilityTax() {
    var loss = $('vtLoss'), rate = $('vtRate');
    if (!loss || !rate) return; // widget not on page

    function render() {
      var L = +loss.value / 100;          // drawdown magnitude
      var r = +rate.value / 100;          // recovery rate
      var gain = E.recoveryGain(L);       // L/(1-L)
      var gainPct = gain * 100;

      $('vtLossVal').textContent = '−' + loss.value + '%';
      $('vtRateVal').textContent = rate.value + '%';
      $('vtRecovery').textContent = gainPct.toFixed(gainPct >= 100 ? 0 : 2) + '%';

      // years to recover: (1+r)^t = 1/(1-L)
      var years = Math.log(1 / (1 - L)) / Math.log(1 + r);
      $('vtYears').textContent = '≈ ' + years.toFixed(1) + ' years to climb back at ' + rate.value + '%/yr';

      $('vtHook').innerHTML = 'Lose ' + loss.value + '%, and you need ' + Math.round(gainPct) +
        '% just to get back to even. <strong>The market doesn’t refund your time.</strong>';

      drawSeesaw(+loss.value, gainPct);
    }

    function drawSeesaw(lossPct, recPct) {
      var plank = $('vtPlank');
      if (!plank) return;
      // left (loss) dips down, right (recovery) rises up
      var angle = map(lossPct, 5, 60, 4, 22);
      // negative = counter-clockwise in SVG's y-down space → left (loss) dips down, right (recovery) rises
      plank.setAttribute('transform', 'rotate(' + (-angle) + ' 200 150)');
      // weight sizes — recovery weight visibly heavier (the asymmetry)
      var rLoss = 8 + lossPct * 0.22;
      var rRec = 8 + Math.min(recPct, 150) * 0.28;
      $('vtWLoss').setAttribute('r', rLoss.toFixed(1));
      $('vtWRec').setAttribute('r', rRec.toFixed(1));
    }

    loss.addEventListener('input', render);
    rate.addEventListener('input', render);
    render();
  }

  // ---------- CALC-01 panel 2 · Same average, different journey ----------
  function initVolatilityJourney() {
    var mean = $('vtMean'), vol = $('vtVol');
    if (!mean || !vol) return;
    var BASE = 100000, YEARS = 10;

    function render() {
      var m = +mean.value / 100, v = +vol.value / 100;
      $('vtMeanVal').textContent = mean.value + '%';
      $('vtVolVal').textContent = '±' + vol.value + '%';

      var steadyTerm = E.fv(BASE, m, YEARS);            // geo == arithmetic
      var rets = [];
      for (var i = 0; i < YEARS; i++) rets.push(i % 2 === 0 ? m + v : m - v);
      var volGeo = E.geoMean(rets);
      var volTerm = rets.reduce(function (b, r) { return b * (1 + r); }, BASE);
      var gap = steadyTerm - volTerm;

      $('vtSteady').textContent = E.fmtD(steadyTerm);
      $('vtVolatile').textContent = E.fmtD(volTerm);
      $('vtSteadyGeo').textContent = 'geometric ' + E.fmtPct(m, 2) + '/yr';
      $('vtVolatileGeo').textContent = 'geometric ' + E.fmtPct(volGeo, 2) + '/yr';
      $('vtGap').textContent = (gap >= 0 ? '−' : '+') + E.fmtD(Math.abs(gap)) +
        ' vs the steady path — same average return';
    }

    mean.addEventListener('input', render);
    vol.addEventListener('input', render);
    render();
  }

  function init() { initVolatilityTax(); initVolatilityJourney(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
