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
  for (const t of closed) {
    const d = new Date(Number(t.time));
    const key = d.toISOString().slice(0, 10);
    dayMap[key] = (dayMap[key] || 0) + (Number(t.grossProfit) || 0);
    dayCount[key] = (dayCount[key] || 0) + 1;
  }
  const days = Object.keys(dayMap).sort();
  if (!days.length) {
    return { title: 'Daily Overview', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>', category: 'P&L & Returns' };
  }

  const vals = days.map(d => dayMap[d]);
  const counts = days.map(d => dayCount[d]);
  const noTradeDays = [];

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

  const html = [];
  html.push(`<div class="report-header"><h2>Daily Overview</h2><p>Unified daily dashboard: P&L timeline, trade count, and correlation.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:140px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Total Days', String(days.length)],
    ['Profitable Days', String(profitableDays)],
    ['Losing Days', String(losingDays)],
    ['Breakeven Days', String(breakevenDays)],
    ['Total Trades', String(totalTrades)],
    ['Avg Daily P&L', avgPnl.toFixed(1)],
    ['Correlation', corr.toFixed(3)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Daily P&L Timeline</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Green = profitable day, Red = losing day.</p>${pnlSvg}</div>`);
  html.push(`<div class="report-body"><h3>Daily Trade Count</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Number of closed trades per day.</p>${countSvg}</div>`);
  html.push(`<div class="report-body"><h3>Trades per Day vs Daily P&L</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Relationship between number of trades and daily profit/loss.</p>${scatter}${scatterLabel}</div>`);

  if (noTradeDays.length) {
    html.push(`<div class="report-body"><h3>No-Trade Days</h3><p style="color:#94a3b8;font-size:13px;">Days with no closed trades: ${noTradeDays.join(', ')}</p></div>`);
  }

  return { title: 'Daily Overview', description: 'Unified daily dashboard: P&L timeline, trade count, and correlation.', html: html.join(''), category: 'P&L & Returns' };
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
