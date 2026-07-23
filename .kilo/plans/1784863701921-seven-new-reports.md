# Report Plan: 7 New Analytics Reports

## Summary
Add 7 new reports to cover trailing-stop efficiency, modification cadence, directional sizing bias, equity-normalized risk, breakeven effectiveness, quick-scalp segment, and SL reaction latency.

## Reports

1. **trail-efficiency**
   - Category: Risk & Loss Analysis
   - Data source: all `Close Position` / `Stop Loss Hit` events per position
   - Logic:
     - Build `positionEvents` map and sort by time
     - Identify canonical close event: last event where `closePrice != null`
     - Extract SL history before close
     - For each position, compute max favorable excursion as best SL reached
     - Compute give-back = difference between best-SL profit and actual profit
   - Output:
     - Per-position metrics: best SL, profit at best SL, actual profit, give-back
     - Aggregate stats: average give-back, percent of profit given back
     - Histogram / table of give-back distribution

2. **sl-modification-cadence**
   - Category: Risk & Loss Analysis
   - Data source: all `Position Modified (S/L)` events per position
   - Logic:
     - Count number of SL modifications per position
     - Group positions by modification count
     - Compute win rate, total P&L, average P&L per group
   - Output:
     - Dose-response table: modifications vs win rate / P&L
     - Bar chart or table

3. **directional-sizing-bias**
   - Category: Trade Quality & Sizing
   - Data source: closed trades with `type` Buy vs Sell
   - Logic:
     - Aggregate by direction: count, total P&L, avg P&L, avg volume, avg pips, win rate
     - Compute size-normalized metrics: P&L per lot, pips per lot
   - Output:
     - Direction comparison table
     - Size-normalized edge comparison

4. **risk-consistency-audit**
   - Category: Risk & Loss Analysis
     - For each closed trade, compute:
       - risk = abs(entryPrice - SL) * volume (or abs(grossProfit) if SL unavailable)
       - equity fraction = risk / equity_at_entry
     - Flag outliers (e.g., top 5% equity fraction)
   - Output:
     - Histogram of equity-normalized risk
     - Outlier table with trade details

5. **breakeven-stop-effectiveness**
   - Category: Risk & Loss Analysis
   - Data source: SL history per position
   - Logic:
     - Detect when SL was moved to breakeven or better
     - Track final P&L vs breakeven level
     - Cases where breakeven was hit but later given back
   - Output:
     - Positions where breakeven was activated
     - Of those, how many ended below breakeven
     - Average profit at breakeven vs final profit

6. **quick-scalp-segment**
   - Category: Trade Quality & Sizing
   - Data source: closed trades with duration < 5 minutes
   - Logic:
     - Filter trades by duration
     - Compute segment-level stats: count, win rate, avg P&L, avg volume, hours distribution
     - Compare to non-scalp segment
   - Output:
     - Segment summary table
     - Hour distribution of scalps
     - Size distribution of scalps

7. **sl-reaction-latency**
   - Category: Time & Scheduling
   - Data source: `Create Position` time vs first `Position Modified (S/L)` time
   - Logic:
     - For each modified position, compute latency = first_mod_time - create_time
     - Bucket latency into ranges
     - Correlate latency with final P&L / win rate
   - Output:
     - Latency distribution
     - Win rate by latency bucket
     - Scatter plot or table

## Implementation Order
1. trail-efficiency
2. sl-modification-cadence
3. directional-sizing-bias
4. risk-consistency-audit
5. breakeven-stop-effectiveness
6. quick-scalp-segment
7. sl-reaction-latency

## Validation
- `node --check` each new file
- Restart server and verify reports load
- Cross-check totals against known dataset counts (782 positions, 641 with exactly 1 SL modification, etc.)
