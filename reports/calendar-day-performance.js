export default async function calendarDayPerformance(events) {
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
    return { title: 'Calendar Day Performance', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const dayMap = {};
  for (let d = 1; d <= 31; d++) dayMap[d] = [];
  for (const t of closed) {
    const date = new Date(Number(t.time));
    dayMap[date.getDate()].push(t);
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const analyzeDay = (trades) => {
    if (!trades.length) return null;
    const wins = trades.filter(t => Number(t.grossProfit) > 0);
    const losses = trades.filter(t => Number(t.grossProfit) < 0);
    const profit = trades.reduce((sum, t) => sum + (Number(t.grossProfit) || 0), 0);
    const winRate = (wins.length / trades.length) * 100;
    const grossProfit = wins.reduce((sum, t) => sum + Number(t.grossProfit), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + Number(t.grossProfit), 0));
    const profitFactor = grossLoss ? grossProfit / grossLoss : 0;
    const avgLoss = losses.length ? losses.reduce((sum, t) => sum + Number(t.grossProfit), 0) / losses.length : 0;
    const avgWin = wins.length ? wins.reduce((sum, t) => sum + Number(t.grossProfit), 0) / wins.length : 0;
    const avgPnl = profit / trades.length;
    const sample = losses.slice(0, 5).map(t => ({
      positionId: t.positionId,
      profit: Number(t.grossProfit),
      type: t.type,
      time: Number(t.time),
      event: t.event,
    }));
    return { trades: trades.length, winRate, avgPnl, profitFactor, avgLoss, avgWin, profit, sample };
  };

  const results = [];
  for (let d = 1; d <= 31; d++) {
    const r = analyzeDay(dayMap[d]);
    if (r) results.push({ day: d, ...r });
  }

  const overall = analyzeDay(closed);
  const noTradeDays = Array.from({ length: 31 }, (_, i) => i + 1).filter(d => !dayMap[d].length).length;

  const badDays = results.filter(r => r.trades >= 10 && (r.profitFactor < 0.9 || r.winRate < 40 || r.avgPnl < -50));
  const worstDays = [...results].sort((a, b) => a.profit - b.profit).slice(0, 5);
  const bestDays = [...results].sort((a, b) => b.profit - a.profit).slice(0, 5);

  const html = [];
  html.push(`<div class="report-header"><h2>Calendar Day Performance</h2><p>Analysis of performance by calendar day (1-31) to identify no-trade zones.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Overall Trades', String(overall.trades)],
    ['Overall Win Rate', overall.winRate.toFixed(1) + '%'],
    ['Overall Avg P&L', overall.avgPnl.toFixed(1)],
    ['No-Trade Days', String(noTradeDays)],
    ['No-Trade Zones', String(badDays.length)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  const dayColor = (r) => {
    if (r.trades < 5) return '#475569';
    if (r.profitFactor < 0.9 || r.winRate < 40 || r.avgPnl < -50) return '#ef4444';
    if (r.profitFactor >= 1.2 && r.winRate >= 50 && r.avgPnl > 0) return '#22c55e';
    return '#fbbf24';
  };

  html.push(`<div class="report-body"><h3>Performance by Calendar Day</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Green = profitable zone, Red = no-trade zone, Gray = insufficient data.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Day</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Avg P&L</th><th style="padding:8px;text-align:right">Profit Factor</th><th style="padding:8px;text-align:right">Total P&L</th></tr></thead><tbody>`);
  for (const r of results) {
    const color = dayColor(r);
    const pfColor = r.profitFactor >= 1 ? '#22c55e' : r.profitFactor >= 0.9 ? '#fbbf24' : '#ef4444';
    const wrColor = r.winRate >= 50 ? '#22c55e' : r.winRate >= 40 ? '#fbbf24' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">${r.day}</td><td style="padding:8px;text-align:right">${r.trades}</td><td style="padding:8px;text-align:right;color:${wrColor};">${r.winRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${r.avgPnl >= 0 ? '#22c55e' : '#ef4444'};">${r.avgPnl.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${pfColor};">${r.profitFactor.toFixed(2)}</td><td style="padding:8px;text-align:right;color:${r.profit >= 0 ? '#22c55e' : '#ef4444'};">${r.profit.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  if (badDays.length) {
    html.push(`<div class="report-body"><h3>Automatic No-Trade Zones</h3><p style="color:#fbbf24;font-size:13px;margin-bottom:8px;">Recommended days to avoid (min 10 trades, PF < 0.9 or win rate < 40% or avg P&L < -50):</p>`);
    html.push(`<ul style="color:#e2e8f0;font-size:13px;line-height:1.6;">`);
    for (const r of badDays) {
      html.push(`<li><strong>Day ${r.day}</strong> — ${r.trades} trades, win rate ${r.winRate.toFixed(0)}%, avg P&L ${r.avgPnl.toFixed(1)}, PF ${r.profitFactor.toFixed(2)}</li>`);
    }
    html.push(`</ul></div>`);
  } else {
    html.push(`<div class="report-body"><h3>Automatic No-Trade Zones</h3><p style="color:#94a3b8;font-size:13px;">No calendar days met the no-trade criteria with 10+ trades.</p></div>`);
  }

  html.push(`<div class="report-body"><h3>Best Calendar Days</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Days with highest total profit.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Day</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Avg P&L</th><th style="padding:8px;text-align:right">Total P&L</th></tr></thead><tbody>`);
  for (const r of bestDays) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">${r.day}</td><td style="padding:8px;text-align:right">${r.trades}</td><td style="padding:8px;text-align:right;color:#22c55e;">${r.winRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:#22c55e;">${r.avgPnl.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#22c55e;">+${(r.profit).toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Worst Calendar Days</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Days with lowest total profit.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Day</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Avg P&L</th><th style="padding:8px;text-align:right">Total P&L</th></tr></thead><tbody>`);
  for (const r of worstDays) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">${r.day}</td><td style="padding:8px;text-align:right">${r.trades}</td><td style="padding:8px;text-align:right;color:#ef4444;">${r.winRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:#ef4444;">${r.avgPnl.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#ef4444;">${r.profit.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  if (overall.sample && overall.sample.length) {
    html.push(`<div class="report-body"><h3>Sample Losing Trades on Worst Day</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Examples from the worst-performing calendar day.</p>`);
    html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Position</th><th style="padding:8px;text-align:left">Type</th><th style="padding:8px;text-align:right">Loss</th><th style="padding:8px;text-align:left">Exit</th></tr></thead><tbody>`);
    for (const t of worstDays[0].sample.slice(0, 5)) {
      const date = new Date(t.time);
      html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#94a3b8;">#${t.positionId}</td><td style="padding:8px;color:#e2e8f0;">${t.type}</td><td style="padding:8px;text-align:right;color:#ef4444;">${t.profit.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#94a3b8;">${date.toISOString().slice(5, 10)}</td></tr>`);
    }
    html.push(`</tbody></table></div>`);
  }

  return {
    title: 'Calendar Day Performance',
    description: 'Analysis of performance by calendar day (1-31) to identify no-trade zones.',
    html: html.join(''),
    category: 'Time & Scheduling',
  };
}
