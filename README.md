# BotAnalytics

<p align="center">
  <img src="https://img.shields.io/badge/Trading_Analytics-54-botanalytics-blue?style=for-the-badge" alt="BotAnalytics"/>
  <img src="https://img.shields.io/badge/Node_18%2B-Express-green?style=for-the-badge&logo=nodedotjs" alt="Node"/>
  <img src="https://img.shields.io/badge/Docker-Ready-0db7ed?style=for-the-badge&logo=docker" alt="Docker"/>
  <img src="https://img.shields.io/badge/Version-1.4.0-brightgreen?style=for-the-badge" alt="Version"/>
</p>

<p align="center">
  Trade event intelligence. Maximum adverse excursion analysis. Drawdown forensics. Optimal stop-loss recommendations.
</p>

---

## What It Does

BotAnalytics turns raw trade event logs into actionable analytics. Drop in an `events.json` export, and the dashboard renders 34 independent reports covering risk, timing, sizing, and strategy forensics — no database, no ETL, no config files.

### Key Capabilities

| Capability | Detail |
|---|---|
| **Zero-config ingestion** | Upload `events.json` via drag-and-drop or API |
| **34 built-in reports** | Risk, P&L, time, quality, sizing, and strategy modules |
| **Optimal SL recommendation** | Statistical MAE analysis with daily/hourly heatmaps and long/short breakdowns |
| **Trade lifecycle inspection** | Click any position ID to view full event timeline with close-event highlighting |
| **Docker-ready** | Single container, bind-mounted dataset, reproducible deploy |
| **Extensible** | Drop a new JS module into `reports/` to add a report |

## Quick Start

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Docker Desktop (optional)

### Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Open dashboard
open http://localhost:8054
```

### Docker

```bash
# Build and run
docker compose up --build

# Open dashboard
open http://localhost:8054
```

## Project Structure

```
54-botanalytics/
 ├── server.js                 # Express server, report loader, REST API
 ├── events.json               # Trade event dataset (bind-mounted in Docker)
 ├── reports/                  # Extensible report modules
 │   ├── optimal-sl-recommendation.js
 │   ├── drawdown-recovery.js
 │   ├── loss-autopsy.js
 │   ├── win-loss-anatomy.js
 │   └── ... (34 total)
 ├── public/
 │   ├── index.html            # Static shell
 │   ├── app.js                # Sidebar, routing, trade detail modal
 │   └── style.css             # Dark theme, responsive layout
 ├── Dockerfile
 ├── compose.yaml
 ├── package.json
 └── README.md
```

## Reports at a Glance

| Report | Category | What It Tells You |
|---|---|---|
| **Optimal SL Recommendation** | Risk & Loss Analysis | 95th/90th percentile SL levels from MAE statistics, daily/hourly heatmaps, long/short breakdown |
| **Drawdown Recovery** | P&L & Returns | Drawdown depth, recovery duration, equity curve |
| **Loss Autopsy** | Risk & Loss Analysis | Worst trade spotlight, SL vs manual close breakdown, day/hour heatmaps |
| **Win-Loss Anatomy** | Trade Quality & Sizing | P&L distribution, duration comparison, day expansion, directional win rates |
| **Quick-Scalp Segment** | Trade Quality & Sizing | Sub-5-minute trade metrics vs non-scalp, scalp win rate, hour distribution |
| **Position Size vs P&L** | Trade Quality & Sizing | Volume bucket performance and win-rate correlation |
| **Time Analysis** | Time & Scheduling | Best/worst trading windows, no-trade zones, start/exit time heatmaps |
| **Follow Trade After Loss** | Risk & Loss Analysis | Revenge trading probability, consecutive loss streaks |
| **SL Hit Analysis** | Risk & Loss Analysis | True SL losses vs profitable trailing stops |
| **Strategy Forensics** | Strategy Forensics | Deep strategy breakdown |

<details>
<summary>View all 34 reports</summary>

| Report ID | Category |
|---|---|
| `breakeven-stop-effectiveness` | Risk & Loss Analysis |
| `calendar-day-performance` | Time & Scheduling |
| `concurrent-position-stacked-exposure` | Risk & Loss Analysis |
| `consecutive-days-impact` | Risk & Loss Analysis |
| `daily-loss-distribution` | P&L & Returns |
| `daily-overview` | P&L & Returns |
| `directional-sizing-bias` | Trade Quality & Sizing |
| `drawdown-recovery` | P&L & Returns |
| `follow-trade-after-loss` | Risk & Loss Analysis |
| `gap-trade-session-edge` | Time & Scheduling |
| `hour-minute-performance` | Time & Scheduling |
| `loss-autopsy` | Risk & Loss Analysis |
| `lost-opportunity` | Trade Quality & Sizing |
| `market-session-analysis` | Time & Scheduling |
| `minute-performance` | Time & Scheduling |
| `monthly-consistency` | P&L & Returns |
| `naked-exposure` | Risk & Loss Analysis |
| `optimal-sl-recommendation` | Risk & Loss Analysis |
| `overtrading-analysis` | Risk & Loss Analysis |
| `position-modification-impact` | Risk & Loss Analysis |
| `position-size-vs-pnl` | Trade Quality & Sizing |
| `quick-scalp-segment` | Trade Quality & Sizing |
| `risk-consistency-audit` | Risk & Loss Analysis |
| `sl-hit-analysis` | Risk & Loss Analysis |
| `sl-modification-cadence` | Risk & Loss Analysis |
| `sl-reaction-latency` | Time & Scheduling |
| `strategy-forensics` | Risk & Loss Analysis |
| `time-analysis` | Time & Scheduling |
| `trade-duration-optimality` | Trade Quality & Sizing |
| `trade-streaks` | Risk & Loss Analysis |
| `trades-vs-pnl` | P&L & Returns |
| `trail-efficiency` | Risk & Loss Analysis |
| `win-loss-anatomy` | Trade Quality & Sizing |
| `worst-days-impact` | P&L & Returns |

</details>

## Screenshots

### Dashboard
<img src="dashboard-trade-detail.png" alt="Dashboard" width="600"/>

### Drawdown Recovery
<img src="daily-pnl-report.png" alt="Daily PnL" width="600"/>

### Loss Autopsy
<img src="loss-autopsy-report-after-fix.png" alt="Loss Autopsy" width="600"/>

### Position Size vs P&L
<img src="position-size-vs-pnl-report.png" alt="Position Size vs PnL" width="600"/>

### Hourly Performance
<img src="hour-minute-report.png" alt="Hour Minute Report" width="600"/>

### Highest Loss Trade
<img src="highest-loss-trade-after-fix.png" alt="Highest Loss Trade" width="600"/>

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/reports` | List all available reports |
| `GET` | `/api/reports/:id` | Get rendered report HTML by ID |
| `GET` | `/api/trades/:positionId` | Get full event timeline for a trade |
| `GET` | `/api/version` | App version and deployment metadata |
| `POST` | `/api/upload` | Upload new `events.json` files |

