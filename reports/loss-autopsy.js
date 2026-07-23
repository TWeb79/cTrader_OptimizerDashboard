export default async function lossAutopsy(events) {
  const closed = [];
  const pos = {};
  const badWindows = [];

  for (const e of events) {
    if (e.closePrice != null) {
      pos[e.positionId] = e;
    }
  }
  for (const k of Object.keys(pos)) closed.push(pos[k]);

  const losses = closed.filter(t => Number(t.grossProfit) < 0);
  const losers = losses.length;

  if (!losers) {
    return { title: 'Loss Autopsy', description: 'No losing trades to analyze.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const absLoss = losses.map(t => Math.abs(Number(t.grossProfit)));
  const totalLoss = losses.reduce((a, t) => a + Number(t.grossProfit), 0);
  const avgLoss = totalLoss / losers;
  const maxLoss = Math.max(...absLoss);
  const medianLoss = absLoss.sort((a, b) => a - b)[Math.floor(absLoss.length / 2)];

  const manualCloses = events.filter(t => t.event === 'Position closed' && Number(t.grossProfit) < 0);
  const manualLossMap = {};
  for (const t of manualCloses) {
    manualLossMap[t.positionId] = t;
  }
  const manualLosses = Object.values(manualLossMap);
  const slLosses = losses.filter(t => t.event === 'Stop Loss Hit');
  const slLossTotal = slLosses.reduce((a, t) => a + Number(t.grossProfit), 0);
  const manualLossTotal = manualLosses.reduce((a, t) => a + Number(t.grossProfit), 0);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayMap = {};
  const hourMap = {};
  const typeMap = {};

  for (const t of losses) {
    const d = new Date(Number(t.time));
    const day = dayNames[d.getDay()];
    const hour = d.getHours();
    const dayKey = `${day}-${t.event}`;
    const hourKey = `${hour}-${t.event}`;
    dayMap[dayKey] = (dayMap[dayKey] || 0) + Math.abs(Number(t.grossProfit));
    hourMap[hourKey] = (hourMap[hourKey] || 0) + Math.abs(Number(t.grossProfit));
    const typeKey = `${t.type}-${t.event}`;
    typeMap[typeKey] = (typeMap[typeKey] || 0) + Math.abs(Number(t.grossProfit));
  }

  const dayHeatValues = Object.values(dayMap);
  const dayHeatMin = Math.min(...dayHeatValues, 0);
  const dayHeatMax = Math.max(...dayHeatValues, 1);

  function heatColor(v, min, max) {
    if (max === min) return 'rgb(100,100,100)';
    const t = (v - min) / (max - min);
    if (t > 0.5) return `rgb(${Math.round(34+(251-34)*(t-0.5)*2)},${Math.round(197+(191-197)*(t-0.5)*2)},${Math.round(94+(36-94)*(t-0.5)*2)})`;
    return `rgb(${Math.round(239+(251-239)*t*2)},${Math.round(68+(191-68)*t*2)},${Math.round(68+(36-68)*t*2)})`;
  }

  const html = [];
  html.push(`<div class="report-header"><h2>Loss Autopsy</h2><p>Deep dissection of every losing trade to identify root causes and systemic failure patterns.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:160px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Total Losses', String(losers)],
    ['Total P&L Lost', totalLoss.toFixed(1)],
    ['Avg Loss', avgLoss.toFixed(1)],
    ['Median Loss', medianLoss.toFixed(1)],
    ['Max Single Loss', maxLoss.toFixed(1)],
    ['SL-Hit Losses', String(slLosses.length)],
    ['Manual Close Losses', String(manualLosses.length)],
    ['SL Loss Total', slLossTotal.toFixed(1)],
    ['Manual Loss Total', manualLossTotal.toFixed(1)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Loss Type Breakdown</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Comparing Stop Loss hits vs manual closures.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Type</th><th style="padding:8px;text-align:right;">Count</th><th style="padding:8px;text-align:right;">Total Loss</th><th style="padding:8px;text-align:right;">Avg Loss</th><th style="padding:8px;text-align:right;">% of Total</th></tr></thead><tbody>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Stop Loss Hit</td><td style="padding:8px;text-align:right;">${slLosses.length}</td><td style="padding:8px;text-align:right;">${slLossTotal.toFixed(1)}</td><td style="padding:8px;text-align:right;">${slLosses.length ? (slLossTotal/slLosses.length).toFixed(1) : '0'}</td><td style="padding:8px;text-align:right;">${((slLossTotal/totalLoss)*100).toFixed(1)}%</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Manual Close</td><td style="padding:8px;text-align:right;">${manualLosses.length}</td><td style="padding:8px;text-align:right;">${manualLossTotal.toFixed(1)}</td><td style="padding:8px;text-align:right;">${manualLosses.length ? (manualLossTotal/manualLosses.length).toFixed(1) : '0'}</td><td style="padding:8px;text-align:right;">${((manualLossTotal/totalLoss)*100).toFixed(1)}%</td></tr>`);
  html.push(`</tbody></table></div>`);

  if (manualLosses.length > 0) {
    html.push(`<div class="report-body"><h3>Catastrophic Manual Closes (Top 10)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">The single biggest source of account drawdown. These trades should never happen without a stop loss.</p>`);
    html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Position</th><th style="padding:8px;text-align:left;">Type</th><th style="padding:8px;text-align:right;">Volume</th><th style="padding:8px;text-align:right;">Entry</th><th style="padding:8px;text-align:right;">Close</th><th style="padding:8px;text-align:right;">SL</th><th style="padding:8px;text-align:right;">Loss</th><th style="padding:8px;text-align:right;">Date</th></tr></thead><tbody>`);
    const sortedManual = manualLosses.sort((a, b) => Number(a.grossProfit) - Number(b.grossProfit));
    for (const t of sortedManual.slice(0, 10)) {
      const d = new Date(Number(t.time));
      const dateStr = d.toISOString().slice(5, 10);
      html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;"><span class="trade-link" data-position-id="${t.positionId}">#${t.positionId}</span></td><td style="padding:8px;color:#94a3b8;">${t.type}</td><td style="padding:8px;text-align:right;">${t.volume}</td><td style="padding:8px;text-align:right;">${t.entryPrice}</td><td style="padding:8px;text-align:right;">${t.closePrice}</td><td style="padding:8px;text-align:right;">${t.sl != null ? t.sl : 'NONE'}</td><td style="padding:8px;text-align:right;color:#ef4444;">${Number(t.grossProfit).toFixed(1)}</td><td style="padding:8px;text-align:right;color:#94a3b8;">${dateStr}</td></tr>`);
    }
    html.push(`</tbody></table></div>`);
  }

  html.push(`<div class="report-body"><h3>Loss by Day of Week & Exit Type</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Which days and exit mechanisms cause the most damage?</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:6px;text-align:left;">Day</th><th style="padding:6px;text-align:right;">SL-Hit Loss</th><th style="padding:6px;text-align:right;">Manual Loss</th><th style="padding:6px;text-align:right;">Total</th></tr></thead><tbody>`);
  for (const day of dayNames) {
    const slKey = `${day}-Stop Loss Hit`;
    const pcKey = `${day}-Position closed`;
    const slVal = dayMap[slKey] || 0;
    const pcVal = dayMap[pcKey] || 0;
    const total = slVal + pcVal;
    const max = dayHeatMax || 1;
    const bg = heatColor(total, dayHeatMin, dayHeatMax);
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#94a3b8;">${day}</td><td style="padding:8px;text-align:right;">${slVal.toFixed(1)}</td><td style="padding:8px;text-align:right;">${pcVal.toFixed(1)}</td><td style="padding:8px;text-align:right;background:${bg};color:#e2e8f0;">${total.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Loss by Hour of Day</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Time-based concentration of losses.</p>`);
  const hourHeatValues = Object.values(hourMap);
  const hourHeatMin = Math.min(...hourHeatValues, 0);
  const hourHeatMax = Math.max(...hourHeatValues, 1);
  html.push(`<svg viewBox="0 0 960 280" style="width:100%;height:auto;min-height:220px;">`);
  html.push(`<line x1="40" y1="260" x2="940" y2="260" stroke="#475569" />`);
  for (let h = 0; h < 24; h++) {
    const slKey = `${h}-Stop Loss Hit`;
    const pcKey = `${h}-Position closed`;
    const slVal = hourMap[slKey] || 0;
    const pcVal = hourMap[pcKey] || 0;
    const total = slVal + pcVal;
    const x = 40 + (h / 23) * 900;
    const bh = (total / (hourHeatMax || 1)) * 220;
    html.push(`<rect x="${x-12}" y="${260-bh}" width="20" height="${bh}" fill="${heatColor(total, hourHeatMin, hourHeatMax)}" rx="1" />`);
    html.push(`<text x="${x}" y="275" fill="#94a3b8" font-size="10" text-anchor="middle">${String(h).padStart(2,'0')}</text>`);
  }
  html.push(`<text x="14" y="140" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 140)">Loss Amount ($)</text>`);
  html.push(`</svg>`);
  html.push(`</div>`);

  const lossByType = losses.reduce((acc, t) => {
    const key = t.type;
    if (!acc[key]) acc[key] = { total: 0, count: 0 };
    acc[key].total += Number(t.grossProfit);
    acc[key].count += 1;
    return acc;
  }, {});

  html.push(`<div class="report-body"><h3>Loss by Direction (Buy vs Sell)</h3><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Type</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Avg Loss</th><th style="padding:8px;text-align:right">Total Loss</th></tr></thead><tbody>`);
  for (const [type, data] of Object.entries(lossByType)) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${type}</td><td style="padding:8px;text-align:right">${data.count}</td><td style="padding:8px;text-align:right">${(data.total / data.count).toFixed(1)}</td><td style="padding:8px;text-align:right;color:#ef4444;">${data.total.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'Loss Autopsy', description: 'Deep dissection of every losing trade to identify root causes and systemic failure patterns.', html: html.join(''), category: 'Risk & Loss Analysis' };
}
