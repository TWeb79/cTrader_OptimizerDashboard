export default async function timeAnalysis(events) {
  const trades = [];
  const pos = {};
  for (const e of events) {
    const ev = String(e.event || '');
    if (ev === 'Create Position') {
      pos[String(e.positionId)] = { ...e, enter: Number(e.time) };
    } else if (ev === 'Stop Loss Hit' && e.closePrice != null) {
      const p = pos[String(e.positionId)];
      if (p && !p.exit) {
        p.exit = Number(e.time);
        p.profit = Number(e.grossProfit) || 0;
        trades.push(p);
      }
    }
  }
  if (!trades.length) return { title: 'Time Analysis', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };

  const lossProfits = trades.filter(t => t.profit < 0).map(t => Math.abs(t.profit));
  const avgLoss = lossProfits.length ? lossProfits.reduce((a, b) => a + b, 0) / lossProfits.length : 1;
  const toR = (v) => v / avgLoss;

  for (const t of trades) {
    t.r = toR(t.profit);
    t.dur = Math.max(1, Math.round((t.exit - t.enter) / 60000));
    const d = new Date(t.enter);
    t.minOfDay = d.getHours() * 60 + d.getMinutes();
    t.hour = d.getHours();
    t.weekday = d.getDay();
    t.exitMin = new Date(t.exit).getHours() * 60 + new Date(t.exit).getMinutes();
  }

  const sum = (arr, k) => arr.reduce((a, t) => a + t[k], 0);
  const pf = sum(trades, 'profit');
  const grossProfit = sum(trades.filter(t => t.profit > 0), 'profit');
  const grossLoss = Math.abs(sum(trades.filter(t => t.profit < 0), 'profit'));
  const profitFactor = grossLoss ? grossProfit / grossLoss : 0;
  const winRate = trades.filter(t => t.profit > 0).length / trades.length * 100;
  const avgR = trades.reduce((a, t) => a + t.r, 0) / trades.length;
  const avgDur = trades.reduce((a, t) => a + t.dur, 0) / trades.length;
  const expectancy = avgR;

  let cum = 0, peak = 0, maxDd = 0;
  for (const t of trades.sort((a, b) => a.enter - b.enter)) {
    cum += t.r;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDd) maxDd = dd;
  }

  const bucket15 = (min) => Math.floor(min / 15) * 15;
  const startBuckets = {};
  for (const t of trades) {
    const b = bucket15(t.minOfDay);
    if (!startBuckets[b]) startBuckets[b] = [];
    startBuckets[b].push(t);
  }
  const sortedStart = Object.keys(startBuckets).map(Number).sort((a, b) => a - b);
  let bestWindow = '', worstWindow = '', bestAvgR = -Infinity, worstAvgR = Infinity;
  for (const b of sortedStart) {
    const avg = startBuckets[b].reduce((a, t) => a + t.r, 0) / startBuckets[b].length;
    if (avg > bestAvgR) { bestAvgR = avg; bestWindow = `${pad(b)}-${pad(b+14)}`; }
    if (avg < worstAvgR) { worstAvgR = avg; worstWindow = `${pad(b)}-${pad(b+14)}`; }
  }
  function pad(m) { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }

  const html = [];
  html.push(`<div class="report-header"><h2>Time Analysis</h2><p>At what times of the day do you consistently make or lose money?</p></div>`);

  // 1. Executive Summary
  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:140px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';
  const kpis = [[cardStyle, 'Total Trades', String(trades.length)], ['Win Rate', winRate.toFixed(1)+'%'], ['Average R', avgR.toFixed(2)], ['Profit Factor', profitFactor.toFixed(2)], ['Best Window', bestWindow], ['Worst Window', worstWindow], ['Avg Hold', avgDur.toFixed(0)+'m'], ['Max Drawdown', '-'+maxDd.toFixed(1)+'R']];
  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0].length>10?k[0].replace(cardStyle,'').trim():k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  // Helper: svg histogram
  function histSvg(values, labels, color) {
    const w = 1000, h = 260, pad = 40;
    const barW = Math.max(4, (w - pad * 2) / values.length - 2);
    const max = Math.max(...values, 1);
    let s = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:220px;">`;
    s += `<line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="#475569" />`;
    for (let i = 0; i < values.length; i++) {
      const x = pad + i * (barW + 2);
      const bh = (values[i] / max) * (h - pad * 2);
      s += `<rect x="${x}" y="${h-pad-bh}" width="${barW}" height="${bh}" fill="${color}" rx="1" />`;
    }
    s += `</svg>`;
    return s;
  }

  // 2. Activity Timeline (15-min started and closed)
  const started = [], closedArr = [];
  for (let m = 0; m < 1440; m += 15) {
    started.push(trades.filter(t => bucket15(t.minOfDay) === m).length);
    closedArr.push(trades.filter(t => bucket15(t.exitMin) === m).length);
  }
  const labels15 = started.map((_, i) => pad(i * 15));
  html.push(`<div class="report-body"><h3>Trading Activity Timeline</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Trades started and closed per 15-minute interval.</p>`);
  html.push(histSvg(started, labels15, '#38bdf8').replace('</svg>', '<rect x="0" y="0" width="0" height="0" fill="none" /><text x="8" y="20" fill="#94a3b8" font-size="11">Started</text></svg>'));
  html.push(histSvg(closedArr, labels15, '#22c55e').replace('</svg>', '<rect x="0" y="0" width="0" height="0" fill="none" /><text x="8" y="20" fill="#94a3b8" font-size="11">Closed</text></svg>'));
  html.push(`</div>`);

  // 3. Performance by Start Time (15-min buckets)
  function perfTable(bucketMap) {
    const rows = Object.keys(bucketMap).map(Number).sort((a,b)=>a-b).map(m => {
      const ts = bucketMap[m];
      const wins = ts.filter(t => t.profit > 0).length;
      const pnl = sum(ts, 'profit');
      const avgR = ts.length ? ts.reduce((a,t)=>a+t.r,0)/ts.length : 0;
      const pf = grossLossIn(ts);
      return { window: `${pad(m)}-${pad(m+14)}`, count: ts.length, win: (wins/ts.length*100).toFixed(0), r: avgR.toFixed(2), pnl: pnl.toFixed(1), pf };
    });
    let t = `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Window</th><th style="padding:8px;text-align:right;">Trades</th><th style="padding:8px;text-align:right;">Win %</th><th style="padding:8px;text-align:right;">Avg R</th><th style="padding:8px;text-align:right;">Profit</th><th style="padding:8px;text-align:right;">PF</th></tr></thead><tbody>`;
    for (const r of rows) {
      const color = r.r >= 0.3 ? '#22c55e' : r.r >= 0 ? '#fbbf24' : '#ef4444';
      t += `<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#94a3b8;">${r.window}</td><td style="padding:8px;text-align:right;">${r.count}</td><td style="padding:8px;text-align:right;">${r.win}%</td><td style="padding:8px;text-align:right;color:${color};">${r.r}</td><td style="padding:8px;text-align:right;">${Number(r.pnl)>=0?'+':''}${r.pnl}</td><td style="padding:8px;text-align:right;">${r.pf.toFixed(2)}</td></tr>`;
    }
    t += `</tbody></table>`;
    return t;
  }
  function grossLossIn(arr) {
    const loss = arr.filter(t => t.profit < 0).reduce((a, t) => a + t.profit, 0);
    const gain = arr.filter(t => t.profit > 0).reduce((a, t) => a + t.profit, 0);
    return loss ? gain / Math.abs(loss) : 0;
  }
  html.push(`<div class="report-body"><h3>Performance by Start Time</h3>`);
  html.push(perfTable(startBuckets));
  html.push(`</div>`);

  // 4. Performance by Exit Time
  const exitBuckets = {};
  for (const t of trades) {
    const b = bucket15(t.exitMin);
    if (!exitBuckets[b]) exitBuckets[b] = [];
    exitBuckets[b].push(t);
  }
  html.push(`<div class="report-body"><h3>Performance by Exit Time</h3>`);
  html.push(perfTable(exitBuckets));
  html.push(`</div>`);

  // 5. Start Time × Holding Time Heatmap
  const durBuckets = [0, 5, 10, 20, 40, 60, 9999];
  const durLabels = ['<5m', '5-10m', '10-20m', '20-40m', '40-60m', '60m+'];
  const heatData = {};
  for (const t of trades) {
    let di = durBuckets.findIndex((v, i, a) => t.dur >= v && t.dur < a[i+1]);
    if (di < 0) di = durBuckets.length - 2;
    const key = `${bucket15(t.minOfDay)}_${di}`;
    if (!heatData[key]) heatData[key] = [];
    heatData[key].push(t.r);
  }
  const hv = Object.values(heatData).map(arr => arr.reduce((a,b)=>a+b,0)/arr.length);
  const hmin = Math.min(...hv, -0.5), hmax = Math.max(...hv, 0.5);
  const heatColor = (v) => {
    if (hmax === hmin) return '#334155';
    const t = (v - hmin) / (hmax - hmin);
    return t >= 0.5 ? `rgb(${Math.round(34+(251-34)*(t-0.5)*2)},${Math.round(197+(191-197)*(t-0.5)*2)},${Math.round(94+(36-94)*(t-0.5)*2)})` : `rgb(${Math.round(239+(251-239)*t*2)},${Math.round(68+(191-68)*t*2)},${Math.round(68+(36-68)*t*2)})`;
  };
  const activeStartBuckets = Object.keys(startBuckets).map(Number).sort((a,b)=>a-b);
  let heatHtml = `<table style="border-collapse:collapse;font-size:12px;margin-top:8px;"><thead><tr><th style="padding:6px;background:#1e293b;color:#94a3b8;">Holding\\ Start</th>`;
  for (const b of activeStartBuckets) heatHtml += `<th style="padding:6px;background:#1e293b;color:#94a3b8;">${pad(b)}</th>`;
  heatHtml += `</tr></thead><tbody>`;
  for (let di = 0; di < durLabels.length; di++) {
    heatHtml += `<tr><th style="padding:6px;background:#1e293b;color:#94a3b8;text-align:right;">${durLabels[di]}</th>`;
    for (const b of activeStartBuckets) {
      const key = `${b}_${di}`;
      const arr = heatData[key];
      const val = arr ? arr.reduce((a,x)=>a+x,0)/arr.length : null;
      if (val != null) heatHtml += `<td style="padding:6px;background:${heatColor(val)};color:#e2e8f0;text-align:center;">${val.toFixed(2)}</td>`;
      else heatHtml += `<td style="padding:6px;background:#0f172a;color:#475569;text-align:center;">-</td>`;
    }
    heatHtml += `</tr>`;
  }
  heatHtml += `</tbody></table>`;
  html.push(`<div class="report-body"><h3>Start Time × Holding Time Heatmap</h3><p style="color:#94a3b8;font-size:13px;">Average R by start time bucket and holding duration.</p>${heatHtml}</div>`);

  // 6. Time-of-Day Equity Curve
  const sorted = [...trades].sort((a, b) => a.enter - b.enter);
  let eqPath = '', areaPath = '';
  if (sorted.length) {
    const minT = sorted[0].enter, maxT = sorted[sorted.length-1].enter;
    const sx = (t) => 40 + ((t.enter - minT)/(maxT-minT||1)) * 960;
    const sy = (r) => 260 - ((r - (Math.min(...sorted.map(t=>t.r))-1)) / ((Math.max(...sorted.map(t=>t.r))+1) - (Math.min(...sorted.map(t=>t.r))-1) || 1)) * 220;
    eqPath = `M ${sx(sorted[0])} ${sy(0)}` + sorted.map(t => ` L ${sx(t)} ${sy(t.r)}`).join('');
    let cumR = 0, cumArr = [];
    for (const t of sorted) { cumR += t.r; cumArr.push({ x: sx(t), y: sy(cumR) }); }
    areaPath = `M ${cumArr[0].x} ${260} ` + cumArr.map(p => `L ${p.x} ${p.y}`).join('') + ` L ${cumArr[cumArr.length-1].x} 260 Z`;
  }
  html.push(`<div class="report-body"><h3>Time-of-Day Equity Curve</h3><p style="color:#94a3b8;font-size:13px;">Cumulative R throughout the trading day.</p>`);
  html.push(`<svg viewBox="0 0 1000 300" style="width:100%;height:auto;min-height:240px;"><line x1="40" y1="260" x2="980" y2="260" stroke="#475569" /><path d="${areaPath}" fill="#ef4444" opacity="0.15" /><path d="${eqPath}" fill="none" stroke="#38bdf8" stroke-width="2" /></svg>`);
  html.push(`</div>`);

  // 7. Hourly Statistics
  const hourBuckets = {};
  for (const t of trades) {
    if (!hourBuckets[t.hour]) hourBuckets[t.hour] = [];
    hourBuckets[t.hour].push(t);
  }
  const hourRows = Object.keys(hourBuckets).map(Number).sort((a,b)=>a-b).map(h => {
    const ts = hourBuckets[h];
    const wins = ts.filter(t => t.profit > 0).length;
    const avgR = ts.reduce((a,t)=>a+t.r,0)/ts.length;
    const exp = avgR;
    return { hour: pad(h*60).slice(0,2), trades: ts.length, win: (wins/ts.length*100).toFixed(0), r: avgR.toFixed(2), exp: exp.toFixed(2) };
  });
  html.push(`<div class="report-body"><h3>Hourly Statistics</h3>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Hour</th><th style="padding:8px;text-align:right;">Trades</th><th style="padding:8px;text-align:right;">Win %</th><th style="padding:8px;text-align:right;">Avg R</th><th style="padding:8px;text-align:right;">Expectancy</th></tr></thead><tbody>`);
  for (const r of hourRows) {
    const c = r.r >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#94a3b8;">${r.hour}</td><td style="padding:8px;text-align:right;">${r.trades}</td><td style="padding:8px;text-align:right;">${r.win}%</td><td style="padding:8px;text-align:right;color:${c};">${r.r}</td><td style="padding:8px;text-align:right;">${Number(r.exp)>=0?'+':''}${r.exp}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  // 8. Weekday × Time Heatmap
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const wdHeat = {};
  for (const t of trades) {
    const key = `${t.weekday}_${t.hour}`;
    if (!wdHeat[key]) wdHeat[key] = [];
    wdHeat[key].push(t.r);
  }
  const wvv = Object.values(wdHeat).map(arr => arr.reduce((a,b)=>a+b,0)/arr.length);
  const wmin = Math.min(...wvv, -0.5), wmax = Math.max(...wvv, 0.5);
  html.push(`<div class="report-body"><h3>Weekday × Hour Heatmap</h3>`);
  html.push(`<table style="border-collapse:collapse;font-size:12px;margin-top:8px;"><thead><tr><th style="padding:6px;background:#1e293b;color:#94a3b8;"></th>`);
  for (let h = 0; h < 24; h++) html.push(`<th style="padding:6px;background:#1e293b;color:#94a3b8;">${String(h).padStart(2,'0')}</th>`);
  html.push(`</tr></thead><tbody>`);
  for (let d = 0; d < 7; d++) {
    html.push(`<tr><th style="padding:6px;background:#1e293b;color:#94a3b8;text-align:right;">${dayNames[d]}</th>`);
    for (let h = 0; h < 24; h++) {
      const key = `${d}_${h}`;
      const arr = wdHeat[key];
      if (arr) {
        const v = arr.reduce((a,x)=>a+x,0)/arr.length;
        const t = wmax===wmin ? 0.5 : (v-wmin)/(wmax-wmin);
        const c = t >= 0.5 ? `rgb(${Math.round(34+(251-34)*(t-0.5)*2)},${Math.round(197+(191-197)*(t-0.5)*2)},${Math.round(94+(36-94)*(t-0.5)*2)})` : `rgb(${Math.round(239+(251-239)*t*2)},${Math.round(68+(191-68)*t*2)},${Math.round(68+(36-68)*t*2)})`;
        html.push(`<td style="padding:6px;background:${c};color:#e2e8f0;text-align:center;">${v.toFixed(1)}</td>`);
      } else html.push(`<td style="padding:6px;background:#0f172a;color:#475569;text-align:center;">-</td>`);
    }
    html.push(`</tr>`);
  }
  html.push(`</tbody></table></div>`);

  // 9. Best vs Worst Windows
  function rankedTable(items, title) {
    let t = `<h3>${title}</h3><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Rank</th><th style="padding:8px;text-align:left;">Window</th><th style="padding:8px;text-align:right;">Trades</th><th style="padding:8px;text-align:right;">Avg R</th></tr></thead><tbody>`;
    for (let i = 0; i < items.length; i++) {
      const r = items[i];
      const c = r.avg >= 0 ? '#22c55e' : '#ef4444';
      t += `<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#94a3b8;">${i+1}</td><td style="padding:8px;">${r.window}</td><td style="padding:8px;text-align:right;">${r.count}</td><td style="padding:8px;text-align:right;color:${c};">${r.avg.toFixed(2)}</td></tr>`;
    }
    t += `</tbody></table>`;
    return t;
  }
  const ranked = sortedStart.map(m => ({ window: `${pad(m)}-${pad(m+14)}`, count: startBuckets[m].length, avg: startBuckets[m].reduce((a,t)=>a+t.r,0)/startBuckets[m].length })).sort((a,b)=>b.avg-a.avg);
  html.push(`<div class="report-body">`);
  html.push(rankedTable(ranked.slice(0,5), 'Best Time Windows'));
  html.push(rankedTable([...ranked].sort((a,b)=>a.avg-b.avg).slice(0,5), 'Worst Time Windows'));
  html.push(`</div>`);

  // 10. No-Trade Zones
  const noTrade = ranked.filter(r => r.count >= 25 && (r.avg < 0 || r.count >= 25));
  // Actually apply rules: min 25 trades AND (PF < 0.9 OR expectancy < 0 OR winRate < 45%)
  const badWindows = ranked.filter(r => {
    const ts = startBuckets[r.window.split('-')[0] ? parseInt(r.window.split(':')[0])*60+parseInt(r.window.split(':')[1]) : 0];
    // Reconstruct key from window
    const parts = r.window.split('-');
    const mins = parseInt(parts[0].split(':')[0])*60 + parseInt(parts[0].split(':')[1]);
    const arr = startBuckets[mins];
    if (!arr || arr.length < 25) return false;
    const wr = arr.filter(t=>t.profit>0).length/arr.length*100;
    const exp = arr.reduce((a,t)=>a+t.r,0)/arr.length;
    const pf = grossLossIn(arr);
    return pf < 0.9 || exp < 0 || wr < 45;
  });
  html.push(`<div class="report-body"><h3>Automatic No-Trade Zones</h3>`);
  if (badWindows.length) {
    html.push(`<p style="color:#fbbf24;font-size:13px;margin-bottom:8px;">Recommended windows to avoid (min 25 trades, PF < 0.9 or expectancy < 0 or win rate < 45%):</p>`);
    html.push(`<ul style="color:#e2e8f0;font-size:13px;line-height:1.6;">`);
    for (const r of badWindows) {
      const parts = r.window.split('-');
      const mins = parseInt(parts[0].split(':')[0])*60 + parseInt(parts[0].split(':')[1]);
      const arr = startBuckets[mins];
      const wr = arr.filter(t=>t.profit>0).length/arr.length*100;
      const exp = arr.reduce((a,t)=>a+t.r,0)/arr.length;
      const pf = grossLossIn(arr);
      html.push(`<li><strong>${r.window}</strong> — ${arr.length} trades, win rate ${wr.toFixed(0)}%, expectancy ${exp.toFixed(2)}R, PF ${pf.toFixed(2)}</li>`);
    }
    html.push(`</ul>`);
  } else {
    html.push(`<p style="color:#94a3b8;font-size:13px;">No windows met the no-trade criteria with 25+ trades.</p>`);
  }
  html.push(`</div>`);

  // 11. Trade Duration Analysis
  const durMap = {};
  for (const t of trades) {
    let di = durBuckets.findIndex((v, i, a) => t.dur >= v && t.dur < a[i+1]);
    if (di < 0) di = durBuckets.length - 2;
    if (!durMap[di]) durMap[di] = [];
    durMap[di].push(t);
  }
  html.push(`<div class="report-body"><h3>Trade Duration Analysis</h3>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Holding Time</th><th style="padding:8px;text-align:right;">Trades</th><th style="padding:8px;text-align:right;">Win %</th><th style="padding:8px;text-align:right;">Avg R</th><th style="padding:8px;text-align:right;">Profit</th></tr></thead><tbody>`);
  for (let i = 0; i < durLabels.length; i++) {
    const ts = durMap[i];
    if (!ts) continue;
    const wins = ts.filter(t=>t.profit>0).length;
    const avgR = ts.reduce((a,t)=>a+t.r,0)/ts.length;
    const pnl = sum(ts, 'profit');
    const c = avgR >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#94a3b8;">${durLabels[i]}</td><td style="padding:8px;text-align:right;">${ts.length}</td><td style="padding:8px;text-align:right;">${(wins/ts.length*100).toFixed(0)}%</td><td style="padding:8px;text-align:right;color:${c};">${avgR.toFixed(2)}</td><td style="padding:8px;text-align:right;">${Number(pnl)>=0?'+':''}${pnl.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'Time Analysis', description: 'At what times of the day do you consistently make or lose money?', html: html.join('') };
}
