"use strict";

/* ============================================================
 * Strategy Lab — Monte Carlo investment simulation engine
 * Pure JS, no dependencies. Works in the browser and in Node.
 * ============================================================ */

/* ---------- Asset universe (annual nominal assumptions) ---------- */

const ASSETS = [
  { id: "stocks", name: "Global stocks", short: "STK", mu: 0.09,  sigma: 0.16 },
  { id: "em",     name: "EM / small-cap", short: "EM",  mu: 0.11,  sigma: 0.22 },
  { id: "bonds",  name: "Bonds",          short: "BND", mu: 0.045, sigma: 0.06 },
  { id: "gold",   name: "Gold",           short: "GLD", mu: 0.06,  sigma: 0.15 },
  { id: "reit",   name: "Real estate",    short: "RE",  mu: 0.08,  sigma: 0.17 },
  { id: "crypto", name: "Crypto",         short: "CRY", mu: 0.20,  sigma: 0.70 },
  { id: "cash",   name: "Cash / deposits", short: "CSH", mu: 0.035, sigma: 0.005 },
];

const CASH_INDEX = ASSETS.findIndex((a) => a.id === "cash");

/* Long-run monthly return correlations between the asset classes above. */
const DEFAULT_CORR = [
  [1.00, 0.85, 0.10, 0.05, 0.70, 0.40, 0.00],
  [0.85, 1.00, 0.05, 0.10, 0.65, 0.45, 0.00],
  [0.10, 0.05, 1.00, 0.20, 0.20, 0.00, 0.30],
  [0.05, 0.10, 0.20, 1.00, 0.10, 0.10, 0.05],
  [0.70, 0.65, 0.20, 0.10, 1.00, 0.30, 0.00],
  [0.40, 0.45, 0.00, 0.10, 0.30, 1.00, 0.00],
  [0.00, 0.00, 0.30, 0.05, 0.00, 0.00, 1.00],
];

/* ---------- Random numbers ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNormal(rng) {
  let spare = null;
  return function () {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u;
    do { u = rng(); } while (u <= 1e-12);
    const v = rng();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}

/* Cholesky factor of a correlation matrix (with diagonal jitter fallback). */
function cholesky(matrix) {
  const n = matrix.length;
  const L = Array.from({ length: n }, () => new Float64Array(n));
  for (let jitter = 0; jitter < 6; jitter++) {
    const bump = jitter === 0 ? 0 : Math.pow(10, jitter - 6);
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = matrix[i][j] + (i === j ? bump : 0);
        for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
        if (i === j) {
          if (sum <= 0) { ok = false; break; }
          L[i][i] = Math.sqrt(sum);
        } else {
          L[i][j] = sum / L[j][j];
        }
      }
    }
    if (ok) return L;
  }
  throw new Error("Correlation matrix is not positive definite");
}

/* ============================================================
 * Market paths
 *
 * Each simulation `s` regenerates the exact same correlated
 * monthly growth factors from seed (baseSeed + s), so every
 * strategy is tested against identical market histories —
 * differences in outcomes come from the strategy alone.
 * ============================================================ */

function generatePath(baseSeed, sim, months, assets, chol) {
  const n = assets.length;
  const normal = makeNormal(mulberry32((baseSeed + sim * 0x9e3779b9) >>> 0));
  const drift = new Float64Array(n);
  const vol = new Float64Array(n);
  for (let a = 0; a < n; a++) {
    drift[a] = (assets[a].mu - 0.5 * assets[a].sigma * assets[a].sigma) / 12;
    vol[a] = assets[a].sigma / Math.sqrt(12);
  }
  const factors = new Float64Array(months * n);
  const z = new Float64Array(n);
  for (let t = 0; t < months; t++) {
    for (let a = 0; a < n; a++) z[a] = normal();
    for (let a = 0; a < n; a++) {
      let eps = 0;
      for (let k = 0; k <= a; k++) eps += chol[a][k] * z[k];
      factors[t * n + a] = Math.exp(drift[a] + vol[a] * eps);
    }
  }
  return factors;
}

/* ---------- Strategy configuration ----------
 * {
 *   name, color,
 *   initial:    lump invested at month 0,
 *   monthly:    contribution per month,
 *   stepUpPct:  annual % growth of the monthly contribution,
 *   alloc:      { assetId: percent, ... },
 *   glideTo:    null | { assetId: percent } — linear glide to this mix,
 *   rebalance:  "none" | "monthly" | "quarterly" | "yearly",
 *   timing:     { mode: "none" | "dip" | "momentum", dipPct, lookback },
 *   withdrawal: { startYear: 0 = off, monthly, inflationAdjust }
 * }
 */

function allocToWeights(alloc, assets) {
  const w = new Float64Array(assets.length);
  let sum = 0;
  for (let a = 0; a < assets.length; a++) {
    const v = Math.max(0, Number(alloc?.[assets[a].id]) || 0);
    w[a] = v;
    sum += v;
  }
  if (sum <= 0) {
    w[CASH_INDEX] = 1;
    return w;
  }
  for (let a = 0; a < w.length; a++) w[a] /= sum;
  return w;
}

