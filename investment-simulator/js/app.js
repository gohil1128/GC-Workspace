"use strict";

/* ============================================================
 * Strategy Lab — UI
 * ============================================================ */

(() => {
  const COLORS = ["#4f8ef7", "#34d399", "#f59e0b", "#f472b6", "#a78bfa", "#22d3ee", "#fb7185", "#facc15"];
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));

  /* ---------- State ---------- */

  const state = {
    global: {
      years: 30,
      sims: 1000,
      seed: 42,
      inflationPct: 2.5,
      goal: 1000000,
      symbol: "$",
      log: false,
    },
    assets: ASSETS.map((a) => ({ ...a })),
    strategies: [],
    nextId: 1,
    fanIndex: 0,
    lastRun: null,
  };

  const blankAlloc = () => Object.fromEntries(ASSETS.map((a) => [a.id, 0]));

  function makeStrategy(partial) {
    const s = {
      id: "s" + state.nextId++,
      name: "Strategy",
      initial: 10000,
      monthly: 500,
      stepUpPct: 0,
      alloc: { ...blankAlloc(), stocks: 100 },
      glideEnabled: false,
      glideTo: { ...blankAlloc(), stocks: 30, bonds: 60, gold: 10 },
      rebalance: "none",
      timingMode: "none",
      dipPct: 15,
      lookback: 6,
      wdStartYear: 0,
      wdMonthly: 0,
      ...partial,
    };
    s.color = COLORS[(state.nextId - 2) % COLORS.length];
    return s;
  }

  const PRESETS = {
    sip_stocks: () => makeStrategy({ name: "SIP 100% stocks", alloc: { ...blankAlloc(), stocks: 100 } }),
    classic_6040: () => makeStrategy({ name: "60/40 rebalanced", alloc: { ...blankAlloc(), stocks: 60, bonds: 40 }, rebalance: "yearly" }),
    stepup: () => makeStrategy({ name: "Step-up SIP +10%/yr", alloc: { ...blankAlloc(), stocks: 80, bonds: 20 }, stepUpPct: 10 }),
    dip: () => makeStrategy({ name: "Buy the dip (−15%)", alloc: { ...blankAlloc(), stocks: 100 }, timingMode: "dip", dipPct: 15 }),
    momentum: () => makeStrategy({ name: "Momentum (6-mo)", alloc: { ...blankAlloc(), stocks: 100 }, timingMode: "momentum", lookback: 6 }),
    glide: () => makeStrategy({ name: "Retirement glide path", alloc: { ...blankAlloc(), stocks: 90, bonds: 10 }, glideEnabled: true, rebalance: "yearly" }),
    permanent: () => makeStrategy({ name: "Permanent portfolio", alloc: { ...blankAlloc(), stocks: 25, bonds: 25, gold: 25, cash: 25 }, rebalance: "yearly" }),
    crypto: () => makeStrategy({ name: "Crypto satellite 10%", alloc: { ...blankAlloc(), stocks: 60, bonds: 30, crypto: 10 }, rebalance: "yearly" }),
    lumpsum: () => makeStrategy({ name: "Lump sum, no SIP", initial: 100000, monthly: 0, alloc: { ...blankAlloc(), stocks: 100 } }),
    custom: () => makeStrategy({ name: "Custom strategy" }),
  };

  /* ---------- Engine adapters ---------- */

  function toEngineStrategy(s) {
    return {
      name: s.name,
      color: s.color,
      initial: num(s.initial),
      monthly: num(s.monthly),
      stepUpPct: num(s.stepUpPct),
      alloc: s.alloc,
      glideTo: s.glideEnabled ? s.glideTo : null,
      rebalance: s.rebalance,
      timing: { mode: s.timingMode, dipPct: num(s.dipPct), lookback: num(s.lookback) },
      withdrawal: { startYear: num(s.wdStartYear), monthly: num(s.wdMonthly), inflationAdjust: true },
    };
  }

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  /* ---------- Simulation ---------- */

  let runTimer = null;
  function scheduleRun() {
    clearTimeout(runTimer);
    runTimer = setTimeout(run, 450);
    $("#status").textContent = "…";
  }

  function run() {
    if (state.strategies.length === 0) {
      state.lastRun = null;
      renderOutputs();
      $("#status").textContent = "Add a strategy to begin";
      return;
    }
    $("#status").textContent = "Simulating…";
    // Let the status paint before the synchronous run.
    setTimeout(() => {
      const t0 = performance.now();
      try {
        state.lastRun = runSimulation(
          {
            years: clamp(num(state.global.years), 1, 60),
            sims: clamp(num(state.global.sims), 50, 5000),
            seed: num(state.global.seed) || 42,
            inflation: num(state.global.inflationPct) / 100,
            goal: num(state.global.goal),
            assets: state.assets,
          },
          state.strategies.map(toEngineStrategy)
        );
        const ms = Math.round(performance.now() - t0);
        $("#status").textContent = `${state.lastRun.sims.toLocaleString()} simulations × ${state.strategies.length} strategies in ${ms} ms`;
      } catch (err) {
        console.error(err);
        $("#status").textContent = "Error: " + err.message;
        state.lastRun = null;
      }
      renderOutputs();
    }, 20);
  }

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ---------- Rendering: outputs ---------- */

  let compareHover = null;
  let fanHover = null;

  function renderOutputs() {
    renderSummary();
    renderFanSelect();
    renderCharts();
  }

  function renderCharts() {
    const run = state.lastRun;
    const opts = { symbol: state.global.symbol, log: state.global.log };
    const compareCanvas = $("#compareChart");
    const fanCanvas = $("#fanChart");
    const histCanvas = $("#histChart");
    if (!run) {
      for (const c of [compareCanvas, fanCanvas, histCanvas]) {
        const ctx = c.getContext("2d");
        ctx.clearRect(0, 0, c.width, c.height);
      }
      return;
    }
    Charts.renderCompare(compareCanvas, {
      months: run.months,
      hoverMonth: compareHover,
      series: run.results.map((r) => ({ name: r.strategy.name, color: r.strategy.color, values: r.bands.p50 })),
    }, opts);

    const fi = Math.min(state.fanIndex, run.results.length - 1);
    const r = run.results[fi];
    Charts.renderFan(fanCanvas, {
      months: run.months,
      bands: r.bands,
      contributed: r.contributed,
      color: r.strategy.color,
      name: r.strategy.name,
      hoverMonth: fanHover,
    }, opts);

    Charts.renderHist(histCanvas, {
      finals: r.finals,
      color: r.strategy.color,
      goal: num(state.global.goal) || null,
      contributed: r.metrics.totalContributed,
    }, opts);
    $("#histTitle").textContent = `Where "${r.strategy.name}" can end up after ${state.global.years} years (${run.sims.toLocaleString()} outcomes)`;
  }

  function renderSummary() {
    const tbody = $("#summary tbody");
    tbody.innerHTML = "";
    if (!state.lastRun) return;
    const sym = state.global.symbol;
    const money = (v) => Charts.fmtMoney(v, sym);
    const pct = (v) => (v * 100).toFixed(0) + "%";
    const anyWithdraw = state.strategies.some((s) => num(s.wdStartYear) > 0 && num(s.wdMonthly) > 0);
    $("#ruinHead").style.display = anyWithdraw ? "" : "none";

    for (const r of state.lastRun.results) {
      const m = r.metrics;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="dot" style="background:${r.strategy.color}"></span>${esc(r.strategy.name)}</td>
        <td>${money(m.totalContributed)}</td>
        <td class="strong">${money(m.medianFinal)}</td>
        <td class="muted">${money(m.p10Final)} – ${money(m.p90Final)}</td>
        <td>${money(m.medianReal)}</td>
        <td>${m.multiple.toFixed(1)}×</td>
        <td>${pct(m.medianMaxDrawdown)}</td>
        <td>${pct(m.probLoss)}</td>
        <td>${m.probGoal == null ? "—" : pct(m.probGoal)}</td>
        ${anyWithdraw ? `<td>${pct(m.probRuin)}</td>` : ""}`;
      tbody.appendChild(tr);
    }
  }

  function renderFanSelect() {
    const sel = $("#fanSelect");
    sel.innerHTML = "";
    state.strategies.forEach((s, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = s.name;
      sel.appendChild(opt);
    });
    sel.value = Math.min(state.fanIndex, Math.max(0, state.strategies.length - 1));
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Rendering: strategy cards ---------- */

  function allocGrid(strategyId, field, alloc) {
    return `<div class="alloc-grid">${ASSETS.map((a) => `
      <label class="alloc-cell" title="${esc(a.name)}">
        <span>${a.short}</span>
        <input type="number" min="0" max="100" step="5" data-sid="${strategyId}" data-field="${field}" data-asset="${a.id}" value="${num(alloc[a.id])}">
      </label>`).join("")}
      <span class="alloc-sum" data-sumfor="${strategyId}-${field}"></span>
    </div>`;
  }

  function allocSum(alloc) {
    return ASSETS.reduce((s, a) => s + num(alloc[a.id]), 0);
  }

  function cardHTML(s) {
    return `
    <section class="panel strategy-card" data-card="${s.id}" style="border-left: 3px solid ${s.color}">
      <div class="card-head">
        <input class="name-input" type="text" data-sid="${s.id}" data-field="name" value="${esc(s.name)}">
        <div class="card-actions">
          <button class="icon-btn" data-action="duplicate" data-sid="${s.id}" title="Duplicate">⧉</button>
          <button class="icon-btn danger" data-action="remove" data-sid="${s.id}" title="Remove">✕</button>
        </div>
      </div>

      <div class="field-row">
        <label>Initial <input type="number" min="0" step="1000" data-sid="${s.id}" data-field="initial" value="${s.initial}"></label>
        <label>Monthly <input type="number" min="0" step="50" data-sid="${s.id}" data-field="monthly" value="${s.monthly}"></label>
        <label>Step-up %/yr <input type="number" min="0" max="50" step="1" data-sid="${s.id}" data-field="stepUpPct" value="${s.stepUpPct}"></label>
      </div>

      <div class="sub-label">Allocation (%)</div>
      ${allocGrid(s.id, "alloc", s.alloc)}

      <div class="field-row">
        <label class="check"><input type="checkbox" data-sid="${s.id}" data-field="glideEnabled" ${s.glideEnabled ? "checked" : ""}> Glide to end mix</label>
        <label>Rebalance
          <select data-sid="${s.id}" data-field="rebalance">
            ${["none", "monthly", "quarterly", "yearly"].map((v) => `<option value="${v}" ${s.rebalance === v ? "selected" : ""}>${v}</option>`).join("")}
          </select>
        </label>
      </div>
      ${s.glideEnabled ? `<div class="sub-label">End-of-horizon mix (%)</div>${allocGrid(s.id, "glideTo", s.glideTo)}` : ""}

      <div class="field-row">
        <label>Market timing
          <select data-sid="${s.id}" data-field="timingMode">
            <option value="none" ${s.timingMode === "none" ? "selected" : ""}>always invested</option>
            <option value="dip" ${s.timingMode === "dip" ? "selected" : ""}>buy the dip</option>
            <option value="momentum" ${s.timingMode === "momentum" ? "selected" : ""}>momentum switch</option>
          </select>
        </label>
        ${s.timingMode === "dip" ? `<label>Dip trigger % <input type="number" min="1" max="60" step="1" data-sid="${s.id}" data-field="dipPct" value="${s.dipPct}"></label>` : ""}
        ${s.timingMode === "momentum" ? `<label>Lookback (mo) <input type="number" min="1" max="24" step="1" data-sid="${s.id}" data-field="lookback" value="${s.lookback}"></label>` : ""}
      </div>

      <div class="field-row">
        <label>Withdraw from yr <input type="number" min="0" max="60" step="1" data-sid="${s.id}" data-field="wdStartYear" value="${s.wdStartYear}" title="0 = no withdrawals"></label>
        <label>Withdraw /mo <input type="number" min="0" step="100" data-sid="${s.id}" data-field="wdMonthly" value="${s.wdMonthly}" title="Inflation-adjusted"></label>
      </div>
    </section>`;
  }

  function renderStrategies() {
    $("#strategies").innerHTML = state.strategies.map(cardHTML).join("");
    updateAllocSums();
  }

  function updateAllocSums() {
    for (const s of state.strategies) {
      for (const field of ["alloc", "glideTo"]) {
        const el = $(`[data-sumfor="${s.id}-${field}"]`);
        if (!el) continue;
        const sum = allocSum(s[field]);
        el.textContent = "Σ " + sum + "%";
        el.classList.toggle("warn", Math.round(sum) !== 100);
        el.title = Math.round(sum) === 100 ? "" : "Weights are normalized to 100% automatically";
      }
    }
  }

  /* ---------- Rendering: market assumptions ---------- */

  function renderMarketPanel() {
    $("#market-rows").innerHTML = state.assets.map((a, i) => `
      <div class="market-row">
        <span class="market-name">${esc(a.name)}</span>
        <label>ret % <input type="number" step="0.5" data-aidx="${i}" data-prop="mu" value="${(a.mu * 100).toFixed(1)}"></label>
        <label>vol % <input type="number" min="0" step="0.5" data-aidx="${i}" data-prop="sigma" value="${(a.sigma * 100).toFixed(1)}"></label>
      </div>`).join("");
  }

  /* ---------- Events ---------- */

  function bindEvents() {
    // Global settings
    $("#sidebar").addEventListener("input", (e) => {
      const el = e.target;
      if (el.dataset.global) {
        const key = el.dataset.global;
        state.global[key] = el.type === "checkbox" ? el.checked : el.value;
        if (key === "log" || key === "symbol") renderOutputs();
        else scheduleRun();
        return;
      }
      if (el.dataset.aidx != null) {
        const a = state.assets[Number(el.dataset.aidx)];
        a[el.dataset.prop] = num(el.value) / 100;
        scheduleRun();
        return;
      }
      if (el.dataset.sid) {
        const s = state.strategies.find((x) => x.id === el.dataset.sid);
        if (!s) return;
        if (el.dataset.asset) {
          s[el.dataset.field][el.dataset.asset] = num(el.value);
          updateAllocSums();
        } else if (el.type === "checkbox") {
          s[el.dataset.field] = el.checked;
          renderStrategies();
        } else {
          s[el.dataset.field] = el.value;
          if (el.dataset.field === "name") renderFanSelect();
        }
        if (el.tagName === "SELECT" && (el.dataset.field === "timingMode")) renderStrategies();
        scheduleRun();
      }
    });

    $("#sidebar").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const idx = state.strategies.findIndex((x) => x.id === btn.dataset.sid);
      if (idx < 0) return;
      if (btn.dataset.action === "remove") {
        state.strategies.splice(idx, 1);
      } else if (btn.dataset.action === "duplicate") {
        const clone = JSON.parse(JSON.stringify(state.strategies[idx]));
        delete clone.id; // makeStrategy must assign a fresh id and color
        delete clone.color;
        const copy = makeStrategy({ ...clone, name: clone.name + " (copy)" });
        state.strategies.splice(idx + 1, 0, copy);
      }
      renderStrategies();
      scheduleRun();
    });

    $("#add-strategy").addEventListener("click", () => {
      if (state.strategies.length >= 8) return;
      const preset = PRESETS[$("#preset-select").value] || PRESETS.custom;
      state.strategies.push(preset());
      renderStrategies();
      scheduleRun();
    });

    $("#run-btn").addEventListener("click", run);

    $("#fanSelect").addEventListener("change", (e) => {
      state.fanIndex = Number(e.target.value) || 0;
      renderCharts();
    });

    window.addEventListener("resize", () => renderCharts());
  }

  /* Hover needs the live month count, so wrap the binding. */
  function bindChartHovers() {
    const compare = $("#compareChart");
    const fan = $("#fanChart");
    const toMonth = (canvas, e) => {
      const rect = canvas.getBoundingClientRect();
      const padL = 58, padR = 14;
      const inner = rect.width - padL - padR;
      const relX = e.clientX - rect.left;
      if (!state.lastRun || relX < padL || relX > rect.width - padR || inner <= 0) return null;
      return clamp(Math.round(((relX - padL) / inner) * state.lastRun.months), 0, state.lastRun.months);
    };
    compare.addEventListener("mousemove", (e) => { compareHover = toMonth(compare, e); renderCharts(); });
    compare.addEventListener("mouseleave", () => { compareHover = null; renderCharts(); });
    fan.addEventListener("mousemove", (e) => { fanHover = toMonth(fan, e); renderCharts(); });
    fan.addEventListener("mouseleave", () => { fanHover = null; renderCharts(); });
  }

  /* ---------- Boot ---------- */

  function boot() {
    state.strategies = [PRESETS.sip_stocks(), PRESETS.classic_6040(), PRESETS.dip()];
    renderMarketPanel();
    renderStrategies();
    bindEvents();
    bindChartHovers();
    run();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
