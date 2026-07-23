export default async function slModificationCadence(events) {
  const positionEvents = {};
  for (const e of events) {
    if (!positionEvents[e.positionId]) positionEvents[e.positionId] = [];
    positionEvents[e.positionId].push(e);
  }

  const modCounts = {};
  const groupMetrics = {};

  for (const pid of Object.keys(positionEvents)) {
    const evts = positionEvents[pid].sort((a, b) => Number(a.time) - Number(b.time));
    const close = evts[evts.length - 1];
    if (!close || close.closePrice == null) continue;

    const mods = evts.filter(e => e.event === 'Position Modified (S/L)');
    const count = mods.length;
    const profit = Number(close.grossProfit) || 0;
    const win = profit > 0 ? 1 : 0;

    modCounts[pid] = count;
    if (!groupMetrics[count]) {
      groupMetrics[count] = { count: 0, trades: 0, wins: 0, profit: 0 };
    }
    groupMetrics[count].trades += 1;
    groupMetrics[count].wins += win;
    groupMetrics[count].profit += profit;
  }

  const counts = Object.keys(groupMetrics).map(Number).sort((a, b) => a - b);
  const totalPositions = Object.values(modCounts).length;

  if (!totalPositions) {
    return { title: 'SL Modification Cadence', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const html = [];
  html.push(`<div class="report-header"><h2>SL Modification Cadence vs Outcome</h2><p>Does more trailing-stop activity correlate with better or worse results?</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Total Positions', String(totalPositions)],
    ['No Modifications', String(groupMetrics[0]?.trades || 0)],
    ['1 Modification', String(groupMetrics[1]?.trades || 0)],
    ['Max Modifications', String(Math.max(...counts))],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Dose-Response: Modifications vs Outcome</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Win rate, total P&L, and average P&L by number of SL modifications.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:right">Modifications</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Wins</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Total P&L</th><th style="padding:8px;text-align:right">Avg P&L</th></tr></thead><tbody>`);
  for (const c of counts) {
    const g = groupMetrics[c];
    const wr = g.trades ? (g.wins / g.trades) * 100 : 0;
    const avg = g.trades ? g.profit / g.trades : 0;
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;text-align:right;color:#e2e8f0;font-weight:600;">${c}</td><td style="padding:8px;text-align:right">${g.trades}</td><td style="padding:8px;text-align:right">${g.wins}</td><td style="padding:8px;text-align:right;color:${wr >= 50 ? '#22c55e' : '#ef4444'};">${wr.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${g.profit >= 0 ? '#22c55e' : '#ef4444'};">${g.profit.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${avg >= 0 ? '#22c55e' : '#ef4444'};">${avg.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'SL Modification Cadence', description: 'Does more trailing-stop activity correlate with better or worse results?', html: html.join(''), category: 'Risk & Loss Analysis' };
}
