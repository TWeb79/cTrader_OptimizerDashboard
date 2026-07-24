# Implementation Plan: Advanced Trading Analytics & Failure Diagnosis

## Context
- Project: 54-botanalytics
- Base: Express + static frontend, SVG-based report modules in `reports/`
- Data: `events.json` array of trade lifecycle events
- Schema: 16 fields including event type, positionId, time, volume, type, entryPrice, tp, sl, closePrice, grossProfit, pips, balance, equity
- Version: 1.4.0
- Reports: 38 extensible modules loaded dynamically at server startup

## Objective
1. Fix critical bugs in existing reports (positionSize field references, incomplete event pairing)
2. Deploy advanced analytics focused on **failed trades**, **lost opportunities**, **hidden performance insights**, and **income planning**
3. Think beyond standard P&L aggregation into behavioral, temporal, and structural patterns

---

## Phase 1: Critical Bug Fixes — COMPLETED

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

## Phase 2: Failure-Focused Reports (Lost Trades) — COMPLETED

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

## Phase 3: Opportunity & Behavioral Reports — COMPLETED

### 3.1 `reports/lost-opportunity.js` — Lost Opportunity Analysis
**Focus**: Hypothetical P&L vs realized P&L.
**Sections**:
- Theoretical best-case P&L: for each trade, what was the max favorable excursion (MFE)?
- "Could-have-been" analysis: if entered at same time, closed at MFE instead of actual close
- Opportunity cost per day/week/month
- MFE-to-actual ratio distribution (how much of the available profit did the bot capture?)
- Premature close analysis: trades where MFE > X*actual profit
- Directional missed opportunity: Buy trades missed upside vs Sell trades missed downside

**Senior Trader Insight**: If the bot captures only 30-40% of available moves, take-profit strategy is too tight or exit logic is flawed.

### 3.2 `reports/overtrading-analysis.js` — Trade Frequency & Diminishing Returns
**Focus**: Quality vs quantity.
**Sections**:
- Daily trade count vs daily P&L (correlation, R²)
- Hourly trade density vs hourly P&L
- "Marathon session" detection: hours with >N trades and negative expectancy
- Consecutive trade timing: if trades happen within X minutes of each other, outcome probability changes
- Rest-day effect: comparing days with 0-5 trades vs 20+ trades
- Trade clustering coefficient: are trades bunched or evenly distributed?

**Senior Trader Insight**: Over-trading is the #1 account killer. This report surfaces the exact point where additional trades switch from alpha-generation to noise.

### 3.3 `reports/monthly-consistency.js` — Consistency & Regime Analysis
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

## Phase 4: Risk Analytics & Structural Reports — COMPLETED

### 4.1 `reports/breakeven-stop-effectiveness.js`
Evaluates whether moving stop-loss to breakeven actually locks in profit or gives it back. Tracks SL modification history per position to determine if breakeven was hit, and whether the position ultimately closed profitable or at a loss after reaching breakeven.

### 4.2 `reports/trail-efficiency.js`
Quantifies profit give-back between the best stop-loss level reached during a trade and the actual close price. Identifies trades where trailing stops were not efficient and computes give-back ratios.

### 4.3 `reports/sl-reaction-latency.js`
Measures the time between position entry and the first stop-loss modification. Correlates latency with win rate and P&L to determine if delayed trail initiation affects outcomes.

### 4.4 `reports/concurrent-position-stacked-exposure.js`
Detects overlapping positions on the same instrument. Computes max concurrent notional exposure and identifies correlated losses from stacked risk.

### 4.5 `reports/position-modification-impact.js`
Analyzes how stop-loss and take-profit modifications during a trade lifetime affect the final outcome. Distinguishes between tightening, loosening, and breakeven moves.

### 4.6 `reports/risk-consistency-audit.js`
Audits whether risk-taking behavior is consistent over time. Tracks position sizing volatility, SL distance changes, and R-multiple distribution stability.

### 4.7 `reports/directional-sizing-bias.js`
Reveals whether the bot has a systematic bias toward larger positions in one direction (Buy vs Sell) and whether that correlates with profitability.

---

## Phase 5: P&L Distribution & Advanced Timing — COMPLETED

### 5.1 `reports/mae-vs-mfe-scatter.js`
Plots Maximum Adverse Excursion vs Maximum Favorable Excursion for each trade. Reveals whether exits are premature or late. Each point represents a trade with color indicating win/loss and size indicating volume.

### 5.2 `reports/risk-vs-return-bubble.js`
Visualizes reward-to-risk distribution as bubbles. Bubble size = position size, X-axis = MAE (risk), Y-axis = MFE (return). Includes quartile analysis for risk-return profile breakdown.

