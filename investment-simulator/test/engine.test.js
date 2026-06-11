"use strict";

/* Sanity tests for the simulation engine. Run: node test/engine.test.js */

const path = require("path");
const { ASSETS, DEFAULT_CORR, cholesky, runSimulation, contributionSeries } = require(path.join(__dirname, "..", "js", "engine.js"));

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log("  ok  " + name);
  } else {
    failures++;
    console.error("FAIL  " + name + (detail ? " — " + detail : ""));
  }
}

const approx = (a, b, tol) => Math.abs(a - b) <= tol;

/* Cholesky reproduces the correlation matrix. */
{
  const L = cholesky(DEFAULT_CORR);
  const n = DEFAULT_CORR.length;
  let maxErr = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let v = 0;
      for (let k = 0; k < n; k++) v += L[i][k] * L[j][k];
      maxErr = Math.max(maxErr, Math.abs(v - DEFAULT_CORR[i][j]));
    }
  }
  check("cholesky reconstructs correlation matrix", maxErr < 1e-9, "maxErr=" + maxErr);
}

const global10y = { years: 10, sims: 400, seed: 42, inflation: 0.025, goal: 0 };

/* Pure cash compounds at ~the cash rate with almost no variance. */
{
  const cash = runSimulation(global10y, [{
    name: "cash", initial: 10000, monthly: 0, stepUpPct: 0,
    alloc: { cash: 100 }, glideTo: null, rebalance: "none",
    timing: { mode: "none" }, withdrawal: { startYear: 0, monthly: 0 },
  }]).results[0];
  const expected = 10000 * Math.exp((0.035 - 0.5 * 0.005 * 0.005) * 10);
  check("cash strategy compounds near the cash rate",
    approx(cash.metrics.medianFinal, expected, expected * 0.02),
    `median=${cash.metrics.medianFinal.toFixed(0)} expected≈${expected.toFixed(0)}`);
  // 0.5% annual vol over 10y ≈ 1.6% std of log value → p10–p90 ≈ 4%
  check("cash strategy has tight outcome range",
    (cash.metrics.p90Final - cash.metrics.p10Final) / cash.metrics.medianFinal < 0.06);
}

/* Determinism: same seed twice gives identical results. */
{
  const cfg = [{
    name: "a", initial: 5000, monthly: 200, stepUpPct: 5,
    alloc: { stocks: 70, bonds: 30 }, glideTo: null, rebalance: "yearly",
    timing: { mode: "none" }, withdrawal: { startYear: 0, monthly: 0 },
  }];
  const r1 = runSimulation(global10y, cfg).results[0];
  const r2 = runSimulation(global10y, cfg).results[0];
  check("same seed is fully deterministic", r1.metrics.medianFinal === r2.metrics.medianFinal);
  const r3 = runSimulation({ ...global10y, seed: 7 }, cfg).results[0];
  check("different seed gives different results", r1.metrics.medianFinal !== r3.metrics.medianFinal);
}

/* Stocks should out-earn cash in the median over 30 years, with wider spread. */
{
  const g = { years: 30, sims: 400, seed: 42, inflation: 0.025, goal: 0 };
  const base = { initial: 10000, monthly: 500, stepUpPct: 0, glideTo: null, rebalance: "none", timing: { mode: "none" }, withdrawal: { startYear: 0, monthly: 0 } };
  const res = runSimulation(g, [
    { ...base, name: "stocks", alloc: { stocks: 100 } },
    { ...base, name: "cash", alloc: { cash: 100 } },
  ]).results;
  check("stocks median beats cash median over 30y", res[0].metrics.medianFinal > res[1].metrics.medianFinal * 1.5);
  check("stocks have larger drawdowns than cash", res[0].metrics.medianMaxDrawdown > res[1].metrics.medianMaxDrawdown);
  check("invested totals match the contribution schedule",
    approx(res[0].metrics.totalContributed, 10000 + 500 * 360, 1));
}

/* Contribution series respects step-up. */
{
  const s = contributionSeries({ initial: 0, monthly: 100, stepUpPct: 10, withdrawal: { startYear: 0 } }, 24);
  check("step-up contributions grow yearly",
    approx(s[24], 100 * 12 + 110 * 12, 0.01), "got " + s[24]);
}

/* Withdrawals can fail: high withdrawal rate should show ruin risk. */
{
  const g = { years: 30, sims: 300, seed: 42, inflation: 0.025, goal: 0 };
  const r = runSimulation(g, [{
    name: "retiree", initial: 300000, monthly: 0, stepUpPct: 0,
    alloc: { stocks: 60, bonds: 40 }, glideTo: null, rebalance: "yearly",
    timing: { mode: "none" }, withdrawal: { startYear: 1, monthly: 3000, inflationAdjust: true },
  }]).results[0];
  check("aggressive withdrawals produce ruin in some paths", r.metrics.probRuin > 0.2, "probRuin=" + r.metrics.probRuin);
  check("portfolio value never goes negative", Math.min(...r.finals) >= 0);
}

/* Timing strategies run and stay sane. */
{
  const base = { initial: 10000, monthly: 500, stepUpPct: 0, glideTo: null, rebalance: "none", withdrawal: { startYear: 0, monthly: 0 } };
  const res = runSimulation(global10y, [
    { ...base, name: "dip", alloc: { stocks: 100 }, timing: { mode: "dip", dipPct: 15 } },
    { ...base, name: "momentum", alloc: { stocks: 100 }, timing: { mode: "momentum", lookback: 6 } },
    { ...base, name: "buy-hold", alloc: { stocks: 100 }, timing: { mode: "none" } },
  ]).results;
  for (const r of res) {
    check(`${r.strategy.name}: finals are finite and positive`, r.finals.every((v) => Number.isFinite(v) && v >= 0));
    check(`${r.strategy.name}: median is plausible (> half of invested)`, r.metrics.medianFinal > r.metrics.totalContributed * 0.5,
      `median=${r.metrics.medianFinal.toFixed(0)} invested=${r.metrics.totalContributed}`);
  }
  check("momentum reduces drawdown vs buy & hold", res[1].metrics.medianMaxDrawdown < res[2].metrics.medianMaxDrawdown,
    `momentum=${res[1].metrics.medianMaxDrawdown.toFixed(3)} bh=${res[2].metrics.medianMaxDrawdown.toFixed(3)}`);
}

/* Glide path ends less volatile than it starts: end-of-horizon drawdowns shrink. */
{
  const g = { years: 30, sims: 300, seed: 42, inflation: 0.025, goal: 0 };
  const base = { initial: 10000, monthly: 500, stepUpPct: 0, rebalance: "yearly", timing: { mode: "none" }, withdrawal: { startYear: 0, monthly: 0 } };
  const res = runSimulation(g, [
    { ...base, name: "glide", alloc: { stocks: 90, bonds: 10 }, glideTo: { stocks: 20, bonds: 70, cash: 10 } },
    { ...base, name: "static", alloc: { stocks: 90, bonds: 10 }, glideTo: null },
  ]).results;
  const spread = (r) => (r.bands.p90[360] - r.bands.p10[360]) / r.bands.p50[360];
  check("glide path narrows the outcome spread vs static 90/10", spread(res[0]) < spread(res[1]),
    `glide=${spread(res[0]).toFixed(2)} static=${spread(res[1]).toFixed(2)}`);
}

console.log(failures === 0 ? "\nAll tests passed." : `\n${failures} test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
