export default async function tradeDurationOptimality(events) {
  const positionEvents = {};
  for (const e of events) {
    if (!positionEvents[e.positionId]) positionEvents[e.positionId] = [];
    positionEvents[e.positionId].push(e);
  }

  const closed = [];
  for (const pid of Object.keys(positionEvents)) {
    const evts = positionEvents[pid].sort((a, b) => Number(a.time) - Number(b.time));
    const create = evts[0];
    const close = evts[evts.length - 1];
    if (!close || close.closePrice == null) continue;
    const dur = Math.max(1, Math.round((Number(close.time) - Number(create.time)) / 60000));
    closed.push({ ...close, profit: Number(close.grossProfit) || 0, duration: dur });
  }

  if (!closed.length) {
    return { title: 'Trade Duration Optimality', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const buckets = [
    { label: '0-5m', min: 0, max: 5 },
    { label: '5-10m', min: 5, max: 10 },
    { label: '10-20m', min: 10, max: 20 },
    { label: '20-40m', min: 20, max: 40 },
    { label: '40-60m', min: 40, max: 60 },
    { label: '60m+', min: 60, max: Infinity },
  ];

  const bucketData = {};
  for (const b of buckets) {
    bucketData[b.label] = { trades: [], profit: 0, wins: 0, losses: 0 };
  }

  for (const t of closed) {
    const dur = t.duration;
    const p = t.profit;
    for (const b of buckets) {
      if (dur >= b.min && dur < b.max) {
        bucketData[b.label].trades.push(t);
        bucketData[b.label].profit += p;
        if (p > 0) bucketData[b.label].wins++;
        if (p < 0) bucketData[b.label].losses++;
        break;
      }
    }
  }

  const html = [];
  html.push(`<div class="report-header"><h2>Trade Duration Optimality</h2><p>Is there an optimal hold time? When should the bot have exited?</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [];
  for (const b of buckets) {
    const d = bucketData[b.label];
    const wr = d.trades.length ? (d.wins / d.trades.length) * 100 : 0;
    kpis.push([b.label + ' Trades', String(d.trades.length)]);
    kpis.push([b.label + ' Win Rate', wr.toFixed(1) + '%']);
    kpis.push([b.label + ' P&L', d.profit.toFixed(1)]);
  }

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Duration Bucket Performance</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Performance grouped by trade duration.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Duration</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Total P&L</th><th style="padding:8px;text-align:right">Avg P&L</th></tr></thead><tbody>`);
  for (const b of buckets) {
    const d = bucketData[b.label];
    const wr = d.trades.length ? (d.wins / d.trades.length) * 100 : 0;
    const avg = d.trades.length ? d.profit / d.trades.length : 0;
    const color = d.profit >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">${b.label}</td><td style="padding:8px;text-align:right">${d.trades.length}</td><td style="padding:8px;text-align:right;color:${wr >= 50 ? '#22c55e' : '#ef4444'};">${wr.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${color};">${d.profit.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${avg >= 0 ? '#22c55e' : '#ef4444'};">${avg.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'Trade Duration Optimality', description: 'Is there an optimal hold time? When should the bot have exited?', html: html.join(''), category: 'Trade Quality & Sizing' };
}