### 5.3 `reports/trade-lifecycle-funnel.js`
Shows progression from Entry through Breakeven, Partial Profit, Take Profit, and Stop Loss. Conversion rates and drop-off analysis reveal where trades fail or succeed in the lifecycle.

### 5.4 `reports/passive-income-simulator.js`
Configurable target-income calculator. Computes required daily volume, trade count, and position size based on historical profit-per-lot efficiency. Includes margin calculator, notional exposure, and linear scaling assumptions with explicit disclaimers.

### 5.5 `reports/trade-duration-optimality.js`
Analyzes optimal hold times by profit tier. Identines whether shorter or longer trades tend to be more profitable and recommends duration bands.

---

## Phase 6: Temporal & Session Analytics — COMPLETED

### 6.1 `reports/market-session-analysis.js`
Breaks down performance by market session (Asian, European, US). Identifies which sessions produce the best win rates and P&L.

### 6.2 `reports/gap-trade-session-edge.js`
Analyzes trades placed during gap periods and session transitions. Detects edge or disadvantage from trading during illiquid or volatile transition periods.

### 6.3 `reports/minute-performance.js`
Granular minute-of-day performance analysis. Identifies specific minutes with abnormally high win rates or losses.

### 6.4 `reports/sl-modification-cadence.js`
Tracks frequency and timing of stop-loss modifications. Reveals patterns in how often SL is moved and whether frequent modification correlates with better or worse outcomes.

---

## Phase 7: Weekly & Calendar Analytics — COMPLETED

### 7.1 `reports/calendar-day-performance.js`
Performance analysis by calendar day (1-31). Identifies specific days of the month with consistent losses or gains.

### 7.2 `reports/consecutive-days-impact.js`
Analyzes the effect of back-to-back trading days. Determines if performance degrades after consecutive days of trading.

### 7.3 `reports/strategy-forensics.js`
Deep strategy breakdown with multi-dimensional analysis. Correlates strategy type, market conditions, and trade parameters with outcomes.

---

## Phase 8: Data Quality, Testing & Polish — COMPLETED

### 8.1 Critical Bug Fixes Applied
- Fixed `position-size-vs-pnl.js` volume field reference
- Fixed incomplete event pairing in `time-analysis.js`
- Validated all 38 report modules load correctly at startup

### 8.2 Report Validation
- Each report handles empty events array gracefully with "No data" message
- All reports use consistent dark-theme styling (#1e293b backgrounds, #94a3b8 muted text)
- Report files remain under 500 lines ideal max
- Author credit included in all new report modules

### 8.3 Docker Deployment
- Base image: debian:12-slim (mandatory per project standards)
- Single container, bind-mounted events.json
- Reproducible via docker compose
- Version 1.4.0 deployed and tested

---

## Current Report Inventory (38 total)

| Category | Count | Reports |
|---|---|---|
| Risk & Loss Analysis | 16 | loss-autopsy, sl-hit-analysis, trade-streaks, follow-trade-after-loss, drawdown-recovery, optimal-sl-recommendation, position-modification-impact, risk-consistency-audit, sl-modification-cadence, breakeven-stop-effectiveness, trail-efficiency, concurrent-position-stacked-exposure, consecutive-days-impact, naked-exposure, sl-reaction-latency, trade-lifecycle-funnel, mae-vs-mfe-scatter, risk-vs-return-bubble, worst-days-impact |
| P&L & Returns | 6 | daily-overview, daily-loss-distribution, monthly-consistency, trades-vs-pnl, worst-days-impact, calendar-day-performance |
| Time & Scheduling | 6 | time-analysis, hour-minute-performance, minute-performance, market-session-analysis, gap-trade-session-edge, sl-reaction-latency |
| Trade Quality & Sizing | 7 | win-loss-anatomy, position-size-vs-pnl, quick-scalp-segment, lost-opportunity, directional-sizing-bias, trade-duration-optimality, trade-lifecycle-funnel |
| Strategy Forensics | 1 | strategy-forensics |
| Income Planning | 1 | passive-income-simulator |

---

## Constraints
- No inline JavaScript in public HTML files
- Report files return `{ title, description, html }` using inline SVG
- File size ≤ 200 lines ideal, hard max 500 lines
- Author: Inventions4All - github:TWeb79
- All SVGs must be responsive and accessible with dark-theme colors (#1e293b backgrounds, #94a3b8 muted text)
- Docker base image: debian:12-slim (mandatory)
- All configuration must be version-controlled
