export default async function monthlyConsistency(events) {
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
    return { title: 'Monthly Consistency', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const monthMap = {};
  for (const t of closed) {
    const d = new Date(Number(t.time));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { trades: [], total: 0, wins: 0, losses: 0, grossWin: 0, grossLoss: 0 };
    const p = Number(t.grossProfit) || 0;
    monthMap[key].trades.push({ ...t, profit: p, time: Number(t.time) });
    monthMap[key].total += p;
    if (p > 0) { monthMap[key].wins++; monthMap[key].grossWin += p; }
    if (p < 0) { monthMap[key].losses++; monthMap[key].grossLoss += p; }
  }

  const months = Object.keys(monthMap).sort();
  const tradesPerMonth = months.map(m => monthMap[m].trades.length);
  const avgTrades = tradesPerMonth.length ? tradesPerMonth.reduce((a, b) => a + b, 0) / tradesPerMonth.length : 0;
  const maxTrades = Math.max(...tradesPerMonth, 0);
  const minTrades = Math.min(...tradesPerMonth, 0);
  const positiveMonths = months.filter(m => monthMap[m].total > 0).length;
  const negativeMonths = months.filter(m => monthMap[m].total < 0).length;
  const breakevenMonths = months.filter(m => monthMap[m].total === 0).length;
  const consistencyScore = months.length ? (positiveMonths / months.length) * 100 : 0;

  let cum = 0, peak = 0;
  const monthEquity = [];
  for (const m of months) {
    cum += monthMap[m].total;
    if (cum > peak) peak = cum;
    monthEquity.push({ month: m, cum, dd: peak - cum });
  }
  const maxMonthDd = Math.max(...monthEquity.map(e => e.dd), 0);

  let longestWinStreak = 0, longestLossStreak = 0;
  let currentWin = 0, currentLoss = 0;
  for (const m of months) {
    if (monthMap[m].total > 0) {
      currentWin++;
      currentLoss = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWin);
    } else if (monthMap[m].total < 0) {
      currentLoss++;
      currentWin = 0;
      longestLossStreak = Math.max(longestLossStreak, currentLoss);
    } else {
      currentWin = 0;
      currentLoss = 0;
    }
  }

  const html = [];
  html.push(`<div class="report-header"><h2>Monthly Consistency</h2><p>Stability and predictability metrics beyond raw profit. A bot that wins 80% of months is more valuable than one that wins once a quarter.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:160px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const totalMonths = months.length;
  const avgMonthPnL = totalMonths ? months.reduce((a, m) => a + monthMap[m].total, 0) / totalMonths : 0;
  const avgWinMonth = totalMonths ? months.filter(m => monthMap[m].total > 0).reduce((a, m) => a + monthMap[m].total, 0) / (positiveMonths || 1) : 0;
  const avgLossMonth = totalMonths ? Math.abs(months.filter(m => monthMap[m].total < 0).reduce((a, m) => a + monthMap[m].total, 0) / (negativeMonths || 1)) : 0;
  const kellyEstimate = avgMonthPnL !== 0 && avgLossMonth !== 0 ? (avgWinMonth / avgLossMonth) : 0;

  const kpis = [
    ['Months Tracked', String(totalMonths)],
    ['Positive Months', String(positiveMonths)],
    ['Negative Months', String(negativeMonths)],
    ['Consistency Score', consistencyScore.toFixed(0) + '%'],
    ['Avg P&L/Month', avgMonthPnL.toFixed(1)],
    ['Avg Win Month', avgWinMonth.toFixed(1)],
    ['Avg Loss Month', avgLossMonth.toFixed(1)],
    ['Max Month DD', maxMonthDd.toFixed(1)],
    ['Longest Win Streak', String(longestWinStreak)],
    ['Longest Loss Streak', String(longestLossStreak)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Monthly P&L</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Green bars = profit, red bars = loss. Consistency means most bars are green.</p>`);
  html.push(`<svg viewBox="0 0 ${Math.max(960, totalMonths * 60 + 80)} 300" style="width:100%;height:auto;min-height:240px;">`);
  const leftPad = 60, rightPad = 20;
  const chartW = Math.max(960, totalMonths * 60 + leftPad + rightPad) - leftPad - rightPad;
  const barW = Math.max(20, (chartW / totalMonths) * 0.7);
  const values = months.map(m => monthMap[m].total);
  const minV = Math.min(...values, 0);
  const maxV = Math.max(...values, 0);
  const range = (maxV - minV) || 1;
  const zeroY = 260 - ((0 - minV) / range) * 220;

  html.push(`<line x1="${leftPad}" y1="${260}" x2="${leftPad + chartW}" y2="${260}" stroke="#475569" />`);
  html.push(`<line x1="${leftPad}" y1="${zeroY}" x2="${leftPad + chartW}" y2="${zeroY}" stroke="#94a3b8" stroke-dasharray="3" />`);

  for (let i = 0; i < months.length; i++) {
    const m = months[i];
    const v = monthMap[m].total;
    const x = leftPad + (i / Math.max(1, totalMonths - 1)) * chartW;
    const bh = (Math.abs(v) / range) * 220;
    const y = v >= 0 ? zeroY - bh : zeroY;
    const color = v >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<rect x="${x - barW / 2}" y="${y}" width="${barW}" height="${bh}" fill="${color}" rx="2" />`);
    html.push(`<text x="${x}" y="280" fill="#94a3b8" font-size="10" text-anchor="middle">${m.slice(2)}</text>`);
  }
  html.push(`<text x="14" y="140" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 140)">P&L ($)</text>`);
  html.push(`</svg>`);
  html.push(`</div>`);

  html.push(`<div class="report-body"><h3>Monthly Statistics Table</h3>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Month</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Win P&L</th><th style="padding:8px;text-align:right">Loss P&L</th><th style="padding:8px;text-align:right">Net P&L</th></tr></thead><tbody>`);
  for (const m of months) {
    const data = monthMap[m];
    const wr = data.trades.length ? (data.wins / data.trades.length) * 100 : 0;
    const color = data.total >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#94a3b8;">${m}</td><td style="padding:8px;text-align:right">${data.trades.length}</td><td style="padding:8px;text-align:right">${wr.toFixed(0)}%</td><td style="padding:8px;text-align:right;color:#22c55e;">${data.grossWin.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#ef4444;">${data.grossLoss.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${color};">${data.total.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Monthly Equity Curve</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Quarterly or monthly cumulative performance. Drawdowns show the longest recovery periods.</p>`);
  html.push(`<svg viewBox="0 0 960 300" style="width:100%;height:auto;min-height:240px;">`);
  if (monthEquity.length > 0) {
    const cumVals = monthEquity.map(e => e.cum);
    const cumMin = Math.min(...cumVals, 0);
    const cumMax = Math.max(...cumVals, 0);
    const cumRange = (cumMax - cumMin) || 1;
    const sx = (i) => 40 + (i / Math.max(1, monthEquity.length - 1)) * 880;
    const sy = (v) => 260 - ((v - cumMin) / cumRange) * 220;

    html.push(`<line x1="40" y1="260" x2="940" y2="260" stroke="#475569" />`);
    for (let i = 0; i < monthEquity.length; i++) {
      const x = sx(i);
      const y = sy(monthEquity[i].cum);
      html.push(`<circle cx="${x}" cy="${y}" r="4" fill="#38bdf8" />`);
      if (i > 0) html.push(`<line x1="${sx(i-1)}" y1="${sy(monthEquity[i-1].cum)}" x2="${x}" y2="${y}" stroke="#38bdf8" stroke-width="2" />`);
    }
  }
  html.push(`<text x="480" y="290" fill="#94a3b8" font-size="11" text-anchor="middle">Month</text>`);
  html.push(`<text x="14" y="150" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 150)">Cumulative P&L ($)</text>`);
  html.push(`</svg>`);
  html.push(`</div>`);

  return { title: 'Monthly Consistency', description: 'Stability and predictability metrics beyond raw profit.', html: html.join(''), category: 'P&L & Returns' };
}
