# Strategy Lab — Investment Strategy Simulator

A zero-dependency web app for testing investment strategies against thousands of
simulated market futures and seeing how they play out over decades.

Build any strategy you can think of, run it through a Monte Carlo simulation of
correlated asset returns, and compare outcomes side by side — every strategy is
tested against the **exact same** simulated market histories, so differences in
results come from the strategy alone.

## Running it

No build step, no dependencies. Either:

- open `index.html` directly in a browser, or
- serve the folder: `npx serve .` / `python3 -m http.server`, or
- host it on GitHub Pages (Settings → Pages → deploy from branch).

## What you can model

**Cashflows**
- Initial lump sum and/or monthly contributions (SIP/DCA)
- Annual step-up of contributions (e.g. +10% every year)
- Retirement withdrawals: from year N, withdraw a monthly amount
  (inflation-indexed) — see the probability of running out of money

**Portfolio construction**
- Any mix of 7 asset classes: global stocks, EM/small-cap, bonds, gold,
  real estate, crypto, cash
- Rebalancing: never / monthly / quarterly / yearly
- Glide paths: linearly shift from a start mix to an end mix over the horizon
  (e.g. 90% stocks → 30% stocks as retirement approaches)

**Market timing rules**
- *Buy the dip*: contributions pile up in cash and deploy only when the market
  is down X% from its peak
- *Momentum switch*: exit to cash when the trailing N-month return is negative,
  re-enter when it turns positive

**Market assumptions**
- Edit expected return and volatility per asset class to stress-test your own
  view of the future. Returns are generated as correlated lognormal monthly
  steps (stocks↔real estate, stocks↔EM correlations, etc.).

## What you get

- **Summary table**: invested amount, median final value, the 10th–90th
  percentile range, inflation-adjusted value, multiple on invested capital,
  median max drawdown, probability of loss, of reaching your goal, of ruin
- **Median wealth over time** for all strategies on one chart
- **Fan chart**: the full range of outcomes (10–90% and 25–75% bands) for any
  strategy, against the amount you put in
- **Histogram** of final values across all simulations

Global controls: horizon (1–60 years), number of simulations (250–5,000),
inflation, goal amount, currency, random seed, log-scale charts.

## How it works

- Monthly correlated lognormal returns (geometric Brownian motion with a
  Cholesky-factored correlation matrix), seeded RNG for reproducibility
- Common random numbers: simulation *i* uses the same market path for every
  strategy, making comparisons fair
- Engine is pure JavaScript (`js/engine.js`) and runs in Node too —
  `node test/engine.test.js` runs the sanity test-suite

## Caveats

This is an educational tool, not financial advice. The model uses simplified
assumptions: no fat tails, no volatility clustering or regime changes, no
taxes, fees, or slippage. Real markets are wilder than lognormal.
