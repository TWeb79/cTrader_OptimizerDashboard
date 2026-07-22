export default async function positionSizeVsPnl(events) {
  const buckets = { '<0.5': { total: 0, count: 0, wins: 0, losses: 0 }, '0.5-1.0': { total: 0, count: 0, wins: 0, losses: 0 }, '1.0-1.5': { total: 0, count: 0, wins: 0, losses: 0 }, '1.5-2.0': { total: 0, count: 0, wins: 0, losses: 0 }, '2.0+': { total: 0, count: 0, wins: 0, losses: 0 } };
  for (const e of events) {
    if (e.closePrice != null) {
      const v = Number(e.volume) || 0;
      const p = Number(e.grossProfit) || 0;
      let key = '2.0+';
      if (v < 0.5) key = '<0.5';
      else if (v < 1.0) key = '0.5-1.0';
      else if (v < 1.5) key = '1.0-1.5';
      else if (v < 2.0) key = '1.5-2.0';
      if (buckets[key]) {
        buckets[key].total += p;
        buckets[key].count += 1;
        if (p > 0) buckets[key].wins += 1;
        if (p < 0) buckets[key].losses += 1;
      }
    }
  }

  const keys = Object.keys(buckets);
  const maxVal = Math.max(...keys.map(k => Math.abs(buckets[k].total)), 1);
  const maxCount = Math.max(...keys.map(k => buckets[k].count), 1);

  let svg = `<svg viewBox="0 0 960 300" style="width:100%;height:auto;min-height:240px;">`;
  svg += `<line x1="40" y1="260" x2="940" y2="260" stroke="#475569" />`;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const b = buckets[key];
    const x = 60 + i * 180;
    const barH = (Math.abs(b.total) / maxVal) * 200;
    const y = b.total >= 0 ? 260 - barH : 260;
    const color = b.total >= 0 ? '#22c55e' : '#ef4444';
    svg += `<rect x="${x}" y="${y}" width="120" height="${barH}" fill="${color}" rx="2" />`;
    svg += `<text x="${x + 60}" y="280" fill="#94a3b8" font-size="11" text-anchor="middle">${key}</text>`;
    svg += `<text x="${x + 60}" y="${y - 6}" fill="#e2e8f0" font-size="12" text-anchor="middle">${b.total.toFixed(1)}</text>`;
  }
  svg += `<text x="520" y="295" fill="#94a3b8" font-size="11" text-anchor="middle">Volume Bucket</text>`;
  svg += `<text x="14" y="150" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 150)">Total P&L ($)</text>`;
  svg += `</svg>`;

  let table = `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Volume</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Total P&L</th><th style="padding:8px;text-align:right">Avg P&L</th></tr></thead><tbody>`;
  for (const key of keys) {
    const b = buckets[key];
    const wr = b.count ? (b.wins / b.count) * 100 : 0;
    const avg = b.count ? b.total / b.count : 0;
    const color = b.total >= 0 ? '#22c55e' : '#ef4444';
    table += `<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#94a3b8;">${key}</td><td style="padding:8px;text-align:right">${b.count}</td><td style="padding:8px;text-align:right">${wr.toFixed(0)}%</td><td style="padding:8px;text-align:right;color:${color};">${b.total.toFixed(1)}</td><td style="padding:8px;text-align:right">${avg.toFixed(1)}</td></tr>`;
  }
  table += `</tbody></table>`;

  const html = `<div class="report-header"><h2>Position Size vs P&L</h2><p>Aggregated P&L by volume buckets (using actual 'volume' field).</p></div><div class="report-body">${svg}<p style="color:#94a3b8;font-size:13px;margin-top:8px;margin-bottom:8px;">Does larger position size correlate with higher profit or higher risk?</p>${table}</div>`;

  return { title: 'Position Size vs P&L', description: 'Aggregated profit/loss by volume bucket.', html, category: 'Trade Quality & Sizing' };
}
