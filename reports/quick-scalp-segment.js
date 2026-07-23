export default async function quickScalpSegment(events) {
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

    const duration = Math.round((Number(close.time) - Number(create.time)) / 60000);
    const profit = Number(close.grossProfit) || 0;
    const pips = Number(close.pips) || 0;
    const volume = Number(close.volume) || 1;
    const hour = new Date(Number(create.time)).getHours();

    trades.push({
      positionId: pid,
      type: close.type,
      duration,
      profit,
      pips,
      volume,
      hour,
      scalp: duration < 5,
    });
  }

  if (!trades.length) {
    return { title: 'Quick-Scalp Segment', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const scalps = trades.filter(t => t.scalp);
  const nonScalps = trades.filter(t => !t.scalp);

  const analyze = (arr) => {
    if (!arr.length) return { count: 0, winRate: 0, avgProfit: 0, totalProfit: 0, avgVolume: 0, avgPips: 0 };
    const wins = arr.filter(t => t.profit > 0);
    const total = arr.reduce((a, t) => a + t.profit, 0);
    const avgVol = arr.reduce((a, t) => a + t.volume, 0) / arr.length;
    const avgPips = arr.reduce((a, t) => a + t.pips, 0) / arr.length;
    return {
      count: arr.length,
      winRate: (wins.length / arr.length) * 100,
      avgProfit: total / arr.length,
      totalProfit: total,
      avgVolume: avgVol,
      avgPips: avgPips,
    };
  };

  const scalpStats = analyze(scalps);
  const nonScalpStats = analyze(nonScalps);

  const hourBuckets = Array.from({ length: 24 }, (_, i) => i);
  const hourCounts = {};
  for (const h of hourBuckets) {
    hourCounts[h] = scalps.filter(t => t.hour === h).length;
  }
  const maxHourCount = Math.max(...Object.values(hourCounts), 1);

  const typeCounts = {};
  for (const t of scalps) {
    typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
  }

  const html = [];
  html.push(`<div class="report-header"><h2>Quick-Scalp Segment</h2><p>Analysis of sub-5-minute trades to identify a distinct trading mode.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Scalp Trades', String(scalpStats.count)],
    ['Scalp Win Rate', scalpStats.winRate.toFixed(1) + '%'],
    ['Non-Scalp Win Rate', nonScalpStats.winRate.toFixed(1) + '%'],
    ['Scalp Avg P&L', scalpStats.avgProfit.toFixed(1)],
    ['Non-Scalp Avg P&L', nonScalpStats.avgProfit.toFixed(1)],
    ['Scalp Avg Volume', scalpStats.avgVolume.toFixed(1)],
    ['Non-Scalp Avg Volume', nonScalpStats.avgVolume.toFixed(1)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Scalp vs Non-Scalp Comparison</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Key metrics for trades under 5 minutes vs all others.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Metric</th><th style="padding:8px;text-align:right">Scalp</th><th style="padding:8px;text-align:right">Non-Scalp</th></tr></thead><tbody>`);
  const rows = [
    ['Count', scalpStats.count, nonScalpStats.count],
    ['Win Rate', scalpStats.winRate, nonScalpStats.winRate],
    ['Avg P&L', scalpStats.avgProfit, nonScalpStats.avgProfit],
    ['Total P&L', scalpStats.totalProfit, nonScalpStats.totalProfit],
    ['Avg Volume', scalpStats.avgVolume, nonScalpStats.avgVolume],
    ['Avg Pips', scalpStats.avgPips, nonScalpStats.avgPips],
  ];
  for (const r of rows) {
    const fmt = (v) => r[0].includes('Rate') ? v.toFixed(1) + '%' : v.toFixed(2);
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${r[0]}</td><td style="padding:8px;text-align:right;color:${r[1] >= 0 ? '#22c55e' : '#ef4444'};">${fmt(r[1])}</td><td style="padding:8px;text-align:right;color:${r[2] >= 0 ? '#22c55e' : '#ef4444'};">${fmt(r[2])}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Scalp Hour Distribution</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">When do quick scalps occur?</p>`);
  html.push(`<svg viewBox="0 0 960 200" style="width:100%;height:auto;min-height:160px;">`);
  html.push(`<line x1="40" y1="180" x2="920" y2="180" stroke="#475569" />`);
  for (let h = 0; h < 24; h++) {
    const val = hourCounts[h] || 0;
    const barH = (val / maxHourCount) * 140;
    const x = 40 + (h / 23) * 880;
    html.push(`<rect x="${x-12}" y="${180-barH}" width="20" height="${barH}" fill="#38bdf8" rx="1" />`);
    html.push(`<text x="${x}" y="195" fill="#94a3b8" font-size="10" text-anchor="middle">${String(h).padStart(2,'0')}</text>`);
  }
  html.push(`<text x="14" y="90" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 90)">Scalp Count</text>`);
  html.push(`</svg></div>`);

  return { title: 'Quick-Scalp Segment', description: 'Analysis of sub-5-minute trades to identify a distinct trading mode.', html: html.join(''), category: 'Trade Quality & Sizing' };
}
