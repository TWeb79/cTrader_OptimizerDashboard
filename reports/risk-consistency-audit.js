export default async function riskConsistencyAudit(events) {
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

    const entry = Number(close.entryPrice);
    const sl = close.sl != null ? Number(close.sl) : null;
    const closePrice = Number(close.closePrice);
    const volume = Number(close.volume) || 1;
    const equity = close.equity != null ? Number(close.equity) : null;
    const profit = Number(close.grossProfit) || 0;

    let risk = 0;
    if (sl != null && entry > 0) {
      risk = Math.abs(entry - sl) * volume;
    } else if (entry > 0 && closePrice > 0) {
      risk = Math.abs(entry - closePrice) * volume;
    }

    const equityFraction = equity > 0 ? risk / equity : null;

    trades.push({
      positionId: pid,
      type: close.type,
      entry,
      sl,
      closePrice,
      volume,
      equity,
      risk,
      equityFraction,
      profit,
    });
  }

  if (!trades.length) {
    return { title: 'Risk-Consistency Audit', description: 'No closed trades available.', html: '<p style=\"color:#94a3b8\">No data.</p>' };
  }

  const withEquity = trades.filter(t => t.equityFraction != null);
  const avgRisk = withEquity.length ? withEquity.reduce((a, t) => a + t.equityFraction, 0) / withEquity.length : 0;
  const maxRisk = withEquity.length ? Math.max(...withEquity.map(t => t.equityFraction)) : 0;
  const sortedRisk = withEquity.sort((a, b) => b.equityFraction - a.equityFraction);
  const top5pct = sortedRisk.slice(0, Math.max(1, Math.ceil(sortedRisk.length * 0.05)));

  const html = [];
  html.push(`<div class="report-header"><h2>Risk-Consistency Audit</h2><p>Position sizing as a percentage of equity per trade, highlighting outliers.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Total Trades', String(trades.length)],
    ['With Equity Data', String(withEquity.length)],
    ['Avg Risk %', withEquity.length ? (avgRisk * 100).toFixed(2) + '%' : 'N/A'],
    ['Max Risk %', maxRisk ? (maxRisk * 100).toFixed(2) + '%' : 'N/A'],
    ['Outliers (Top 5%)', String(top5pct.length)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style=\"${cardStyle}\"><div style=\"${labelStyle}\">${k[0]}</div><div style=\"${valueStyle}\">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Top 5% Risk Outliers</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Trades with the highest equity-normalized risk.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Position</th><th style="padding:8px;text-align:left">Type</th><th style="padding:8px;text-align:right">Volume</th><th style="padding:8px;text-align:right">Entry</th><th style="padding:8px;text-align:right">SL</th><th style="padding:8px;text-align:right">Risk $</th><th style="padding:8px;text-align:right">Equity</th><th style="padding:8px;text-align:right">Risk %</th><th style="padding:8px;text-align:right">P&L</th></tr></thead><tbody>`);
  for (const t of top5pct) {
    html.push(`<tr style=\"border-bottom:1px solid #1e293b;\"><td style=\"padding:8px;color:#e2e8f0;\"><span class=\"trade-link\" data-position-id=\"${t.positionId}\">#${t.positionId}</span></td><td style=\"padding:8px;color:#94a3b8;\">${t.type}</td><td style=\"padding:8px;text-align:right\">${t.volume}</td><td style=\"padding:8px;text-align:right\">${t.entry.toFixed(1)}</td><td style=\"padding:8px;text-align:right\">${t.sl != null ? t.sl.toFixed(1) : 'NONE'}</td><td style=\"padding:8px;text-align:right\">${t.risk.toFixed(1)}</td><td style=\"padding:8px;text-align:right\">${t.equity != null ? t.equity.toFixed(1) : 'N/A'}</td><td style=\"padding:8px;text-align:right;color:${t.equityFraction > 0.05 ? '#ef4444' : '#94a3b8'};\">${t.equityFraction != null ? (t.equityFraction * 100).toFixed(2) + '%' : 'N/A'}</td><td style=\"padding:8px;text-align:right;color:${t.profit >= 0 ? '#22c55e' : '#ef4444'};\">${t.profit.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class=\"report-body\"><h3>All Trades Risk Table (sorted)</h3><p style=\"color:#94a3b8;font-size:13px;margin-bottom:8px;\">Complete list of trades by equity-normalized risk.</p>`);
  html.push(`<table style=\"width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;\"><thead><tr style=\"background:#1e293b;color:#94a3b8;\"><th style=\"padding:8px;text-align:left\">Position</th><th style=\"padding:8px;text-align:left\">Type</th><th style=\"padding:8px;text-align:right\">Risk %</th><th style=\"padding:8px;text-align:right\">P&L</th></tr></thead><tbody>`);
  for (const t of sortedRisk.slice(0, 100)) {
    html.push(`<tr style=\"border-bottom:1px solid #1e293b;\"><td style=\"padding:8px;color:#e2e8f0;\"><span class=\"trade-link\" data-position-id=\"${t.positionId}\">#${t.positionId}</span></td><td style=\"padding:8px;color:#94a3b8;\">${t.type}</td><td style=\"padding:8px;text-align:right;color:${t.equityFraction > 0.05 ? '#ef4444' : '#94a3b8'};\">${t.equityFraction != null ? (t.equityFraction * 100).toFixed(2) + '%' : 'N/A'}</td><td style=\"padding:8px;text-align:right;color:${t.profit >= 0 ? '#22c55e' : '#ef4444'};\">${t.profit.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'Risk-Consistency Audit', description: 'Position sizing as a percentage of equity per trade, highlighting outliers.', html: html.join(''), category: 'Risk & Loss Analysis' };
}
