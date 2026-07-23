# Report Audit, Consolidation, and New Reports Plan

## Executive Summary

The current dashboard ships **23 reports**, several of which overlap significantly in scope. This plan proposes:
- **Consolidating 4 reports** into fewer, higher-value artifacts.
- **Removing 1 redundant report** because its content is fully covered by another.
- **Adding 5 new reports** that fill measurable analytical gaps.
- **Net result:** 23 reports → 18 reports, with clearer coverage and less duplication.

---

## 1. Current Report Landscape

| Report | Category | Granularity | Primary Value | Overlap Risk |
|--------|----------|-------------|---------------|--------------|
| `cumulative-pnl-drawdown` | P&L & Returns | Trade | Cumulative equity + drawdown | Low |
| `daily-loss-distribution` | P&L & Returns | Day | Histogram of losing days | **High** — daily-level, loss-only view |
| `daily-pnl` | P&L & Returns | Day | Chronological daily P&L bars | **High** — daily-level |
| `daily-pnl-vs-count` | P&L & Returns | Day | Daily P&L + count scatter + correlation | **High** — daily-level |
| `daily-trade-count-distribution` | P&L & Returns | Day | Chronological daily trade count | **High** — daily-level |
| `heatmap-day-hour` | Time & Scheduling | Day×Hour | Day-of-week × hour avg P&L | **Critical** — fully covered by `time-analysis` |
| `highest-loss-trade` | Risk & Loss Analysis | Trade | Link to single worst trade | **High** — 25-line report, trivial content |
| `hour-minute-performance` | Time & Scheduling | Hour×Minute | 24×60 grid + stats table | Low |
| `loss-autopsy` | Risk & Loss Analysis | Trade | Loss breakdown by exit type, day, hour, direction | Low |
| `lost-opportunity` | Trade Quality & Sizing | Trade | Direction bias, biggest wins/losses, scatter | Low |
| `minute-performance` | Time & Scheduling | Minute | Minute-level stats + danger zones | Low |
| `monthly-consistency` | P&L & Returns | Month | Monthly P&L, consistency score, equity curve | Low |
| `overtrading-analysis` | Risk & Loss Analysis | Day | Trade count vs P&L buckets, time gaps | Medium |
| `position-size-vs-pnl` | Trade Quality & Sizing | Trade | Volume buckets, total P&L, win rate | Low |
| `sl-hit-analysis` | Risk & Loss Analysis | Trade | SL vs manual close profitability | Low |
| `time-analysis` | Time & Scheduling | Multi | 15-min buckets, heatmaps, hourly stats, duration | Low |
| `trade-streaks` | Risk & Loss Analysis | Trade | Win/loss streaks, revenge trading, equity curve | Low |
| `trades-vs-pnl` | P&L & Returns | Day | Scatter trades/day vs P&L + Pearson correlation | Medium |
| `win-loss-anatomy` | Trade Quality & Sizing | Trade | Winners vs losers (pips, duration, day, direction) | Low |
| `win-rate-by-size` | Trade Quality & Sizing | Trade | Win rate by size bucket | **High** — covered by `position-size-vs-pnl` |
| `worst-days-impact` | P&L & Returns | Day | Actual vs without-worst-day equity curve | Low |
| `follow-trade-after-loss` | Risk & Loss Analysis | Trade | Revenge trade follow-up analysis | Low |
| `calendar-day-performance` | Time & Scheduling | Day | Calendar day 1–31 no-trade zones | Low |

---

## 2. Consolidation Plan

### 2.1 Merge `daily-pnl` + `daily-trade-count-distribution` + `daily-pnl-vs-count` → `daily-overview`

**Rationale:** All three operate at day granularity and share the same `dayMap` data structure. They ask the same question from different angles (temporal, distributional, correlational). A single report eliminates repeated data-passing and gives users a unified daily dashboard.

**New report contents:**
- Daily P&L timeline (from `daily-pnl`)
- Daily trade count timeline (from `daily-trade-count-distribution`)
- Trades/day vs Daily P&L scatter with Pearson correlation (from `daily-pnl-vs-count`)
- No-trade days list

**Migration:**
- Create `reports/daily-overview.js`
- Keep `/api/reports/daily-pnl`, `/api/reports/daily-pnl-vs-count`, `/api/reports/daily-trade-count-distribution` as **aliases** that return the same payload as `daily-overview` with a `_deprecated` flag.
- Frontend sidebar can show a single "Daily Overview" entry under `P&L & Returns`.

### 2.2 Merge `win-rate-by-size` INTO `position-size-vs-pnl`

**Rationale:** `position-size-vs-pnl` already renders a table with `Win Rate`, `Total P&L`, and `Avg P&L` per volume bucket. `win-rate-by-size` is a bar chart of win rates by a different bucket schema. The two are redundant; one unified sizing report is sufficient.

