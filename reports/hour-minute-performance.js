export default async function hourMinutePerformance(events) {
  const posEvents = {};

  for (const e of events) {
    if (!posEvents[e.positionId]) posEvents[e.positionId] = [];
    posEvents[e.positionId].push(e);
  }

  const grid = {};
  for (const pid of Object.keys(posEvents)) {
    const evts = posEvents[pid].sort((a, b) => Number(a.time) - Number(b.time));
    const create = evts[0];
    const close = evts[evts.length - 1];
    const entry = new Date(Number(create.time));
    const hr = entry.getHours();
    const min = entry.getMinutes();
    const key = hr + '|' + min;
    const p = Number(close.grossProfit) || 0;
    const dur = Math.max(1, Math.round((Number(close.time) - Number(create.time)) / 60000));

    if (!grid[key]) grid[key] = { profits: [], durations: [], wins: 0, losses: 0, count: 0, bigLosses: [] };
    grid[key].profits.push(p);
    grid[key].durations.push(dur);
    grid[key].count++;
    if (p > 0) grid[key].wins++;
    if (p < 0) { grid[key].losses++; grid[key].bigLosses.push(Math.abs(p)); }
  }

  const html = [];
  html.push(`<div class="report-header"><h2>Hour-Minute Performance Grid</h2><p>Granular trade statistics by hour and start minute. Each cell shows performance for trades opened at HH:MM. Use this to identify hour-specific entry minute patterns.</p></div>`);

  const cellSize = 14;
  const hourHeight = 28;
  const legendWidth = 90;
  const w = 60 * cellSize + legendWidth + 40;
  const h = 24 * hourHeight + 40;
  const leftPad = legendWidth;
  const svgW = w;
  const svgH = h;
  const zeroY = svgH - 20;

  const values = Object.values(grid).map(g => g.profits.reduce((a, b) => a + b, 0) / g.profits.length);
  const minVal = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - minVal || 1;

  function heatColor(v) {
    if (range === 0) return 'rgb(51, 65, 85)';
    const t = (v - minVal) / range;
    if (t >= 0.5) return `rgb(${Math.round(34+(251-34)*(t-0.5)*2)},${Math.round(197+(191-197)*(t-0.5)*2)},${Math.round(94+(36-94)*(t-0.5)*2)})`;
    return `rgb(${Math.round(239+(251-239)*t*2)},${Math.round(68+(191-68)*t*2)},${Math.round(68+(36-68)*t*2)})`;
  }

  html.push(`<div class="report-body" style="overflow-x:auto;">`);
  html.push(`<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;height:auto;min-height:${svgH}px;max-width:${svgW}px;">`);
  html.push(`<text x="10" y="${zeroY + 15}" fill="#94a3b8" font-size="10">Min</text>`);
  for (let m = 0; m < 60; m++) {
    const x = leftPad + m * cellSize + cellSize / 2;
    if (m % 5 === 0) {
      html.push(`<text x="${x}" y="${zeroY + 12}" fill="#94a3b8" font-size="9" text-anchor="middle">${String(m).padStart(2,'0')}</text>`);
      html.push(`<line x1="${x}" y1="${zeroY}" x2="${x}" y2="${zeroY + 6}" stroke="#475569" />`);
    }
  }

  for (let hr = 0; hr < 24; hr++) {
    const y = zeroY - (hr + 1) * hourHeight - 5;
    html.push(`<text x="${leftPad - 5}" y="${y + hourHeight / 2 + 4}" fill="#94a3b8" font-size="10" text-anchor="end">${String(hr).padStart(2,'0')}</text>`);
    html.push(`<line x1="${leftPad}" y1="${y + hourHeight}" x2="${leftPad + 60 * cellSize}" y2="${y + hourHeight}" stroke="#1e293b" />`);

    for (let m = 0; m < 60; m++) {
      const key = hr + '|' + m;
      const g = grid[key];
      const x = leftPad + m * cellSize;
      const cellY = y;
      if (g) {
        const avg = g.profits.reduce((a, b) => a + b, 0) / g.profits.length;
        const wr = (g.wins / g.count) * 100;
        const color = wr < 70 ? '#ef4444' : wr < 85 ? '#fbbf24' : '#22c55e';
        const opacity = Math.max(0.3, Math.min(1, g.count / 5 + 0.2));
        html.push(`<rect x="${x + 1}" y="${cellY + 1}" width="${cellSize - 2}" height="${hourHeight - 2}" fill="${color}" fill-opacity="${opacity}" rx="1" />`);
        if (g.count > 1) {
          const avgP = g.profits.reduce((a, b) => a + b, 0) / g.profits.length;
          html.push(`<text x="${x + cellSize/2}" y="${cellY + hourHeight/2 + 4}" fill="#0f172a" font-size="8" text-anchor="middle" font-weight="600">${wr.toFixed(0)}%</text>`);
        }
      }
    }
  }

  html.push(`<text x="${svgW/2}" y="${svgH - 2}" fill="#94a3b8" font-size="11" text-anchor="middle">Start Minute (0-59) →</text>`);
  html.push(`<text x="14" y="${svgH/2}" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 ${svgH/2})">Hour of Day →</text>`);
  html.push(`</svg>`);
  html.push(`<div style="display:flex;gap:12px;justify-content:center;margin-top:8px;color:#94a3b8;font-size:12px;"><span><span style="display:inline-block;width:12px;height:12px;background:#22c55e;margin-right:4px;border-radius:2px;"></span>Safe (WR >= 85%)</span><span><span style="display:inline-block;width:12px;height:12px;background:#fbbf24;margin-right:4px;border-radius:2px;"></span>Caution (70-84%)</span><span><span style="display:inline-block;width:12px;height:12px;background:#ef4444;margin-right:4px;border-radius:2px;"></span>Danger (WR < 70%)</span><span style="margin-left:12px;">Opacity = trade count</span></div>`);
  html.push(`</div>`);

  html.push(`<div class="report-body"><h3>Hour-Minute Statistics Table</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Compact view of all active cells (only minutes with trades in that hour are shown).</p>`);
  html.push(`<div style="max-height:400px;overflow-y:auto;">`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:6px;text-align:left;">Hour</th><th style="padding:6px;text-align:left;">Min</th><th style="padding:6px;text-align:right">Trades</th><th style="padding:6px;text-align:right">Win %</th><th style="padding:6px;text-align:right">Avg P&L</th><th style="padding:6px;text-align:right">Avg Dur</th><th style="padding:6px;text-align:right">Max Loss</th></tr></thead><tbody>`);
  const rows = [];
  for (let hr = 0; hr < 24; hr++) {
    for (let m = 0; m < 60; m++) {
      const key = hr + '|' + m;
      const g = grid[key];
      if (!g || !g.count) continue;
      const wr = (g.wins / g.count) * 100;
      const avg = g.profits.reduce((a, b) => a + b, 0) / g.profits.length;
      const avgDur = g.durations.reduce((a, b) => a + b, 0) / g.durations.length;
      const maxLoss = g.bigLosses.length ? Math.max(...g.bigLosses) : 0;
      rows.push({ hr, min: m, count: g.count, wr, avg, avgDur, maxLoss });
    }
  }
  rows.sort((a, b) => a.wr - b.wr);
  for (const r of rows) {
    const wc = r.wr >= 85 ? '#22c55e' : r.wr >= 70 ? '#fbbf24' : '#ef4444';
    const ac = r.avg >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;color:#e2e8f0;">${String(r.hr).padStart(2,'0')}:00</td><td style="padding:6px;color:#e2e8f0;">min ${String(r.min).padStart(2,'0')}</td><td style="padding:6px;text-align:right">${r.count}</td><td style="padding:6px;text-align:right;color:${wc};">${r.wr.toFixed(0)}%</td><td style="padding:6px;text-align:right;color:${ac};">${r.avg.toFixed(1)}</td><td style="padding:6px;text-align:right">${r.avgDur.toFixed(0)}m</td><td style="padding:6px;text-align:right;color:#ef4444;">${r.maxLoss.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div></div>`);

  return { title: 'Hour-Minute Performance Grid', description: 'Granular performance by hour and start minute (24x60 grid). Worst risk cells are sorted to the top.', html: html.join(''), category: 'Time & Scheduling' };
}
