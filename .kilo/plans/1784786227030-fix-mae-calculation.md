# Plan: Fix MAE Calculation for Optimal SL Recommendation

## Problem Statement

The current `optimal-sl-recommendation.js` computes MAE as:
```javascript
const entryEquity = Number(create.equity);
const minEquity = Math.min(...evts.map(ev => Number(ev.equity)));
const mae = Math.max(0, entryEquity - minEquity);
```

This uses account equity as a proxy, which:
1. Confounds multiple positions open simultaneously
2. Doesn't reflect the actual price distance from entry to stop-loss
3. Mixes trade-specific P&L with account-level fluctuations

## Goal

Compute MAE based on the **actual stop-loss distance from entry** for each trade, enabling accurate SL level optimization.

## Data Analysis

Each trade has:
- `entryPrice` (from Create Position event)
- `sl` (from final SL value, either at close or last modification)
- `type` (Buy or Sell)

The SL distance calculation:
- **For Buy trades**: MAE = entryPrice - SL (SL below entry limits loss)
- **For Sell trades**: MAE = SL - entryPrice (SL above entry limits loss)

However, there's an anomaly: 406 Buy trades have SL above entry, and 341 Sell trades have SL below entry. This suggests either:
1. Trailing stops that moved beyond entry (profit protection)
2. Data format where SL values work differently for this instrument

## Proposed Fix

### Option A: Use SL-to-Entry Distance (Recommended)

Compute MAE as the absolute price distance between entry and initial SL:

```javascript
const entry = Number(create.entryPrice);
const sl = getInitialSl(evts); // First SL set, not final
const slDistance = Math.abs(entry - sl);
const mae = slDistance;
```

This directly measures the stop-loss cushion.

### Option B: Use Equity-Based MAE with De-duplication

If multiple positions are open:
- Track equity at position entry (isolated)
- Track minimum equity while only that position was open (requires complex filtering)
- Too complex for current data structure.

## Implementation Steps

1. **Modify `optimal-sl-recommendation.js`:**
   - Find the first `Position Modified (S/L)` event or initial `sl` value
   - Calculate MAE = |entryPrice - firstSL|
   - Handle both Buy and Sell correctly
   - For trades without SL, use the MAE computed via equity as fallback

2. **Key functions to add:**
   ```javascript
   function getInitialSl(evts) {
     const slEvent = evts.find(e => e.sl != null && e.event === 'Position Modified (S/L)');
     return slEvent ? Number(slEvent.sl) : null;
   }
   ```

3. **Handle edge cases:**
   - Trades without SL: Use equity-based MAE (fallback)
   - SL at or beyond entry (trailing stop hit): MAE = 0 or negative
   - Multiple SL modifications: Use first SL (the set stop distance)

4. **Add validation:**
   - Show count of trades used SL-based vs equity-based MAE
   - Flag anomalies where SL is beyond entry

## Metrics to Add

After fix, include in report:
- **Trades with Valid SL:** Count of trades where SL-based MAE was computed
- **Trades Needing Equity MAE:** Count of trades without SL data
- **Average SL Distance:** Mean of all SL-to-entry distances
- **MAE Distribution by Direction:** Separate Buy/Sell MAE percentiles

## Risks

1. **Incorrect MAE for trailing stops:** If SL was moved to breakeven and then hit, the initial SL distance overstates risk.
2. **Missing SL data:** Many positions may not have explicit SL (null), requiring equity fallback.
3. **Price vs Equity units:** SL distance in price units vs MAE in currency may need normalization.

## Next Decision

**Use first SL set** for MAE computation because it represents the intended risk cushion at entry. This enables optimization of future stop placement based on actual historical SL distances, not trailing stop adjustments.

---

## Implementation Summary

The plan is ready. It addresses:
- Problem: Equity-based MAE conflates multi-position dynamics
- Solution: SL-to-entry distance calculation
- Edge cases: Missing SL, trailing stops, Buy/Sell direction handling
- Validation: Metrics for SL availability and anomaly detection

Switch to implementation mode to apply this fix to `optimal-sl-recommendation.js`.