**Action:**
- Add a "Win Rate Bar Chart" section to `position-size-vs-pnl.js` using the existing bucket definitions.
- Delete `reports/win-rate-by-size.js`.

### 2.3 Absorb `highest-loss-trade` INTO `loss-autopsy`

**Rationale:** `highest-loss-trade` is 25 lines. It adds no statistical value beyond a single link to a trade detail modal, which `loss-autopsy` already provides in its "Catastrophic Manual Closes" table.

**Action:**
- Add a "Worst Trade Spotlight" section to `loss-autopsy.js` showing the single highest-loss trade (by `grossProfit`).
- Delete `reports/highest-loss-trade.js`.

### 2.4 Remove `heatmap-day-hour`

**Rationale:** `time-analysis.js` already contains a **Weekday × Hour Heatmap** section that renders the exact same data (day-of-week × hour average gross profit). `heatmap-day-hour.js` adds no unique insight.

**Action:**
- Delete `reports/heatmap-day-hour.js`.
- Server auto-discovery will remove it from the sidebar automatically.

---

## 3. Five New Reports

### 3.1 `position-modification-impact.js`
**Category:** Risk & Loss Analysis
**Question:** Does modifying the stop loss improve or destroy trade outcomes?
**Data needed:** `Position Modified (S/L)` events from the raw events array.
**Key metrics:**
  - % of positions modified
  - P&L of modified vs non-modified positions
  - Win rate, avg loss, profit factor for both groups
  - Common modification patterns (SL moved closer/farther)
**Why it matters:** Currently every report treats the final closed trade as the only truth. This report reveals whether the bot's risk-management adjustments help or hurt.

### 3.2 `market-session-analysis.js`
**Category:** Time & Scheduling
**Question:** Which market session (Asian, European, US, or overlap) is most profitable?
**Data needed:** Trade open times.
**Key metrics:**
  - Win rate, avg P&L, profit factor per session
  - Session-overlap performance
  - Best/worst 2-hour windows within sessions
**Why it matters:** Time-of-day reports show hourly performance but never group by market session. Session-level insights are actionable for scheduling bot uptime or disabling trading during low-liquidity windows.

### 3.3 `drawdown-recovery.js`
**Category:** P&L & Returns
**Question:** How painful are drawdowns, and how long does recovery usually take?
**Data needed:** Closed trades sorted by time; cumulative P&L.
**Key metrics:**
  - All drawdown events (depth, start, recovery point)
  - Average recovery time (in trades and minutes)
  - Max consecutive loss days
  - Drawdown frequency vs account size
  - "Stress test" table: probability of drawdown > X%
**Why it matters:** `monthly-consistency` touches on this, but trade-level drawdown recovery is missing. This is the report a trader shows investors to prove resilience.

### 3.4 `consecutive-days-impact.js`
**Category:** Risk & Loss Analysis
**Question:** Does the bot need rest days? What happens when it trades N consecutive days?
**Data needed:** Trade dates.
**Key metrics:**
  - Performance by consecutive-day streaks (1 day, 2 days, 3+ days)
  - Next-day performance after a trading streak
  - Rest-day effect (day after 2+ consecutive trading days)
  - Best/worst 3-day rolling windows
**Why it matters:** `overtrading-analysis` buckets by trade count per day but never looks at calendar-day streaks. A bot may look fine in isolation but degrade after 3 straight active days.

### 3.5 `trade-duration-optimality.js`
**Category:** Trade Quality & Sizing
**Question:** Is there an optimal hold time? When should the bot have exited?
**Data needed:** Trade open/close times and P&L.
**Key metrics:**
  - P&L distribution by duration bucket (0-5m, 5-10m, 10-20m, 20-40m, 40-60m, 60m+)
  - Probability of profit by duration
  - "Decay curve" — does average P&L worsen with time?
  - Optimal exit time per trade size bucket
**Why it matters:** `time-analysis` has a "Trade Duration Analysis" section, but it's buried in a massive report. A standalone, focused report makes it easier to tune TP/SL levels.

---

## 4. Implementation Steps

### Phase 1 — Create `daily-overview.js` (consolidation)
1. Read `daily-pnl.js`, `daily-trade-count-distribution.js`, `daily-pnl-vs-count.js` to extract data-building logic.
2. Create `reports/daily-overview.js`:
   - Share a single `dayMap` computation.
   - Render: temporal P&L bars, temporal count bars, scatter plot with correlation, no-trade days table.
3. Add alias endpoints in `server.js` for `daily-pnl`, `daily-pnl-vs-count`, `daily-trade-count-distribution` that return the new report payload with a `deprecated` metadata flag.

