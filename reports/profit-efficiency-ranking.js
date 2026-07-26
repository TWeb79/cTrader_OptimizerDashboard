// Author: Inventions4All - github:TWeb79
//
// Profit Efficiency Ranking
// -------------------------------------------------------------------------
// Ranks every closed trade by profit per 1 volume unit.
// Useful for identifying which trades delivered the highest/lowest
// efficiency regardless of absolute position size.
// Extended with statistically relevant early-identification signals.

export default async function profitEfficiencyRanking(events) {
  const closed = [];
  const pos = {};
  for (const e of events) {
    if (e.closePrice != null && e.grossProfit != null) {
      pos[e.positionId] = e;
    }
  }
  for (const k of Object.keys(pos)) closed.push(pos[k]);

  if (!closed.length) {
    return { title: 'Profit Efficiency Ranking', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>', category: 'Trade Quality & Sizing' };
  }

  const trades = closed.map((t) => {
    const profit = Number(t.grossProfit) || 0;
    const volume = Number(t.volume) || 0;
    const efficiency = volume > 0 ? profit / volume : 0;
    const sl = t.sl != null ? Number(t.sl) : null;
    const entry = Number(t.entryPrice) || 0;
    const slDistance = sl != null && entry > 0
      ? t.type === 'Buy' ? entry - sl : sl - entry
      : null;
    const date = new Date(Number(t.time));
    return {
      positionId: t.positionId,
      type: t.type,
      volume,
      profit,
      efficiency,
      slDistance,
      hour: date.getHours(),
      date: date.toISOString().slice(0, 10),
      time: date.toISOString().slice(11, 16),
    };
  });

  const ranked = [...trades].sort((a, b) => b.efficiency - a.efficiency);

  const avgEfficiency = trades.reduce((a, t) => a + t.efficiency, 0) / trades.length;
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const medianEfficiency = (() => {
    const sorted = trades.map(t => t.efficiency).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  })();

  const winners = trades.filter(t => t.efficiency > 0);
  const losers = trades.filter(t => t.efficiency < 0);

  const stdDev = Math.sqrt(trades.reduce((a, t) => a + (t.efficiency - avgEfficiency) ** 2, 0) / trades.length);
  const cv = avgEfficiency !== 0 ? Math.abs(stdDev / avgEfficiency) : 0;

  const html = [];
  html.push(`<div class="report-header"><h2>Profit Efficiency Ranking</h2><p>Closed trades ranked by profit per 1 volume unit. Higher = more capital-efficient trade.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Trades', String(trades.length)],
    ['Avg Efficiency', avgEfficiency.toFixed(4)],
    ['Median Efficiency', medianEfficiency.toFixed(4)],
    ['Best Trade', best.efficiency.toFixed(4)],
    ['Worst Trade', worst.efficiency.toFixed(4)],
    ['Winners', String(winners.length)],
    ['Losers', String(losers.length)],
    ['Coeff. Variation', cv.toFixed(3)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Trades Ranked by Profit/Volume (Efficiency)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Sorted highest to lowest. Positive values = profit per unit volume; negative = loss per unit volume.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:center;">Rank</th><th style="padding:8px;text-align:left;">Position</th><th style="padding:8px;text-align:left">Type</th><th style="padding:8px;text-align:right">Volume</th><th style="padding:8px;text-align:right">P&L</th><th style="padding:8px;text-align:right">Profit/Vol</th><th style="padding:8px;text-align:left">Date</th></tr></thead><tbody>`);

  const display = ranked.slice(0, 200);
  for (let i = 0; i < display.length; i++) {
    const t = display[i];
    const effColor = t.efficiency >= 0 ? '#22c55e' : '#ef4444';
    const pnlColor = t.profit >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;text-align:center;color:#94a3b8;">${i + 1}</td><td style="padding:8px;color:#e2e8f0;"><span class="trade-link" data-position-id="${t.positionId}">#${t.positionId}</span></td><td style="padding:8px;color:#94a3b8;">${t.type}</td><td style="padding:8px;text-align:right">${t.volume.toFixed(2)}</td><td style="padding:8px;text-align:right;color:${pnlColor};">${t.profit.toFixed(2)}</td><td style="padding:8px;text-align:right;color:${effColor};font-weight:600;">${t.efficiency.toFixed(4)}</td><td style="padding:8px;color:#94a3b8;">${t.date} ${t.time}</td></tr>`);
  }
  if (ranked.length > 200) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td colspan="7" style="padding:8px;color:#94a3b8;text-align:center;">... ${ranked.length - 200} more trades truncated for performance ...</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Efficiency Distribution (By Direction)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">How capital efficiency compares between Buy and Sell trades.</p>`);

  const byType = {};
  for (const t of trades) {
    if (!byType[t.type]) byType[t.type] = [];
    byType[t.type].push(t);
  }
  const typeRows = Object.keys(byType).sort().map((type) => {
    const list = byType[type];
    const avg = list.reduce((a, t) => a + t.efficiency, 0) / list.length;
    const best = list.reduce((a, b) => (b.efficiency > a.efficiency ? b : a));
    const worst = list.reduce((a, b) => (b.efficiency < a.efficiency ? b : a));
    const wr = list.filter(t => t.efficiency > 0).length / list.length * 100;
    return `<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${type}</td><td style="padding:8px;text-align:right">${list.length}</td><td style="padding:8px;text-align:right">${avg.toFixed(4)}</td><td style="padding:8px;text-align:right;color:#22c55e;">${best.efficiency.toFixed(4)}</td><td style="padding:8px;text-align:right;color:#ef4444;">${worst.efficiency.toFixed(4)}</td><td style="padding:8px;text-align:right">${wr.toFixed(0)}%</td></tr>`;
  }).join('');

  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Type</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Avg Profit/Vol</th><th style="padding:8px;text-align:right">Best</th><th style="padding:8px;text-align:right">Worst</th><th style="padding:8px;text-align:right">Win Rate</th></tr></thead><tbody>${typeRows}</tbody></table></div>`);

  html.push(statisticalDistribution(trades));

  html.push(zScoreOutliers(trades, avgEfficiency, stdDev));

  html.push(paretoAnalysis(ranked));

  html.push(volumeBandEfficiency(trades));

  html.push(slDistanceEfficiency(trades));

  html.push(timeOfDayEfficiency(trades));

  return { title: 'Profit Efficiency Ranking', description: 'Closed trades ranked by profit per 1 volume unit to evaluate capital efficiency.', html: html.join(''), category: 'Trade Quality & Sizing' };
}

function zScoreOutliers(trades, mean, stdDev) {
  if (!stdDev) return '<p style="color:#94a3b8">No variance for z-score calculation.</p>';

  const withZ = trades.map(t => ({
    ...t,
    zScore: (t.efficiency - mean) / stdDev,
  }));

  const extremeWinners = withZ.filter(t => t.zScore >= 1.5).sort((a, b) => b.zScore - a.zScore).slice(0, 10);
  const extremeLosers = withZ.filter(t => t.zScore <= -1.5).sort((a, b) => a.zScore - b.zScore).slice(0, 10);

  const html = [];
  html.push(`<div class="report-body"><h3>Z-Score Outliers (Statistical Significance)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Trades with |z-score| &ge; 1.5 are statistically significant outliers. Positive = exceptional winner; negative = catastrophic loser.</p>`);

  if (extremeWinners.length) {
    html.push(`<h4 style="color:#22c55e;margin-top:12px;">Extreme Winners (z-score &ge; +1.5)</h4>`);
    html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:center;">Position</th><th style="padding:8px;text-align:left">Type</th><th style="padding:8px;text-align:right">Volume</th><th style="padding:8px;text-align:right">P&L</th><th style="padding:8px;text-align:right">Efficiency</th><th style="padding:8px;text-align:right">Z-Score</th></tr></thead><tbody>`);
    for (const t of extremeWinners) {
      html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;"><span class="trade-link" data-position-id="${t.positionId}">#${t.positionId}</span></td><td style="padding:8px;color:#94a3b8;">${t.type}</td><td style="padding:8px;text-align:right">${t.volume.toFixed(2)}</td><td style="padding:8px;text-align:right;color:#22c55e;">${t.profit.toFixed(2)}</td><td style="padding:8px;text-align:right;color:#22c55e;">${t.efficiency.toFixed(4)}</td><td style="padding:8px;text-align:right;color:#22c55e;font-weight:600;">+${t.zScore.toFixed(2)}</td></tr>`);
    }
    html.push(`</tbody></table>`);
  }

  if (extremeLosers.length) {
    html.push(`<h4 style="color:#ef4444;margin-top:12px;">Extreme Losers (z-score &le; -1.5)</h4>`);
    html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:center;">Position</th><th style="padding:8px;text-align:left">Type</th><th style="padding:8px;text-align:right">Volume</th><th style="padding:8px;text-align:right">P&L</th><th style="padding:8px;text-align:right">Efficiency</th><th style="padding:8px;text-align:right">Z-Score</th></tr></thead><tbody>`);
    for (const t of extremeLosers) {
      html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;"><span class="trade-link" data-position-id="${t.positionId}">#${t.positionId}</span></td><td style="padding:8px;color:#94a3b8;">${t.type}</td><td style="padding:8px;text-align:right">${t.volume.toFixed(2)}</td><td style="padding:8px;text-align:right;color:#ef4444;">${t.profit.toFixed(2)}</td><td style="padding:8px;text-align:right;color:#ef4444;">${t.efficiency.toFixed(4)}</td><td style="padding:8px;text-align:right;color:#ef4444;font-weight:600;">${t.zScore.toFixed(2)}</td></tr>`);
    }
    html.push(`</tbody></table>`);
  }

  html.push(`</div>`);
  return html.join('');
}

