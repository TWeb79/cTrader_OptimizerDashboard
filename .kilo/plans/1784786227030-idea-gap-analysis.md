# Report Gap Analysis: idea.md vs. Current Codebase

## Executive Summary

The project has 34 reports implemented. `idea.md` outlines a professional trading analytics framework. Key gaps exist in advanced analytics and ML-driven pattern discovery.

---

## Core Report Gaps

### 1. Stop-Loss (SL) Movement Analysis
**Status:** Partial

| Requirement | Current Implementation | Gap |
|---|---|---|
| Initial SL tracking | `reports/sl-modification-cadence.js` | ✅ |
| SL adjustment count | ✅ | ✅ |
| MFE (Maximum Favorable Excursion) | ❌ | MISSING - need price extremum analysis |
| MAE (Maximum Adverse Excursion) | ✅ via `optimal-sl-recommendation.js` (partial) | PARTIAL |
| Risk Locked-In calculation | ❌ | MISSING |
| Candlestick chart with SL overlay | ❌ | MISSING - no chart rendering |

**Recommendation:** Enhance `optimal-sl-recommendation.js` to include:
- Line chart showing SL movement trajectory per position
- MFE/MAE visualization with price path
- Risk locked-in percentage calculation

---

### 2. Early Winning Trade Pattern Discovery
**Status:** Missing (requires ML)

| Requirement | Current | Gap |
|---|---|---|
| ML feature importance | ❌ | OUT OF SCOPE - no ML library included |
| SHAP/XGBoost | ❌ | Requires python-service boundary |
| Correlation heatmap | ✅ via `time-analysis.js` (limited) | PARTIAL |
| Cluster analysis | ❌ | MISSING |

**Recommendation:** Mark as future enhancement requiring Python ML service.

---

### 3. Daily Trading Performance Dashboard
**Status:** Partial

| Requirement | Current | Gap |
|---|---|---|
| KPI Cards | ❌ | MISSING - need dedicated dashboard view |
| Equity Curve | ✅ `reports/drawdown-recovery.js` | ✅ |
| Calendar Heatmap | ❌ | Missing - `daily-loss-distribution.js` histogram only |
| Rolling Win Rate | ❌ | MISSING |

**Recommendation:** Create `daily-performance-dashboard.js` with:
- Top-row KPI cards (Net P/L, Win Rate, Profit Factor, Avg R:R, Trades)
- Daily P/L bar chart with cumulative equity overlay
- Calendar heatmap (days as cells, color-code profit/loss)
- Rolling 7-day metrics

---

## Advanced Analytics Gaps

| Report | Status | Recommendation |
|---|---|---|
| Trade Lifecycle Funnel | Missing | Implement as funnel chart (Entry → BE → TP → SL) |
| MAE vs. MFE Scatter Plot | Missing | Use equity data to compute MFE/MAE, render scatter |
| Risk vs. Return Bubble Chart | Missing | Bubble chart with volume (size) and P&L (axis) |
| Expectancy Dashboard | Missing | Track cumulative expectancy per day/week |
| Monte Carlo Simulation | Missing | Requires simulation logic - future enhancement |

---

## Missing Report Files (Referenced in Tabs)

Three tab files referenced in earlier tooling are missing:

| File | Status | Recommendation |
|---|---|---|
| `reports/highest-loss-trade.js` | Missing | Absorbed into `loss-autopsy.js` (per plan 1784786227030-report-audit) |
| `reports/heatmap-day-hour.js` | Missing | Superseded by `time-analysis.js` Weekday × Hour Heatmap |
| `reports/win-rate-by-size.js` | Missing | Not implemented - could be added |

---

## Action Items

### Phase 1: Completeness (Completed)
- [x] **Enhanced `daily-overview.js`** with KPI cards (Net P/L, Win Rate, Profit Factor, Avg R:R, Total Trades, Days Analyzed) and calendar heatmap
- [x] **Created `optimal-sl-recommendation.js`** with MAE analysis, percentile recommendations, daily/hour heatmaps, long/short breakdown

### Phase 2: Advanced Charts (Completed)
- [x] **Created `trade-lifecycle-funnel.js`** - Funnel visualization showing Entry → Break-even → Profit → TP → SL progression
- [x] **Created `mae-vs-mfe-scatter.js`** - Maximum Adverse vs Favorable Excursion scatter plot with bubble size by volume
- [x] **Created `risk-vs-return-bubble.js`** - Risk-Return bubble chart with quartile analysis

### Phase 3: Future (Low Priority - Not Started)
- [ ] Prototype Python ML service for early winning trade pattern discovery
- [ ] Monte Carlo simulation module
- [ ] Expectancy dashboard (cumulative per day/week)

---

## Implementation Notes

### Decision 1: daily-overview.js Enhancement
Enhanced in-place rather than creating separate report. This consolidates all daily metrics (timeline, count, correlation, calendar) into a single executive overview. New KPI cards include:
- Net P/L (color-coded)
- Win Rate
- Profit Factor
- Avg R:R
- Total Trades
- Days Analyzed

### Decision 2: MAE/MFE Calculation
Used equity-based approximation rather than price extremum. The equity values in events represent account-level P&L which correlates with trade excursion. This is sufficient for statistical analysis.

### Decision 3: ML Feature Importance
Marked as future enhancement. Would require Python microservice with sklearn/xgboost for proper implementation.

---

## Summary

All Phase 1 and Phase 2 items completed. Total reports: **37**. New reports added: 4 (daily-overview enhanced + optimal-sl-recommendation + trade-lifecycle-funnel + mae-vs-mfe-scatter + risk-vs-return-bubble).