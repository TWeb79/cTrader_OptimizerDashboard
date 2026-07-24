export default async function riskVsReturnBubble(events) {
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
    const profit = Number(close.grossProfit) || 0;
    const volume = Number(close.volume) || 1;
    const pips = Number(close.pips) || 0;
    const type = close.type;

    const date = new Date(Number(close.time));
    const day = date.getDay();
    const hour = date.getHours();

    let maxEquity = Math.max(...evts.map(ev => Number(ev.equity)).filter(v => !isNaN(v)));
    let minEquity = Math.min(...evts.map(ev => Number(ev.equity)).filter(v => !isNaN(v)));
    const entryEquity = Number(create.equity) || (minEquity + maxEquity) / 2;
    const mfe = maxEquity - entryEquity;
    const mae = Math.max(0, entryEquity - minEquity);

    trades.push({
      positionId: pid,
      profit,
      volume,
      pips,
      type,
      day,
      hour,
      risk: mae,
      return: mfe,
    });
  }

  if (!trades.length) {
    return { title: 'Risk vs Return Bubble', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>', category: 'P&L & Returns' };
  }

  const totalProfit = trades.reduce((a, t) => a + t.profit, 0);
  const totalVolume = trades.reduce((a, t) => a + t.volume, 0);
  const avgRisk = trades.reduce((a, t) => a + t.risk, 0) / trades.length;
  const avgReturn = trades.reduce((a, t) => a + t.return, 0) / trades.length;

  const html = [];
  html.push(`<div class="report-header"><h2>Risk vs Return Bubble</h2><p>Visualizes reward-to-risk distribution. Bubble size = position size, X/Y = MFE/MAE.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:140px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Total P&L', totalProfit >= 0 ? '+$' + totalProfit.toFixed(1) : '-$' + Math.abs(totalProfit).toFixed(1)],
    ['Avg Risk', avgRisk.toFixed(1)],
    ['Avg Return', avgReturn.toFixed(1)],
    ['Avg R:R', (avgReturn / (avgRisk || 1)).toFixed(2) + ':1'],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle};color:${k[0] === 'Total P&L' ? (totalProfit >= 0 ? '#22c55e' : '#ef4444') : '#e2e8f0'}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Risk-Return Scatter (Bubble)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Green = winner, Red = loser. Larger bubbles = larger position size.</p>`);
  html.push(bubbleChart(trades));
  html.push(`</div>`);

  html.push(`<div class="report-body"><h3>Quartile Analysis</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Risk-return profile breakdown.</p>`);
  html.push(quartileTable(trades));
  html.push(`</div>`);

  return { title: 'Risk vs Return Bubble', description: 'Reward-to-risk distribution visualization.', html: html.join(''), category: 'P&L & Returns' };
}

function bubbleChart(trades) {
  const w = 800, h = 500, pad = 60;
  const risks = trades.map(t => t.risk).filter(v => v > 0);
  const returns = trades.map(t => t.return).filter(v => v > 0);
  const minRisk = Math.min(...risks, 0);
  const maxRisk = Math.max(...risks, 1);
  const minRet = Math.min(...returns, 0);
  const maxRet = Math.max(...returns, 1);

  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:400px;">`;
  svg += `<rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" fill="none" stroke="#334155" rx="8" />`;
  svg += `<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`;
  svg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}" stroke="#475369" />`;
  svg += `<text x="${w / 2}" y="${h - 12}" fill="#94a3b8" font-size="13" text-anchor="middle">Risk (MAE)</text>`;
  svg += `<text x="16" y="${h / 2}" fill="#94a3b8" font-size="13" text-anchor="middle" transform="rotate(-90 16 ${h / 2})">Return (MFE)</text>`;

  const maxVol = Math.max(...trades.map(t => t.volume), 1);
  for (const t of trades) {
    const x = pad + ((t.risk - minRisk) / (maxRisk - minRisk || 1)) * (w - pad * 2);
    const y = (h - pad) - ((t.return - minRet) / (maxRet - minRet || 1)) * (h - pad * 2);
    const r = Math.max(3, Math.min(12, (t.volume / maxVol) * 15));
    const color = t.profit >= 0 ? '#22c55e' : '#ef4444';
    svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="0.6" stroke="#0f172a" stroke-width="1" />`;
  }
  svg += '</svg>';
  return svg;
}

function quartileTable(trades) {
  const sorted = [...trades].sort((a, b) => a.risk - b.risk);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q2 = sorted[Math.floor(sorted.length * 0.5)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const q4 = sorted[sorted.length - 1];

  let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Quartile</th><th style="padding:8px;text-align:right;">Risk (MAE)</th><th style="padding:8px;text-align:right;">Return (MFE)</th><th style="padding:8px;text-align:right;">R:R</th></tr></thead><tbody>`;
  const rows = [
    ['Q1 (Low Risk)', q1],
    ['Q2 (Low-Mid)', q2],
    ['Q3 (Mid-High)', q3],
    ['Q4 (High Risk)', q4],
  ];
  for (const [label, t] of rows) {
    if (t) {
      const rr = t.risk > 0 ? t.return / t.risk : 0;
      html += `<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${label}</td><td style="padding:8px;text-align:right;">${t.risk.toFixed(1)}</td><td style="padding:8px;text-align:right;">${t.return.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${rr >= 1 ? '#22c55e' : '#ef4444'};">${rr.toFixed(2)}:1</td></tr>`;
    }
  }
  html += '</tbody></table>';
  return html;
}