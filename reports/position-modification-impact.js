export default async function positionModificationImpact(events) {
  const positionEvents = {};
  for (const e of events) {
    if (!positionEvents[e.positionId]) positionEvents[e.positionId] = [];
    positionEvents[e.positionId].push(e);
  }

  const modified = [];
  const unmodified = [];
  const modTypes = {};

  for (const pid of Object.keys(positionEvents)) {
    const evts = positionEvents[pid].sort((a, b) => Number(a.time) - Number(b.time));
    const close = evts[evts.length - 1];
    if (!close || close.closePrice == null) continue;

    const mods = evts.filter(e => e.event === 'Position Modified (S/L)');
    const p = Number(close.grossProfit) || 0;
    const trade = { ...close, profit: p, time: Number(close.time), modCount: mods.length };

    if (mods.length > 0) {
      modified.push(trade);
      for (const m of mods) {
        const key = `${m.sl != null && close.sl != null ? (m.sl < close.sl ? 'sl-tighter' : 'sl-wider') : 'unknown'}`;
        modTypes[key] = (modTypes[key] || 0) + 1;
      }
    } else {
      unmodified.push(trade);
    }
  }

  if (!modified.length && !unmodified.length) {
    return { title: 'Position Modification Impact', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const analyze = (trades) => {
    if (!trades.length) return { count: 0, wins: 0, losses: 0, profit: 0, winRate: 0, avgLoss: 0, pf: 0 };
    const wins = trades.filter(t => t.profit > 0);
    const losses = trades.filter(t => t.profit < 0);
    const profit = trades.reduce((a, t) => a + t.profit, 0);
    const grossWin = wins.reduce((a, t) => a + t.profit, 0);
    const grossLoss = Math.abs(losses.reduce((a, t) => a + t.profit, 0));
    return {
      count: trades.length,
      wins: wins.length,
      losses: losses.length,
      profit,
      winRate: (wins.length / trades.length) * 100,
      avgLoss: losses.length ? losses.reduce((a, t) => a + t.profit, 0) / losses.length : 0,
      pf: grossLoss ? grossWin / grossLoss : 0,
    };
  };

  const modStats = analyze(modified);
  const unmodStats = analyze(unmodified);

  const html = [];
  html.push(`<div class="report-header"><h2>Position Modification Impact</h2><p>Does modifying the stop loss improve or destroy trade outcomes?</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Modified Positions', String(modStats.count)],
    ['Unmodified Positions', String(unmodStats.count)],
    ['Mod Win Rate', modStats.winRate.toFixed(1) + '%'],
    ['Unmod Win Rate', unmodStats.winRate.toFixed(1) + '%'],
    ['Mod Avg Loss', modStats.avgLoss.toFixed(1)],
    ['Unmod Avg Loss', unmodStats.avgLoss.toFixed(1)],
    ['Mod Profit Factor', modStats.pf.toFixed(2)],
    ['Unmod Profit Factor', unmodStats.pf.toFixed(2)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Modified vs Unmodified Performance</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Comparing trades where the stop loss was adjusted vs left untouched.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Metric</th><th style="padding:8px;text-align:right">Modified</th><th style="padding:8px;text-align:right">Unmodified</th><th style="padding:8px;text-align:right">Difference</th></tr></thead><tbody>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Trades</td><td style="padding:8px;text-align:right">${modStats.count}</td><td style="padding:8px;text-align:right">${unmodStats.count}</td><td style="padding:8px;text-align:right">${modStats.count - unmodStats.count}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Win Rate</td><td style="padding:8px;text-align:right;color:${modStats.winRate >= 50 ? '#22c55e' : '#ef4444'};">${modStats.winRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${unmodStats.winRate >= 50 ? '#22c55e' : '#ef4444'};">${unmodStats.winRate.toFixed(1)}%</td><td style="padding:8px;text-align:right">${(modStats.winRate - unmodStats.winRate).toFixed(1)}%</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Total P&L</td><td style="padding:8px;text-align:right;color:${modStats.profit >= 0 ? '#22c55e' : '#ef4444'};">${modStats.profit.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${unmodStats.profit >= 0 ? '#22c55e' : '#ef4444'};">${unmodStats.profit.toFixed(1)}</td><td style="padding:8px;text-align:right">${(modStats.profit - unmodStats.profit).toFixed(1)}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Profit Factor</td><td style="padding:8px;text-align:right;color:${modStats.pf >= 1 ? '#22c55e' : '#ef4444'};">${modStats.pf.toFixed(2)}</td><td style="padding:8px;text-align:right;color:${unmodStats.pf >= 1 ? '#22c55e' : '#ef4444'};">${unmodStats.pf.toFixed(2)}</td><td style="padding:8px;text-align:right">${(modStats.pf - unmodStats.pf).toFixed(2)}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Avg Loss</td><td style="padding:8px;text-align:right;color:${modStats.avgLoss >= 0 ? '#22c55e' : '#ef4444'};">${modStats.avgLoss.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${unmodStats.avgLoss >= 0 ? '#22c55e' : '#ef4444'};">${unmodStats.avgLoss.toFixed(1)}</td><td style="padding:8px;text-align:right">${(modStats.avgLoss - unmodStats.avgLoss).toFixed(1)}</td></tr>`);
  html.push(`</tbody></table></div>`);

  return { title: 'Position Modification Impact', description: 'Does modifying the stop loss improve or destroy trade outcomes?', html: html.join(''), category: 'Risk & Loss Analysis' };
}
