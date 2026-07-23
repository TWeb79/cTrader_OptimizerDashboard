export default async function winLossAnatomy(events) {
  const closed = [];
  const pos = {};

  for (const e of events) {
    if (e.closePrice != null) {
      pos[e.positionId] = e;
    }
  }
  for (const k of Object.keys(pos)) closed.push(pos[k]);

  const winners = closed.filter(t => Number(t.grossProfit) > 0);
  const losers = closed.filter(t => Number(t.grossProfit) < 0);
  const breakevens = closed.filter(t => Number(t.grossProfit) === 0);

  if (!closed.length) {
    return { title: 'Win-Loss Anatomy', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const avgWin = winners.length ? winners.reduce((a, t) => a + Number(t.grossProfit), 0) / winners.length : 0;
  const avgLoss = losers.length ? losers.reduce((a, t) => a + Number(t.grossProfit), 0) / losers.length : 0;
  const winLossRatio = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 999;
  const avgWinVol = winners.length ? winners.reduce((a, t) => a + Number(t.volume), 0) / winners.length : 0;
  const avgLossVol = losers.length ? losers.reduce((a, t) => a + Number(t.volume), 0) / losers.length : 0;

  const html = [];
  html.push(`<div class="report-header"><h2>Win-Loss Anatomy</h2><p>Side-by-side structural comparison: what do winning trades have that losing trades lack?</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:160px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Winners', String(winners.length)],
    ['Losers', String(losers.length)],
    ['Breakeven', String(breakevens.length)],
    ['Win Rate', ((winners.length / closed.length) * 100).toFixed(1) + '%'],
    ['Avg Win', avgWin.toFixed(1)],
    ['Avg Loss', avgLoss.toFixed(1)],
    ['Win/Loss Ratio', winLossRatio.toFixed(2)],
    ['Avg Win Vol', avgWinVol.toFixed(2)],
    ['Avg Loss Vol', avgLossVol.toFixed(2)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>P&L Distribution Comparison</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Winning trades cluster near small gains; losing trades have fat tails with catastrophic outliers.</p>`);
  html.push(`<svg viewBox="0 0 960 300" style="width:100%;height:auto;min-height:240px;">`);
  const allPips = closed.map(t => Number(t.pips));
  const minPip = Math.min(...allPips) - 10;
  const maxPip = Math.max(...allPips) + 10;
  const bucketSize = 20;
  const winBuckets = {};
  const lossBuckets = {};
  for (const t of closed) {
    const p = Number(t.pips);
    const b = Math.floor(p / bucketSize) * bucketSize;
    if (Number(t.grossProfit) > 0) winBuckets[b] = (winBuckets[b] || 0) + 1;
    else if (Number(t.grossProfit) < 0) lossBuckets[b] = (lossBuckets[b] || 0) + 1;
  }
  const allBuckets = new Set([...Object.keys(winBuckets).map(Number), ...Object.keys(lossBuckets).map(Number)]);
  const sortedBuckets = Array.from(allBuckets).sort((a, b) => a - b);
  const maxCount = Math.max(...sortedBuckets.map(b => Math.max(winBuckets[b] || 0, lossBuckets[b] || 0)), 1);
  const barWidth = Math.max(4, (900 / sortedBuckets.length) - 2);

  html.push(`<line x1="40" y1="250" x2="940" y2="250" stroke="#475569" />`);
  let startX = 40;
  for (const b of sortedBuckets) {
    const winH = ((winBuckets[b] || 0) / maxCount) * 200;
    const lossH = ((lossBuckets[b] || 0) / maxCount) * 200;
    html.push(`<rect x="${startX}" y="${250 - winH}" width="${barWidth}" height="${winH}" fill="#22c55e" rx="1" />`);
    html.push(`<rect x="${startX + barWidth + 1}" y="${250 - lossH}" width="${barWidth}" height="${lossH}" fill="#ef4444" rx="1" />`);
    startX += barWidth * 2 + 2;
  }
  html.push(`<text x="14" y="150" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 150)">Count</text>`);
  html.push(`<text x="480" y="290" fill="#94a3b8" font-size="11" text-anchor="middle">Pips (negative = loss, positive = profit)</text>`);
  html.push(`</svg>`);
  html.push(`<div style="display:flex;gap:16px;justify-content:center;margin-top:8px;color:#94a3b8;font-size:12px;"><span><span style="display:inline-block;width:10px;height:10px;background:#22c55e;margin-right:4px;"></span>Winners</span><span><span style="display:inline-block;width:10px;height:10px;background:#ef4444;margin-right:4px;"></span>Losers</span></div>`);
  html.push(`</div>`);

  const winDurs = winners.map(t => Math.max(1, Math.round((Number(t.time) - Number(t.enter || t.time)) / 60000)));
  const lossDurs = losers.map(t => Math.max(1, Math.round((Number(t.time) - Number(t.enter || t.time)) / 60000)));
  const avgWinDur = winners.length ? winners.reduce((a, t) => a + Math.max(1, Math.round((Number(t.time) - Number(t.enter || t.time)) / 60000)), 0) / winners.length : 0;
  const avgLossDur = losers.length ? losers.reduce((a, t) => a + Math.max(1, Math.round((Number(t.time) - Number(t.enter || t.time)) / 60000)), 0) / losers.length : 0;

  html.push(`<div class="report-body"><h3>Duration Comparison</h3><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Metric</th><th style="padding:8px;text-align:right">Winners</th><th style="padding:8px;text-align:right">Losers</th></tr></thead><tbody>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Avg Duration (min)</td><td style="padding:8px;text-align:right">${avgWinDur.toFixed(0)}</td><td style="padding:8px;text-align:right">${avgLossDur.toFixed(0)}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Median Duration (min)</td><td style="padding:8px;text-align:right">${winners.length ? winDurs.sort((a,b)=>a-b)[Math.floor(winDurs.length/2)] : 0}</td><td style="padding:8px;text-align:right">${losers.length ? lossDurs.sort((a,b)=>a-b)[Math.floor(lossDurs.length/2)] : 0}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Shortest Win (min)</td><td style="padding:8px;text-align:right">${winners.length ? Math.min(...winDurs) : 0}</td><td style="padding:8px;text-align:right">${losers.length ? Math.min(...lossDurs) : 0}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Longest Win (min)</td><td style="padding:8px;text-align:right">${winners.length ? Math.max(...winDurs) : 0}</td><td style="padding:8px;text-align:right">${losers.length ? Math.max(...lossDurs) : 0}</td></tr>`);
  html.push(`</tbody></table></div>`);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayWin = {};
  const dayLoss = {};
  const dayTrades = {};
  for (const t of closed) {
    const d = new Date(Number(t.time));
    const day = dayNames[d.getDay()];
    const p = Number(t.grossProfit);
    if (!dayWin[day]) dayWin[day] = { count: 0, total: 0 };
    if (!dayLoss[day]) dayLoss[day] = { count: 0, total: 0 };
    if (p > 0) { dayWin[day].count++; dayWin[day].total += p; }
    else if (p < 0) { dayLoss[day].count++; dayLoss[day].total += p; }
    if (!dayTrades[day]) dayTrades[day] = [];
    dayTrades[day].push(t);
  }

  html.push(`<div class="report-body"><h3>Win vs Loss by Day</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Click a day to expand its trades.</p><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Day</th><th style="padding:8px;text-align:right">Wins</th><th style="padding:8px;text-align:right">Losses</th><th style="padding:8px;text-align:right">Win P&L</th><th style="padding:8px;text-align:right">Loss P&L</th><th style="padding:8px;text-align:right">Net</th></tr></thead><tbody>`);
  for (const day of dayNames) {
    const w = dayWin[day] || { count: 0, total: 0 };
    const l = dayLoss[day] || { count: 0, total: 0 };
    const net = w.total + l.total;
    html.push(`<tr style="border-bottom:1px solid #1e293b;cursor:pointer;" class="day-row" data-day="${day}"><td style="padding:8px;color:#e2e8f0;">${day}</td><td style="padding:8px;text-align:right">${w.count}</td><td style="padding:8px;text-align:right">${l.count}</td><td style="padding:8px;text-align:right;color:#22c55e;">${w.total.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#ef4444;">${l.total.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${net >= 0 ? '#22c55e' : '#ef4444'};">${net.toFixed(1)}</td></tr>`);
    const trades = dayTrades[day] || [];
    html.push(`<tr class="day-trades-row" data-day="${day}" style="display:none;"><td colspan="6" style="padding:8px;background:#0f172a;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:6px;text-align:left;">Position</th><th style="padding:6px;text-align:left">Time</th><th style="padding:6px;text-align:left">Type</th><th style="padding:6px;text-align:right">Volume</th><th style="padding:6px;text-align:right">P&L</th><th style="padding:6px;text-align:right">Pips</th></tr></thead><tbody>`);
    for (const t of trades.sort((a, b) => Number(a.time) - Number(b.time)).slice(0, 20)) {
      const d = new Date(Number(t.time));
      const timeStr = d.toISOString().slice(11, 16);
      const p = Number(t.grossProfit);
      const pips = Number(t.pips) || 0;
      const color = p > 0 ? '#22c55e' : p < 0 ? '#ef4444' : '#94a3b8';
      html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;color:#94a3b8;"><span class="trade-link" data-position-id="${t.positionId}">#${t.positionId}</span></td><td style="padding:6px;color:#e2e8f0;">${timeStr}</td><td style="padding:6px;color:#e2e8f0;">${t.type}</td><td style="padding:6px;text-align:right">${t.volume}</td><td style="padding:6px;text-align:right;color:${color};">${p.toFixed(1)}</td><td style="padding:6px;text-align:right;color:${color};">${pips.toFixed(1)}</td></tr>`);
    }
    if (trades.length > 20) {
      html.push(`<tr><td colspan="6" style="padding:6px;color:#94a3b8;text-align:center;">... and ${trades.length - 20} more trades</td></tr>`);
    }
    html.push(`</tbody></table></td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  const typeWin = {};
  const typeLoss = {};
  for (const t of closed) {
    const type = t.type;
    const p = Number(t.grossProfit);
    if (!typeWin[type]) typeWin[type] = { count: 0, total: 0 };
    if (!typeLoss[type]) typeLoss[type] = { count: 0, total: 0 };
    if (p > 0) { typeWin[type].count++; typeWin[type].total += p; }
    else if (p < 0) { typeLoss[type].count++; typeLoss[type].total += p; }
  }

  html.push(`<div class="report-body"><h3>Win vs Loss by Direction</h3><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Direction</th><th style="padding:8px;text-align:right">Wins</th><th style="padding:8px;text-align:right">Losses</th><th style="padding:8px;text-align:right">Win P&L</th><th style="padding:8px;text-align:right">Loss P&L</th><th style="padding:8px;text-align:right">Net</th></tr></thead><tbody>`);
  for (const type of ['Buy', 'Sell']) {
    const w = typeWin[type] || { count: 0, total: 0 };
    const l = typeLoss[type] || { count: 0, total: 0 };
    const net = w.total + l.total;
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${type}</td><td style="padding:8px;text-align:right">${w.count}</td><td style="padding:8px;text-align:right">${l.count}</td><td style="padding:8px;text-align:right;color:#22c55e;">${w.total.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#ef4444;">${l.total.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${net >= 0 ? '#22c55e' : '#ef4444'};">${net.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'Win-Loss Anatomy', description: 'Side-by-side structural comparison: what do winning trades have that losing trades lack?', html: html.join(''), category: 'Trade Quality & Sizing' };
}
