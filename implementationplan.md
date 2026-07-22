# Implementation Plan: Pending Reports & Docker Redeployment

## Context
- Project: 54-botanalytics
- Base: Express + static frontend, report modules in `reports/`
- Data: `events.json` array of trade lifecycle events

## Objective
Implement the 2 dashboards described in `pendingreports.md` with 10 report modules, then rebuild and redeploy the Docker container on port 8054.

## Tasks

1. **Create implementation plan**
   - Status: In Progress
   - File: `implementationplan.md`

2. **Update Docker setup**
   - Add `.dockerignore` to keep images small and reproducible
   - Verify `Dockerfile` still complies with `debian:12-slim` and layer-minimization rules
   - Verify `compose.yaml` names and port mapping for project 54

3. **Implement Report 1 – Daily Performance & Risk Analysis Dashboard**
   - `reports/daily-pnl.js` – chronological daily P&L bars
   - `reports/trades-vs-pnl.js` – scatter plot with correlation
   - `reports/cumulative-pnl-drawdown.js` – equity curve + drawdown area
   - `reports/daily-loss-distribution.js` – loss histogram with mean/median

4. **Implement Report 2 – Trading Strategy Optimization Dashboard**
   - `reports/position-size-vs-pnl.js` – scatter plot by position volume
   - `reports/daily-trade-count-distribution.js` – histogram of trades per day
   - `reports/daily-pnl-vs-count.js` – scatter with regression and R²
   - `reports/worst-days-impact.js` – two equity curves (actual vs. without worst days)
   - `reports/daily-loss-limits.js` – normalized bar chart for simulated loss limits
   - `reports/win-rate-by-size.js` – win rate by position size buckets

5. **Build and deploy**
   - Run `docker compose build`
   - Run `docker compose up --force-recreate -d`
   - Verify `/api/reports` lists all new reports and frontend loads on `http://localhost:8054`

## Constraints
- No inline JavaScript in public HTML files
- Report files return `{ title, description, html }`
- File size ≤ 200 lines where possible, hard max 500 lines
- Author: Inventions4All - github:TWeb79
