export default async function breakevenStopEffectiveness(events) {
  const positionEvents = {};
  for (const e of events) {
    if (!positionEvents[e.positionId]) positionEvents[e.positionId] = [];
    positionEvents[e.positionId].push(e);
  }

  const positions = [];
  for (const pid of Object.keys(positionEvents)) {
    const evts = positionEvents[pid].sort((a, b) => Number(a.time) - Number(b.time));
    const close = evts[evts.length - 1];
    if (!close || close.closePrice == null) continue;

    const type = close.type;
    const entry = Number(close.entryPrice);
    const actualProfit = Number(close.grossProfit) || 0;

    const slHistory = evts.filter(e => e.sl != null);
    let breakevenHit = false;
    let breakevenTime = null;
    let bestProfitAfterBreakeven = actualProfit;

    for (const e of slHistory) {
      const sl = Number(e.sl);
      const isBreakeven = type === 'Buy' ? sl >= entry : sl <= entry;
      if (isBreakeven && !breakevenHit) {
        breakevenHit = true;
        breakevenTime = Number(e.time);
      }
    }

    positions.push({
      positionId: pid,
      type,
      entry,
      actualProfit,
      breakevenHit,
      breakevenTime,
      bestProfitAfterBreakeven,
    });
  }

  if (!positions.length) {
    return { title: 'Breakeven-Stop Effectiveness', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const breakevenPositions = positions.filter(p => p.breakevenHit);
  const nonBreakeven = positions.filter(p => !p.breakevenHit);
  const gaveBackAfterBreakeven = breakevenPositions.filter(p => p.actualProfit < 0);
  const zeroPnl = positions.filter(p => p.actualProfit === 0);

  const html = [];
  html.push(`<div class="report-header"><h2>Breakeven-Stop Effectiveness</h2><p>How often does the breakeven protection mechanism lock in profit vs give it back?</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Total Positions', String(positions.length)],
    ['Breakeven Hit', String(breakevenPositions.length)],
    ['No Breakeven', String(nonBreakeven.length)],
    ['Gave Back After BE', String(gaveBackAfterBreakeven.length)],
    ['Exact Zero P&L', String(zeroPnl.length)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style=\"${cardStyle}\"><div style=\"${labelStyle}\">${k[0]}</div><div style=\"${valueStyle}\">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Breakeven Mechanics</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Of positions that reached breakeven, how many finished with a loss?</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style=\"padding:8px;text-align:left\">Category</th><th style=\"padding:8px;text-align:right\">Count</th><th style=\"padding:8px;text-align:right\">Share</th></tr></thead><tbody>`);
  html.push(`<tr style=\"border-bottom:1px solid #1e293b;\"><td style=\"padding:8px;color:#e2e8f0;\">Hit breakeven</td><td style=\"padding:8px;text-align:right\">${breakevenPositions.length}</td><td style=\"padding:8px;text-align:right\">${positions.length ? (breakevenPositions.length / positions.length * 100).toFixed(1) : 0}%</td></tr>`);
  html.push(`<tr style=\"border-bottom:1px solid #1e293b;\"><td style=\"padding:8px;color:#e2e8f0;\">Gave back after BE</td><td style=\"padding:8px;text-align:right;color:#ef4444;\">${gaveBackAfterBreakeven.length}</td><td style=\"padding:8px;text-align:right\">${breakevenPositions.length ? (gaveBackAfterBreakeven.length / breakevenPositions.length * 100).toFixed(1) : 0}%</td></tr>`);
  html.push(`<tr style=\"border-bottom:1px solid #1e293b;\"><td style=\"padding:8px;color:#e2e8f0;\">Kept profit after BE</td><td style=\"padding:8px;text-align:right;color:#22c55e;\">${breakevenPositions.length - gaveBackAfterBreakeven.length}</td><td style=\"padding:8px;text-align:right\">${breakevenPositions.length ? ((breakevenPositions.length - gaveBackAfterBreakeven.length) / breakevenPositions.length * 100).toFixed(1) : 0}%</td></tr>`);
  html.push(`<tr style=\"border-bottom:1px solid #1e293b;\"><td style=\"padding:8px;color:#e2e8f0;\">Closed at exactly zero</td><td style=\"padding:8px;text-align:right\">${zeroPnl.length}</td><td style=\"padding:8px;text-align:right\">${positions.length ? (zeroPnl.length / positions.length * 100).toFixed(1) : 0}%</td></tr>`);
  html.push(`</tbody></table></div>`);

  return { title: 'Breakeven-Stop Effectiveness', description: 'How often does the breakeven protection mechanism lock in profit vs give it back?', html: html.join(''), category: 'Risk & Loss Analysis' };
}
