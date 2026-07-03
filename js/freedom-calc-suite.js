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

  // ---------- CALC-02 · Freedom Number + FCR Gauge ----------
  function initFreedomNumber() {
    var exp = $('fnExpenses'); if (!exp) return;
    var income = $('fnIncome');
    var chips = Array.prototype.slice.call(document.querySelectorAll('#calc-freedom-number .fchip'));
    var RATES = [0.04, 0.06, 0.07, 0.08, 0.10];
    var activeRate = 0.04;

    function render() {
      var annual = (+exp.value) * 12;
      $('fnExpVal').textContent = E.fmtD(+exp.value) + '/mo';
      $('fnNumber').textContent = E.fmtD(E.capitalForIncome(annual, activeRate));

      var caps = RATES.map(function (r) { return E.capitalForIncome(annual, r); });
      var max = Math.max.apply(null, caps);
      RATES.forEach(function (r, i) {
        var row = $('fnBar-' + Math.round(r * 100));
        if (!row) return;
        row.querySelector('.fbar-fill').style.width = (caps[i] / max * 100) + '%';
        row.querySelector('.fbar-amt').textContent = E.fmtD(caps[i]);
        row.classList.toggle('is-active', Math.abs(r - activeRate) < 1e-9);
      });

      var inc = income && income.value ? +income.value : 0;
      var fill = $('fnGaugeFill'), status = $('fnStatus'), hint = $('fnHint');
      if (inc > 0) {
        var ratio = E.fcr(inc, annual);
        fill.style.width = (Math.min(ratio / 2, 1) * 100) + '%';
        var color = ratio >= 1.25 ? '#C8A951' : (ratio >= 1.0 ? '#D9B44A' : '#C0392B');
        fill.style.background = color; status.style.color = color;
        status.textContent = 'FCR = ' + ratio.toFixed(2) +
          (ratio >= 1.25 ? ' · freedom, with margin' : ratio >= 1.0 ? ' · covered, no margin' : ' · not yet covered');
        hint.textContent = '';
      } else {
        fill.style.width = '0%'; status.textContent = '';
        hint.textContent = 'Add your current support income to see your Freedom Coverage Ratio.';
      }
    }
    exp.addEventListener('input', render);
    if (income) income.addEventListener('input', render);
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        activeRate = +c.dataset.rate;
        chips.forEach(function (x) { x.classList.remove('is-active'); });
        c.classList.add('is-active'); render();
      });
    });
    render();
  }

  // ---------- CALC-04 · Cost of Waiting Meter ----------
  function initCostOfWaiting() {
    var goal = $('cwGoal'); if (!goal) return;
    var years = $('cwYears'), rate = $('cwRate'), delay = $('cwDelay');
    var frame = 'lift', liveBase = 0, liveStart = null, liveEl = $('cwLive');

    function render() {
      var G = +goal.value, n = +years.value, r = +rate.value / 100, d = Math.min(+delay.value, n - 1);
      $('cwGoalVal').textContent = E.fmtD(G);
      $('cwYearsVal').textContent = n + ' yrs';
      $('cwRateVal').textContent = rate.value + '%';
      $('cwDelayVal').textContent = d + (d === 1 ? ' yr' : ' yrs');
      var now = E.requiredContribution(G, r, n);
      var later = E.requiredContribution(G, r, n - d);
      var mult = later / now;
      $('cwNow').textContent = E.fmtD(now) + '/yr';
      $('cwLater').textContent = E.fmtD(later) + '/yr';
      if (frame === 'lift') {
        $('cwHeadline').textContent = '+' + Math.round((mult - 1) * 100) + '%';
        $('cwHeadLabel').textContent = 'heavier annual lift from waiting ' + d + (d === 1 ? ' year' : ' years');
      } else {
        var short = G - E.fvAnnuity(now, r, n - d);
        $('cwHeadline').textContent = E.fmtD(short);
        $('cwHeadLabel').textContent = 'short of goal if you wait ' + d + (d === 1 ? ' year' : ' years') + ' but keep the same contribution';
      }
      $('cwWarn').style.display = (r > 0.10) ? 'block' : 'none';
      liveBase = G * r / (365 * 24 * 3600);
      $('cwHook').innerHTML = 'Waiting ' + d + (d === 1 ? ' year' : ' years') + ' doesn’t cost ' + d +
        (d === 1 ? ' year' : ' years') + '. <strong>At ' + rate.value + '%, it’s a ' + Math.round((mult - 1) * 100) + '% heavier annual lift.</strong>';
    }
    Array.prototype.forEach.call(document.querySelectorAll('#calc-cost-of-waiting .fcalc__toggle button'), function (btn) {
      btn.addEventListener('click', function () {
        frame = btn.dataset.frame;
        Array.prototype.forEach.call(document.querySelectorAll('#calc-cost-of-waiting .fcalc__toggle button'), function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active'); render();
      });
    });
    [goal, years, rate, delay].forEach(function (el) { if (el) el.addEventListener('input', render); });
    render();
    if (liveEl) {
      liveStart = performance.now();
      setInterval(function () { liveEl.textContent = E.fmtD(liveBase * (performance.now() - liveStart) / 1000); }, 200);
    }
  }

  // ---------- CALC-03 · Fee Drag Comparator ----------
  function initFeeDrag() {
    var pv = $('fdPortfolio'); if (!pv) return;
    var gross = $('fdGross'), aumFee = $('fdAum'), flatFee = $('fdFlat'), horizon = $('fdYears');

    function crossoverYear(P, g, af, threshFrac) {
      var net = g - af, bal = P, cum = 0, thresh = threshFrac * P;
      for (var k = 1; k <= 40; k++) { cum += af * bal; bal *= (1 + net); if (cum > thresh) return k; }
      return null;
    }
    function render() {
      var P = +pv.value, g = +gross.value / 100, af = +aumFee.value / 100, ff = +flatFee.value, n = +horizon.value;
      $('fdPortfolioVal').textContent = E.fmtD(P);
      $('fdGrossVal').textContent = gross.value + '%';
      $('fdAumVal').textContent = (+aumFee.value).toFixed(2) + '%';
      $('fdFlatVal').textContent = E.fmtD(ff) + '/yr';
      $('fdYearsVal').textContent = n + ' yrs';
      var aum = E.feePathAUM(P, g, af, n), flat = E.feePathFlat(P, g, ff, n);
      var gap = flat.terminal - aum.terminal;
      $('fdGap').textContent = E.fmtD(Math.abs(gap));
      $('fdGapLabel').textContent = (gap >= 0 ? 'more wealth on the flat-fee path over ' : 'less on the flat-fee path over ') + n + ' years';
      $('fdAumFees').textContent = E.fmtD(aum.cumFees);
      $('fdFlatFees').textContent = E.fmtD(flat.cumFees);
      $('fdLost').textContent = E.fmtD(aum.lostCompounding);
      var cross = crossoverYear(P, g, af, 0.10);
      $('fdCross').textContent = cross ? ('Year ' + cross) : 'beyond the horizon';
      var maxFee = Math.max(aum.cumFees, flat.cumFees, 1);
      $('fdAumBar').style.width = (aum.cumFees / maxFee * 100) + '%';
      $('fdFlatBar').style.width = (flat.cumFees / maxFee * 100) + '%';
      $('fdWarn').style.display = (g > 0.10) ? 'block' : 'none';
    }
    [pv, gross, aumFee, flatFee, horizon].forEach(function (el) { if (el) el.addEventListener('input', render); });
    render();
  }

  function init() {
    initVolatilityTax(); initVolatilityJourney();
    initFreedomNumber(); initCostOfWaiting(); initFeeDrag();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
