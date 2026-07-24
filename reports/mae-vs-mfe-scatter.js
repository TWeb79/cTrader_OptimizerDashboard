export default async function maeVsMfeScatter(events) {
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

    const entry = Number(create.entryPrice);
    const exit = Number(close.closePrice);
    const sl = close.sl;
    const tp = close.tp;
    const profit = Number(close.grossProfit) || 0;
    const type = close.type;
    const volume = Number(close.volume) || 0;

    let minEquity = Infinity;
    let maxEquity = -Infinity;
    for (const ev of evts) {
      const eq = Number(ev.equity);
      if (!isNaN(eq)) {
        if (eq < minEquity) minEquity = eq;
        if (eq > maxEquity) maxEquity = eq;
      }
    }
    const entryEquity = Number(create.equity) || minEquity;
    const mae = entryEquity > 0 ? Math.max(0, entryEquity - minEquity) : 0;
    const mfe = maxEquity - (entryEquity || maxEquity);
    const mfePrice = type === 'Buy' ? mfe / entry : mfe / entry * -1;
    const maePrice = type === 'Buy' ? mae / entry : mae / entry * -1;

    trades.push({
      positionId: pid,
      type,
      profit,
      volume,
      mae: maePrice,
      mfe: mfePrice,
      actualOutcome: profit,
    });
  }

  if (!trades.length) {
    return { title: 'MAE vs MFE Scatter', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>', category: 'Risk & Loss Analysis' };
  }

  const html = [];
  html.push(`<div class="report-header"><h2>MAE vs MFE Scatter</h2><p>Maximum Adverse Excursion vs Maximum Favorable Excursion per trade. Reveals whether exits are premature or late.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:140px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const avgMAE = trades.reduce((a, t) => a + t.mae, 0) / trades.length;
  const avgMFE = trades.reduce((a, t) => a + t.mfe, 0) / trades.length;
  const avgRR = avgMFE > 0 && avgMAE > 0 ? avgMFE / avgMAE : 0;

  const kpis = [
    ['Avg MAE', (avgMAE * 100).toFixed(1) + '%'],
    ['Avg MFE', (avgMFE * 100).toFixed(1) + '%'],
    ['Avg R:R', avgRR.toFixed(2) + ':1'],
    ['Trades', String(trades.length)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>MAE vs MFE Scatter</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Each point is a trade. X = MFE, Y = MAE. Green = winner, Red = loser.</p>`);
  html.push(scatterChart(trades));
  html.push(`</div>`);

  html.push(`<div class="report-body"><h3>Interpretation Guide</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">What the scatter reveals about exit timing.</p>`);
  html.push(`<ul style="color:#e2e8f0;font-size:13px;line-height:1.6;margin-left:20px;">
    <li><strong>Points near top-left:</strong> High MAE, low MFE — stopped out quickly before capturing gains.</li>
    <li><strong>Points near bottom-right:</strong> Low MAE, high MFE — let winners run, good reward-to-risk.</li>
    <li><strong>Points scattered right:</strong> Consistent MFE regardless of MAE — strategy may scale out early.</li>
    <li><strong>Vertical clusters:</strong> Similar MAE across trades — consistent stop placement.</li>
  </ul>`);
  html.push(`</div>`);

  return { title: 'MAE vs MFE Scatter', description: 'Maximum Adverse vs Favorable Excursion analysis to evaluate exit timing.', html: html.join(''), category: 'Risk & Loss Analysis' };
}

function scatterChart(trades) {
  const w = 800, h = 500, pad = 60;
  const maeVals = trades.map(t => Math.abs(t.mae)).filter(v => v > 0);
  const mfeVals = trades.map(t => Math.abs(t.mfe)).filter(v => v > 0);
  const minMae = Math.min(...maeVals, 0);
  const maxMae = Math.max(...maeVals, 0.1);
  const minMfe = Math.min(...mfeVals, 0);
  const maxMfe = Math.max(...mfeVals, 0.1);

  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:400px;">`;
  svg += `<rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" fill="none" stroke="#334155" rx="8" />`;
  svg += `<line x1="${pad}" y1="${h / 2}" x2="${w - pad}" y2="${h / 2}" stroke="#475569" stroke-dasharray="2" />`;
  svg += `<line x1="${w / 2}" y1="${pad}" x2="${w / 2}" y2="${h - pad}" stroke="#475569" stroke-dasharray="2" />`;
  svg += `<text x="${w / 2}" y="${h - 12}" fill="#94a3b8" font-size="13" text-anchor="middle">MFE (%)</text>`;
  svg += `<text x="16" y="${h / 2}" fill="#94a3b8" font-size="13" text-anchor="middle" transform="rotate(-90 16 ${h / 2})">MAE (%)</text>`;

  for (const t of trades) {
    const x = pad + ((Math.abs(t.mfe) - minMfe) / (maxMfe - minMfe || 1)) * (w - pad * 2);
    const y = (h - pad) - ((Math.abs(t.mae) - minMae) / (maxMae - minMae || 1)) * (h - pad * 2);
    const color = t.actualOutcome >= 0 ? '#22c55e' : '#ef4444';
    const r = Math.max(3, Math.min(8, Math.sqrt(t.volume || 1) * 1.5));
    svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="0.7" />`;
  }
  svg += '</svg>';
  return svg;
}