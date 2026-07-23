export default async function slReactionLatency(events) {
  const positionEvents = {};
  for (const e of events) {
    if (!positionEvents[e.positionId]) positionEvents[e.positionId] = [];
    positionEvents[e.positionId].push(e);
  }

  const trades = [];
  for (const pid of Object.keys(positionEvents)) {
    const evts = positionEvents[pid].sort((a, b) => Number(a.time) - Number(b.time));
    const create = evts[0];
    const close = evts[evts.length - 1];
    if (!create || !close || close.closePrice == null) continue;

    const firstMod = evts.find(e => e.event === 'Position Modified (S/L)');
    if (!firstMod) continue;

    const latency = Math.round((Number(firstMod.time) - Number(create.time)) / 60000);
    const profit = Number(close.grossProfit) || 0;
    const win = profit > 0 ? 1 : 0;

    trades.push({
      positionId: pid,
      latency,
      profit,
      win,
      type: close.type,
    });
  }

  if (!trades.length) {
    return { title: 'SL Reaction Latency', description: 'No trades with SL modifications available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const buckets = [
    { label: '0-5m', min: 0, max: 5 },
    { label: '5-15m', min: 5, max: 15 },
    { label: '15-30m', min: 15, max: 30 },
    { label: '30-60m', min: 30, max: 60 },
    { label: '1-2h', min: 60, max: 120 },
    { label: '2-4h', min: 120, max: 240 },
    { label: '4h+', min: 240, max: Infinity },
  ];

  const bucketData = {};
  for (const b of buckets) {
    bucketData[b.label] = { trades: 0, wins: 0, profit: 0 };
  }

  for (const t of trades) {
    for (const b of buckets) {
      if (t.latency >= b.min && t.latency < b.max) {
        bucketData[b.label].trades += 1;
        bucketData[b.label].wins += t.win;
        bucketData[b.label].profit += t.profit;
        break;
      }
    }
  }

  const medianLatency = (() => {
    const sorted = trades.map(t => t.latency).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  })();

  const html = [];
  html.push(`<div class="report-header"><h2>SL Reaction Latency</h2><p>Does the time between opening a position and trailing the stop correlate with outcome?</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Positions', String(trades.length)],
    ['Median Latency', medianLatency + 'm'],
    ['Avg Latency', Math.round(trades.reduce((a, t) => a + t.latency, 0) / trades.length) + 'm'],
    ['Min Latency', Math.min(...trades.map(t => t.latency)) + 'm'],
    ['Max Latency', Math.max(...trades.map(t => t.latency)) + 'm'],
  ];

  html.push(`<div style=\"display:flex;flex-wrap:wrap;margin-bottom:16px;\">${kpis.map(k => `<div style=\"${cardStyle}\"><div style=\"${labelStyle}\">${k[0]}</div><div style=\"${valueStyle}\">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class=\"report-body\"><h3>Latency vs Outcome</h3><p style=\"color:#94a3b8;font-size:13px;margin-bottom:8px;\">Win rate and P&L by time-to-first-trail bucket.</p>`);
  html.push(`<table style=\"width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;\"><thead><tr style=\"background:#1e293b;color:#94a3b8;\"><th style=\"padding:8px;text-align:left\">Latency</th><th style=\"padding:8px;text-align:right\">Trades</th><th style=\"padding:8px;text-align:right\">Win Rate</th><th style=\"padding:8px;text-align:right\">Total P&L</th><th style=\"padding:8px;text-align:right\">Avg P&L</th></tr></thead><tbody>`);
  for (const b of buckets) {
    const d = bucketData[b.label];
    const wr = d.trades ? (d.wins / d.trades) * 100 : 0;
    const avg = d.trades ? d.profit / d.trades : 0;
    html.push(`<tr style=\"border-bottom:1px solid #1e293b;\"><td style=\"padding:8px;color:#e2e8f0;font-weight:600;\">${b.label}</td><td style=\"padding:8px;text-align:right\">${d.trades}</td><td style=\"padding:8px;text-align:right;color:\${wr >= 50 ? '#22c55e' : '#ef4444'};\">${wr.toFixed(1)}%</td><td style=\"padding:8px;text-align:right;color:\${d.profit >= 0 ? '#22c55e' : '#ef4444'};\">${d.profit.toFixed(1)}</td><td style=\"padding:8px;text-align:right;color:\${avg >= 0 ? '#22c55e' : '#ef4444'};\">${avg.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'SL Reaction Latency', description: 'Does the time between opening a position and trailing the stop correlate with outcome?', html: html.join(''), category: 'Time & Scheduling' };
}
