// Author: Inventions4All - github:TWeb79
//
// Bot Score Analysis
// -------------------------------------------------------------------------
// Computes a composite bot score based on profitability, risk-adjusted returns,
// and drawdown resilience.
//
// Score = Net Profit × Profit Factor × Recovery Factor ÷ Max Drawdown
//
// Components:
//   Net Profit     = total gross profit - total gross loss
//   Profit Factor  = gross profit / gross loss
//   Recovery Factor= net profit / max drawdown
//   Max Drawdown   = largest peak-to-trough equity decline

export default async function botScoreAnalysis(events) {
  const closed = [];
  const pos = {};
  for (const e of events) {
    if (e.closePrice != null && e.grossProfit != null) {
      pos[e.positionId] = e;
    }
  }
  const sorted = Object.values(pos).sort((a, b) => Number(a.time) - Number(b.time));
  for (const t of sorted) closed.push(t);

  if (!closed.length) {
    return { title: 'Bot Score Analysis', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>', category: 'Bot Performance' };
  }

  const grossProfit = closed.reduce((a, t) => a + (Number(t.grossProfit) || 0), 0);
  const grossLoss = Math.abs(closed.filter(t => Number(t.grossProfit) < 0).reduce((a, t) => a + Number(t.grossProfit), 0));
  const netProfit = grossProfit - grossLoss;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
  const totalTrades = closed.length;
  const winners = closed.filter(t => Number(t.grossProfit) > 0).length;
  const winRate = (winners / totalTrades) * 100;

  let cum = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const equityCurve = [];
  const drawdowns = [];

  for (let i = 0; i < closed.length; i++) {
    cum += Number(closed[i].grossProfit) || 0;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    maxDrawdown = Math.max(maxDrawdown, dd);
    equityCurve.push({ idx: i, cum, dd, peak });
  }

  const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : 0;
  const score = maxDrawdown > 0 ? netProfit * profitFactor * recoveryFactor / maxDrawdown : 0;

  const losingTrades = totalTrades - winners;
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
  const altScore = netProfit - maxDrawdown * 3 + profitFactor * 500 + winRate * 20 - losingTrades * 10 - avgLoss * 2;

  const grade = getGrade(score, profitFactor, winRate, maxDrawdown, netProfit);

  const html = [];
  html.push(`<div class="report-header"><h2>Bot Score Analysis</h2><p>Composite performance score combining profitability, risk-adjusted returns, and drawdown resilience.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Bot Score', score.toFixed(2)],
    ['Grade', grade],
    ['Net Profit', `$${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}`],
    ['Profit Factor', profitFactor.toFixed(2)],
    ['Recovery Factor', recoveryFactor.toFixed(2)],
    ['Max Drawdown', `$${maxDrawdown.toFixed(2)}`],
    ['Win Rate', winRate.toFixed(1) + '%'],
    ['Total Trades', String(totalTrades)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle};color:${k[0] === 'Net Profit' ? (netProfit >= 0 ? '#22c55e' : '#ef4444') : k[0] === 'Max Drawdown' ? '#ef4444' : k[0] === 'Bot Score' ? gradeColor(grade) : '#e2e8f0'}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Score Formula Breakdown</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">How the bot score is calculated from raw trade data.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Component</th><th style="padding:8px;text-align:right">Value</th><th style="padding:8px;text-align:left">Explanation</th></tr></thead><tbody>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Net Profit</td><td style="padding:8px;text-align:right;color:${netProfit >= 0 ? '#22c55e' : '#ef4444'};">$${netProfit.toFixed(2)}</td><td style="padding:8px;color:#94a3b8;">Total profit minus total loss</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Profit Factor</td><td style="padding:8px;text-align:right;">${profitFactor.toFixed(2)}</td><td style="padding:8px;color:#94a3b8;">Gross profit / gross loss. >1 = profitable</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Recovery Factor</td><td style="padding:8px;text-align:right;">${recoveryFactor.toFixed(2)}</td><td style="padding:8px;color:#94a3b8;">Net profit / max drawdown. Higher = faster recovery</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Max Drawdown</td><td style="padding:8px;text-align:right;color:#ef4444;">$${maxDrawdown.toFixed(2)}</td><td style="padding:8px;color:#94a3b8;">Largest peak-to-trough equity decline</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">Bot Score</td><td style="padding:8px;text-align:right;color:${gradeColor(grade)};font-weight:700;">${score.toFixed(2)}</td><td style="padding:8px;color:#94a3b8;">Net Profit × Profit Factor × Recovery Factor ÷ Max Drawdown</td></tr>`);
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Grade Interpretation</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">What your bot score means in practical terms.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Grade</th><th style="padding:8px;text-align:left">Score Range</th><th style="padding:8px;text-align:left">Meaning</th></tr></thead><tbody>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#22c55e;font-weight:600;">A+</td><td style="padding:8px;color:#e2e8f0;">> 1000</td><td style="padding:8px;color:#94a3b8;">Exceptional. High profit, low drawdown, strong risk-adjusted returns.</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#22c55e;font-weight:600;">A</td><td style="padding:8px;color:#e2e8f0;">500 - 1000</td><td style="padding:8px;color:#94a3b8;">Excellent. Solid profitability with controlled risk.</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#86efac;font-weight:600;">B+</td><td style="padding:8px;color:#e2e8f0;">200 - 500</td><td style="padding:8px;color:#94a3b8;">Good. Profitable but drawdowns could be tighter.</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#fbbf24;font-weight:600;">B</td><td style="padding:8px;color:#e2e8f0;">100 - 200</td><td style="padding:8px;color:#94a3b8;">Average. Profitability exists but risk management needs work.</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#f97316;font-weight:600;">C</td><td style="padding:8px;color:#e2e8f0;">50 - 100</td><td style="padding:8px;color:#94a3b8;">Below average. Either low profit or high drawdown.</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#ef4444;font-weight:600;">D</td><td style="padding:8px;color:#e2e8f0;">10 - 50</td><td style="padding:8px;color:#94a3b8;">Poor. Significant risk-adjusted losses.</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#ef4444;font-weight:600;">F</td><td style="padding:8px;color:#e2e8f0;">< 10</td><td style="padding:8px;color:#94a3b8;">Failing. Negative or minimal returns with high risk.</td></tr>`);
  html.push(`</tbody></table></div>`);

  html.push(equityCurveChart(equityCurve));

  html.push(scoreHistory(closed));

  html.push(improvementSuggestions(score, profitFactor, winRate, maxDrawdown, netProfit, recoveryFactor));

  html.push(alternativeScoreSection(netProfit, maxDrawdown, profitFactor, winRate, losingTrades, avgLoss, altScore));

  return { title: 'Bot Score Analysis', description: 'Composite bot performance score based on Net Profit, Profit Factor, Recovery Factor, and Max Drawdown.', html: html.join(''), category: 'Bot Performance' };
}

function getGrade(score, profitFactor, winRate, maxDrawdown, netProfit) {
  if (score > 1000) return 'A+';
  if (score > 500) return 'A';
  if (score > 200) return 'B+';
  if (score > 100) return 'B';
  if (score > 50) return 'C';
  if (score > 10) return 'D';
  return 'F';
}

function gradeColor(grade) {
  const colors = {
    'A+': '#22c55e',
    'A': '#22c55e',
    'B+': '#86efac',
    'B': '#fbbf24',
    'C': '#f97316',
    'D': '#ef4444',
    'F': '#ef4444',
  };
  return colors[grade] || '#94a3b8';
}

function equityCurveChart(curve) {
  const w = 960, h = 300, pad = 40;
  const minCum = Math.min(...curve.map(c => c.cum), 0);
  const maxCum = Math.max(...curve.map(c => c.cum), 0);
  const maxDd = Math.max(...curve.map(c => c.dd), 0);
  const yMin = minCum - maxDd * 0.1;
  const yMax = maxCum + maxDd * 0.1;
  const range = yMax - yMin || 1;
  const sx = (i) => pad + (i / Math.max(1, curve.length - 1)) * (w - pad * 2);
  const sy = (v) => pad + ((yMax - v) / range) * (h - pad * 2);

  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:240px;">`;
  svg += `<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`;

  let areaPath = `M ${sx(0)} ${sy(curve[0].peak)}`;
  for (let i = 1; i < curve.length; i++) {
    areaPath += ` L ${sx(i)} ${sy(curve[i].peak)}`;
  }
  areaPath += ` L ${sx(curve.length - 1)} ${sy(curve[curve.length - 1].cum)} Z`;
  svg += `<path d="${areaPath}" fill="#ef4444" opacity="0.15" />`;

  let eqPath = `M ${sx(0)} ${sy(curve[0].cum)}`;
  for (let i = 1; i < curve.length; i++) {
    eqPath += ` L ${sx(i)} ${sy(curve[i].cum)}`;
  }
  svg += `<path d="${eqPath}" fill="none" stroke="#38bdf8" stroke-width="2" />`;
  svg += `<text x="${w/2}" y="${h - 10}" fill="#94a3b8" font-size="11" text-anchor="middle">Trade Index</text>`;
  svg += `<text x="14" y="${h/2}" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 ${h/2})">Cumulative P&L ($)</text>`;
  svg += `</svg>`;

  const html = [];
  html.push(`<div class="report-body"><h3>Equity Curve with Drawdowns</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Cumulative P&L showing maximum drawdown depth.</p>`);
  html.push(svg);
  html.push(`</div>`);

  return html.join('');
}

function scoreHistory(closed) {
  const monthMap = {};
  for (const t of closed) {
    const d = new Date(Number(t.time));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { trades: [], total: 0, grossWin: 0, grossLoss: 0 };
    const p = Number(t.grossProfit) || 0;
    monthMap[key].trades.push(p);
    monthMap[key].total += p;
    if (p > 0) monthMap[key].grossWin += p;
    if (p < 0) monthMap[key].grossLoss += Math.abs(p);
  }

  const months = Object.keys(monthMap).sort();
  if (months.length < 2) return '';

  const scores = [];
  let cum = 0, peak = 0, maxDd = 0;
  const cumCurve = [];

  for (const m of months) {
    cum += monthMap[m].total;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    maxDd = Math.max(maxDd, dd);
    cumCurve.push({ month: m, cum, dd });

    const net = cum;
    const pf = monthMap[m].grossLoss > 0 ? monthMap[m].grossWin / monthMap[m].grossLoss : 0;
    const rf = maxDd > 0 ? net / maxDd : 0;
    const s = maxDd > 0 ? net * pf * rf / maxDd : 0;
    scores.push({ month: m, score: s, net, pf, rf, maxDd });
  }

  const maxScore = Math.max(...scores.map(s => s.score), 1);
  const barW = Math.max(20, (900 / scores.length) * 0.7);

  let svg = `<svg viewBox="0 0 960 300" style="width:100%;height:auto;min-height:240px;">`;
  svg += `<line x1="60" y1="260" x2="940" y2="260" stroke="#475569" />`;
  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    const barH = (s.score / maxScore) * 220;
    const x = 60 + (i / Math.max(1, scores.length - 1)) * 880;
    const y = 260 - barH;
    const color = s.score >= 200 ? '#22c55e' : s.score >= 100 ? '#fbbf24' : s.score >= 50 ? '#f97316' : '#ef4444';
    svg += `<rect x="${x - barW/2}" y="${y}" width="${barW}" height="${barH}" fill="${color}" rx="2" />`;
    svg += `<text x="${x}" y="280" fill="#94a3b8" font-size="9" text-anchor="middle">${s.month.slice(2)}</text>`;
  }
  svg += `<text x="480" y="295" fill="#94a3b8" font-size="11" text-anchor="middle">Month</text>`;
  svg += `<text x="14" y="150" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 150)">Bot Score</text>`;
  svg += `</svg>`;

  const html = [];
  html.push(`<div class="report-body"><h3>Score History by Month</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">How your bot score evolved over time. Green = strong, Red = weak.</p>`);
  html.push(svg);
  html.push(`</div>`);

  return html.join('');
}