const REBALANCE_MONTHS = { none: 0, monthly: 1, quarterly: 3, yearly: 12 };

/* Run one strategy through one market path. Appends per-month totals
 * into `totals` (length months+1, including month 0) and returns
 * { final, maxDrawdown, ruined }. */
function runStrategyOnPath(strategy, path, months, assets, global, totals) {
  const n = assets.length;
  const w0 = allocToWeights(strategy.alloc, assets);
  const w1 = strategy.glideTo ? allocToWeights(strategy.glideTo, assets) : null;
  const rebalEvery = REBALANCE_MONTHS[strategy.rebalance] || 0;
  const timing = strategy.timing || { mode: "none" };
  const wd = strategy.withdrawal || { startYear: 0, monthly: 0 };
  const wdStartMonth = wd.startYear > 0 ? Math.round(wd.startYear * 12) : Infinity;
  const monthlyInflation = Math.pow(1 + global.inflation, 1 / 12);

  const holdings = new Float64Array(n);
  let dry = 0; // un-deployed cash sleeve (dip waiting / momentum exit)
  let inMarket = timing.mode !== "dip"; // dip strategies start in cash
  const weights = new Float64Array(n);

  // Reference index for timing signals: the strategy's own target mix.
  let index = 1;
  let indexPeak = 1;
  const indexHistory = timing.mode === "momentum" ? new Float64Array(months + 1) : null;
  if (indexHistory) indexHistory[0] = 1;

  let invested = strategy.initial;
  let peak = strategy.initial;
  let maxDrawdown = 0;
  let ruined = false;

  const currentWeights = (t) => {
    if (!w1) return w0;
    const f = months <= 1 ? 1 : t / (months - 1);
    for (let a = 0; a < n; a++) weights[a] = w0[a] + (w1[a] - w0[a]) * f;
    return weights;
  };

  const deploy = (amount, w) => {
    for (let a = 0; a < n; a++) holdings[a] += amount * w[a];
  };

  // Month 0: place the initial lump sum.
  if (inMarket) deploy(strategy.initial, currentWeights(0));
  else dry = strategy.initial;
  totals[0] = strategy.initial;

  for (let t = 0; t < months; t++) {
    const w = currentWeights(t);
    const withdrawing = t >= wdStartMonth;

    // 1) Contribution (paused once withdrawals begin).
    if (!withdrawing && strategy.monthly > 0) {
      const years = Math.floor(t / 12);
      const c = strategy.monthly * Math.pow(1 + strategy.stepUpPct / 100, years);
      invested += c;
      if (inMarket && timing.mode !== "dip") deploy(c, w);
      else dry += c;
    }

    // 2) Timing signals (evaluated on the reference index before this month's move).
    if (timing.mode === "dip") {
      const drawdown = 1 - index / indexPeak;
      if (drawdown >= (timing.dipPct || 10) / 100 && dry > 0) {
        deploy(dry, w);
        dry = 0;
      }
    } else if (timing.mode === "momentum") {
      const lb = Math.max(1, Math.round(timing.lookback || 6));
      if (t >= lb) {
        const trailing = indexHistory[t] / indexHistory[t - lb] - 1;
        if (trailing < 0 && inMarket) {
          for (let a = 0; a < n; a++) { dry += holdings[a]; holdings[a] = 0; }
          inMarket = false;
        } else if (trailing >= 0 && !inMarket) {
          deploy(dry, w);
          dry = 0;
          inMarket = true;
        }
      }
    }

    // 3) Apply this month's market move.
    let total = 0;
    let indexGrowth = 0;
    for (let a = 0; a < n; a++) {
      holdings[a] *= path[t * n + a];
      total += holdings[a];
      indexGrowth += w[a] * (path[t * n + a] - 1);
    }
    dry *= path[t * n + CASH_INDEX];
    total += dry;
    index *= 1 + indexGrowth;
    if (index > indexPeak) indexPeak = index;
    if (indexHistory) indexHistory[t + 1] = index;

    // 4) Withdrawal (taken at month end, inflation-indexed if requested).
    if (withdrawing && wd.monthly > 0 && total > 0) {
      let out = wd.monthly;
      if (wd.inflationAdjust !== false) out *= Math.pow(monthlyInflation, t);
      if (out >= total) {
        out = total;
        ruined = true;
      }
      const fromDry = Math.min(dry, out);
      dry -= fromDry;
      let rest = out - fromDry;
      if (rest > 0 && total - dry - fromDry > 0) {
        const investedPart = total - (dry + fromDry);
        const scale = Math.max(0, 1 - rest / investedPart);
        for (let a = 0; a < n; a++) holdings[a] *= scale;
      }
      total -= out;
    }

    // 5) Scheduled rebalance back to target weights.
    if (rebalEvery > 0 && (t + 1) % rebalEvery === 0 && inMarket) {
      let investedTotal = 0;
      for (let a = 0; a < n; a++) investedTotal += holdings[a];
      if (investedTotal > 0) {
        for (let a = 0; a < n; a++) holdings[a] = investedTotal * w[a];
      }
    }

    if (total > peak) peak = total;
    if (peak > 0) {
      const dd = (peak - total) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
    totals[t + 1] = total;
  }

  return { final: totals[months], maxDrawdown, ruined, invested };
}

/* ---------- Aggregation ---------- */

function percentileSorted(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/* Deterministic contribution schedule (same for every simulation). */
function contributionSeries(strategy, months) {
  const series = new Float64Array(months + 1);
  const wd = strategy.withdrawal || { startYear: 0 };
  const wdStartMonth = wd.startYear > 0 ? Math.round(wd.startYear * 12) : Infinity;
  let sum = strategy.initial;
  series[0] = sum;
  for (let t = 0; t < months; t++) {
    if (t < wdStartMonth && strategy.monthly > 0) {
      sum += strategy.monthly * Math.pow(1 + strategy.stepUpPct / 100, Math.floor(t / 12));
    }
    series[t + 1] = sum;
  }
  return series;
}

/* ============================================================
 * Entry point
 *
 * global = { years, sims, seed, inflation (0.025), goal, assets?, corr? }
 * strategies = [strategyConfig, ...]
 * ============================================================ */

function runSimulation(global, strategies) {
  const months = Math.max(1, Math.round(global.years * 12));
  const sims = Math.max(10, Math.round(global.sims));
  const assets = global.assets || ASSETS;
  const chol = cholesky(global.corr || DEFAULT_CORR);
  const baseSeed = (global.seed >>> 0) || 42;

  const results = strategies.map((s) => ({
    strategy: s,
    finals: new Float64Array(sims),
    drawdowns: new Float64Array(sims),
    totalsMatrix: new Float64Array(sims * (months + 1)),
    ruinedCount: 0,
    contributed: contributionSeries(s, months),
  }));

  const scratch = new Float64Array(months + 1);
  for (let sim = 0; sim < sims; sim++) {
    const path = generatePath(baseSeed, sim, months, assets, chol);
    for (const r of results) {
      const out = runStrategyOnPath(r.strategy, path, months, assets, global, scratch);
      r.totalsMatrix.set(scratch, sim * (months + 1));
      r.finals[sim] = out.final;
      r.drawdowns[sim] = out.maxDrawdown;
      if (out.ruined) r.ruinedCount++;
    }
  }

  const inflationFactor = Math.pow(1 + global.inflation, global.years);
  const col = new Float64Array(sims);

  return {
    months,
    sims,
    results: results.map((r) => {
      const bands = {
        p10: new Float64Array(months + 1),
        p25: new Float64Array(months + 1),
        p50: new Float64Array(months + 1),
        p75: new Float64Array(months + 1),
        p90: new Float64Array(months + 1),
      };
      for (let t = 0; t <= months; t++) {
        for (let sim = 0; sim < sims; sim++) col[sim] = r.totalsMatrix[sim * (months + 1) + t];
        const sorted = col.slice().sort();
        bands.p10[t] = percentileSorted(sorted, 0.10);
        bands.p25[t] = percentileSorted(sorted, 0.25);
        bands.p50[t] = percentileSorted(sorted, 0.50);
        bands.p75[t] = percentileSorted(sorted, 0.75);
        bands.p90[t] = percentileSorted(sorted, 0.90);
      }
      const finalsSorted = r.finals.slice().sort();
      const ddSorted = r.drawdowns.slice().sort();
      const totalContributed = r.contributed[months];
      let losses = 0;
      let goalHits = 0;
      for (let sim = 0; sim < sims; sim++) {
        if (r.finals[sim] < totalContributed) losses++;
        if (global.goal > 0 && r.finals[sim] >= global.goal) goalHits++;
      }
      const medianFinal = percentileSorted(finalsSorted, 0.5);
      return {
        strategy: r.strategy,
        bands,
        finals: r.finals,
        contributed: r.contributed,
        metrics: {
          totalContributed,
          medianFinal,
          p10Final: percentileSorted(finalsSorted, 0.10),
          p90Final: percentileSorted(finalsSorted, 0.90),
          medianReal: medianFinal / inflationFactor,
          multiple: totalContributed > 0 ? medianFinal / totalContributed : 0,
          medianMaxDrawdown: percentileSorted(ddSorted, 0.5),
          probLoss: losses / sims,
          probGoal: global.goal > 0 ? goalHits / sims : null,
          probRuin: r.ruinedCount / sims,
        },
      };
    }),
  };
}

/* ---------- Node export for tests ---------- */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ASSETS, CASH_INDEX, DEFAULT_CORR, mulberry32, makeNormal, cholesky, generatePath, allocToWeights, contributionSeries, runSimulation };
}
