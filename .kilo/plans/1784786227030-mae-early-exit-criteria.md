# Plan: MAE-Based Early Exit Criteria

## Goal
Add statistical criteria to the MAE vs MFE Scatter report that identifies trades crossing danger thresholds during their lifecycle, enabling early exit decisions.

## Current State
- `mae-vs-mfe-scatter.js` computes MAE and MFE per trade
- Only post-trade statistics are shown (average MAE/MFE)
- No in-trade threshold analysis

## Proposed Enhancement

### 1. Compute MAE Thresholds Per Trade
For each trade's event timeline:
- Track running MAE at each intermediate event
- Identify if MAE crossed critical thresholds (25th, 50th, 75th, 90th percentile of all trade MAE)

### 2. Add Statistics Section
New KPIs:
- **MAE > 75th percentile:** Count / Rate of trades that hit extreme MAE
- **MAE > 90th percentile:** Count / Rate (critical danger zone)
- **MAE Recovery Rate:** Trades that recovered from >50th percentile MAE to close positive
- **Early Warning MAE:** Suggested threshold (e.g., 95th percentile) for proactive partial exit

### 3. Add Distribution Histogram
- Histogram of intra-trade MAE values (not just final MAE)
- Show overlap between winning and losing trades on same MAE ranges

### 4. Add Threshold Table
Per-threshold statistics:
| MAE Level | Trades | Win Rate | False Positive Rate | Recovery Possibility |
|-----------|--------|----------|---------------------|-------------------|
| > 25% | 120 | 32% | High | Moderate |
| > 50% | 65 | 18% | Very High | Low |
| > 75% | 23 | 5% | Critical | Very Low |

## Implementation Steps

1. **Modify `mae-vs-mfe-scatter.js`:**
   - Add `intraTradeMae` array per trade capturing MAE at each event
   - Compute overall MAE percentiles across all trades
   - Add `dangerThresholdFlags` per trade (boolean flags for each percentile)
   - Add histogram section showing MAE distribution

2. **Add Early Exit Logic:**
   - Find the MAE threshold where win rate drops below 30%
   - Suggest that as "Early Warning Level"
   - Show percent of trades recoverable after hitting threshold

3. **UI Addition:**
   - New "Early Exit Criteria" section after scatter chart
   - Table of thresholds with actionable guidance
   - Histogram of intra-trade MAE distribution

## Data Requirements
- Each trade's event timeline has equity values
- MAE computed as `entryEquity - minEquity` per intermediate event
- No additional data needed beyond existing events.json

## Risks
- Equity values reflect account total, not individual trade — may conflate multiple positions
- MAE approximation via equity may be noisy during high volatility
- Thresholds computed from historical data may not predict future outcomes

## Validation
- Verify MAE thresholds correlate with negative outcomes
- Check that recovery rate < 30% for trades exceeding 75th percentile MAE
- Ensure histogram renders correctly with color-coding for win/loss