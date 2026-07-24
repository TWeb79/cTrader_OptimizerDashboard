export default async function optimalSlRecommendation(events) {
  const positionEvents = {};
  for (const e of events) {
    if (!positionEvents[e.positionId]) positionEvents[e.positionId] = [];
    positionEvents[e.positionId].push(e);
  }

  const trades = [];
  let slBasedCount = 0;
  let equityFallbackCount = 0;
  for (const pid of Object.keys(positionEvents)) {
    const evts = positionEvents[pid].sort((a, b) => Number(a.time) - Number(b.time));
    const create = evts[0];
    const close = evts[evts.length - 1];
    if (!create || !close || close.closePrice == null) continue;

    const type = close.type;
    const entry = Number(create.entryPrice);
    const initialSL = getInitialSl(evts);
    const finalPnl = Number(close.grossProfit) || 0;
    const date = new Date(Number(close.time));
    const day = date.toISOString().slice(0, 10);
    const hour = date.getHours();

    let mae;
    if (initialSL != null && !isNaN(initialSL)) {
      mae = Math.abs(entry - initialSL);
      slBasedCount++;
    } else {
      const entryEquity = Number(create.equity);
      const minEquity = Math.min(...evts.map(ev => Number(ev.equity)).filter(v => !isNaN(v)));
      mae = entryEquity > 0 && !isNaN(minEquity) ? Math.max(0, entryEquity - minEquity) : 0;
      equityFallbackCount++;
    }

    trades.push({
      positionId: pid,
      type,
      mae,
      finalPnl,
      day,
      hour,
      win: finalPnl > 0,
      hasSl: initialSL != null,
    });
  }

  if (!trades.length) {
    return { title: 'Optimal SL Recommendation', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const allMae = trades.map(t => t.mae).filter(v => v > 0);
  const longs = trades.filter(t => t.type === 'Buy');
  const shorts = trades.filter(t => t.type === 'Sell');

  const stats = {
    all: computeStats(allMae),
    long: computeStats(longs.map(t => t.mae).filter(v => v > 0)),
    short: computeStats(shorts.map(t => t.mae).filter(v => v > 0)),
  };

  const thresholdAnalysis = computeMaeThresholdAnalysis(trades);

  const html = [];
  html.push(`<div class="report-header"><h2>Optimal SL Recommendation</h2><p>Statistical analysis of maximum adverse excursion (MAE) based on stop-loss distance to entry, with intra-trade threshold analysis.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:160px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Recommended SL (95%)', stats.all.p95.toFixed(1)],
    ['Recommended SL (90%)', stats.all.p90.toFixed(1)],
    ['Mean MAE', stats.all.mean.toFixed(1)],
    ['Median MAE', stats.all.median.toFixed(1)],
    ['Max MAE', stats.all.max.toFixed(1)],
    ['Std Dev', stats.all.std.toFixed(1)],
    ['Trades w/ SL', slBasedCount],
    ['Equity Fallback', equityFallbackCount],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>MAE Threshold Analysis</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Win rate degradation when MAE exceeds thresholds. Early exit warning levels shown in red.</p>`);
  html.push(thresholdTable(thresholdAnalysis));
  html.push(`</div>`);

  html.push(`<div class="report-body"><h3>Recommended SL Levels</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Based on Maximum Adverse Excursion (MAE) distribution across all closed trades.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Metric</th><th style="padding:8px;text-align:right">All Trades</th><th style="padding:8px;text-align:right">Long (Buy)</th><th style="padding:8px;text-align:right">Short (Sell)</th></tr></thead><tbody>`);
  const rows = [
    ['95th Percentile', stats.all.p95, stats.long.p95, stats.short.p95],
    ['90th Percentile', stats.all.p90, stats.long.p90, stats.short.p90],
    ['80th Percentile', stats.all.p80, stats.long.p80, stats.short.p80],
    ['Mean', stats.all.mean, stats.long.mean, stats.short.mean],
    ['Median', stats.all.median, stats.long.median, stats.short.median],
    ['Std Dev', stats.all.std, stats.long.std, stats.short.std],
    ['Max', stats.all.max, stats.long.max, stats.short.max],
  ];
  for (const r of rows) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${r[0]}</td><td style="padding:8px;text-align:right;color:${r[1]>=0?'#e2e8f0':'#ef4444'};">${r[1].toFixed(1)}</td><td style="padding:8px;text-align:right;color:${r[2]>=0?'#e2e8f0':'#ef4444'};">${r[2].toFixed(1)}</td><td style="padding:8px;text-align:right;color:${r[3]>=0?'#e2e8f0':'#ef4444'};">${r[3].toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>MAE Distribution (All Trades)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Histogram of maximum adverse excursion across all closed trades.</p>`);
  html.push(maeHistogram(allMae, 40));
  html.push(`</div>`);

  html.push(`<div class="report-body"><h3>MAE by Day of Week</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Average maximum adverse excursion by trading day. Redder = riskier days requiring wider SL.</p>`);
  html.push(dayHeatmap(trades, 'all'));
  html.push(`</div>`);

  html.push(`<div class="report-body"><h3>MAE by Hour of Day (All Trades)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Average maximum adverse excursion by hour of day. Riskier hours may need wider SL or reduced size.</p>`);
  html.push(hourHeatmap(trades, 'all'));
  html.push(`</div>`);

  html.push(`<div class="report-body"><h3>MAE by Day × Hour Heatmap</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Granular view of maximum adverse excursion by day and hour. Darker red = higher typical drawdown before recovery or close.</p>`);
  html.push(dayHourHeatmap(trades));
  html.push(`</div>`);

  return { title: 'Optimal SL Recommendation', description: 'Statistical analysis of maximum adverse excursion (MAE) to determine optimal stop-loss levels across all trades, by direction, day, and hour.', html: html.join(''), category: 'Risk & Loss Analysis' };
}

function computeStats(values) {
  if (!values.length) return { mean: 0, median: 0, p80: 0, p90: 0, p95: 0, max: 0, std: 0 };
  const sorted = values.slice().sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p80 = percentile(sorted, 0.80);
  const p90 = percentile(sorted, 0.90);
  const p95 = percentile(sorted, 0.95);
  const max = sorted[sorted.length - 1];
  const variance = sorted.reduce((a, v) => a + (v - mean) ** 2, 0) / sorted.length;
  const std = Math.sqrt(variance);
  return { mean, median, p80, p90, p95, max, std };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, idx)];
}

function maeHistogram(values, bins) {
  if (!values.length) return '<p style="color:#94a3b8">No MAE data available.</p>';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  const labels = [];
  for (let i = 0; i < bins; i++) {
    labels.push((min + i * width).toFixed(0));
  }
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    counts[idx]++;
  }
  const maxCount = Math.max(...counts, 1);
  const barW = 40;
  const pad = 50;
  const chartW = pad * 2 + bins * (barW + 4);
  const chartH = 300;
  
  let svg = `<svg viewBox="0 0 ${chartW} ${chartH}" style="width:100%;height:auto;min-height:250px;">`;
  svg += `<line x1="${pad}" y1="${chartH - 40}" x2="${chartW - pad}" y2="${chartH - 40}" stroke="#475569" />`;
  for (let i = 0; i < bins; i++) {
    const x = pad + i * (barW + 4);
    const barH = maxCount ? (counts[i] / maxCount) * (chartH - 60) : 0;
    const y = chartH - 40 - barH;
    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#38bdf8" rx="2" />`;
    if (i % 5 === 0) {
      svg += `<text x="${x + barW/2}" y="${chartH - 24}" fill="#94a3b8" font-size="9" text-anchor="middle">${labels[i]}</text>`;
    }
  }
  svg += `<text x="${chartW/2}" y="${chartH - 6}" fill="#94a3b8" font-size="11" text-anchor="middle">MAE ($)</text>`;
  svg += `<text x="14" y="${chartH/2}" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 ${chartH/2})">Frequency</text>`;
  svg += `</svg>`;
  return svg;
}

function dayHeatmap(trades, mode) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayMap = {};
  for (const t of trades) {
    const d = new Date(t.day + 'T00:00:00');
    const day = dayNames[d.getDay()];
    if (!dayMap[day]) dayMap[day] = { sum: 0, count: 0 };
    dayMap[day].sum += t.mae;
    dayMap[day].count++;
  }
  const values = dayNames.map(d => dayMap[d] ? dayMap[d].sum / dayMap[d].count : 0);
  const maxVal = Math.max(...values, 1);
  
  let html = '<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Day</th><th style="padding:8px;text-align:right">Avg MAE</th><th style="padding:8px;text-align:right">Trades</th></tr></thead><tbody>';
  for (let i = 0; i < dayNames.length; i++) {
    const d = dayNames[i];
    const data = dayMap[d];
    const avg = data ? data.sum / data.count : 0;
    const intensity = maxVal > 0 ? avg / maxVal : 0;
    const bg = heatColor(intensity);
    html += `<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${d}</td><td style="padding:8px;text-align:right;background:${bg};color:#e2e8f0;">${avg.toFixed(1)}</td><td style="padding:8px;text-align:right">${data ? data.count : 0}</td></tr>`;
  }
  html += '</tbody></table>';
  return html;
}

function hourHeatmap(trades, mode) {
  const hourMap = {};
  for (const t of trades) {
    const h = t.hour;
    if (!hourMap[h]) hourMap[h] = { sum: 0, count: 0 };
    hourMap[h].sum += t.mae;
    hourMap[h].count++;
  }
  const values = [];
  for (let h = 0; h < 24; h++) {
    values.push(hourMap[h] ? hourMap[h].sum / hourMap[h].count : 0);
  }
  const maxVal = Math.max(...values, 1);
  
  let html = '<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:6px;text-align:left;">Hour</th><th style="padding:6px;text-align:right">Avg MAE</th><th style="padding:6px;text-align:right">Trades</th></tr></thead><tbody>';
  for (let h = 0; h < 24; h++) {
    const data = hourMap[h];
    const avg = data ? data.sum / data.count : 0;
    const intensity = maxVal > 0 ? avg / maxVal : 0;
    const bg = heatColor(intensity);
    html += `<tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;color:#94a3b8;">${String(h).padStart(2,'0')}:00</td><td style="padding:6px;text-align:right;background:${bg};color:#e2e8f0;">${avg.toFixed(1)}</td><td style="padding:6px;text-align:right">${data ? data.count : 0}</td></tr>`;
  }
  html += '</tbody></table>';
  return html;
}

function dayHourHeatmap(trades) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayHourMap = {};
  for (const t of trades) {
    const d = new Date(t.day + 'T00:00:00');
    const day = dayNames[d.getDay()];
    const h = t.hour;
    const key = `${day}_${h}`;
    if (!dayHourMap[key]) dayHourMap[key] = { sum: 0, count: 0 };
    dayHourMap[key].sum += t.mae;
    dayHourMap[key].count++;
  }
  
  const allAvgs = [];
  for (const d of dayNames) {
    for (let h = 0; h < 24; h++) {
      const key = `${d}_${h}`;
      const data = dayHourMap[key];
      if (data && data.count > 0) allAvgs.push(data.sum / data.count);
    }
  }
  const maxVal = Math.max(...allAvgs, 1);
  
  let html = '<table style="border-collapse:collapse;font-size:12px;"><thead><tr><th style="padding:6px;background:#1e293b;color:#94a3b8;">Day \\ Hour</th>';
  for (let h = 0; h < 24; h++) html += `<th style="padding:4px;background:#1e293b;color:#94a3b8;">${String(h).padStart(2,'0')}</th>`;
  html += '</tr></thead><tbody>';
  
  for (const d of dayNames) {
    html += `<tr><th style="padding:6px;background:#1e293b;color:#94a3b8;text-align:right;">${d}</th>`;
    for (let h = 0; h < 24; h++) {
      const key = `${d}_${h}`;
      const data = dayHourMap[key];
      let avg = 0;
      if (data && data.count > 0) avg = data.sum / data.count;
      const intensity = maxVal > 0 ? avg / maxVal : 0;
      const bg = heatColor(intensity);
      const display = data && data.count > 0 ? avg.toFixed(0) : '-';
      html += `<td style="padding:4px;background:${bg};color:#e2e8f0;text-align:center;" title="Avg MAE: ${avg.toFixed(1)} | Trades: ${data ? data.count : 0}">${display}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function heatColor(intensity) {
  const t = Math.max(0, Math.min(1, intensity));
  const r = Math.round(30 + (239 - 30) * t);
  const g = Math.round(41 + (68 - 41) * t);
  const b = Math.round(54 + (68 - 54) * t);
  return `rgb(${r},${g},${b})`;
}

function getInitialSl(evts) {
  if (!evts || !evts.length) return null;
  for (const e of evts) {
    if (e.sl != null && e.event === 'Position Modified (S/L)') {
      return Number(e.sl);
    }
    if (e.sl != null && typeof e.sl === 'number') {
      return Number(e.sl);
    }
  }
  const withSl = evts.find(e => e.sl != null);
  return withSl ? Number(withSl.sl) : null;
}

function computeMaeThresholdAnalysis(trades) {
  const thresholds = [0, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200];
  const results = [];

  for (const thresh of thresholds) {
    const below = trades.filter(t => t.mae <= thresh);
    const above = trades.filter(t => t.mae > thresh);

    const belowWinRate = below.length ? below.filter(t => t.win).length / below.length : 0;
    const aboveWinRate = above.length ? above.filter(t => t.win).length / above.length : 0;
    const allWinRate = trades.length ? trades.filter(t => t.win).length / trades.length : 0;

    const recoveryRate = above.length ? trades.filter(t => t.mae > thresh && t.win).length / above.length : 0;

    results.push({
      threshold: thresh,
      belowCount: below.length,
      aboveCount: above.length,
      belowWinRate: belowWinRate,
      aboveWinRate: aboveWinRate,
      allWinRate: allWinRate,
      recoveryRate: recoveryRate,
      winRateDrop: belowWinRate > 0 ? (belowWinRate - aboveWinRate) / belowWinRate : 0,
    });
  }

  return results;
}

function thresholdTable(analysis) {
  let html = '<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">MAE Threshold</th><th style="padding:8px;text-align:right">Above</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Drop vs Below</th><th style="padding:8px;text-align:right">Recovery</th></tr></thead><tbody>';

  for (const r of analysis) {
    const isWarning = r.aboveWinRate < r.belowWinRate * 0.5 && r.aboveCount > 10;
    const winColor = r.aboveWinRate < 0.5 ? '#ef4444' : r.aboveWinRate < 0.7 ? '#f59e0b' : '#22c55e';
    const dropColor = r.winRateDrop > 0.5 ? '#ef4444' : r.winRateDrop > 0.25 ? '#f59e0b' : '#94a3b8';

    html += `<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">≤ ${r.threshold}</td><td style="padding:8px;text-align:right;color:#94a3b8;">${r.aboveCount} trades</td><td style="padding:8px;text-align:right;color:${winColor};">${(r.aboveWinRate * 100).toFixed(0)}%</td><td style="padding:8px;text-align:right;color:${dropColor};">${(r.winRateDrop * 100).toFixed(0)}%</td><td style="padding:8px;text-align:right;color:#94a3b8;">${(r.recoveryRate * 100).toFixed(0)}%</td></tr>`;
  }
  html += '</tbody></table>';
  return html;
}
