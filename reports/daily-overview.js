export default async function dailyOverview(events) {
  const closed = [];
  const pos = {};
  for (const e of events) {
    if (e.closePrice != null && e.grossProfit != null) {
      pos[e.positionId] = e;
    }
  }
  for (const k of Object.keys(pos)) closed.push(pos[k]);

  const dayMap = {};
  const dayCount = {};
  const dayWins = {};
  const dayProfit = {};
  const dayLoss = {};
  for (const t of closed) {
    const d = new Date(Number(t.time));
    const key = d.toISOString().slice(0, 10);
    const profit = Number(t.grossProfit) || 0;
    dayMap[key] = (dayMap[key] || 0) + profit;
    dayCount[key] = (dayCount[key] || 0) + 1;
    if (profit > 0) {
      dayWins[key] = (dayWins[key] || 0) + 1;
      dayProfit[key] = (dayProfit[key] || 0) + profit;
    } else if (profit < 0) {
      dayLoss[key] = (dayLoss[key] || 0) + profit;
    }
  }
  const days = Object.keys(dayMap).sort();
  if (!days.length) {
    return { title: 'Daily Overview', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>', category: 'P&L & Returns' };
  }

  const vals = days.map(d => dayMap[d]);
  const counts = days.map(d => dayCount[d]);

  const maxAbs = Math.max(1, ...vals.map(v => Math.abs(v)));
  const w = 1000, h = 400, pad = 50;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;
  const barW = Math.max(2, chartW / days.length - 1);

  let pnlSvg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:300px;">`;
  pnlSvg += `<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`;
  pnlSvg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}" stroke="#475569" />`;
  pnlSvg += `<line x1="${pad}" y1="${h / 2}" x2="${w - pad}" y2="${h / 2}" stroke="#334155" stroke-dasharray="4" />`;
  pnlSvg += `<text x="14" y="${h/2}" fill="#94a3b8" font-size="12" text-anchor="middle" transform="rotate(-90 14 ${h/2})">P&L ($)</text>`;
  pnlSvg += `<text x="${w/2}" y="${h - 10}" fill="#94a3b8" font-size="12" text-anchor="middle">Date</text>`;
  for (let i = 0; i < days.length; i++) {
    const val = vals[i];
    const barH = (Math.abs(val) / maxAbs) * (chartH / 2);
    const x = pad + (i / days.length) * chartW;
    const y = val >= 0 ? (h / 2) - barH : (h / 2);
    const color = val >= 0 ? '#22c55e' : '#ef4444';
    pnlSvg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${color}" rx="1" />`;
  }
  const step = Math.max(1, Math.floor(days.length / 8));
  for (let i = 0; i < days.length; i += step) {
    const x = pad + (i / days.length) * chartW + barW / 2;
    pnlSvg += `<text x="${x}" y="${h - pad + 16}" fill="#94a3b8" font-size="10" text-anchor="middle">${days[i].slice(5)}</text>`;
  }
  pnlSvg += `</svg>`;

  const maxCount = Math.max(...counts, 1);
  let countSvg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:300px;">`;
  countSvg += `<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`;
  countSvg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}" stroke="#475569" />`;
  countSvg += `<text x="14" y="${h/2}" fill="#94a3b8" font-size="12" text-anchor="middle" transform="rotate(-90 14 ${h/2})">Trade Count</text>`;
  countSvg += `<text x="${w/2}" y="${h - 10}" fill="#94a3b8" font-size="12" text-anchor="middle">Date</text>`;
  for (let i = 0; i < days.length; i++) {
    const val = counts[i];
    const barH = (val / maxCount) * chartH;
    const x = pad + (i / days.length) * chartW;
    const y = h - pad - barH;
    countSvg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#38bdf8" rx="1" />`;
    countSvg += `<text x="${x + barW/2}" y="${h - pad + 16}" fill="#94a3b8" font-size="10" text-anchor="middle">${days[i].slice(5)}</text>`;
    countSvg += `<text x="${x + barW/2}" y="${y - 6}" fill="#e2e8f0" font-size="10" text-anchor="middle">${val}</text>`;
  }
  countSvg += `</svg>`;

  const points = days.map(d => [dayCount[d], dayMap[d], dayMap[d] >= 0 ? '#22c55e' : '#ef4444']);
  const corr = pearson(points.map(p => p[0]), points.map(p => p[1]));
  const scatter = scatterSvg(points, 800, 400, 'Trades', 'Daily P&L', '#38bdf8');
  const scatterLabel = `<div style="text-align:center;margin-top:8px;color:#94a3b8;font-size:13px;">Correlation = ${corr.toFixed(3)} &nbsp;|&nbsp; ${points.length} days</div>`;

  const losingDays = days.filter(d => dayMap[d] < 0).length;
  const profitableDays = days.filter(d => dayMap[d] > 0).length;
  const breakevenDays = days.filter(d => dayMap[d] === 0).length;
  const avgPnl = vals.reduce((a, b) => a + b, 0) / vals.length;
  const totalTrades = counts.reduce((a, b) => a + b, 0);

  const totalProfit = closed.filter(t => Number(t.grossProfit) > 0).reduce((a, t) => a + Number(t.grossProfit), 0);
  const totalLoss = Math.abs(closed.filter(t => Number(t.grossProfit) < 0).reduce((a, t) => a + Number(t.grossProfit), 0));
  const winRate = totalTrades > 0 ? (closed.filter(t => Number(t.grossProfit) > 0).length / totalTrades) * 100 : 0;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
  const avgRR = totalProfit / (totalLoss || 1) / winRate * (100 - winRate) / 100 || 0;
  const netPnl = totalProfit - totalLoss;

  const html = [];
  html.push(`<div class="report-header"><h2>Daily Overview</h2><p>Executive dashboard with KPI cards, daily P&L timeline, and calendar heatmap.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:140px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Net P/L', `$${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(1)}`],
    ['Win Rate', winRate.toFixed(1) + '%'],
    ['Profit Factor', profitFactor.toFixed(2)],
    ['Avg R:R', Number(avgRR).toFixed(2) + ':1'],
    ['Total Trades', String(totalTrades)],
    ['Days Analyzed', String(days.length)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle};color:${k[0] === 'Net P/L' ? (netPnl >= 0 ? '#22c55e' : '#ef4444') : '#e2e8f0'}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Daily P&L Timeline</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Green = profitable day, Red = losing day.</p>${pnlSvg}</div>`);
  html.push(`<div class="report-body"><h3>Daily Trade Count</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Number of closed trades per day.</p>${countSvg}</div>`);
  html.push(`<div class="report-body"><h3>Trades per Day vs Daily P&L</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Relationship between number of trades and daily profit/loss.</p>${scatter}${scatterLabel}</div>`);
  html.push(`<div class="report-body"><h3>Calendar Heatmap</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Color intensity shows daily P&L. Redder = larger loss, Greener = larger profit.</p>${calendarHeatmap(dayMap, dayCount)}</div>`);

  return { title: 'Daily Overview', description: 'Executive daily dashboard: KPI cards, P&L timeline, trade count, correlation, and calendar heatmap.', html: html.join(''), category: 'P&L & Returns' };
}

