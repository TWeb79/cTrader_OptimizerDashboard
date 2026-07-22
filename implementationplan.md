# Implementation Plan: Advanced Trading Analytics & Failure Diagnosis

## Context
- Project: 54-botanalytics
- Base: Express + static frontend, SVG-based report modules in `reports/`
- Data: `events.json` array of trade lifecycle events (~782 closed trades, ~3.2K events total)
- Schema: 16 fields including event type, positionId, time, volume, type, entryPrice, tp (always null), sl, closePrice, grossProfit, pips, balance, equity

## Objective
1. Fix critical bugs in existing reports (positionSize field references, incomplete event pairing)
2. Deploy advanced analytics focused on **failed trades**, **lost opportunities**, and **hidden performance insights**
3. Think beyond standard P&L aggregation into behavioral, temporal, and structural patterns

---

## Phase 1: Critical Bug Fixes

### 1.1 Fix `reports/position-size-vs-pnl.js`
- **Bug**: References `e.positionSize` which does NOT exist in events.json schema
- **Fix**: Replace with `e.volume` (lot size equivalent)
- **Impact**: Report was producing NaN/undefined bars; now correctly shows P&L by volume

### 1.2 Fix `reports/win-rate-by-size.js`
- **Bug**: Same `e.positionSize` reference
- **Fix**: Replace with `e.volume`
- **Impact**: Win rate analysis broken; now correctly buckets by trade size

### 1.3 Fix `reports/time-analysis.js` incomplete pairing
- **Bug**: Only pairs `Create Position` with `Stop Loss Hit`, ignoring `Position closed` events
- **Fix**: Also pair `Create Position` with `Position closed` events when closePrice exists
- **Impact**: Trades closed at take-profit or manually were silently excluded from time analysis

---

## Phase 2: Failure-Focused Reports (Lost Trades)

### 2.1 `reports/loss-autopsy.js` — Loss Autopsy
**Focus**: Every losing trade dissected into components.
**Sections**:
- Executive KPIs: total loss, average loss, largest single loss, loss std dev, max adverse excursion (MAE) if calculable
- Loss distribution by absolute amount and by R-multiples
- Loss type breakdown:
  - **Stop Loss Hit** vs **Position Closed** (manual close at loss)
  - Buy vs Sell losses
- Day-of-week and hour-of-day loss heatmap (dedicated loss view)
- Volume vs loss scatter (do larger trades lose more?)
- Cumulative loss curve (equivalent to drawdown from losses only)

**Senior Trader Insight**: Identifies whether losses are random noise or concentrated in specific market conditions, times, or size buckets.

### 2.2 `reports/sl-hit-analysis.js` — Stop Loss Hit Patterns
**Focus**: The boundary between acceptable risk and premature exit.
**Sections**:
- % of all losses that came from SL hit vs manual close
- SL distance analysis: average SL distance vs actual loss distance (premature SL detection)
- Time between entry and SL hit (were traders stopped out too early?)
- SL hit by day/hour heatmap (dedicated)
- "Whipsaw" detection: trades that hit SL then price reversed beyond entry within same time window
- SL tightness index: correlation between P&L and (closePrice - entryPrice) at exit for SL trades

**Senior Trader Insight**: If bot consistently gets stopped out before the real move happens, SL placement strategy is fundamentally broken.

### 2.3 `reports/win-loss-anatomy.js` — Winners vs Losers Anatomy
**Focus**: Side-by-side structural comparison of winning vs losing trades.
**Sections**:
- Comparative table: avg win size, avg loss size, avg win duration, avg loss duration
- Win/Loss ratio (average win / average loss)
- R-multiples distribution: expected value, standard deviation, Sharpe-like ratio
- Outcome by `type` (Buy vs Sell): separate win rates, avg profit, avg duration
- Outcome by day of week
- Box-plot-like representation of profit distribution (winners vs losers)
- Time-of-day discrimination: best and worst hours for losers specifically