function improvementSuggestions(score, profitFactor, winRate, maxDrawdown, netProfit, recoveryFactor) {
  const suggestions = [];
  const html = [];

  if (profitFactor < 1.5) {
    suggestions.push({ metric: 'Profit Factor', value: profitFactor.toFixed(2), target: '> 1.5', advice: 'Increase win size or reduce average loss. Review exit logic to let winners run.' });
  }
  if (winRate < 45) {
    suggestions.push({ metric: 'Win Rate', value: winRate.toFixed(1) + '%', target: '> 45%', advice: 'Filter entries more strictly. Avoid trading during low-probability setups.' });
  }
  if (recoveryFactor < 1) {
    suggestions.push({ metric: 'Recovery Factor', value: recoveryFactor.toFixed(2), target: '> 1.0', advice: 'Reduce position size or tighten stops. Recovery factor below 1 means drawdowns exceed net profit.' });
  }
  if (maxDrawdown > Math.abs(netProfit) * 0.5 && netProfit > 0) {
    suggestions.push({ metric: 'Max Drawdown', value: '$' + maxDrawdown.toFixed(2), target: '< 50% of net profit', advice: 'Drawdown is too deep relative to profit. Add tighter stop-loss or reduce exposure during volatile periods.' });
  }
  if (netProfit <= 0) {
    suggestions.push({ metric: 'Net Profit', value: '$' + netProfit.toFixed(2), target: 'Positive', advice: 'Strategy is losing money overall. Review entry/exit logic and consider reducing trade frequency.' });
  }

  if (!suggestions.length) {
    suggestions.push({ metric: 'Overall', value: 'Good', target: 'Maintain', advice: 'All key metrics are healthy. Focus on consistency and gradual optimization.' });
  }

  html.push(`<div class="report-body"><h3>Improvement Recommendations</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Data-driven suggestions to improve your bot score.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Metric</th><th style="padding:8px;text-align:right">Current</th><th style="padding:8px;text-align:right">Target</th><th style="padding:8px;text-align:left">Recommendation</th></tr></thead><tbody>`);
  for (const s of suggestions) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">${s.metric}</td><td style="padding:8px;text-align:right;color:#fbbf24;">${s.value}</td><td style="padding:8px;text-align:right;color:#22c55e;">${s.target}</td><td style="padding:8px;color:#94a3b8;">${s.advice}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return html.join('');
}

