# Plan: Gap-Trade Session Edge Report

## Objective
Add one new report that detects gap-up/gap-down sessions from the trade log and measures whether the post-gap edge favors longs or shorts, expressed in win rate, total profit, and average profit.

## Report
- File: `reports/gap-trade-session-edge.js`
- Category: `Time & Scheduling`

## Logic
1. Build per-day trade buckets from closed trades.
2. For each trading day, derive:
   - `open` = earliest trade entryPrice that day
   - `close` = latest trade closePrice that day
   - `sessionReturn` = percentage change from open to close
3. Compare each day’s open to the previous day’s close:
   - `gapUp` if `currentOpen > previousClose`
   - `gapDown` if `currentOpen < previousClose`
4. For gap-up sessions:
   - Compute Buy trades: win rate, total P&L, avg P&L
   - Compute Sell trades: win rate, total P&L, avg P&L
5. For gap-down sessions:
   - Same Buy/Sell split
6. Render:
   - Summary KPIs: gap-up days, gap-down days, no-gap days
   - Gap-up table: direction | trades | win rate | total P&L | avg P&L
   - Gap-down table: direction | trades | win rate | total P&L | avg P&L
   - Optional: list of individual gap trades with position links

## Assumptions
- Day boundary is local calendar day based on trade `time`.
- Gap threshold = any measurable gap (no minimum % filter). If needed, can add a configurable gap threshold later.
- Only closed trades with both `entryPrice` and `closePrice` are used.

## Validation
- `node --check reports/gap-trade-session-edge.js`
- Restart server, verify report appears in `/api/reports`
- Quick sanity: total trades in gap report should approximate total closed trades
