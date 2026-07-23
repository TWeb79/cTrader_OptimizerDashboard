export default async function directionalSizingBias(events) {
  const closed = [];
  const pos = {};
  for (const e of events) {
    if (e.closePrice != null) {
      pos[e.positionId] = e;
    }
  }
  for (const k of Object.keys(pos)) closed.push(pos[k]);

  if (!closed.length) {
    return { title: 'Directional Sizing Bias', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const groups = { Buy: [], Sell: [] };
  for (const t of closed) {
    if (t.type === 'Buy' || t.type === 'Sell') {
      groups[t.type].push(t);
    }
  }

  const analyze = (trades) => {
    if (!trades.length) return null;
    const profit = trades.reduce((a, t) => a + (Number(t.grossProfit) || 0), 0);
    const pips = trades.reduce((a, t) => a + (Number(t.pips) || 0), 0);
    const volume = trades.reduce((a, t) => a + (Number(t.volume) || 0), 0);
    const wins = trades.filter(t => Number(t.grossProfit) > 0);
    const count = trades.length;
    return {
      count,
      profit,
      pips,
      volume,
      avgProfit: profit / count,
      avgPips: pips / count,
      avgVolume: volume / count,
      winRate: (wins.length / count) * 100,
      profitPerLot: volume > 0 ? profit / volume : 0,
      pipsPerLot: volume > 0 ? pips / volume : 0,
    };
  };

  const buy = analyze(groups.Buy);
  const sell = analyze(groups.Sell);

  const html = [];
  html.push(`<div class="report-header"><h2>Directional Sizing Bias</h2><p>Comparing edge and sizing between Buy and Sell trades, with per-unit normalization.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Buy Trades', String(buy.count)],
    ['Sell Trades', String(sell.count)],
    ['Buy Avg P&L', buy.avgProfit.toFixed(1)],
    ['Sell Avg P&L', sell.avgProfit.toFixed(1)],
    ['Buy Avg Volume', buy.avgVolume.toFixed(1)],
    ['Sell Avg Volume', sell.avgVolume.toFixed(1)],
    ['Buy P&L/Lot', buy.profitPerLot.toFixed(2)],
    ['Sell P&L/Lot', sell.profitPerLot.toFixed(2)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Directional Comparison</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Raw and normalized metrics by direction.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Metric</th><th style="padding:8px;text-align:right">Buy</th><th style="padding:8px;text-align:right">Sell</th><th style="padding:8px;text-align:right">Difference</th></tr></thead><tbody>`);
  const rows = [
    ['Trades', buy.count, sell.count, buy.count - sell.count],
    ['Total P&L', buy.profit, sell.profit, buy.profit - sell.profit],
    ['Avg P&L', buy.avgProfit, sell.avgProfit, buy.avgProfit - sell.avgProfit],
    ['Win Rate', buy.winRate, sell.winRate, buy.winRate - sell.winRate],
    ['Avg Volume', buy.avgVolume, sell.avgVolume, buy.avgVolume - sell.avgVolume],
    ['Avg Pips', buy.avgPips, sell.avgPips, buy.avgPips - sell.avgPips],
    ['P&L per Lot', buy.profitPerLot, sell.profitPerLot, buy.profitPerLot - sell.profitPerLot],
    ['Pips per Lot', buy.pipsPerLot, sell.pipsPerLot, buy.pipsPerLot - sell.pipsPerLot],
  ];
  for (const r of rows) {
    const fmt = r[0] === 'Win Rate' ? '%.1f%%' : '%.2f';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${r[0]}</td><td style="padding:8px;text-align:right;color:${r[1] >= 0 ? '#22c55e' : '#ef4444'};">${typeof r[1] === 'number' && r[0].includes('Rate') ? r[1].toFixed(1)+'%' : r[1].toFixed(2)}</td><td style="padding:8px;text-align:right;color:${r[2] >= 0 ? '#22c55e' : '#ef4444'};">${typeof r[2] === 'number' && r[0].includes('Rate') ? r[2].toFixed(1)+'%' : r[2].toFixed(2)}</td><td style="padding:8px;text-align:right;color:${r[3] >= 0 ? '#22c55e' : '#ef4444'};">${typeof r[3] === 'number' && r[0].includes('Rate') ? r[3].toFixed(1)+'%' : r[3].toFixed(2)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'Directional Sizing Bias', description: 'Comparing edge and sizing between Buy and Sell trades, with per-unit normalization.', html: html.join(''), category: 'Trade Quality & Sizing' };
}
