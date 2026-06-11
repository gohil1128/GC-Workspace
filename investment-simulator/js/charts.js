"use strict";

/* ============================================================
 * Strategy Lab — lightweight canvas charts
 * Fan chart (percentile bands), multi-line comparison, histogram.
 * ============================================================ */

const Charts = (() => {
  const FONT = "12px 'Inter', system-ui, sans-serif";
  const AXIS = "#5b6478";
  const GRID = "rgba(91,100,120,0.18)";
  const TEXT = "#9aa3b8";

  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || canvas.parentElement.clientWidth || 600;
    const cssH = canvas.clientHeight || 320;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: cssW, h: cssH };
  }

  function fmtMoney(v, sym) {
    const abs = Math.abs(v);
    let s;
    if (abs >= 1e9) s = (v / 1e9).toFixed(abs >= 1e10 ? 0 : 1) + "B";
    else if (abs >= 1e6) s = (v / 1e6).toFixed(abs >= 1e7 ? 1 : 2) + "M";
    else if (abs >= 1e3) s = (v / 1e3).toFixed(abs >= 1e5 ? 0 : 1) + "k";
    else s = v.toFixed(0);
    return (sym || "$") + s;
  }

  function niceTicks(min, max, count) {
    if (max <= min) max = min + 1;
    const span = max - min;
    const step0 = span / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    let step = mag;
    for (const m of [1, 2, 2.5, 5, 10]) {
      if (step0 <= m * mag) { step = m * mag; break; }
    }
    const ticks = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(v);
    return ticks;
  }

  /* Scales: months → x px, value → y px (linear or log10). */
  function makeFrame(ctx, w, h, months, vMin, vMax, opts) {
    const pad = { l: 58, r: 14, t: 12, b: 28 };
    const log = !!opts.log;
    const yMinV = log ? Math.max(1, vMin) : Math.min(0, vMin);
    const tf = log ? (v) => Math.log10(Math.max(1, v)) : (v) => v;
    const y0 = tf(yMinV);
    const y1 = tf(Math.max(vMax, yMinV + 1));
    const x = (m) => pad.l + (m / months) * (w - pad.l - pad.r);
    const y = (v) => h - pad.b - ((tf(v) - y0) / (y1 - y0 || 1)) * (h - pad.t - pad.b);

    ctx.font = FONT;
    ctx.lineWidth = 1;

    // Y grid + labels
    const yTicks = log
      ? niceTicks(y0, y1, 5).map((e) => Math.pow(10, e))
      : niceTicks(yMinV, vMax, 5);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const v of yTicks) {
      const py = y(v);
      if (py < pad.t - 1 || py > h - pad.b + 1) continue;
      ctx.strokeStyle = GRID;
      ctx.beginPath();
      ctx.moveTo(pad.l, py);
      ctx.lineTo(w - pad.r, py);
      ctx.stroke();
      ctx.fillStyle = TEXT;
      ctx.fillText(fmtMoney(v, opts.symbol), pad.l - 8, py);
    }

    // X labels in years
    const years = months / 12;
    const xTicks = niceTicks(0, years, Math.min(10, Math.floor(w / 70)));
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const yr of xTicks) {
      const px = x(yr * 12);
      if (px < pad.l || px > w - pad.r) continue;
      ctx.strokeStyle = GRID;
      ctx.beginPath();
      ctx.moveTo(px, pad.t);
      ctx.lineTo(px, h - pad.b);
      ctx.stroke();
      ctx.fillStyle = TEXT;
      ctx.fillText(yr + "y", px, h - pad.b + 8);
    }

    ctx.strokeStyle = AXIS;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, h - pad.b);
    ctx.lineTo(w - pad.r, h - pad.b);
    ctx.stroke();

    return { x, y, pad };
  }

  function drawSeries(ctx, frame, values, color, width, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    for (let t = 0; t < values.length; t++) {
      const px = frame.x(t);
      const py = frame.y(values[t]);
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBand(ctx, frame, lower, upper, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let t = 0; t < upper.length; t++) {
      const px = frame.x(t);
      const py = frame.y(upper[t]);
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    for (let t = lower.length - 1; t >= 0; t--) {
      ctx.lineTo(frame.x(t), frame.y(lower[t]));
    }
    ctx.closePath();
    ctx.fill();
  }

  function hexToRgba(hex, alpha) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
  }

  function drawTooltip(ctx, w, h, frame, month, months, rows, symbol) {
    const px = frame.x(month);
    ctx.strokeStyle = "rgba(154,163,184,0.5)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, frame.pad.t);
    ctx.lineTo(px, h - frame.pad.b);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = FONT;
    const title = (month / 12).toFixed(1) + " yr";
    let boxW = ctx.measureText(title).width;
    for (const r of rows) {
      boxW = Math.max(boxW, ctx.measureText(`${r.label}  ${fmtMoney(r.value, symbol)}`).width + 14);
    }
    boxW += 20;
    const lineH = 18;
    const boxH = (rows.length + 1) * lineH + 10;
    let bx = px + 12;
    if (bx + boxW > w - 6) bx = px - boxW - 12;
    const by = frame.pad.t + 8;

    ctx.fillStyle = "rgba(15,20,36,0.94)";
    ctx.strokeStyle = "rgba(91,100,120,0.5)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, boxW, boxH, 6);
    else ctx.rect(bx, by, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e6e9f2";
    ctx.fillText(title, bx + 10, by + 5 + lineH / 2);
    rows.forEach((r, i) => {
      const ry = by + 5 + (i + 1) * lineH + lineH / 2;
      if (r.color) {
        ctx.fillStyle = r.color;
        ctx.fillRect(bx + 10, ry - 4, 8, 8);
      }
      ctx.fillStyle = "#c6ccdb";
      ctx.fillText(`${r.label}  ${fmtMoney(r.value, symbol)}`, bx + (r.color ? 24 : 10), ry);
    });
  }

  /* ---------- Public renderers ---------- */

  /* data: { months, series: [{ name, color, values }], hoverMonth } */
  function renderCompare(canvas, data, opts) {
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    let vMax = 0;
    let vMin = Infinity;
    for (const s of data.series) {
      for (const v of s.values) {
        if (v > vMax) vMax = v;
        if (v < vMin) vMin = v;
      }
    }
    const frame = makeFrame(ctx, w, h, data.months, vMin, vMax * 1.05, opts);
    for (const s of data.series) drawSeries(ctx, frame, s.values, s.color, 2.2);

    // Legend
    ctx.font = FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    let lx = frame.pad.l + 10;
    for (const s of data.series) {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, frame.pad.t + 4, 10, 3);
      ctx.fillStyle = TEXT;
      ctx.fillText(s.name, lx + 15, frame.pad.t + 6);
      lx += 25 + ctx.measureText(s.name).width + 12;
    }

    if (data.hoverMonth != null) {
      const m = data.hoverMonth;
      drawTooltip(ctx, w, h, frame, m, data.months,
        data.series.map((s) => ({ label: s.name, color: s.color, value: s.values[m] })),
        opts.symbol);
    }
    return frame;
  }

  /* data: { months, bands, contributed, color, name, hoverMonth } */
  function renderFan(canvas, data, opts) {
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const b = data.bands;
    let vMax = 0;
    for (const v of b.p90) if (v > vMax) vMax = v;
    let vMin = Infinity;
    for (const v of b.p10) if (v < vMin) vMin = v;
    const frame = makeFrame(ctx, w, h, data.months, vMin, vMax * 1.05, opts);

    drawBand(ctx, frame, b.p10, b.p90, hexToRgba(data.color, 0.14));
    drawBand(ctx, frame, b.p25, b.p75, hexToRgba(data.color, 0.22));
    drawSeries(ctx, frame, b.p50, data.color, 2.4);
    if (data.contributed) drawSeries(ctx, frame, data.contributed, "#9aa3b8", 1.4, [5, 4]);

    ctx.font = FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = TEXT;
    ctx.fillText(`${data.name} — median with 10–90% and 25–75% ranges; dashed = amount invested`, frame.pad.l + 10, frame.pad.t + 6);

    if (data.hoverMonth != null) {
      const m = data.hoverMonth;
      const rows = [
        { label: "90th pct", value: b.p90[m] },
        { label: "75th pct", value: b.p75[m] },
        { label: "median", color: data.color, value: b.p50[m] },
        { label: "25th pct", value: b.p25[m] },
        { label: "10th pct", value: b.p10[m] },
      ];
      if (data.contributed) rows.push({ label: "invested", value: data.contributed[m] });
      drawTooltip(ctx, w, h, frame, m, data.months, rows, opts.symbol);
    }
    return frame;
  }

  /* data: { finals, color, goal, contributed } */
  function renderHist(canvas, data, opts) {
    const { ctx, w, h } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const sorted = Float64Array.from(data.finals).sort();
    const lo = sorted[Math.floor(sorted.length * 0.005)];
    const hi = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.995))];
    const nBins = Math.min(50, Math.max(20, Math.floor(w / 22)));
    const span = Math.max(1, hi - lo);
    const bins = new Float64Array(nBins);
    for (const v of data.finals) {
      let i = Math.floor(((v - lo) / span) * nBins);
      if (i < 0) i = 0;
      if (i >= nBins) i = nBins - 1;
      bins[i]++;
    }
    let maxBin = 0;
    for (const c of bins) if (c > maxBin) maxBin = c;

    const pad = { l: 58, r: 14, t: 14, b: 28 };
    const x = (v) => pad.l + ((v - lo) / span) * (w - pad.l - pad.r);
    const y = (c) => h - pad.b - (c / (maxBin || 1)) * (h - pad.t - pad.b);

    ctx.font = FONT;
    ctx.strokeStyle = AXIS;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, h - pad.b);
    ctx.lineTo(w - pad.r, h - pad.b);
    ctx.stroke();

    const binW = (w - pad.l - pad.r) / nBins;
    ctx.fillStyle = hexToRgba(data.color, 0.65);
    for (let i = 0; i < nBins; i++) {
      const py = y(bins[i]);
      ctx.fillRect(pad.l + i * binW + 1, py, binW - 2, h - pad.b - py);
    }

    // X labels
    ctx.fillStyle = TEXT;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const v of niceTicks(lo, hi, Math.min(8, Math.floor(w / 90)))) {
      const px = x(v);
      if (px < pad.l || px > w - pad.r) continue;
      ctx.fillText(fmtMoney(v, opts.symbol), px, h - pad.b + 8);
    }

    // Markers: amount invested, goal
    const marker = (v, label, color) => {
      if (v == null || v <= lo || v >= hi) return;
      const px = x(v);
      ctx.strokeStyle = color;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(px, pad.t);
      ctx.lineTo(px, h - pad.b);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(label, px + 5, pad.t);
    };
    marker(data.contributed, "invested", "#9aa3b8");
    marker(data.goal, "goal", "#f59e0b");
  }

  return { renderCompare, renderFan, renderHist, fmtMoney };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Charts;
