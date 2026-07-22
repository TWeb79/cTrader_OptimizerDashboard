export default async function minutePerformance(events) {
  const posEvents = {};

  for (const e of events) {
    if (!posEvents[e.positionId]) posEvents[e.positionId] = [];
    posEvents[e.positionId].push(e);
  }

  const minuteStats = {};
  for (const pid of Object.keys(posEvents)) {
    const evts = posEvents[pid].sort((a, b) => Number(a.time) - Number(b.time));
    const create = evts[0];
    const close = evts[evts.length - 1];
    const entry = new Date(Number(create.time));
    const min = entry.getMinutes();
    const p = Number(close.grossProfit) || 0;
    const dur = Math.max(1, Math.round((Number(close.time) - Number(create.time)) / 60000));

    if (!minuteStats[min]) minuteStats[min] = { profits: [], durations: [], wins: 0, losses: 0, counts: 0, bigLosses: [] };
    minuteStats[min].profits.push(p);
    minuteStats[min].durations.push(dur);
    minuteStats[min].counts++;
    if (p > 0) minuteStats[min].wins++;
    if (p < 0) { minuteStats[min].losses++; minuteStats[min].bigLosses.push(Math.abs(p)); }
  }

  const html = [];
  html.push(`<div class="report-header"><h2>Minute Performance Analysis</h2><p>Aggregated statistics for every start minute of the hour (0-59). Shows whether the first minutes of an hour are safer or riskier than average.</p></div>`);

  const rows = [];
  let bestMin = 0, worstMin = 0, bestWR = 0, worstWR = 101;
  for (let m = 0; m < 60; m++) {
    const s = minuteStats[m];
    if (!s || !s.counts) continue;
    const wr = (s.wins / s.counts) * 100;
    const avg = s.profits.reduce((a, b) => a + b, 0) / s.profits.length;
    const median = s.profits.sort((a, b) => a - b)[Math.floor(s.profits.length / 2)];
    const avgDur = s.durations.reduce((a, b) => a + b, 0) / s.durations.length;
    const maxLoss = s.bigLosses.length ? Math.max(...s.bigLosses) : 0;
    rows.push({ min: m, count: s.counts, wr, avg, median, avgDur, maxLoss, losses: s.losses });
    if (wr > bestWR) { bestWR = wr; bestMin = m; }
    if (wr < worstWR) { worstWR = wr; worstMin = m; }
  }

  const summaryCards = [
    ['Best Minute', `${String(bestMin).padStart(2,'0')} (${bestWR.toFixed(0)}% WR)`],
    ['Worst Minute', `${String(worstMin).padStart(2,'0')} (${worstWR.toFixed(0)}% WR)`],
    ['Total Minutes Analyzed', String(rows.length)],
  ];
  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:160px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';
  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${summaryCards.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Win Rate by Start Minute</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">100% = perfect, below 80% = danger zone. The first 5 minutes are not uniformly bad; watch for spikes.</p>`);
  html.push(`<svg viewBox="0 0 960 260" style="width:100%;height:auto;min-height:220px;">`);
  html.push(`<line x1="40" y1="250" x2="940" y2="250" stroke="#475569" />`);
  html.push(`<line x1="40" y1="80" x2="940" y2="80" stroke="#ef4444" stroke-dasharray="3" opacity="0.3" /><text x="44" y="75" fill="#ef4444" font-size="10">80%</text>`);
  const barW = 10;
  for (const r of rows) {
    const x = 40 + (r.min / 59) * 900;
    const h = (r.wr / 100) * 200;
    const y = 250 - h;
    const color = r.wr < 80 ? '#ef4444' : r.wr < 90 ? '#fbbf24' : '#22c55e';
    html.push(`<rect x="${x - barW/2}" y="${y}" width="${barW}" height="${h}" fill="${color}" rx="1" />`);
    html.push(`<text x="${x}" y="265" fill="#94a3b8" font-size="9" text-anchor="middle">${String(r.min).padStart(2,'0')}</text>`);
  }
  html.push(`<text x="14" y="130" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 130)">Win Rate (%)</text>`);
  html.push(`</svg></div>`);

  html.push(`<div class="report-body"><h3>Average P&L by Start Minute</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Negative bars signal loss-making entry minutes. Watch for consistent drawdown clusters.</p>`);
  html.push(`<svg viewBox="0 0 960 260" style="width:100%;height:auto;min-height:220px;">`);
  html.push(`<line x1="40" y1="250" x2="940" y2="250" stroke="#475569" />`);
  const allAvgs = rows.map(r => r.avg);
  const maxAbsAvg = Math.max(...allAvgs.map(a => Math.abs(a)), 1);
  for (const r of rows) {
    const x = 40 + (r.min / 59) * 900;
    const h = (Math.abs(r.avg) / maxAbsAvg) * 180;
    const y = r.avg >= 0 ? 250 - h : 250;
    const color = r.avg >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<rect x="${x - barW/2}" y="${y}" width="${barW}" height="${h}" fill="${color}" rx="1" />`);
  }
  html.push(`<text x="14" y="130" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 130)">Avg P&L ($)</text>`);
  html.push(`</svg></div>`);

  html.push(`<div class="report-body"><h3>Detailed Minute Statistics</h3>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Min</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Win %</th><th style="padding:8px;text-align:right">Avg P&L</th><th style="padding:8px;text-align:right">Median</th><th style="padding:8px;text-align:right">Avg Dur</th><th style="padding:8px;text-align:right">Max Loss</th><th style="padding:8px;text-align:right">Losses</th></tr></thead><tbody>`);
  for (const r of rows) {
    const wc = r.wr >= 80 ? '#22c55e' : r.wr >= 60 ? '#fbbf24' : '#ef4444';
    const ac = r.avg >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${String(r.min).padStart(2,'0')}</td><td style="padding:8px;text-align:right">${r.count}</td><td style="padding:8px;text-align:right;color:${wc};">${r.wr.toFixed(0)}%</td><td style="padding:8px;text-align:right;color:${ac};">${r.avg.toFixed(1)}</td><td style="padding:8px;text-align:right">${r.median.toFixed(1)}</td><td style="padding:8px;text-align:right">${r.avgDur.toFixed(0)}m</td><td style="padding:8px;text-align:right;color:#ef4444;">${r.maxLoss.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#ef4444;">${r.losses}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Insight: Minutes to Skip?</h3>`);
  const dangerous = rows.filter(r => r.wr < 85 || r.avg < -20 || r.maxLoss > 500);
  if (dangerous.length) {
    html.push(`<p style="color:#fbbf24;font-size:13px;margin-bottom:8px;">Minutes with elevated risk (WR < 85%, avg P&L < -20, or single loss > $500):</p>`);
    html.push(`<ul style="color:#e2e8f0;font-size:13px;line-height:1.6;">`);
    for (const r of dangerous) {
      html.push(`<li><strong>${String(r.min).padStart(2,'0')}m</strong> — ${r.count} trades, WR ${r.wr.toFixed(0)}%, avg $=${r.avg.toFixed(1)}, max loss $=${r.maxLoss.toFixed(1)}</li>`);
    }
    html.push(`</ul>`);
  } else {
    html.push(`<p style="color:#22c55e;font-size:13px;">No dangerous minutes detected. All minutes have WR >= 85%, avg P&L >= -20, and max loss <= $500.</p>`);
  }
  html.push(`</div>`);

  return { title: 'Minute Performance Analysis', description: 'Trade statistics aggregated by start minute of the hour (0-59). Identifies the safest and riskiest minutes to enter trades.', html: html.join(''), category: 'Time & Scheduling' };
}
