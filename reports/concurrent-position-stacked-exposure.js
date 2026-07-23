export default async function concurrentPositionStackedExposure(events) {
  const positionEvents = {};
  for (const e of events) {
    if (!positionEvents[e.positionId]) positionEvents[e.positionId] = [];
    positionEvents[e.positionId].push(e);
  }

  const trades = [];
  for (const pid of Object.keys(positionEvents)) {
    const evts = positionEvents[pid].sort((a, b) => Number(a.time) - Number(b.time));
    const close = evts[evts.length - 1];
    if (!close || close.closePrice == null) continue;

    const create = evts[0];
    const start = Number(create.time);
    const end = Number(close.time);
    const volume = Number(close.volume) || 1;
    const profit = Number(close.grossProfit) || 0;

    trades.push({
      positionId: pid,
      type: close.type,
      start,
      end,
      volume,
      profit,
      notional: volume,
    });
  }

  if (!trades.length) {
    return { title: 'Concurrent Position / Stacked Exposure', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const overlaps = [];
  for (let i = 0; i < trades.length; i++) {
    for (let j = i + 1; j < trades.length; j++) {
      const a = trades[i];
      const b = trades[j];
      const overlapStart = Math.max(a.start, b.start);
      const overlapEnd = Math.min(a.end, b.end);
      if (overlapStart < overlapEnd) {
        overlaps.push({
          positionA: a.positionId,
          positionB: b.positionId,
          overlapMs: overlapEnd - overlapStart,
          overlapMin: Math.round((overlapEnd - overlapStart) / 60000),
          combinedNotional: a.notional + b.notional,
          profitA: a.profit,
          profitB: b.profit,
          bothLoss: a.profit < 0 && b.profit < 0,
        });
      }
    }
  }

  const overlapCount = overlaps.length;
  const correlatedLosses = overlaps.filter(o => o.bothLoss).length;
  const worstOverlaps = [...overlaps].sort((a, b) => b.combinedNotional - a.combinedNotional).slice(0, 20);

  const maxConcurrent = (() => {
    const points = [];
    for (const t of trades) {
      points.push({ time: t.start, delta: t.notional, trade: t });
      points.push({ time: t.end, delta: -t.notional, trade: t });
    }
    points.sort((a, b) => a.time - b.time);
    let running = 0;
    let max = 0;
    for (const p of points) {
      running += p.delta;
      if (running > max) max = running;
    }
    return max;
  })();

  const html = [];
  html.push(`<div class="report-header"><h2>Concurrent Position / Stacked Exposure</h2><p>Overlapping positions on the same instrument and whether stacked risk correlates with losses.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Total Positions', String(trades.length)],
    ['Overlapping Pairs', String(overlapCount)],
    ['Correlated Losses', String(correlatedLosses)],
    ['Max Concurrent Notional', maxConcurrent.toFixed(2)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Worst Overlapping Exposure (Top 20)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Overlapping position pairs with the highest combined notional exposure.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Position A</th><th style="padding:8px;text-align:left">Position B</th><th style="padding:8px;text-align:right">Overlap (min)</th><th style="padding:8px;text-align:right">Combined Notional</th><th style="padding:8px;text-align:right">P&L A</th><th style="padding:8px;text-align:right">P&L B</th><th style="padding:8px;text-align:right">Both Loss</th></tr></thead><tbody>`);
  for (const o of worstOverlaps) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;"><span class="trade-link" data-position-id="${o.positionA}">#${o.positionA}</span></td><td style="padding:8px;color:#e2e8f0;"><span class="trade-link" data-position-id="${o.positionB}">#${o.positionB}</span></td><td style="padding:8px;text-align:right">${o.overlapMin}</td><td style="padding:8px;text-align:right">${o.combinedNotional.toFixed(2)}</td><td style="padding:8px;text-align:right;color:${o.profitA >= 0 ? '#22c55e' : '#ef4444'};">${o.profitA.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${o.profitB >= 0 ? '#22c55e' : '#ef4444'};">${o.profitB.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${o.bothLoss ? '#ef4444' : '#94a3b8'};">${o.bothLoss ? 'YES' : 'NO'}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'Concurrent Position / Stacked Exposure', description: 'Overlapping positions on the same instrument and whether stacked risk correlates with losses.', html: html.join(''), category: 'Risk & Loss Analysis' };
}