function paretoAnalysis(ranked) {
  const totalEff = ranked.reduce((a, t) => a + t.efficiency, 0);
  if (!totalEff) return '<p style="color:#94a3b8">No positive efficiency for Pareto analysis.</p>';

  let cumulative = 0;
  let cumCount = 0;
  const thresholds = [10, 20, 30, 50, 80];
  const results = {};
  for (const t of ranked) {
    cumulative += t.efficiency;
    cumCount++;
    const pct = (cumCount / ranked.length) * 100;
    for (const thresh of thresholds) {
      if (pct <= thresh && results[thresh] === undefined) {
        results[thresh] = {
          count: cumCount,
          efficiency: cumulative,
          efficiencyPct: (cumulative / totalEff) * 100,
        };
      }
    }
    if (cumulative >= totalEff) break;
  }

  const html = [];
  html.push(`<div class="report-body"><h3>Pareto Efficiency Analysis</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">What percentage of trades drive what percentage of total efficiency?</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Top X% Trades</th><th style="padding:8px;text-align:right">Trade Count</th><th style="padding:8px;text-align:right">Efficiency Share</th></tr></thead><tbody>`);

  for (const thresh of thresholds) {
    const r = results[thresh] || { count: ranked.length, efficiency: totalEff, efficiencyPct: 100 };
    const color = r.efficiencyPct >= 80 ? '#22c55e' : r.efficiencyPct >= 50 ? '#fbbf24' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Top ${thresh}%</td><td style="padding:8px;text-align:right">${r.count}</td><td style="padding:8px;text-align:right;color:${color};font-weight:600;">${r.efficiencyPct.toFixed(1)}%</td></tr>`);
  }
  html.push(`</tbody></table>`);

  const top20 = results[20] || { count: Math.ceil(ranked.length * 0.2), efficiencyPct: 0 };
  html.push(`<p style="color:#94a3b8;font-size:13px;margin-top:8px;">The best ${top20.count} trades (top 20%) produced <strong style="color:#e2e8f0;">${top20.efficiencyPct.toFixed(1)}%</strong> of total efficiency.</p>`);
  html.push(`</div>`);

  return html.join('');
}

function volumeBandEfficiency(trades) {
  const bands = [
    [0, 0.5],
    [0.5, 1],
    [1, 2],
    [2, 3],
    [3, 5],
    [5, 10],
    [10, Infinity],
  ];

  const buckets = bands.map(([lo, hi]) => ({
    label: hi === Infinity ? lo + '+' : lo + '-' + hi,
    trades: [],
  }));

  for (const t of trades) {
    for (let i = 0; i < bands.length; i++) {
      const [lo, hi] = bands[i];
      if (t.volume >= lo && (hi === Infinity || t.volume < hi)) {
        buckets[i].trades.push(t);
        break;
      }
    }
  }

  const html = [];
  html.push(`<div class="report-body"><h3>Volume Band Efficiency</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Average efficiency by position size. Use this to identify the most capital-efficient volume range before entering a trade.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Volume</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Avg Efficiency</th><th style="padding:8px;text-align:right">Total Efficiency</th></tr></thead><tbody>`);

  for (const b of buckets) {
    if (!b.trades.length) continue;
    const avgEff = b.trades.reduce((a, t) => a + t.efficiency, 0) / b.trades.length;
    const wr = b.trades.filter(t => t.efficiency > 0).length / b.trades.length * 100;
    const totalEff = b.trades.reduce((a, t) => a + t.efficiency, 0);
    const color = avgEff >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${b.label}</td><td style="padding:8px;text-align:right">${b.trades.length}</td><td style="padding:8px;text-align:right">${wr.toFixed(0)}%</td><td style="padding:8px;text-align:right;color:${color};">${avgEff.toFixed(4)}</td><td style="padding:8px;text-align:right;">${totalEff.toFixed(2)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return html.join('');
}

function slDistanceEfficiency(trades) {
  const withSL = trades.filter(t => t.slDistance != null && t.slDistance > 0);
  if (!withSL.length) return '<p style="color:#94a3b8">No SL data available for distance analysis.</p>';

  const bands = [
    [0, 10],
    [10, 30],
    [30, 60],
    [60, 120],
    [120, Infinity],
  ];

  const buckets = bands.map(([lo, hi]) => ({
    label: hi === Infinity ? lo + '+' : lo + '-' + hi,
    trades: [],
  }));

  for (const t of withSL) {
    for (let i = 0; i < bands.length; i++) {
      const [lo, hi] = bands[i];
      if (t.slDistance >= lo && (hi === Infinity || t.slDistance < hi)) {
        buckets[i].trades.push(t);
        break;
      }
    }
  }

  const html = [];
  html.push(`<div class="report-body"><h3>Stop-Loss Distance vs Efficiency</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">How SL proximity to entry price correlates with capital efficiency. Known at trade entry — useful for setup validation.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">SL Distance</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Avg Efficiency</th><th style="padding:8px;text-align:right">Avg P&L</th></tr></thead><tbody>`);

  for (const b of buckets) {
    if (!b.trades.length) continue;
    const avgEff = b.trades.reduce((a, t) => a + t.efficiency, 0) / b.trades.length;
    const wr = b.trades.filter(t => t.efficiency > 0).length / b.trades.length * 100;
    const avgPnl = b.trades.reduce((a, t) => a + t.profit, 0) / b.trades.length;
    const color = avgEff >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${b.label}</td><td style="padding:8px;text-align:right">${b.trades.length}</td><td style="padding:8px;text-align:right">${wr.toFixed(0)}%</td><td style="padding:8px;text-align:right;color:${color};">${avgEff.toFixed(4)}</td><td style="padding:8px;text-align:right;">${avgPnl.toFixed(2)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return html.join('');
}

function timeOfDayEfficiency(trades) {
  const hourBuckets = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    trades: [],
  }));

  for (const t of trades) {
    hourBuckets[t.hour].trades.push(t);
  }

  const html = [];
  html.push(`<div class="report-body"><h3>Efficiency by Hour of Day</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Capital efficiency broken down by trade entry hour. Known at entry — helps identify high-probability trading windows.</p>`);

  const activeHours = hourBuckets.filter(b => b.trades.length >= 5);
  const topHours = [...activeHours].sort((a, b) => {
    const avgA = a.trades.reduce((x, t) => x + t.efficiency, 0) / a.trades.length;
    const avgB = b.trades.reduce((x, t) => x + t.efficiency, 0) / b.trades.length;
    return avgB - avgA;
  }).slice(0, 5);

  const worstHours = [...activeHours].sort((a, b) => {
    const avgA = a.trades.reduce((x, t) => x + t.efficiency, 0) / a.trades.length;
    const avgB = b.trades.reduce((x, t) => x + t.efficiency, 0) / b.trades.length;
    return avgA - avgB;
  }).slice(0, 5);

  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Hour</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Avg Efficiency</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Total Efficiency</th></tr></thead><tbody>`);

  for (const h of topHours) {
    if (!h.trades.length) continue;
    const avgEff = h.trades.reduce((a, t) => a + t.efficiency, 0) / h.trades.length;
    const wr = h.trades.filter(t => t.efficiency > 0).length / h.trades.length * 100;
    const totalEff = h.trades.reduce((a, t) => a + t.efficiency, 0);
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#22c55e;">${String(h.hour).padStart(2, '0')}:00</td><td style="padding:8px;text-align:right">${h.trades.length}</td><td style="padding:8px;text-align:right;color:#22c55e;">${avgEff.toFixed(4)}</td><td style="padding:8px;text-align:right;color:#22c55e;">${wr.toFixed(0)}%</td><td style="padding:8px;text-align:right;color:#22c55e;">+${totalEff.toFixed(2)}</td></tr>`);
  }

  for (const h of worstHours) {
    if (!h.trades.length) continue;
    const avgEff = h.trades.reduce((a, t) => a + t.efficiency, 0) / h.trades.length;
    const wr = h.trades.filter(t => t.efficiency > 0).length / h.trades.length * 100;
    const totalEff = h.trades.reduce((a, t) => a + t.efficiency, 0);
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#ef4444;">${String(h.hour).padStart(2, '0')}:00</td><td style="padding:8px;text-align:right">${h.trades.length}</td><td style="padding:8px;text-align:right;color:#ef4444;">${avgEff.toFixed(4)}</td><td style="padding:8px;text-align:right;color:#ef4444;">${wr.toFixed(0)}%</td><td style="padding:8px;text-align:right;color:#ef4444;">${totalEff.toFixed(2)}</td></tr>`);
  }

  html.push(`</tbody></table></div>`);

  return html.join('');
}

