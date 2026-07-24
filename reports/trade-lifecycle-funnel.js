export default async function tradeLifecycleFunnel(events) {
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

    const entry = Number(create.entryPrice);
    const exit = Number(close.closePrice);
    const type = close.type;
    const profit = Number(close.grossProfit) || 0;
    const sl = close.sl;
    const tp = close.tp;

    let hitBE = false;
    let hitProfit = false;
    let hitTP = false;
    let hitSL = false;

    const sorted = evts.sort((a, b) => Number(a.time) - Number(b.time));
    for (const ev of sorted) {
      if (ev.sl != null && ev.sl !== close.sl) {
        const slPrice = Number(ev.sl);
        if (type === 'Buy' && slPrice > entry) hitBE = true;
        if (type === 'Sell' && slPrice < entry) hitBE = true;
        if (type === 'Buy' && slPrice >= exit) hitSL = true;
        if (type === 'Sell' && slPrice <= exit) hitSL = true;
      }
      if (ev.tp != null) {
        const tpPrice = Number(ev.tp);
        hitTP = true;
      }
    }

    if (profit > 0) hitProfit = true;
    if (close.event === 'Stop Loss Hit') hitSL = true;
    if (hitSL && profit < 0) hitProfit = false;

    trades.push({
      positionId: pid,
      type,
      entry,
      exit,
      profit,
      hitBE,
      hitProfit,
      hitTP,
      hitSL,
    });
  }

  if (!trades.length) {
    return { title: 'Trade Lifecycle Funnel', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>', category: 'Risk & Loss Analysis' };
  }

  const total = trades.length;
  const toBE = trades.filter(t => t.hitBE).length;
  const toProfit = trades.filter(t => t.hitProfit).length;
  const toTP = trades.filter(t => t.hitTP).length;
  const toSL = trades.filter(t => t.hitSL).length;

  const html = [];
  html.push(`<div class="report-header"><h2>Trade Lifecycle Funnel</h2><p>Shows progression: Entry → Break-even → Partial Profit → Full Target → Stop Loss. Reveals where trades fail or succeed.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:120px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Total Trades', String(total)],
    ['To Break-even', String(toBE)],
    ['To Profit', String(toProfit)],
    ['To TP Hit', String(toTP)],
    ['To SL Hit', String(toSL)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Funnel Visualization</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Each stage shows how many trades reached that milestone.</p>`);
  const stages = [
    { label: 'Entry', count: total, color: '#38bdf8' },
    { label: 'Break-even', count: toBE, color: '#22d3ee' },
    { label: 'Partial Profit', count: toProfit, color: '#22c55e' },
    { label: 'Take Profit', count: toTP, color: '#16a34a' },
    { label: 'Stop Loss', count: toSL, color: '#ef4444' },
  ];
  const maxW = 400;
  const minW = 80;
  html.push(`<div style="display:flex;flex-direction:column;gap:8px;max-width:${maxW}px;">`);
  for (const s of stages) {
    const w = ((s.count / total) * (maxW - minW)) + minW;
    html.push(`<div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:12px;color:#94a3b8;min-width:100px;">${s.label}</span>
      <div style="background:${s.color};height:28px;width:${w}px;border-radius:6px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;color:#fff;font-size:12px;font-weight:600;">${s.count}</div>
    </div>`);
  }
  html.push('</div></div>');

  html.push(`<div class="report-body"><h3>Funnel Stage Summary</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Conversion rates between stages.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Stage</th><th style="padding:8px;text-align:right;">Count</th><th style="padding:8px;text-align:right;">% of Entry</th><th style="padding:8px;text-align:right;">Drop-off</th></tr></thead><tbody>`);
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    const prev = stages[i - 1];
    const pct = total ? (s.count / total) * 100 : 0;
    const drop = prev ? prev.count - s.count : 0;
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${s.label}</td><td style="padding:8px;text-align:right;">${s.count}</td><td style="padding:8px;text-align:right;">${pct.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${drop > 0 ? '#ef4444' : '#22c55e'};">${drop > 0 ? '-' + drop : (drop < 0 ? '+' + Math.abs(drop) : '0')}</td></tr>`);
  }
  html.push('</tbody></table></div>');

  return { title: 'Trade Lifecycle Funnel', description: 'Funnel analysis of trade progression from entry to exit.', html: html.join(''), category: 'Risk & Loss Analysis' };
}