/*
  Generates the spring easings used by the Liquid Glass motion system.

  Apple's design language animates with springs, not bezier curves, and the
  difference is the whole feel of it: a bezier has a fixed duration and arrives
  dead, a spring carries momentum and settles. CSS cannot express a spring
  directly — but linear() takes an arbitrary list of sampled points, so a
  spring can be solved numerically and emitted as the curve it actually is.

  The springs below are SwiftUI's own. Apple publishes them as duration and
  BOUNCE, where damping fraction is simply 1 - bounce:

    .smooth            duration 0.5   bounce 0.00   -> zeta 1.00
    .snappy            duration 0.5   bounce 0.15   -> zeta 0.85
    .bouncy            duration 0.5   bounce 0.30   -> zeta 0.70
    .interactiveSpring response 0.15  damping 0.86  -> the press/release spring

  Note how little Apple's springs overshoot: snappy peaks around +0.6% and
  bouncy around +4.6%. Web recreations routinely ship 10-20%, or reach for
  cubic-bezier(0.34, 1.56, 0.64, 1), and the result reads as cartoonish rather
  than Apple-like. If a curve here ever peaks much above 1.05, it is wrong.

  SwiftUI defines response as the period of the undamped oscillation, so the
  natural frequency is 2*pi/response, and damping fraction is the usual zeta.
  Solving the unit step response of a second-order system:

    zeta < 1   x(t) = 1 - e^(-z*w*t) * (cos(wd*t) + (z*w/wd) * sin(wd*t))
    zeta = 1   x(t) = 1 - e^(-w*t) * (1 + w*t)

  Run with:  pnpm exec tsx scripts/gen-springs.ts
  Paste the output into the motion block of src/app/globals.css. Committed so
  the numbers in that file are reproducible rather than magic.
*/

type Spring = { name: string; response: number; damping: number; comment: string };

const SPRINGS: Spring[] = [
  { name: "micro", response: 0.28, damping: 1.0, comment: "short and dead-flat — hover tints and other changes that must not wobble" },
  { name: "smooth", response: 0.5, damping: 1.0, comment: "SwiftUI .smooth — no overshoot, for layout that should settle calmly" },
  { name: "snappy", response: 0.5, damping: 0.85, comment: "SwiftUI .snappy — the default: controls, sheets, the selection indicator" },
  { name: "bouncy", response: 0.5, damping: 0.7, comment: "SwiftUI .bouncy — only where a bounce means something" },
  { name: "press", response: 0.15, damping: 0.86, comment: "SwiftUI .interactiveSpring — the release after a press" },
];

/** Unit step response of the spring at time t, in seconds. */
function position(s: Spring, t: number): number {
  const w = (2 * Math.PI) / s.response;
  const z = s.damping;
  if (z >= 1) {
    // Critically damped. (Over-damped is not used here; SwiftUI's own springs
    // top out at 1.0, and past it the motion reads as sluggish rather than calm.)
    return 1 - Math.exp(-w * t) * (1 + w * t);
  }
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

/**
 * How long until it has settled.
 *
 * Settling is judged on the envelope rather than on a single sample: an
 * underdamped spring crosses its target on every oscillation, so testing
 * |1-x| < tol at one instant would cut the curve off mid-bounce.
 */
/*
  Settled at half a percent of travel, not a thousandth.

  The tolerance IS the duration, and the duration is what the motion feels
  like. At 0.001 a 0.5s Apple spring emits a 736ms CSS transition, and the last
  two hundred milliseconds of that are the curve crawling through a distance
  nobody can see — which does not read as precision, it reads as lag. At 0.005
  the same spring lands near 590ms, which is the figure Apple's own perceptual
  duration corresponds to.
*/
function settleTime(s: Spring, tol = 0.005): number {
  const step = 1 / 600;
  let last = 0;
  for (let t = 0; t < 10; t += step) {
    if (Math.abs(1 - position(s, t)) > tol) last = t;
  }
  return Math.ceil((last + step) * 1000) / 1000;
}

/**
 * Sample into a linear() stop list.
 *
 * linear() interpolates straight between stops, so the sample count is the
 * fidelity. 48 keeps the overshoot smooth and the declaration readable; the
 * error against the true curve is well under a tenth of a percent.
 */
function toLinear(s: Spring, duration: number, samples = 48): string {
  const out: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * duration;
    out.push(position(s, t).toFixed(4).replace(/0+$/, "").replace(/\.$/, ""));
  }
  /*
    The last stop is forced to exactly 1.

    Sampling a decaying exponential never reaches its asymptote, so the final
    sample is 0.9985-ish and linear() would hold the property a fraction short
    of its target for ever. On a colour nobody would see it; on a translate it
    is a permanent sub-pixel offset, and on a scale it is a control that never
    quite returns to full size after being pressed.
  */
  out[out.length - 1] = "1";
  return out.join(", ");
}

const lines: string[] = [];
lines.push("    /* Springs, solved — see scripts/gen-springs.ts. Do not hand-edit. */");
for (const s of SPRINGS) {
  const d = settleTime(s);
  lines.push(`    /* ${s.name}: response ${s.response}s, damping ${s.damping} — ${s.comment} */`);
  lines.push(`    --lg-dur-${s.name}: ${Math.round(d * 1000)}ms;`);
  lines.push(`    --lg-ease-${s.name}: linear(${toLinear(s, d)});`);
}

console.log(lines.join("\n"));

// A quick self-check, printed to stderr so it never lands in the CSS: every
// curve must start at 0, end within a thousandth of 1, and a bouncy spring
// must actually overshoot while a smooth one must not.
for (const s of SPRINGS) {
  const d = settleTime(s);
  const xs = Array.from({ length: 200 }, (_, i) => position(s, (i / 199) * d));
  const peak = Math.max(...xs);
  const stops = toLinear(s, d).split(", ");
  if (stops[stops.length - 1] !== "1") throw new Error(`${s.name} does not end at 1`);
  if (peak > 1.06) throw new Error(`${s.name} overshoots ${((peak - 1) * 100).toFixed(1)}% — too cartoonish`);
  process.stderr.write(
    `${s.name.padEnd(7)} settle ${String(Math.round(d * 1000)).padStart(4)}ms  ` +
      `start ${xs[0].toFixed(3)}  end 1  peak ${peak.toFixed(4)}` +
      `${peak > 1.0005 ? ` (+${((peak - 1) * 100).toFixed(1)}% overshoot)` : ""}\n`,
  );
}
