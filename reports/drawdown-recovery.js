export default async function drawdownRecovery(events) {
  const closed = [];
  const pos = {};
  for (const e of events) {
    if (e.closePrice != null) {
      pos[e.positionId] = e;
    }
  }
  const sorted = Object.values(pos).sort((a, b) => Number(a.time) - Number(b.time));
  for (const t of sorted) closed.push(t);

  if (!closed.length) {
    return { title: 'Drawdown Recovery', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  let cum = 0;
  let peak = 0;
  let peakIdx = 0;
  const curve = [];
  const drawdowns = [];

  for (let i = 0; i < closed.length; i++) {
    cum += Number(closed[i].grossProfit) || 0;
    if (cum > peak) {
      peak = cum;
      peakIdx = i;
    }
    const dd = peak - cum;
    curve.push({ idx: i, cum, dd, peak });
    if (dd > 0 && (i === closed.length - 1 || curve[i + 1]?.dd === 0 || i === closed.length - 1)) {
      const start = peakIdx;
      const recovered = curve.find((c, j) => j > i && c.cum >= peak);
      const recoveryIdx = recovered ? recovered.idx : -1;
      drawdowns.push({
        start,
        end: i,
        depth: dd,
        recoveryTrades: recoveryIdx >= 0 ? recoveryIdx - i : -1,
        recovered: recoveryIdx >= 0,
      });
    }
  }

  const maxDd = Math.max(...curve.map(c => c.dd), 0);
  const avgDd = drawdowns.length ? drawdowns.reduce((a, d) => a + d.depth, 0) / drawdowns.length : 0;
  const recoveredDds = drawdowns.filter(d => d.recovered);
  const avgRecovery = recoveredDds.length ? recoveredDds.reduce((a, d) => a + d.recoveryTrades, 0) / recoveredDds.length : 0;
  const unrecovered = drawdowns.filter(d => !d.recovered).length;

  const html = [];
  html.push(`<div class="report-header"><h2>Drawdown Recovery</h2><p>How painful are drawdowns, and how long does recovery usually take?</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Total Drawdowns', String(drawdowns.length)],
    ['Max Drawdown', maxDd.toFixed(1)],
    ['Avg Drawdown', avgDd.toFixed(1)],
    ['Avg Recovery (trades)', avgRecovery.toFixed(0)],
    ['Unrecovered', String(unrecovered)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Drawdown Events</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Each drawdown from peak to trough, with recovery status.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">#</th><th style="padding:8px;text-align:right">Depth</th><th style="padding:8px;text-align:right">Duration (trades)</th><th style="padding:8px;text-align:right">Recovery (trades)</th><th style="padding:8px;text-align:right">Status</th></tr></thead><tbody>`);
  for (let i = 0; i < drawdowns.length; i++) {
    const d = drawdowns[i];
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#94a3b8;">${i + 1}</td><td style="padding:8px;text-align:right;color:#ef4444;">${d.depth.toFixed(1)}</td><td style="padding:8px;text-align:right">${d.end - d.start}</td><td style="padding:8px;text-align:right">${d.recoveryTrades >= 0 ? d.recoveryTrades : '-'}</td><td style="padding:8px;text-align:right;color:${d.recovered ? '#22c55e' : '#ef4444'};">${d.recovered ? 'Recovered' : 'Unrecovered'}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Equity Curve with Drawdowns</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Cumulative P&L showing drawdown depth.</p>`);
  html.push(`<svg viewBox="0 0 960 300" style="width:100%;height:auto;min-height:240px;">`);
  const w = 960, h = 300, pad = 40;
  const minCum = Math.min(...curve.map(c => c.cum), 0);
  const maxCum = Math.max(...curve.map(c => c.cum), 0);
  const maxDdCurve = Math.max(...curve.map(c => c.dd), 0);
  const yMin = minCum - maxDdCurve * 0.1;
  const yMax = maxCum + maxDdCurve * 0.1;
  const range = yMax - yMin || 1;
  const sx = (i) => pad + (i / Math.max(1, curve.length - 1)) * (w - pad * 2);
  const sy = (v) => pad + ((yMax - v) / range) * (h - pad * 2);

  html.push(`<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`);
  let areaPath = `M ${sx(0)} ${sy(curve[0].peak)}`;
  for (let i = 1; i < curve.length; i++) {
    areaPath += ` L ${sx(i)} ${sy(curve[i].peak)}`;
  }
  areaPath += ` L ${sx(curve.length - 1)} ${sy(curve[curve.length - 1].cum)} Z`;
  html.push(`<path d="${areaPath}" fill="#ef4444" opacity="0.15" />`);
  let eqPath = `M ${sx(0)} ${sy(curve[0].cum)}`;
  for (let i = 1; i < curve.length; i++) {
    eqPath += ` L ${sx(i)} ${sy(curve[i].cum)}`;
  }
  html.push(`<path d="${eqPath}" fill="none" stroke="#38bdf8" stroke-width="2" />`);
  html.push(`<text x="${w/2}" y="${h - 10}" fill="#94a3b8" font-size="11" text-anchor="middle">Trade Index</text>`);
  html.push(`<text x="14" y="${h/2}" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 ${h/2})">Cumulative P&L ($)</text>`);
  html.push(`</svg>`);
  html.push(`</div>`);

  return { title: 'Drawdown Recovery', description: 'How painful are drawdowns, and how long does recovery usually take?', html: html.join(''), category: 'P&L & Returns' };
}
