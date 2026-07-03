/* ============================================================
   GOLDEN TEST VECTORS — spec §8. CI-blocking.
   Run: node js/freedom-engine.test.js   (exit 1 on any failure)
   Rounding: half-up, 2dp percentages, whole-dollar currency.
   ============================================================ */
var E = require('./freedom-engine.js');

var pass = 0, fail = 0;
function r2pct(frac) { return Math.round(frac * 100 * 100) / 100; } // 2dp percent, half-up
function rD(x) { return Math.round(x); }                            // whole dollar, half-up
function check(id, desc, actual, expected) {
  var ok = actual === expected;
  console.log((ok ? '  PASS ' : '  FAIL ') + id + '  ' + desc +
    (ok ? '' : '  → got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected)));
  ok ? pass++ : fail++;
}

console.log('FREEDOM ENGINE — golden vectors (§8)\n');

// V1 recoveryGain
check('V1a', 'recoveryGain -10%', r2pct(E.recoveryGain(0.10)), 11.11);
check('V1b', 'recoveryGain -20%', r2pct(E.recoveryGain(0.20)), 25.00);
check('V1c', 'recoveryGain -30%', r2pct(E.recoveryGain(0.30)), 42.86);
check('V1d', 'recoveryGain -50%', r2pct(E.recoveryGain(0.50)), 100.00);

// V2 geoMean + drag
check('V2a', 'geoMean [+28,-12]', r2pct(E.geoMean([0.28, -0.12])), 6.13);
check('V2b', 'geoMean [8,8]', r2pct(E.geoMean([0.08, 0.08])), 8.00);
check('V2c', 'drag = 1.87pp', r2pct(E.geoMean([0.08, 0.08]) - E.geoMean([0.28, -0.12])), 1.87);

// V3 capitalForIncome (must match live FAQ table)
check('V3a', 'capital $100K @ 4%', rD(E.capitalForIncome(100000, 0.04)), 2500000);
check('V3b', 'capital $100K @ 10%', rD(E.capitalForIncome(100000, 0.10)), 1000000);

// V4 requiredRate
check('V4', 'requiredRate 250K→1M/10y', r2pct(E.requiredRate(250000, 1000000, 10)), 14.87);

// V5 waiting multiplier
check('V5a', 'waitMult r=8% n=20 d=5 (3dp)', Math.round(E.waitingMultiplier(0.08, 20, 5) * 1000) / 1000, 1.685);
check('V5b', 'waiting heavier-lift %', Math.round((E.waitingMultiplier(0.08, 20, 5) - 1) * 1000) / 10, 68.5);

// V6 fv
check('V6', 'fv $1M @ 8% 10y', rD(E.fv(1000000, 0.08, 10)), 2158925);

// V7 fvAnnuity
check('V7', 'fvAnnuity $10K/yr @ 8% 10y end', rD(E.fvAnnuity(10000, 0.08, 10, 'end')), 144866);

// V8 fcr
check('V8', 'fcr 150K/120K', E.fcr(150000, 120000), 1.25);

// V9 feePathAUM vs Flat
var aum = E.feePathAUM(1000000, 0.08, 0.015, 10);
var flat = E.feePathFlat(1000000, 0.08, 10000, 10);
check('V9a', 'AUM terminal', rD(aum.terminal), 1877137);
check('V9b', 'Flat terminal', rD(flat.terminal), 2014059);
check('V9c', 'AUM terminal < Flat terminal', aum.terminal < flat.terminal, true);

// V10 sequencePath — identical mean, divergent terminals (regression-locked)
var badFirst = [-0.20, -0.10, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08];
var goodFirst = badFirst.slice().reverse();
var mean = function (a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; };
var sBad = E.sequencePath(1000000, badFirst, 50000);
var sGood = E.sequencePath(1000000, goodFirst, 50000);
check('V10a', 'identical arithmetic mean', r2pct(mean(badFirst)) === r2pct(mean(goodFirst)), true);
check('V10b', 'bad-first terminal (locked)', rD(sBad.terminal), 625000);
check('V10c', 'good-first terminal (locked)', rD(sGood.terminal), 859751);
check('V10d', 'terminals materially divergent', rD(sGood.terminal) - rD(sBad.terminal) > 200000, true);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) { process.exit(1); }
