export default async function nakedExposure(events) {
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

    const firstMod = evts.find(e => e.event === 'Position Modified (S/L)');
    const nakedTime = firstMod ? Math.round((Number(firstMod.time) - Number(create.time)) / 60000) : Math.round((Number(close.time) - Number(create.time)) / 60000);
    const volume = Number(close.volume) || 1;
    const lotMinutes = nakedTime * volume;
    const profit = Number(close.grossProfit) || 0;

    trades.push({
      positionId: pid,
      type: close.type,
      nakedTime,
      volume,
      lotMinutes,
      profit,
      hadMod: !!firstMod,
    });
  }

  if (!trades.length) {
    return { title: 'Naked Exposure / Time-at-Risk', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const totalLotMinutes = trades.reduce((a, t) => a + t.lotMinutes, 0);
  const avgLotMinutes = trades.length ? totalLotMinutes / trades.length : 0;
  const maxLotMinutes = Math.max(...trades.map(t => t.lotMinutes));
  const worst = [...trades].sort((a, b) => b.lotMinutes - a.lotMinutes).slice(0, 20);
  const hadModCount = trades.filter(t => t.hadMod).length;

  const html = [];
  html.push(`<div class="report-header"><h2>Naked Exposure / Time-at-Risk</h2><p>Lot-minutes of unprotected risk before the first stop-loss modification.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Total Positions', String(trades.length)],
    ['Had SL Mod', String(hadModCount)],
    ['Total Lot-Min', totalLotMinutes.toFixed(0)],
    ['Avg Lot-Min', avgLotMinutes.toFixed(0)],
    ['Max Lot-Min', maxLotMinutes.toFixed(0)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Worst Naked Exposure Trades (Top 20)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Positions with the highest lot-minutes of unprotected risk.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Position</th><th style="padding:8px;text-align:left">Type</th><th style="padding:8px;text-align:right">Volume</th><th style="padding:8px;text-align:right">Naked (min)</th><th style="padding:8px;text-align:right">Lot-Min</th><th style="padding:8px;text-align:right">P&L</th></tr></thead><tbody>`);
  for (const t of worst) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;"><span class="trade-link" data-position-id="${t.positionId}">#${t.positionId}</span></td><td style="padding:8px;color:#94a3b8;">${t.type}</td><td style="padding:8px;text-align:right">${t.volume}</td><td style="padding:8px;text-align:right">${t.nakedTime}</td><td style="padding:8px;text-align:right;color:${t.lotMinutes > 10000 ? '#ef4444' : '#94a3b8'};">${t.lotMinutes.toFixed(0)}</td><td style="padding:8px;text-align:right;color:${t.profit >= 0 ? '#22c55e' : '#ef4444'};">${t.profit.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'Naked Exposure / Time-at-Risk', description: 'Lot-minutes of unprotected risk before the first stop-loss modification.', html: html.join(''), category: 'Risk & Loss Analysis' };
}