**Senior Trader Insight**: Reveals if the bot has a positive expectancy despite low win rate (classic trend-following profile) or if it's just gambling.

### 2.4 `reports/trade-streaks.js` — Consecutive Win/Loss Patterns
**Focus**: Behavioral and statistical patterns in streaks.
**Sections**:
- Longest win streak, longest loss streak
- Distribution of streak lengths (Markov-chain-like analysis)
- Streak impact: how much equity does a 5-loss streak draw down?
- Streak recovery time (trades needed to recover from X consecutive losses)
- Probability of loss after loss vs loss after win (independence test)
- "Chasing" pattern: trade size changes after losses (using volume field)
- Streak heatmap by time-of-day and day-of-week

**Senior Trader Insight**: Streaks are not random. If 3+ losses in a row predict the next trade will also lose, there's a systemic issue (e.g., trading against the trend, session fatigue).

---

## Phase 3: Opportunity & Behavioral Reports

### 2.5 `reports/lost-opportunity.js` — Lost Opportunity Analysis
**Focus**: Hypothetical P&L vs realized P&L.
**Sections**:
- Theoretical best-case P&L: for each trade, what was the max favorable excursion (MFE)?
- "Could-have-been" analysis: if entered at same time, closed at MFE instead of actual close
- Opportunity cost per day/week/month
- MFE-to-actual ratio distribution (how much of the available profit did the bot capture?)
- Premature close analysis: trades where MFE > X*actual profit
- Directional missed opportunity: Buy trades missed upside vs Sell trades missed downside

**Senior Trader Insight**: If the bot captures only 30-40% of available moves, take-profit strategy is too tight or exit logic is flawed.

### 2.6 `reports/overtrading-analysis.js` — Trade Frequency & Diminishing Returns
**Focus**: Quality vs quantity.
**Sections**:
- Daily trade count vs daily P&L (correlation, R²)
- Hourly trade density vs hourly P&L
- "Marathon session" detection: hours with >N trades and negative expectancy
- Consecutive trade timing: if trades happen within X minutes of each other, outcome probability changes
- Rest-day effect: comparing days with 0-5 trades vs 20+ trades
- Trade clustering coefficient: are trades bunched or evenly distributed?

**Senior Trader Insight**: Over-trading is the #1 account killer. This report surfaces the exact point where additional trades switch from alpha-generation to noise.

### 2.7 `reports/monthly-consistency.js` — Consistency & Regime Analysis
**Focus**: Predictability and stability.
**Sections**:
- Win rate by calendar month (seasonality detection)
- Monthly Sharpe/Sortino-like ratios
- Consistency score: % of days with positive P&L
- Kelly criterion estimate: optimal position sizing based on win rate and avg win/loss
- Drawdown duration analysis: average days/weeks to recover from monthly drawdowns
- Consecutive losing/winning months
- Volatility-adjusted performance: P&L per unit of trade count variance

**Senior Trader Insight**: A bot that makes 10% in Jan, -8% in Feb, 12% in Mar is more predictable and safer than one that makes 100% then -50%.

---

## Phase 4: Data Quality & Testing

### 4.1 Bug Fix in `time-analysis.js`
- Extend event pairing to include `Position closed` in addition to `Stop Loss Hit`
- Ensure `Position Modified (S/L)` events are handled (update SL without closing)
- Deduplicate by `positionId` using final state

### 4.2 Test Infrastructure
- Add `tests/` directory with Jest or Vitest
- Create `tests/reports/validation.test.js` to verify each report handles:
  - Empty events array
  - Only open positions
  - Single trade
  - All wins, all losses
  - Edge cases (zero volume, null closePrice)
- Create `tests/schema/events.schema.test.js` to validate JSON structure

---

## Constraints
- No inline JavaScript in public HTML files
- Report files return `{ title, description, html }` using inline SVG
- File size ≤ 200 lines ideal, hard max 500 lines
- Author: Inventions4All - github:TWeb79
- All SVGs must be responsive and accessible with dark-theme colors (#1e293b backgrounds, #94a3b8 muted text)
