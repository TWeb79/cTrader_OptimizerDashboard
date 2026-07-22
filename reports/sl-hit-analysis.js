export default async function slHitAnalysis(events) {
  const closed = [];
  const pos = {};

  for (const e of events) {
    if (e.closePrice != null) {
      pos[e.positionId] = e;
    }
  }
  for (const k of Object.keys(pos)) closed.push(pos[k]);

  const slHits = closed.filter(t => t.event === 'Stop Loss Hit');
  const manualCloses = closed.filter(t => t.event === 'Position closed');
  const total = closed.length;

  if (!total) {
    return { title: 'Stop Loss Hit Analysis', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const slProfitable = slHits.filter(t => Number(t.grossProfit) > 0);
  const slLosing = slHits.filter(t => Number(t.grossProfit) < 0);
  const pcProfitable = manualCloses.filter(t => Number(t.grossProfit) > 0);
  const pcLosing = manualCloses.filter(t => Number(t.grossProfit) < 0);

  const slProfitTotal = slHits.reduce((a, t) => a + Number(t.grossProfit), 0);
  const slLossTotal = slLosing.reduce((a, t) => a + Number(t.grossProfit), 0);
  const manualProfitTotal = manualCloses.reduce((a, t) => a + Number(t.grossProfit), 0);
  const manualLossTotal = manualCloses.reduce((a, t) => a + Number(t.grossProfit), 0);

  const html = [];
  html.push(`<div class="report-header"><h2>Stop Loss Hit Analysis</h2><p>The shocking truth about your stop-loss events: most are actually profitable exits masquerading as losses.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:160px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Total Trades', String(total)],
    ['SL Hit Events', String(slHits.length)],
    ['SL Profitable', String(slProfitable.length)],
    ['SL Losing', String(slLosing.length)],
    ['SL Profit Rate', slHits.length ? ((slProfitable.length / slHits.length) * 100).toFixed(1) + '%' : '0%'],
    ['Manual Closes', String(manualCloses.length)],
    ['SL Total P&L', slProfitTotal.toFixed(1)],
    ['Manual Total P&L', manualProfitTotal.toFixed(1)],
    ['SL to Manual Ratio', slHits.length ? (slHits.length / manualCloses.length).toFixed(1) + 'x' : '0x'],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Event Type Performance</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Comparing Stop Loss hits vs manual position closes. Note: "Stop Loss Hit" does NOT mean a loss — most are trailing stops capturing gains.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Event</th><th style="padding:8px;text-align:right;">Count</th><th style="padding:8px;text-align:right;">Profitable</th><th style="padding:8px;text-align:right;">Losing</th><th style="padding:8px;text-align:right;">Total P&L</th><th style="padding:8px;text-align:right;">Profit Factor</th></tr></thead><tbody>`);

  const slPF = Math.abs(slLossTotal) > 0 ? slProfitTotal / Math.abs(slLossTotal) : (slProfitTotal > 0 ? 999 : 0);
  const manualPF = Math.abs(manualLossTotal) > 0 ? manualProfitTotal / Math.abs(manualLossTotal) : (manualProfitTotal > 0 ? 999 : 0);

  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Stop Loss Hit</td><td style="padding:8px;text-align:right;">${slHits.length}</td><td style="padding:8px;text-align:right;">${slProfitable.length}</td><td style="padding:8px;text-align:right;">${slLosing.length}</td><td style="padding:8px;text-align:right;color:${slProfitTotal >= 0 ? '#22c55e' : '#ef4444'};">${slProfitTotal.toFixed(1)}</td><td style="padding:8px;text-align:right;">${slPF.toFixed(2)}</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Manual Close</td><td style="padding:8px;text-align:right;">${manualCloses.length}</td><td style="padding:8px;text-align:right;">${pcProfitable.length}</td><td style="padding:8px;text-align:right;">${pcLosing.length}</td><td style="padding:8px;text-align:right;color:${manualProfitTotal >= 0 ? '#22c55e' : '#ef4444'};">${manualProfitTotal.toFixed(1)}</td><td style="padding:8px;text-align:right;">${manualPF.toFixed(2)}</td></tr>`);
  html.push(`</tbody></table></div>`);

  if (slLosing.length > 0) {
    html.push(`<div class="report-body"><h3>True SL Losses (When SL Hit at a Loss)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">These are the only SL events that actually represent failed risk management.</p>`);
    html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Position</th><th style="padding:8px;text-align:left;">Type</th><th style="padding:8px;text-align:right;">Entry</th><th style="padding:8px;text-align:right;">SL</th><th style="padding:8px;text-align:right;">Close</th><th style="padding:8px;text-align:right;">Loss</th></tr></thead><tbody>`);
    const trueLosses = slLosing.sort((a, b) => Number(a.grossProfit) - Number(b.grossProfit));
    for (const t of trueLosses) {
      html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;"><span class="trade-link" data-position-id="${t.positionId}">#${t.positionId}</span></td><td style="padding:8px;color:#94a3b8;">${t.type}</td><td style="padding:8px;text-align:right;">${t.entryPrice}</td><td style="padding:8px;text-align:right;">${t.sl}</td><td style="padding:8px;text-align:right;">${t.closePrice}</td><td style="padding:8px;text-align:right;color:#ef4444;">${Number(t.grossProfit).toFixed(1)}</td></tr>`);
    }
    html.push(`</tbody></table></div>`);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hourMap = {};
  for (const t of slHits) {
    const d = new Date(Number(t.time));
    const hour = d.getHours();
    const key = `${hour}-${Number(t.grossProfit) >= 0 ? 'profit' : 'loss'}`;
    hourMap[key] = (hourMap[key] || 0) + 1;
  }

  html.push(`<div class="report-body"><h3>SL Events by Hour</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Volume of SL events per hour, split by profitable vs losing.</p>`);
  html.push(`<svg viewBox="0 0 960 260" style="width:100%;height:auto;min-height:220px;">`);
  const vals = Object.values(hourMap);
  const maxVal = Math.max(...vals, 1);
  html.push(`<line x1="40" y1="250" x2="940" y2="250" stroke="#475569" />`);
  for (let h = 0; h < 24; h++) {
    const profitKey = `${h}-profit`;
    const lossKey = `${h}-loss`;
    const profitCount = hourMap[profitKey] || 0;
    const lossCount = hourMap[lossKey] || 0;
    const x = 40 + (h / 23) * 900;
    const profitH = (profitCount / maxVal) * 200;
    const lossH = (lossCount / maxVal) * 200;
    html.push(`<rect x="${x-12}" y="${250-profitH}" width="9" height="${profitH}" fill="#22c55e" rx="1" />`);
    html.push(`<rect x="${x+3}" y="${250-lossH}" width="9" height="${lossH}" fill="#ef4444" rx="1" />`);
    html.push(`<text x="${x}" y="265" fill="#94a3b8" font-size="10" text-anchor="middle">${String(h).padStart(2,'0')}</text>`);
  }
  html.push(`<text x="14" y="130" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 130)">Count</text>`);
  html.push(`</svg></div>`);

  return { title: 'Stop Loss Hit Analysis', description: 'The shocking truth about your stop-loss events: most are actually profitable exits masquerading as losses.', html: html.join(''), category: 'Risk & Loss Analysis' };
}
