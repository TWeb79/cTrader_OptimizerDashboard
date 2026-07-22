# Architecture

## System Structure

```
54-botanalytics/
 ├── server.js              # Express server, report loader, API
 ├── events.json            # Trade event dataset
 ├── reports/
 │    └── heatmap-day-hour.js
 ├── public/
 │    ├── index.html
 │    ├── app.js
 │    └── style.css
 ├── Dockerfile
 └── compose.yaml
```

## Module Responsibilities

- **server.js**: Loads `events.json`, dynamically imports report modules, caches report data, and exposes REST endpoints.
- **reports/*.js**: Pure functions that accept the events array and return HTML. No framework dependency beyond returning markup.
- **public/**: Standard static frontend shell. Fetches `/api/reports`, renders sidebar navigation, and displays selected report HTML.

## Data Flow

1. Server starts, reads `events.json`.
2. Scans `reports/` for `.js` files.
3. Imports each report function and executes it once, caching the returned `{ title, description, html }`.
4. Browser requests `/api/reports` and renders sidebar.
5. On selection, browser requests `/api/reports/:id` and injects `html` into `#report-main`.

## External Dependencies

- Express for HTTP serving and routing.
- No database or external services required.

## Service Boundaries

- The container exposes only HTTP on port 8054.
- The dataset is mounted read-only as `events.json`.
- Reports are server-rendered at startup and served as static JSON payloads.

Author: Inventions4All - github:TWeb79