function calendarHeatmap(dayMap, dayCount) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const grid = {};
  for (const d of Object.keys(dayMap)) {
    const date = new Date(d + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const weekNum = Math.floor((date - new Date(date.getFullYear(), 0, 1)) / 604800000) + 1;
    const key = `${date.getFullYear()}-${weekNum}-${dayOfWeek}`;
    const profit = dayMap[d];
    const count = dayCount[d];
    if (!grid[key]) {
      grid[key] = { profit: 0, count: 0, date: d };
    }
    grid[key].profit += profit;
    grid[key].count += count;
  }
  const values = Object.values(grid).map(g => g.profit);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const heatColor = (v) => {
    if (v === 0) return '#334155';
    const t = (v - min) / range;
    if (v >= 0) {
      const r = Math.round(34 + (251 - 34) * (t / 2 + 0.5));
      const g = 197;
      const b = Math.round(94 + (36 - 94) * (t / 2 + 0.5));
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    } else {
      const r = Math.round(239 - (239 - 34) * t);
      const g = Math.round(68 + (197 - 68) * t);
      const b = Math.round(68 + (36 - 68) * t);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
  };
  const weeks = {};
  for (const key of Object.keys(grid)) {
    const parts = key.split('-');
    const week = parts[1];
    if (!weeks[week]) weeks[week] = {};
    weeks[week][parts[2]] = grid[key];
  }
  let html = '<table style="border-collapse:collapse;font-size:12px;"><thead><tr><th style="padding:4px;background:#1e293b;color:#94a3b8;"></th>';
  for (let d = 0; d < 7; d++) {
    html += `<th style="padding:4px;background:#1e293b;color:#94a3b8;">${dayNames[d]}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (const week of Object.keys(weeks).sort()) {
    html += `<tr><th style="padding:4px;background:#1e293b;color:#94a3b8;text-align:right;font-size:10px;">Wk${week}</th>`;
    for (let d = 0; d < 7; d++) {
      const cell = weeks[week][d];
      if (cell) {
        const bg = heatColor(cell.profit);
        const maxAbs = Math.max(Math.abs(max), Math.abs(min));
        const intensity = Math.abs(cell.profit) / (maxAbs || 1);
        html += `<td style="padding:6px;background:${bg};color:#e2e8f0;text-align:center;min-width:40px;" title="${cell.date} | P&L: $${cell.profit.toFixed(1)} | Trades: ${cell.count}">${cell.count}</td>`;
      } else {
        html += `<td style="padding:6px;background:#0f172a;color:#475569;text-align:center;min-width:40px;">-</td>`;
      }
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function pearson(x, y) {
  const n = x.length;
  if (!n) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

function scatterSvg(points, w, h, xlabel, ylabel, neutralColor) {
  const pad = 50;
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:300px;">`;
  svg += `<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`;
  svg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}" stroke="#475569" />`;
  svg += `<text x="${w / 2}" y="${h - 8}" fill="#94a3b8" font-size="12" text-anchor="middle">${xlabel}</text>`;
  svg += `<text x="16" y="${h / 2}" fill="#94a3b8" font-size="12" text-anchor="middle" transform="rotate(-90 16 ${h / 2})">${ylabel}</text>`;

  for (const [x, y, c] of points) {
    const cx = pad + ((x - minX) / rangeX) * (w - pad * 2);
    const cy = (h - pad) - ((y - minY) / rangeY) * (h - pad * 2);
    svg += `<circle cx="${cx}" cy="${cy}" r="4" fill="${c || neutralColor || '#38bdf8'}" opacity="0.85" />`;
  }
  svg += `</svg>`;
  return svg;
}
