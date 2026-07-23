export default async function strategyForensics(events) {
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
    const sls = evts.filter(e => e.sl != null).map(e => ({ time: Number(e.time), sl: Number(e.sl) }));
    const mods = evts.filter(e => e.event === 'Position Modified (S/L)').map(e => ({ time: Number(e.time), sl: Number(e.sl) }));

    if (mods.length < 2) continue;

    const jumps = [];
    for (let i = 1; i < mods.length; i++) {
      const prev = mods[i - 1].sl;
      const curr = mods[i].sl;
      const dist = Math.abs(curr - prev);
      const minutes = Math.round((mods[i].time - mods[i - 1].time) / 60000);
      jumps.push({ distance: dist, minutes, from: prev, to: curr });
    }

    const avgJump = jumps.reduce((a, j) => a + j.distance, 0) / jumps.length;
    const avgMinutes = jumps.reduce((a, j) => a + j.minutes, 0) / jumps.length;
    const maxJump = Math.max(...jumps.map(j => j.distance));

    const finalSl = sls.length ? sls[sls.length - 1].sl : null;
    const breakevenPossible = type === 'Buy' ? finalSl >= entry : finalSl <= entry;

    positions.push({
      positionId: pid,
      type,
      modCount: mods.length,
      avgJump,
      avgMinutes,
      maxJump,
      breakevenPossible,
      profit: Number(close.grossProfit) || 0,
    });
  }

  if (!positions.length) {
    return { title: 'Strategy Forensics', description: 'No positions with multiple SL modifications available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const avgJump = positions.reduce((a, p) => a + p.avgJump, 0) / positions.length;
  const avgModMinutes = positions.reduce((a, p) => a + p.avgMinutes, 0) / positions.length;
  const breakevenCount = positions.filter(p => p.breakevenPossible).length;
  const anomalies = positions.filter(p => p.maxJump > avgJump * 3).length;

  const html = [];
  html.push(`<div class="report-header"><h2>Strategy Forensics</h2><p>Reverse-engineered trailing-stop parameters from SL modification patterns.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Positions', String(positions.length)],
    ['Avg SL Jump', avgJump.toFixed(2)],
    ['Avg Mod Interval', Math.round(avgModMinutes) + 'm'],
    ['Breakeven Reached', String(breakevenCount)],
    ['Anomalous Jumps', String(anomalies)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>SL Jump Analysis</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Distribution of stop-loss adjustment sizes and intervals.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Position</th><th style="padding:8px;text-align:right">Mods</th><th style="padding:8px;text-align:right">Avg Jump</th><th style="padding:8px;text-align:right">Avg Interval</th><th style="padding:8px;text-align:right">Max Jump</th><th style="padding:8px;text-align:right">BE Possible</th><th style="padding:8px;text-align:right">P&L</th></tr></thead><tbody>`);
  const sorted = [...positions].sort((a, b) => b.maxJump - a.maxJump).slice(0, 50);
  for (const p of sorted) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;"><span class="trade-link" data-position-id="${p.positionId}">#${p.positionId}</span></td><td style="padding:8px;text-align:right">${p.modCount}</td><td style="padding:8px;text-align:right">${p.avgJump.toFixed(2)}</td><td style="padding:8px;text-align:right">${Math.round(p.avgMinutes)}m</td><td style="padding:8px;text-align:right;color:${p.maxJump > avgJump * 3 ? '#ef4444' : '#94a3b8'};">${p.maxJump.toFixed(2)}</td><td style="padding:8px;text-align:right;color:${p.breakevenPossible ? '#22c55e' : '#94a3b8'};">${p.breakevenPossible ? 'YES' : 'NO'}</td><td style="padding:8px;text-align:right;color:${p.profit >= 0 ? '#22c55e' : '#ef4444'};">${p.profit.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'Strategy Forensics', description: 'Reverse-engineered trailing-stop parameters from SL modification patterns.', html: html.join(''), category: 'Risk & Loss Analysis' };
}
