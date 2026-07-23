export default async function marketSessionAnalysis(events) {
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
    return { title: 'Market Session Analysis', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const sessions = {
    'Asian': { hours: [0,1,2,3,4,5,6,7], trades: [], wins: 0, losses: 0, profit: 0 },
    'European': { hours: [8,9,10,11,12], trades: [], wins: 0, losses: 0, profit: 0 },
    'US': { hours: [13,14,15,16,17,18,19,20,21], trades: [], wins: 0, losses: 0, profit: 0 },
    'Off-hours': { hours: [22,23], trades: [], wins: 0, losses: 0, profit: 0 },
  };

  for (const t of closed) {
    const hour = new Date(Number(t.time)).getHours();
    const p = Number(t.grossProfit) || 0;
    for (const [name, data] of Object.entries(sessions)) {
      if (data.hours.includes(hour)) {
        data.trades.push(t);
        data.profit += p;
        if (p > 0) data.wins++;
        if (p < 0) data.losses++;
        break;
      }
    }
  }

  const html = [];
  html.push(`<div class="report-header"><h2>Market Session Analysis</h2><p>Which market session is most profitable?</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [];
  for (const [name, data] of Object.entries(sessions)) {
    const wr = data.trades.length ? (data.wins / data.trades.length) * 100 : 0;
    const grossWin = data.trades.filter(t => Number(t.grossProfit) > 0).reduce((a, t) => a + Number(t.grossProfit), 0);
    const grossLoss = Math.abs(data.trades.filter(t => Number(t.grossProfit) < 0).reduce((a, t) => a + Number(t.grossProfit), 0));
    const pf = grossLoss ? grossWin / grossLoss : 0;
    kpis.push([name + ' Trades', String(data.trades.length)]);
    kpis.push([name + ' Win Rate', wr.toFixed(1) + '%']);
    kpis.push([name + ' P&L', data.profit.toFixed(1)]);
    kpis.push([name + ' PF', pf.toFixed(2)]);
  }

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Session Performance</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Win rate and P&L by market session.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Session</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Total P&L</th><th style="padding:8px;text-align:right">Profit Factor</th></tr></thead><tbody>`);
  for (const [name, data] of Object.entries(sessions)) {
    const wr = data.trades.length ? (data.wins / data.trades.length) * 100 : 0;
    const grossWin = data.trades.filter(t => Number(t.grossProfit) > 0).reduce((a, t) => a + Number(t.grossProfit), 0);
    const grossLoss = Math.abs(data.trades.filter(t => Number(t.grossProfit) < 0).reduce((a, t) => a + Number(t.grossProfit), 0));
    const pf = grossLoss ? grossWin / grossLoss : 0;
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">${name}</td><td style="padding:8px;text-align:right">${data.trades.length}</td><td style="padding:8px;text-align:right;color:${wr >= 50 ? '#22c55e' : '#ef4444'};">${wr.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${data.profit >= 0 ? '#22c55e' : '#ef4444'};">${data.profit.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${pf >= 1 ? '#22c55e' : '#ef4444'};">${pf.toFixed(2)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'Market Session Analysis', description: 'Which market session is most profitable?', html: html.join(''), category: 'Time & Scheduling' };
}
