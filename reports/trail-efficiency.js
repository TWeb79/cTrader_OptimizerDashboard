export default async function trailEfficiency(events) {
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
    const volume = Number(close.volume) || 1;
    const actualProfit = Number(close.grossProfit) || 0;

    const sls = evts
      .filter(e => e.sl != null)
      .map(e => Number(e.sl));

    let bestSl = null;
    let peakTheoretical = 0;
    let slDistance = 0;
    if (sls.length > 0) {
      if (type === 'Buy') {
        bestSl = Math.max(...sls);
        peakTheoretical = (bestSl - entry) * volume;
        slDistance = bestSl - Math.min(...sls);
      } else if (type === 'Sell') {
        bestSl = Math.min(...sls);
        peakTheoretical = (entry - bestSl) * volume;
        slDistance = Math.max(...sls) - bestSl;
      }
    }

    const giveBack = Math.max(0, peakTheoretical - actualProfit);
    const giveBackRatio = peakTheoretical > 0 ? giveBack / peakTheoretical : 0;
    const slCount = sls.length;

    positions.push({
      positionId: pid,
      type,
      entry,
      bestSl,
      peakTheoretical,
      actualProfit,
      giveBack,
      giveBackRatio,
      slCount,
      volume,
      slDistance,
      closePrice: Number(close.closePrice),
    });
  }

  if (!positions.length) {
    return { title: 'Trail Efficiency', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const withSL = positions.filter(p => p.bestSl != null);
  const avgGiveBack = withSL.length ? withSL.reduce((a, p) => a + p.giveBack, 0) / withSL.length : 0;
  const avgGiveBackRatio = withSL.length ? withSL.reduce((a, p) => a + p.giveBackRatio, 0) / withSL.length : 0;
  const maxGiveBack = withSL.length ? Math.max(...withSL.map(p => p.giveBack)) : 0;
  const gaveBackCount = withSL.filter(p => p.giveBack > 0).length;

  const html = [];
  html.push(`<div class="report-header"><h2>Trail Efficiency</h2><p>How much profit was given back between the best stop-loss level reached and the actual close.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Positions', String(positions.length)],
    ['With SL Mods', String(withSL.length)],
    ['Avg Give-Back', avgGiveBack.toFixed(1)],
    ['Avg Give-Back %', (avgGiveBackRatio * 100).toFixed(1) + '%'],
    ['Max Give-Back', maxGiveBack.toFixed(1)],
    ['Gave Back', String(gaveBackCount)],
    ['Kept Full Peak', String(withSL.length - gaveBackCount)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Worst Give-Back Trades (Top 20)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">These positions gave back the most profit from their best SL level.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Position</th><th style="padding:8px;text-align:left">Type</th><th style="padding:8px;text-align:right">Volume</th><th style="padding:8px;text-align:right">Best SL</th><th style="padding:8px;text-align:right">SL Distance</th><th style="padding:8px;text-align:right">Close Price</th><th style="padding:8px;text-align:right">Peak P&L</th><th style="padding:8px;text-align:right">Actual P&L</th><th style="padding:8px;text-align:right">Give-Back</th><th style="padding:8px;text-align:right">Give-Back %</th></tr></thead><tbody>`);
  const worst = [...withSL].sort((a, b) => b.giveBack - a.giveBack).slice(0, 20);
  for (const p of worst) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;"><span class="trade-link" data-position-id="${p.positionId}">#${p.positionId}</span></td><td style="padding:8px;color:#94a3b8;">${p.type}</td><td style="padding:8px;text-align:right">${p.volume}</td><td style="padding:8px;text-align:right">${p.bestSl != null ? p.bestSl.toFixed(1) : 'N/A'}</td><td style="padding:8px;text-align:right">${p.slDistance.toFixed(1)}</td><td style="padding:8px;text-align:right">${p.closePrice.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#22c55e;">${p.peakTheoretical.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${p.actualProfit >= 0 ? '#22c55e' : '#ef4444'};">${p.actualProfit.toFixed(1)}</td><td style="padding:8px;text-align:right;color:#ef4444;">${p.giveBack.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${p.giveBackRatio > 0.5 ? '#ef4444' : '#94a3b8'};">${(p.giveBackRatio * 100).toFixed(1)}%</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Give-Back Distribution</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">How give-back is distributed across positions.</p>`);
  const buckets = ['0%', '1-25%', '26-50%', '51-75%', '76-99%', '100%'];
  const bucketCounts = buckets.map(() => 0);
  const bucketPnl = buckets.map(() => 0);
  for (const p of withSL) {
    const idx = p.giveBackRatio === 0 ? 0 : p.giveBackRatio <= 0.25 ? 1 : p.giveBackRatio <= 0.5 ? 2 : p.giveBackRatio <= 0.75 ? 3 : p.giveBackRatio < 1 ? 4 : 5;
    bucketCounts[idx]++;
    bucketPnl[idx] += p.giveBack;
  }
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Give-Back Range</th><th style="padding:8px;text-align:right">Positions</th><th style="padding:8px;text-align:right">Total Give-Back</th></tr></thead><tbody>`);
  for (let i = 0; i < buckets.length; i++) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${buckets[i]}</td><td style="padding:8px;text-align:right">${bucketCounts[i]}</td><td style="padding:8px;text-align:right;color:#ef4444;">${bucketPnl[i].toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'Trail Efficiency', description: 'How much profit was given back between the best stop-loss level reached and the actual close.', html: html.join(''), category: 'Risk & Loss Analysis' };
}
