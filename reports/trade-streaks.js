export default async function tradeStreaks(events) {
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
    return { title: 'Trade Streaks', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const trades = closed.map(t => ({
    ...t,
    profit: Number(t.grossProfit) || 0,
    time: Number(t.time),
  }));

  let maxWinStreak = 0, maxLossStreak = 0;
  let currentWin = 0, currentLoss = 0;
  const streaks = [];
  let streakStart = 0;

  for (let i = 0; i < trades.length; i++) {
    if (trades[i].profit > 0) {
      currentWin++;
      if (currentLoss > 0) {
        streaks.push({ type: 'loss', length: currentLoss, start: streakStart, end: i - 1, pnl: trades.slice(streakStart, i).reduce((a, t) => a + t.profit, 0) });
        currentLoss = 0;
      }
    } else if (trades[i].profit < 0) {
      currentLoss++;
      if (currentWin > 0) {
        streaks.push({ type: 'win', length: currentWin, start: streakStart, end: i - 1, pnl: trades.slice(streakStart, i).reduce((a, t) => a + t.profit, 0) });
        currentWin = 0;
      }
    }
    streakStart = currentWin > 0 && currentLoss === 0 ? streakStart : (currentWin === 0 && currentLoss > 0 ? streakStart : i);
    if (currentWin > 0) streakStart = i - currentWin + 1;
    if (currentLoss > 0) streakStart = i - currentLoss + 1;

    maxWinStreak = Math.max(maxWinStreak, currentWin);
    maxLossStreak = Math.max(maxLossStreak, currentLoss);
  }
  if (currentWin > 0) streaks.push({ type: 'win', length: currentWin, start: streakStart, end: trades.length - 1, pnl: trades.slice(streakStart, trades.length).reduce((a, t) => a + t.profit, 0) });
  if (currentLoss > 0) streaks.push({ type: 'loss', length: currentLoss, start: streakStart, end: trades.length - 1, pnl: trades.slice(streakStart, trades.length).reduce((a, t) => a + t.profit, 0) });

  const winStreaks = streaks.filter(s => s.type === 'win');
  const lossStreaks = streaks.filter(s => s.type === 'loss');

  const lossAfterWin = [], lossAfterLoss = [];
  for (let i = 1; i < trades.length; i++) {
    const prevWon = trades[i - 1].profit > 0;
    if (!prevWon && trades[i].profit < 0) lossAfterLoss.push(trades[i].profit);
    if (prevWon && trades[i].profit < 0) lossAfterWin.push(trades[i].profit);
  }
  const avgLossAfterWin = lossAfterWin.length ? lossAfterWin.reduce((a, b) => a + b, 0) / lossAfterWin.length : 0;
  const avgLossAfterLoss = lossAfterLoss.length ? lossAfterLoss.reduce((a, b) => a + b, 0) / lossAfterLoss.length : 0;

  const lossAfterWinRate = lossAfterWin.length ? (lossAfterWin.length / (trades.length - 1)) * 100 : 0;
  const lossAfterLossRate = lossAfterLoss.length ? (lossAfterLoss.length / (trades.length - 1)) * 100 : 0;

  let cumAfterLossStreak = 0, maxDdAfterLoss = 0;
  for (let i = 0; i < trades.length; i++) {
    const inStreak = i > 0 && trades[i - 1].profit < 0;
    cumAfterLossStreak += trades[i].profit;
    if (cumAfterLossStreak > 0) cumAfterLossStreak = 0;
    if (inStreak && Math.abs(cumAfterLossStreak) > maxDdAfterLoss) maxDdAfterLoss = Math.abs(cumAfterLossStreak);
  }

  const html = [];
  html.push(`<div class="report-header"><h2>Trade Streaks</h2><p>Behavioral patterns in consecutive wins and losses. Streaks are not random — they reveal systemic rhythm and psychological traps.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:160px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Max Win Streak', String(maxWinStreak)],
    ['Max Loss Streak', String(maxLossStreak)],
    ['Win Streaks', String(winStreaks.length)],
    ['Loss Streaks', String(lossStreaks.length)],
    ['Loss After Win', lossAfterWinRate.toFixed(1) + '%'],
    ['Loss After Loss', lossAfterLossRate.toFixed(1) + '%'],
    ['Avg Loss After Win', avgLossAfterWin.toFixed(1)],
    ['Avg Loss After Loss', avgLossAfterLoss.toFixed(1)],
    ['Drawdown in Loss Streak', maxDdAfterLoss.toFixed(1)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Streak Distribution</h3><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Type</th><th style="padding:8px;text-align:right">Count</th><th style="padding:8px;text-align:right">Avg Length</th><th style="padding:8px;text-align:right">Max Length</th><th style="padding:8px;text-align:right">Total P&L</th></tr></thead><tbody>`);
  const winStreakCounts = winStreaks.map(s => s.length);
  const lossStreakCounts = lossStreaks.map(s => s.length);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#22c55e;">Winning Streaks</td><td style="padding:8px;text-align:right">${winStreaks.length}</td><td style="padding:8px;text-align:right">${winStreaks.length ? (winStreakCounts.reduce((a,b)=>a+b,0)/winStreaks.length).toFixed(1) : 0}</td><td style="padding:8px;text-align:right">${maxWinStreak}</td><td style="padding:8px;text-align:right;color:#22c55e;">${winStreaks.length ? winStreaks.reduce((a,s)=>a+s.pnl,0).toFixed(1) : 0}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#ef4444;">Losing Streaks</td><td style="padding:8px;text-align:right">${lossStreaks.length}</td><td style="padding:8px;text-align:right">${lossStreaks.length ? (lossStreakCounts.reduce((a,b)=>a+b,0)/lossStreaks.length).toFixed(1) : 0}</td><td style="padding:8px;text-align:right">${maxLossStreak}</td><td style="padding:8px;text-align:right;color:#ef4444;">${lossStreaks.length ? lossStreaks.reduce((a,s)=>a+s.pnl,0).toFixed(1) : 0}</td></tr>`);
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Key Insight: What Happens After a Loss?</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Losses often cluster. If average loss after a loss is worse than average loss after a win, the bot is potentially "revenge trading" or trading against a shifted regime.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Previous Outcome</th><th style="padding:8px;text-align:right">Next Trade Loss %</th><th style="padding:8px;text-align:right">Avg Loss Amount</th><th style="padding:8px;text-align:right">Interpretation</th></tr></thead><tbody>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Win</td><td style="padding:8px;text-align:right">${lossAfterWinRate.toFixed(1)}%</td><td style="padding:8px;text-align:right">${avgLossAfterWin.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#94a3b8;">Baseline</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Loss</td><td style="padding:8px;text-align:right">${lossAfterLossRate.toFixed(1)}%</td><td style="padding:8px;text-align:right">${avgLossAfterLoss.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${avgLossAfterLoss < avgLossAfterWin ? '#22c55e' : '#ef4444'};">${avgLossAfterLoss < avgLossAfterWin ? 'Better' : 'Worse (Revenge Trade?)'}</td></tr>`);
  html.push(`</tbody></table></div>`);

  const cumEq = [];
  let cum = 0, peak = 0;
  for (const t of trades) {
    cum += t.profit;
    if (cum > peak) peak = cum;
    cumEq.push({ idx: cumEq.length, cum, dd: peak - cum });
  }

  html.push(`<div class="report-body"><h3>Equity Curve with Streak Highlights</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Visualize how streaks compound gains or destroy equity.</p>`);
  html.push(`<svg viewBox="0 0 960 300" style="width:100%;height:auto;min-height:240px;">`);
  const w = 960, h = 300, pad = 40;
  const maxCum = Math.max(...cumEq.map(c => c.cum));
  const minCum = Math.min(...cumEq.map(c => c.cum));
  const maxDd = Math.max(...cumEq.map(c => c.dd));
  const yMin = minCum - maxDd * 0.1;
  const yMax = maxCum + maxDd * 0.1;
  const range = yMax - yMin || 1;

  const sx = (i) => pad + (i / Math.max(1, cumEq.length - 1)) * (w - pad * 2);
  const sy = (v) => pad + ((yMax - v) / range) * (h - pad * 2);

  html.push(`<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`);

  let winPath = '', lossPath = '', allPath = '';
  let inWinStreak = false, inLossStreak = false;
  for (let i = 0; i < cumEq.length; i++) {
    const x = sx(i);
    const y = sy(cumEq[i].cum);
    const prevX = i > 0 ? sx(i - 1) : x;
    const prevY = i > 0 ? sy(cumEq[i - 1].cum) : y;
    const isWin = i < trades.length && trades[i].profit > 0;
    const isLoss = i < trades.length && trades[i].profit < 0;
    if (isWin) { inWinStreak = true; inLossStreak = false; }
    else if (isLoss) { inLossStreak = true; inWinStreak = false; }
    if (i === 0) {
      winPath = `M ${x} ${y}`; lossPath = `M ${x} ${y}`; allPath = `M ${x} ${y}`;
    } else {
      if (inWinStreak || (i > 0 && trades[i-1] && trades[i-1].profit > 0 && !isLoss)) winPath += ` L ${x} ${y}`;
      if (inLossStreak || (i > 0 && trades[i-1] && trades[i-1].profit < 0 && !isWin)) lossPath += ` L ${x} ${y}`;
      allPath += ` L ${x} ${y}`;
    }
  }
  html.push(`<path d="${allPath}" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity="0.4" />`);
  html.push(`<path d="${winPath}" fill="none" stroke="#22c55e" stroke-width="2" />`);
  html.push(`<path d="${lossPath}" fill="none" stroke="#ef4444" stroke-width="2" />`);
  html.push(`<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`);
  html.push(`<text x="${w/2}" y="${h - 10}" fill="#94a3b8" font-size="11" text-anchor="middle">Trade Index</text>`);
  html.push(`<text x="14" y="${h/2}" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 ${h/2})">Cumulative P&L ($)</text>`);
  html.push(`</svg>`);
  html.push(`<div style="display:flex;gap:16px;justify-content:center;margin-top:8px;color:#94a3b8;font-size:12px;"><span><span style="display:inline-block;width:20px;height:3px;background:#22c55e;margin-right:4px;"></span>Win Streak</span><span><span style="display:inline-block;width:20px;height:3px;background:#ef4444;margin-right:4px;"></span>Loss Streak</span><span><span style="display:inline-block;width:20px;height:3px;background:#38bdf8;margin-right:4px;"></span>All Trades</span></div>`);
  html.push(`</div>`);

  return { title: 'Trade Streaks', description: 'Behavioral patterns in consecutive wins and losses. Streaks are not random.', html: html.join(''), category: 'Risk & Loss Analysis' };
}
