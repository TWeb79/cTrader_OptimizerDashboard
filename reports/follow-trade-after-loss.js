export default async function followTradeAfterLoss(events) {
  const pos = {};
  for (const e of events) {
    if (e.closePrice != null) {
      pos[e.positionId] = e;
    }
  }
  const sorted = Object.values(pos).sort((a, b) => Number(a.time) - Number(b.time));

  if (!sorted.length) {
    return { title: 'Follow Trade After Loss', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const trades = sorted.map(t => ({
    ...t,
    profit: Number(t.grossProfit) || 0,
    time: Number(t.time),
  }));

  const followAfterLoss = [];
  const secondFollowAfterLoss = [];
  let followLosers = 0;
  let secondFollowLosers = 0;

  for (let i = 1; i < trades.length; i++) {
    const prev = trades[i - 1];
    if (prev.profit < 0) {
      followAfterLoss.push(trades[i]);
      if (trades[i].profit < 0) followLosers++;
    }
    if (i >= 2 && trades[i - 2].profit < 0) {
      secondFollowAfterLoss.push(trades[i]);
      if (trades[i].profit < 0) secondFollowLosers++;
    }
  }

  const totalFollow = followAfterLoss.length;
  const totalSecondFollow = secondFollowAfterLoss.length;
  const followLossRate = totalFollow ? (followLosers / totalFollow) * 100 : 0;
  const secondFollowLossRate = totalSecondFollow ? (secondFollowLosers / totalSecondFollow) * 100 : 0;
  const avgFollowPnl = totalFollow ? followAfterLoss.reduce((a, t) => a + t.profit, 0) / totalFollow : 0;
  const avgSecondFollowPnl = totalSecondFollow ? secondFollowAfterLoss.reduce((a, t) => a + t.profit, 0) / totalSecondFollow : 0;

  const streakCounts = [0, 0, 0];
  const streakPnl = [0, 0, 0];
  for (let i = 0; i < trades.length; ) {
    if (trades[i].profit >= 0) { i++; continue; }
    let j = i;
    while (j < trades.length && trades[j].profit < 0) j++;
    const len = Math.min(j - i, 3);
    streakCounts[len - 1]++;
    streakPnl[len - 1] += trades.slice(i, j).reduce((a, t) => a + t.profit, 0);
    i = j;
  }

  const absStreakPnl = streakPnl.map(p => Math.abs(p));
  const avgStreakPnl = streakCounts.map((c, i) => c ? streakPnl[i] / c : 0);

  const goAgainRates = [0, 0];
  for (let n = 1; n <= 2; n++) {
    let total = 0, wins = 0;
    for (let i = n; i < trades.length; i++) {
      let allNeg = true;
      for (let k = i - n; k < i; k++) {
        if (trades[k].profit >= 0) { allNeg = false; break; }
      }
      if (allNeg) {
        total++;
        if (trades[i].profit > 0) wins++;
      }
    }
    goAgainRates[n - 1] = total ? (wins / total) * 100 : 0;
  }

  const html = [];
  html.push(`<div class="report-header"><h2>Follow Trade After Loss</h2><p>Revenge trading analysis: after a losing trade, how often does the follow-up trade also end negative?</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Total Follow Trades', String(totalFollow)],
    ['Follow Loss Count', String(followLosers)],
    ['Follow Loss Rate', followLossRate.toFixed(1) + '%'],
    ['Avg Follow PnL', avgFollowPnl.toFixed(1)],
    ['Second Follow Loss Rate', secondFollowLossRate.toFixed(1) + '%'],
    ['Avg Second Follow PnL', avgSecondFollowPnl.toFixed(1)],
    ['Win After 1 Loss', goAgainRates[0].toFixed(1) + '%'],
    ['Win After 2 Losses', goAgainRates[1].toFixed(1) + '%'],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Revenge Trade Probability</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">After a loss, what is the chance that the very next trade also loses?</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Scenario</th><th style="padding:8px;text-align:right">Follow Trades</th><th style="padding:8px;text-align:right">Losses</th><th style="padding:8px;text-align:right">Loss Rate</th><th style="padding:8px;text-align:right">Avg PnL</th></tr></thead><tbody>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Follow trade after 1 loss</td><td style="padding:8px;text-align:right">${totalFollow}</td><td style="padding:8px;text-align:right">${followLosers}</td><td style="padding:8px;text-align:right;color:${followLossRate > 50 ? '#ef4444' : '#94a3b8'};">${followLossRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${avgFollowPnl < 0 ? '#ef4444' : '#22c55e'};">${avgFollowPnl.toFixed(1)}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Second follow trade (any trade after 1+ loss)</td><td style="padding:8px;text-align:right">${totalSecondFollow}</td><td style="padding:8px;text-align:right">${secondFollowLosers}</td><td style="padding:8px;text-align:right;color:${secondFollowLossRate > 50 ? '#ef4444' : '#94a3b8'};">${secondFollowLossRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${avgSecondFollowPnl < 0 ? '#ef4444' : '#22c55e'};">${avgSecondFollowPnl.toFixed(1)}</td></tr>`);
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Consecutive Loss Distribution</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">How often do losses repeat in streaks?</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Streak Length</th><th style="padding:8px;text-align:right">Occurrences</th><th style="padding:8px;text-align:right">Total PnL</th><th style="padding:8px;text-align:right">Avg PnL</th></tr></thead><tbody>`);
  const totalStreaks = streakCounts.reduce((a, b) => a + b, 0);
  for (let n = 1; n <= 3; n++) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${n} loss${n > 1 ? 'es' : ''} or more</td><td style="padding:8px;text-align:right">${streakCounts[n - 1]}</td><td style="padding:8px;text-align:right;color:#ef4444;">${streakPnl[n - 1].toFixed(1)}</td><td style="padding:8px;text-align:right;color:${avgStreakPnl[n - 1] < 0 ? '#ef4444' : '#22c55e'};">${avgStreakPnl[n - 1].toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Break-Even Probability After Loss Streaks</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">After a series of consecutive losses, what is the chance the next trade wins?</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Preceding Losses</th><th style="padding:8px;text-align:right">Next Trades Analyzed</th><th style="padding:8px;text-align:right">Wins</th><th style="padding:8px;text-align:right">Win Rate</th></tr></thead><tbody>`);
  for (let n = 1; n <= 2; n++) {
    let total = 0, wins = 0;
    for (let i = n; i < trades.length; i++) {
      let allNeg = true;
      for (let k = i - n; k < i && k >= 0; k++) {
        if (trades[k].profit >= 0) { allNeg = false; break; }
      }
      if (allNeg) {
        total++;
        if (trades[i].profit > 0) wins++;
      }
    }
    const rate = total ? (wins / total) * 100 : 0;
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${n} consecutive loss${n > 1 ? 'es' : ''}</td><td style="padding:8px;text-align:right">${total}</td><td style="padding:8px;text-align:right">${wins}</td><td style="padding:8px;text-align:right;color:${rate >= 50 ? '#22c55e' : '#ef4444'};">${rate.toFixed(1)}%</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Individual Follow Trade Outcomes</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">List of every follow trade after a loss with its outcome.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Previous Trade</th><th style="padding:8px;text-align:right">Follow Trade</th><th style="padding:8px;text-align:left">Direction</th><th style="padding:8px;text-align:right">PnL</th><th style="padding:8px;text-align:left">Date</th></tr></thead><tbody>`);
  const showFollows = followAfterLoss.slice(0, 100);
  for (const ft of showFollows) {
    const pt = trades[trades.indexOf(ft) - 1];
    if (!pt) continue;
    const date = new Date(ft.time);
    const pnlColor = ft.profit < 0 ? '#ef4444' : ft.profit > 0 ? '#22c55e' : '#94a3b8';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#94a3b8;">#${pt.positionId}</td><td style="padding:8px;text-align:right"><span class="trade-link" data-position-id="${ft.positionId}">#${ft.positionId}</span></td><td style="padding:8px;color:#e2e8f0;">${ft.type}</td><td style="padding:8px;text-align:right;color:${pnlColor};">${ft.profit.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#94a3b8;">${date.toISOString().slice(5, 10)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'Follow Trade After Loss', description: 'Revenge trading analysis: after a losing trade, how often does the follow-up trade also end negative?', html: html.join(''), category: 'Risk & Loss Analysis' };
}