### Phase 2 — Absorb `win-rate-by-size` into `position-size-vs-pnl`
1. Read `win-rate-by-size.js` and `position-size-vs-pnl.js`.
2. Add a win-rate bar chart section to `position-size-vs-pnl.js`.
3. Delete `reports/win-rate-by-size.js`.

### Phase 3 — Absorb `highest-loss-trade` into `loss-autopsy`
1. Read `loss-autopsy.js`.
2. Add a "Worst Trade Spotlight" section using the same `closed.filter(t => Number(t.grossProfit) < 0)` logic.
3. Delete `reports/highest-loss-trade.js`.

### Phase 4 — Remove `heatmap-day-hour`
1. Verify `time-analysis.js` contains the Weekday×Hour Heatmap section.
2. Delete `reports/heatmap-day-hour.js`.

### Phase 5 — Create 5 new reports
1. Create `reports/position-modification-impact.js`
2. Create `reports/market-session-analysis.js`
3. Create `reports/drawdown-recovery.js`
4. Create `reports/consecutive-days-impact.js`
5. Create `reports/trade-duration-optimality.js`

### Phase 6 — Update categories & sidebar
1. Review category assignments for all new reports.
2. Ensure sidebar groups remain logical (`P&L & Returns`, `Risk & Loss Analysis`, `Time & Scheduling`, `Trade Quality & Sizing`).

---

## 5. Validation Plan

Because this project has **no automated test suite**, validation is manual + syntax checks:

1. **Syntax validation:** Run `node --check reports/*.js` on every new and modified file.
2. **Server smoke test:** Start `node server.js` and confirm `Loaded N report(s)` without errors.
3. **API contract test:** `curl /api/reports` should list all 18 expected IDs.
4. **Report content test:** `curl /api/reports/<id>` must return JSON with `title`, `description`, `html`, and `category` fields, and `html` must be non-empty.
5. **Alias test:** Old report IDs (`daily-pnl`, `daily-pnl-vs-count`, `daily-trade-count-distribution`) must still resolve and return the `daily-overview` payload.
6. **Frontend smoke test:** Open `http://localhost:8054`, upload `events.json`, verify new reports render without console errors.
7. **Removal test:** `heatmap-day-hour`, `highest-loss-trade`, and `win-rate-by-size` must NOT appear in sidebar or API.

---

## 6. Open Questions / Decisions

| # | Question | Recommended Answer |
|---|----------|-------------------|
| 1 | Should old report URLs redirect permanently (301) or just return the new payload? | Return new payload with `200`. Add a `deprecated` boolean flag in the API response so the frontend can optionally show a toast. No redirect needed. |
| 2 | Should `highest-loss-trade` alias be preserved after merge? | No. The content is absorbed into `loss-autopsy` with 0 added lines of standalone complexity. Removing it reduces sidebar clutter. |
| 3 | Should `daily-pnl` and `daily-trade-count-distribution` become separate "views" inside `daily-overview` (tabs) or a single scrollable page? | Single scrollable page. Charts are small enough and the report is still readable as one document. |
| 4 | Should `win-rate-by-size` bucket schema be unified with `position-size-vs-pnl` (0-1, 1-2, ...) or kept as-is (<1, 1-2, 2-5, ...)? | Unify to the finer `position-size-vs-pnl` buckets for consistency. |
| 5 | Should new reports use a shared utility for common helpers (e.g., `heatColor`, `kpiCards`, `scatterSvg`)? | Yes, but out of scope for this plan. See follow-up plan `report-utilities-extraction.md`. |

---

## 7. Failure Modes & Mitigations

| Risk | Mitigation |
|------|------------|
| Old bookmarks break after merge | Keep alias endpoints that return the new report payload. |
| Frontend sidebar shows duplicate "Daily Overview" + old reports | Update `public/app.js` sidebar rendering to hide aliases from the main sidebar, or mark them as deprecated in UI. |
| New report crashes on empty datasets | Every new report must include the standard `if (!closed.length) return no-data` guard. |
| New report exceeds 500-line limit | Split into sub-sections within the same file using helper functions; do NOT create separate files. |
| `drawdown-recovery` is mathematically incorrect | Use the same cumulative curve logic already proven in `cumulative-pnl-drawdown.js`. |

---

## 8. Rollout Order

1. **First:** Consolidations (they reduce maintenance burden immediately).
2. **Second:** New reports (users get fresh insights).
3. **Third:** Frontend cleanup (hide deprecated reports, update version to `1.1.0`).

---

## 9. Post-Implementation Actions

- Update `README.md` report table.
- Update `ARCHITECTURE.md` if report flow changes.
- Create follow-up plan to extract shared SVG/KPI helpers into `reports/utils.js`.
- Bump `package.json` version to `1.1.0`.