### Example Requests

```bash
# List reports
curl http://localhost:8054/api/reports

# Get a specific report
curl http://localhost:8054/api/reports/optimal-sl-recommendation

# Inspect a trade
curl http://localhost:8054/api/trades/482

# Check version
curl http://localhost:8054/api/version

# Upload new data
curl -F "files=@events.json" http://localhost:8054/api/upload
```

## Data Format

Upload a JSON array of trade events. Each event should follow this schema:

```json
{
  "serial": 0,
  "orderId": null,
  "positionId": 1,
  "event": "Create Position",
  "time": 1762752309164,
  "volume": 1.17,
  "quantity": 1.17,
  "type": "Buy",
  "entryPrice": 6784.4,
  "tp": null,
  "sl": null,
  "closePrice": null,
  "grossProfit": 0,
  "pips": 0,
  "balance": null,
  "equity": 420
}
```

Supported event types: `Create Position`, `Position Modified (S/L)`, `Stop Loss Hit`, `Position closed`.

## Docker

### Build

```bash
docker compose build --no-cache --pull
```

### Run

```bash
docker compose up --force-recreate -d
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8054` | Server port |
| `APP_VERSION` | `1.4.0` | Version string |

### Volumes

| Mount | Description |
|---|---|
| `./events.json:/app/events.json` | Read-only trade dataset |

## Extending Reports

Each report is a standalone module in `reports/`. The server dynamically imports all `.js` files at startup.

```js
// reports/my-new-report.js
export default async function myNewReport(events) {
  // 1. Filter or aggregate events
  const closed = events.filter(e => e.closePrice != null);

  // 2. Compute metrics
  const total = closed.length;

  // 3. Return HTML
  return {
    title: 'My New Report',
    description: 'What this report shows.',
    html: `<div class="report-body">...</div>`,
    category: 'P&L & Returns',
  };
}
```

No registration required. Restart the server and the report appears in the sidebar.

## Tech Stack

- **Runtime:** Node.js 18+ (ESM)
- **Server:** Express 4.x, Multer 2.x
- **Frontend:** Vanilla JS, CSS Grid/Flexbox
- **Deployment:** Docker Compose
- **Data:** Local JSON, in-memory caching

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-report`
3. Add your report under `reports/`
4. Run locally: `npm install && npm start`
5. Validate with: `npm run test` *(if tests exist)*
6. Commit: `git commit -m "feat(reports): add my-new-report"`
7. Push: `git push origin feat/my-report`
8. Open a Pull Request

## License

MIT

## Author

**Inventions4All** — [github:TWeb79](https://github.com/TWeb79)

Built with systematic debugging discipline, senior-level code standards, and a refusal to leave TODO blocks unresolved.