function alternativeScoreSection(netProfit, maxDrawdown, profitFactor, winRate, losingTrades, avgLoss, altScore) {
  const html = [];
  html.push(`<div class="report-body"><h3>Alternative Score Calculation</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">A simpler linear scoring model for quick bot evaluation.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Component</th><th style="padding:8px;text-align:right">Value</th><th style="padding:8px;text-align:right">Weight</th><th style="padding:8px;text-align:right">Contribution</th></tr></thead><tbody>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Net Profit</td><td style="padding:8px;text-align:right;color:${netProfit >= 0 ? '#22c55e' : '#ef4444'};">$${netProfit.toFixed(2)}</td><td style="padding:8px;text-align:right;color:#94a3b8;">+1.0</td><td style="padding:8px;text-align:right;color:#22c55e;">+${netProfit.toFixed(2)}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Max Drawdown</td><td style="padding:8px;text-align:right;color:#ef4444;">$${maxDrawdown.toFixed(2)}</td><td style="padding:8px;text-align:right;color:#94a3b8;">-3.0</td><td style="padding:8px;text-align:right;color:#ef4444;">-${(maxDrawdown * 3).toFixed(2)}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Profit Factor</td><td style="padding:8px;text-align:right;">${profitFactor.toFixed(2)}</td><td style="padding:8px;text-align:right;color:#94a3b8;">+500</td><td style="padding:8px;text-align:right;color:#22c55e;">+${(profitFactor * 500).toFixed(2)}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Win Rate</td><td style="padding:8px;text-align:right;">${winRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:#94a3b8;">+20</td><td style="padding:8px;text-align:right;color:#22c55e;">+${(winRate * 20).toFixed(2)}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Losing Trades</td><td style="padding:8px;text-align:right;color:#ef4444;">${losingTrades}</td><td style="padding:8px;text-align:right;color:#94a3b8;">-10</td><td style="padding:8px;text-align:right;color:#ef4444;">-${(losingTrades * 10).toFixed(2)}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Average Loss</td><td style="padding:8px;text-align:right;color:#ef4444;">$${avgLoss.toFixed(2)}</td><td style="padding:8px;text-align:right;color:#94a3b8;">-2</td><td style="padding:8px;text-align:right;color:#ef4444;">-${(avgLoss * 2).toFixed(2)}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">Alternative Score</td><td style="padding:8px;text-align:right;"></td><td style="padding:8px;text-align:right;"></td><td style="padding:8px;text-align:right;color:#fbbf24;font-weight:700;">${altScore.toFixed(2)}</td></tr>`);
  html.push(`</tbody></table>`);

  const altGrade = altScore > 1000 ? 'A+' : altScore > 500 ? 'A' : altScore > 200 ? 'B+' : altScore > 100 ? 'B' : altScore > 50 ? 'C' : altScore > 10 ? 'D' : 'F';
  html.push(`<p style="color:#94a3b8;font-size:13px;margin-top:8px;">Alternative Grade: <span style="color:${gradeColor(altGrade)};font-weight:600;">${altGrade}</span> <span style="color:#94a3b8;font-size:11px;">(same scale as primary score)</span></p>`);
  html.push(`</div>`);

  return html.join('');
}
