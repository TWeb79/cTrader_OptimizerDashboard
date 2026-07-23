import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8054;
const APP_VERSION = process.env.APP_VERSION || '1.4.0';
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.text({ type: 'text/plain', limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let events = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'events.json'), 'utf8')
);

const reportsDir = path.join(__dirname, 'reports');
const reportFiles = fs
  .readdirSync(reportsDir)
  .filter((f) => f.endsWith('.js') && fs.statSync(path.join(reportsDir, f)).isFile());

const reports = {};
let reportCache = {};
const deprecatedAliases = {
  'daily-pnl': 'daily-overview',
  'daily-pnl-vs-count': 'daily-overview',
  'daily-trade-count-distribution': 'daily-overview',
};

function parseEvents(input) {
  let data;
  if (typeof input === 'string') {
    data = JSON.parse(input);
  } else {
    data = input;
  }
  if (!Array.isArray(data)) {
    throw new Error('Events must be an array.');
  }
  if (data.length === 0) {
    throw new Error('Events array is empty.');
  }
  const sample = data[0];
  const required = ['event', 'time', 'positionId'];
  for (const key of required) {
    if (!(key in sample)) {
      throw new Error(`Invalid events format: missing "${key}" in first record.`);
    }
  }
  return data;
}

async function loadReports(eventsData) {
  const newCache = {};
  for (const file of reportFiles) {
    const id = file.replace(/\.js$/, '');
    try {
      const mod = await import(`file://${path.join(reportsDir, file)}`);
      const reportFn = mod.default;
      if (typeof reportFn !== 'function') {
        console.warn(`Report ${id} does not export a default function, skipping.`);
        continue;
      }
      reports[id] = reportFn;
      const result = await reportFn(eventsData);
      result.version = APP_VERSION;
      newCache[id] = result;
      console.log(`Reloaded report: ${id}`);
    } catch (err) {
      console.error(`Failed to reload report ${id}:`, err.message);
    }
  }
  return newCache;
}

async function init() {
  reportCache = await loadReports(events);
}

app.get('/api/reports', (req, res) => {
  const list = Object.entries(reportCache).map(([id, data]) => ({
    id,
    title: data.title,
    description: data.description,
    category: data.category,
    version: data.version,
    deprecated: !!deprecatedAliases[id],
  }));
  res.json({ version: APP_VERSION, reports: list });
});

app.get('/api/reports/:id', (req, res) => {
  const { id } = req.params;
  const targetId = deprecatedAliases[id] || id;
  const data = reportCache[targetId];
  if (!data) {
    return res.status(404).json({ error: 'Report not found' });
  }
  const isDeprecated = !!deprecatedAliases[id];
  res.json({ ...data, version: APP_VERSION, deprecated: isDeprecated, aliasTarget: isDeprecated ? targetId : undefined });
});

app.get('/api/trades/:positionId', (req, res) => {
  const { positionId } = req.params;
  const pid = Number(positionId);
  if (Number.isNaN(pid)) {
    return res.status(400).json({ error: 'Invalid positionId' });
  }
  const tradeEvents = events
    .filter((e) => Number(e.positionId) === pid)
    .sort((a, b) => Number(a.time) - Number(b.time));
  if (tradeEvents.length === 0) {
    return res.status(404).json({ error: 'Position not found' });
  }
  res.json({ positionId: pid, events: tradeEvents, version: APP_VERSION });
});

app.get('/api/version', (req, res) => {
  res.json({ version: APP_VERSION, deployedAt: new Date().toISOString() });
});

app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }
    const filesData = [];
    for (const file of req.files) {
      const content = file.buffer.toString('utf8');
      const newEvents = parseEvents(content);
      events = newEvents;
      reportCache = await loadReports(events);
      const reportResults = {};
      for (const file of reportFiles) {
        let id = file.replace(/\.js$/, '');
        const targetId = deprecatedAliases[id] || id;
        const cached = reportCache[id];
        if (!cached) continue;
        reportResults[id] = {
          title: cached.title || id,
          description: cached.description || '',
          html: cached.html || '',
          deprecated: !!deprecatedAliases[id],
          aliasTarget: deprecatedAliases[id] || undefined,
        };
        if (!deprecatedAliases[id]) {
          reportResults[targetId] = reportResults[id];
        }
      }
      filesData.push({
        fileName: file.originalname,
        eventsCount: events.length,
        reports: reportResults,
      });
    }
    res.json({ ok: true, files: filesData });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, async () => {
  await init();
  console.log(`BotAnalytics v${APP_VERSION} running at http://localhost:${PORT}`);
  console.log(`Loaded ${Object.keys(reportCache).length} report(s)`);
});