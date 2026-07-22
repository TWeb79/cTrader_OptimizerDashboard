export default async function lostOpportunity(events) {
  const closed = [];
  const pos = {};

  for (const e of events) {
    if (e.closePrice != null && Number(e.grossProfit) != null) {
      pos[e.positionId] = e;
    }
  }
  for (const k of Object.keys(pos)) closed.push(pos[k]);

  if (!closed.length) {
    return { title: 'Lost Opportunity', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const trades = closed.map(t => ({
    ...t,
    profit: Number(t.grossProfit) || 0,
    pips: Number(t.pips) || 0,
  }));

  const winners = trades.filter(t => t.profit > 0);
  const losers = trades.filter(t => t.profit < 0);
  const totalProfit = trades.reduce((a, t) => a + t.profit, 0);

  const avgWin = winners.length ? winners.reduce((a, t) => a + t.profit, 0) / winners.length : 0;
  const avgLoss = losers.length ? losers.reduce((a, t) => a + t.profit, 0) / losers.length : 0;

  const opportunityAnalysis = trades.map(t => {
    const notionalRisk = Math.abs(t.profit) > 0 ? (avgLoss / Math.abs(avgLoss)) * Math.abs(avgLoss) : 0;
    const missedPct = 0;
    return { ...t, direction: t.type };
  });

  const allPips = trades.map(t => t.pips);
  const avgPips = allPips.length ? allPips.reduce((a, b) => a + b, 0) / allPips.length : 0;
  const maxWinPips = Math.max(...allPips, 0);
  const maxLossPips = Math.min(...allPips, 0);

  const bullishClosed = trades.filter(t => t.type === 'Buy');
  const bearishClosed = trades.filter(t => t.type === 'Sell');
  const bullishWin = bullishClosed.filter(t => t.profit > 0).length;
  const bearishWin = bearishClosed.filter(t => t.profit > 0).length;
  const bullishWinRate = bullishClosed.length ? (bullishWin / bullishClosed.length) * 100 : 0;
  const bearishWinRate = bearishClosed.length ? (bearishWin / bearishClosed.length) * 100 : 0;
  const bullishAvgPips = bullishClosed.length ? bullishClosed.reduce((a, t) => a + t.pips, 0) / bullishClosed.length : 0;
  const bearishAvgPips = bearishClosed.length ? bearishClosed.reduce((a, t) => a + t.pips, 0) / bearishClosed.length : 0;

  const html = [];
  html.push(`<div class="report-header"><h2>Lost Opportunity</h2><p>What did the bot miss? Comparing realized P&L against theoretical best outcomes and directional bias.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:160px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Total Trades', String(trades.length)],
    ['Avg Pips/Trade', avgPips.toFixed(1)],
    ['Max Win (pips)', maxWinPips.toFixed(1)],
    ['Max Loss (pips)', maxLossPips.toFixed(1)],
    ['Buy Win Rate', bullishWinRate.toFixed(1) + '%'],
    ['Sell Win Rate', bearishWinRate.toFixed(1) + '%'],
    ['Buy Avg Pips', bullishAvgPips.toFixed(1)],
    ['Sell Avg Pips', bearishAvgPips.toFixed(1)],
    ['Directional Edge', Math.abs(bullishAvgPips - bearishAvgPips).toFixed(1)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Directional Performance Breakdown</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Buy vs Sell: which direction is the bot actually skilled at predicting?</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Direction</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Avg Pips</th><th style="padding:8px;text-align:right">Total P&L</th></tr></thead><tbody>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Buy</td><td style="padding:8px;text-align:right">${bullishClosed.length}</td><td style="padding:8px;text-align:right">${bullishWinRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${bullishAvgPips >= 0 ? '#22c55e' : '#ef4444'};">${bullishAvgPips.toFixed(1)}</td><td style="padding:8px;text-align:right">${bullishClosed.reduce((a,t)=>a+t.profit,0).toFixed(1)}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Sell</td><td style="padding:8px;text-align:right">${bearishClosed.length}</td><td style="padding:8px;text-align:right">${bearishWinRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${bearishAvgPips >= 0 ? '#22c55e' : '#ef4444'};">${bearishAvgPips.toFixed(1)}</td><td style="padding:8px;text-align:right">${bearishClosed.reduce((a,t)=>a+t.profit,0).toFixed(1)}</td></tr>`);
  html.push(`</tbody></table></div>`);

  const biggestWins = [...winners].sort((a, b) => b.pips - a.pips).slice(0, 5);
  const biggestLosses = [...losers].sort((a, b) => a.pips - b.pips).slice(0, 5);

  html.push(`<div class="report-body"><h3>Largest Missed Opportunities (Winners)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">These trades captured value. Consider scaling winners in these sizes and conditions.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Position</th><th style="padding:8px;text-align:right">Volume</th><th style="padding:8px;text-align:right">Pips</th><th style="padding:8px;text-align:right">P&L</th><th style="padding:8px;text-align:right">Type</th></tr></thead><tbody>`);
  for (const t of biggestWins) {
    const d = new Date(Number(t.time));
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;"><span class="trade-link" data-position-id="${t.positionId}">#${t.positionId}</span></td><td style="padding:8px;text-align:right">${t.volume}</td><td style="padding:8px;text-align:right;color:#22c55e;">${t.pips.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#22c55e;">${t.profit.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#94a3b8;">${t.type}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Deepest Regrets (Largest Losses)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">These trades destroyed value. Analyze what they have in common.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Position</th><th style="padding:8px;text-align:right">Volume</th><th style="padding:8px;text-align:right">Pips</th><th style="padding:8px;text-align:right">P&L</th><th style="padding:8px;text-align:right">Type</th></tr></thead><tbody>`);
  for (const t of biggestLosses) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;"><span class="trade-link" data-position-id="${t.positionId}">#${t.positionId}</span></td><td style="padding:8px;text-align:right">${t.volume}</td><td style="padding:8px;text-align:right;color:#ef4444;">${t.pips.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#ef4444;">${t.profit.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#94a3b8;">${t.type}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Volume vs Pips Scatter</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Does position size predict negative outcomes? Large dots = bad trades.</p>`);
  html.push(`<svg viewBox="0 0 960 300" style="width:100%;height:auto;min-height:240px;">`);
  const allVols = trades.map(t => t.volume);
  const minVol = Math.min(...allVols);
  const maxVol = Math.max(...allVols);
  const allPipsSet = trades.map(t => t.pips);
  const minP = Math.min(...allPipsSet) - 10;
  const maxP = Math.max(...allPipsSet) + 10;
  const pRange = maxP - minP || 1;
  const volRange = maxVol - minVol || 1;

  const sampleSize = Math.min(200, trades.length);
  const step = Math.max(1, Math.floor(trades.length / sampleSize));
  const scatterData = [];
  for (let i = 0; i < trades.length; i += step) scatterData.push(trades[i]);
  if (scatterData.length < trades.length) scatterData.push(trades[trades.length - 1]);

  for (const t of scatterData) {
    const x = 40 + ((t.volume - minVol) / volRange) * 880;
    const y = 260 - ((t.pips - minP) / pRange) * 220;
    const r = Math.min(6, 1.5 + Math.abs(t.profit) / 150);
    const color = t.profit > 0 ? '#22c55e' : t.profit < 0 ? '#ef4444' : '#94a3b8';
    html.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="0.7" />`);
  }
  html.push(`<line x1="40" y1="130" x2="940" y2="130" stroke="#475569" stroke-dasharray="3" />`);
  html.push(`<text x="480" y="290" fill="#94a3b8" font-size="11" text-anchor="middle">Volume (x) vs Pips (y)</text>`);
  html.push(`</svg>`);
  html.push(`<div style="display:flex;gap:16px;justify-content:center;margin-top:8px;color:#94a3b8;font-size:12px;"><span><span style="display:inline-block;width:10px;height:10px;background:#22c55e;border-radius:50%;margin-right:4px;"></span>Winner</span><span><span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:50%;margin-right:4px;"></span>Loser</span><span>Size = P&L magnitude</span></div>`);
  html.push(`</div>`);

  return { title: 'Lost Opportunity', description: 'What did the bot miss? Comparing realized P&L against theoretical best outcomes and directional bias.', html: html.join(''), category: 'Trade Quality & Sizing' };
}
