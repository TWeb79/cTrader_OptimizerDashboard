# 54-botanalytics

Trading bot analytics dashboard for analyzing trade events and visualizing performance.

## Project Purpose

BotAnalytics ingests trade event logs (`events.json`) and serves a web dashboard with extensible reports. Each report processes the dataset independently and renders into a common interface. Adding a new report is as simple as dropping a new JS module into the `reports/` folder.

## Service Ports

| Port | Service     |
|------|-------------|
| 8054 | Web dashboard |

## Startup Instructions

### Local

```bash
npm install
npm start
# Open http://localhost:8054
```

### Docker

```bash
docker compose up --build
# Open http://localhost:8054
```

## Dependencies

- Node.js >= 18
- Express ^4.21.2

## API Endpoints

| Method | Path                  | Description                  |
|--------|-----------------------|------------------------------|
| GET    | /api/reports          | List available reports       |
| GET    | /api/reports/:id      | Get report data by id        |
| GET    | /api/version          | Get app version metadata     |

## Example Requests

```bash
curl http://localhost:8054/api/reports
curl http://localhost:8054/api/reports/heatmap-day-hour
curl http://localhost:8054/api/version
```

## Reports

Reports are located in the `reports/` directory. Each file exports a default async function that receives the events array and returns an object with `title`, `description`, and `html`.

Author: Inventions4All - github:TWeb79
