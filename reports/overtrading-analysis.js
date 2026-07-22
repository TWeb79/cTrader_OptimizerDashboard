export default async function overtradingAnalysis(events) {
  const closed = [];
  const pos = {};

  for (const e of events) {
    if (e.closePrice != null) {
      pos[e.positionId] = e;
    }
  }
  const sorted = Object.values(pos).sort((a, b) => Number(a.time) - Number(b.time));
  for (const t of sorted) closed.push(t);

  if (!closed.length) {
    return { title: 'Over-Trading Analysis', description: 'No closed trades available.', html: '<p style="color:#94a4b8">No data.</p>' };
  }

  const dayMap = {};
  const hourMap = {};
  const intervalMap = {};

  for (const t of closed) {
    const d = new Date(Number(t.time));
    const dayKey = d.toISOString().slice(0, 10);
    const hourKey = d.getHours();
    dayMap[dayKey] = (dayMap[dayKey] || 0) + (Number(t.grossProfit) || 0);
    hourMap[hourKey] = (hourMap[hourKey] || 0) + (Number(t.grossProfit) || 0);

    if (!intervalMap[dayKey]) intervalMap[dayKey] = [];
    intervalMap[dayKey].push({ ...t, time: Number(t.time) });
  }

  const days = Object.keys(dayMap).sort();
  const dailyCount = {};
  for (const d of days) {
    dailyCount[d] = intervalMap[d] ? intervalMap[d].length : 0;
  }

  const avgCount = days.length ? days.reduce((a, d) => a + dailyCount[d], 0) / days.length : 0;
  const maxDailyCount = Math.max(...Object.values(dailyCount), 0);
  const highVolumeDays = days.filter(d => dailyCount[d] > avgCount * 2);
  const highVolumePnL = highVolumeDays.reduce((a, d) => a + dayMap[d], 0);
  const allPnL = days.reduce((a, d) => a + dayMap[d], 0);

  const buckets = ['0-2', '3-5', '6-10', '11-20', '21-50', '51-100', '100+'];
  const bucketData = {};
  for (const b of buckets) bucketData[b] = { count: 0, total: 0, days: 0 };

  for (const d of days) {
    const c = dailyCount[d];
    let b = '';
    if (c <= 2) b = '0-2';
    else if (c <= 5) b = '3-5';
    else if (c <= 10) b = '6-10';
    else if (c <= 20) b = '11-20';
    else if (c <= 50) b = '21-50';
    else if (c <= 100) b = '51-100';
    else b = '100+';
    if (bucketData[b]) {
      bucketData[b].count += c;
      bucketData[b].total += dayMap[d];
      bucketData[b].days += 1;
    }
  }

  let prevTime = 0;
  const gaps = [];
  for (const t of closed) {
    const gap = (Number(t.time) - prevTime) / 60000;
    if (prevTime > 0 && gap > 0 && gap < 1440) gaps.push(gap);
    prevTime = Number(t.time);
  }
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  const shortGaps = gaps.filter(g => g < 5);
  const shortGapTrades = closed.filter((t, i) => i > 0 && gaps[i - 1] < 5);
  const shortGapPnL = shortGapTrades.reduce((a, t) => a + (Number(t.grossProfit) || 0), 0);
  const normalGapTrades = closed.filter((t, i) => i > 0 && gaps[i - 1] >= 5);
  const normalGapPnL = normalGapTrades.reduce((a, t) => a + (Number(t.grossProfit) || 0), 0);

  const html = [];
  html.push(`<div class="report-header"><h2>Over-Trading Analysis</h2><p>Quality vs quantity. Does more trading mean more profit, or just more noise?</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:160px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Trading Days', String(days.length)],
    ['Avg Trades/Day', avgCount.toFixed(1)],
    ['Max Trades/Day', String(maxDailyCount)],
    ['High-Volume Days', String(highVolumeDays.length)],
    ['High-Vol P&L', highVolumePnL.toFixed(1)],
    ['Avg Gap (min)', avgGap.toFixed(0)],
    ['Short Gap Trades', String(shortGaps.length)],
    ['Short Gap P&L', shortGapPnL.toFixed(1)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Daily Trade Count vs P&L</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Is there a sweet spot, or does excess trading destroy returns?</p>`);
  html.push(`<svg viewBox="0 0 960 300" style="width:100%;height:auto;min-height:240px;">`);
  const counts = Object.values(dailyCount);
  const pnls = days.map(d => dayMap[d]);
  const maxC = Math.max(...counts, 1);
  const minP = Math.min(...pnls);
  const maxP = Math.max(...pnls);
  const pRange = (maxP - minP) || 1;

  for (let i = 0; i < days.length; i++) {
    const x = 40 + (i / Math.max(1, days.length - 1)) * 880;
    const y = 260 - ((pnls[i] - minP) / pRange) * 220;
    const size = Math.min(20, 4 + (counts[i] / maxC) * 16);
    const color = pnls[i] >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${color}" opacity="0.6" />`);
  }
  html.push(`<line x1="40" y1="130" x2="940" y2="130" stroke="#475569" stroke-dasharray="3" />`);
  html.push(`<text x="14" y="150" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 150)">P&L ($)</text>`);
  html.push(`<text x="480" y="290" fill="#94a3b8" font-size="11" text-anchor="middle">Day (bigger dot = more trades)</text>`);
  html.push(`</svg>`);
  html.push(`<div style="display:flex;gap:16px;justify-content:center;margin-top:8px;color:#94a3b8;font-size:12px;"><span>Green = Profit day</span><span style="margin-left:16px;">Red = Loss day</span><span style="margin-left:16px;">Dot size = trades per day</span></div>`);
  html.push(`</div>`);

  html.push(`<div class="report-body"><h3>Performance by Trade Volume Buckets</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Group days by number of trades to detect diminishing returns.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Trades/Day</th><th style="padding:8px;text-align:right">Days</th><th style="padding:8px;text-align:right">Total Trades</th><th style="padding:8px;text-align:right">Total P&L</th><th style="padding:8px;text-align:right">P&L per Trade</th><th style="padding:8px;text-align:right">P&L per Day</th></tr></thead><tbody>`);
  for (const b of buckets) {
    const data = bucketData[b];
    if (data.days === 0) continue;
    const perTrade = data.count ? data.total / data.count : 0;
    const perDay = data.days ? data.total / data.days : 0;
    const color = data.total >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#94a3b8;">${b}</td><td style="padding:8px;text-align:right">${data.days}</td><td style="padding:8px;text-align:right">${data.count}</td><td style="padding:8px;text-align:right;color:${color};">${data.total.toFixed(1)}</td><td style="padding:8px;text-align:right">${perTrade.toFixed(1)}</td><td style="padding:8px;text-align:right">${perDay.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Time Gap Analysis</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Consecutive trades within 5 minutes of each other may indicate impulsive, revenge, or churn behavior.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Gap Window</th><th style="padding:8px;text-align:right">Trade Count</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Total P&L</th><th style="padding:8px;text-align:right">Avg P&L</th></tr></thead><tbody>`);
  const shortRate = shortGapTrades.length ? (shortGapTrades.filter(t => t.profit > 0).length / shortGapTrades.length) * 100 : 0;
  const normalRate = normalGapTrades.length ? (normalGapTrades.filter(t => t.profit > 0).length / normalGapTrades.length) * 100 : 0;
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Under 5 min</td><td style="padding:8px;text-align:right">${shortGapTrades.length}</td><td style="padding:8px;text-align:right">${shortRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${shortGapPnL >= 0 ? '#22c55e' : '#ef4444'};">${shortGapPnL.toFixed(1)}</td><td style="padding:8px;text-align:right">${shortGapTrades.length ? (shortGapPnL / shortGapTrades.length).toFixed(1) : 0}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">5+ minutes</td><td style="padding:8px;text-align:right">${normalGapTrades.length}</td><td style="padding:8px;text-align:right">${normalRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${normalGapPnL >= 0 ? '#22c55e' : '#ef4444'};">${normalGapPnL.toFixed(1)}</td><td style="padding:8px;text-align:right">${normalGapTrades.length ? (normalGapPnL / normalGapTrades.length).toFixed(1) : 0}</td></tr>`);
  html.push(`</tbody></table></div>`);

  return { title: 'Over-Trading Analysis', description: 'Quality vs quantity. Does more trading mean more profit, or just more noise?', html: html.join(''), category: 'Risk & Loss Analysis' };
}