function statisticalDistribution(trades) {
  const vals = trades.map(t => t.efficiency).filter(v => isFinite(v));
  if (!vals.length) return '<p style="color:#94a3b8">No data.</p>';

  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sorted = vals.slice().sort((a, b) => a - b);
  const median = sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const stdDev = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
  const min = Math.min(...vals);
  const max = Math.max(...vals);

  const bins = 20;
  const width = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const v of vals) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    counts[idx]++;
  }
  const maxCount = Math.max(...counts);
  const barW = 36;
  const chartH = 220;
  const pad = 50;
  const totalW = pad * 2 + bins * (barW + 4);

  let svg = `<svg viewBox="0 0 ${totalW} 300" style="width:100%;height:auto;min-height:240px;">`;
  svg += `<line x1="${pad}" y1="260" x2="${totalW - pad}" y2="260" stroke="#475569" />`;
  for (let i = 0; i < bins; i++) {
    const x = pad + i * (barW + 4);
    const barH = maxCount ? (counts[i] / maxCount) * chartH : 0;
    const y = 260 - barH;
    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#38bdf8" rx="2" />`;
    const label = (min + i * width).toFixed(2);
    svg += `<text x="${x + barW / 2}" y="280" fill="#94a3b8" font-size="9" text-anchor="middle">${label}</text>`;
  }
  const meanY = 260 - (mean - min) / (max - min || 1) * chartH;
  const medY = 260 - (median - min) / (max - min || 1) * chartH;
  svg += `<line x1="${pad}" y1="${meanY}" x2="${totalW - pad}" y2="${meanY}" stroke="#fbbf24" stroke-dasharray="4" stroke-width="2" />`;
  svg += `<line x1="${pad}" y1="${medY}" x2="${totalW - pad}" y2="${medY}" stroke="#22d3ee" stroke-dasharray="4" stroke-width="2" />`;
  svg += `<text x="${totalW / 2}" y="296" fill="#94a3b8" font-size="11" text-anchor="middle">Profit per Volume (Efficiency)</text>`;
  svg += `<text x="14" y="150" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 150)">Count</text>`;
  svg += `</svg>`;

  const legend = `<div style="display:flex;gap:16px;justify-content:center;margin-top:8px;color:#94a3b8;font-size:13px;">
    <span><span style="display:inline-block;width:10px;height:3px;background:#fbbf24;margin-right:4px;"></span>Mean: ${mean.toFixed(4)}</span>
    <span><span style="display:inline-block;width:10px;height:3px;background:#22d3ee;margin-right:4px;"></span>Median: ${median.toFixed(4)}</span>
    <span>Std Dev: ${stdDev.toFixed(4)}</span>
  </div>`;

  const html = [];
  html.push(`<div class="report-body"><h3>Statistical Distribution</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Histogram of profit/volume efficiency with mean and median markers.</p>`);
  html.push(svg + legend);
  html.push(`</div>`);

  return html.join('');
}
