export default async function dailyPnlVsCount(events) {
  const pnls = {};
  const counts = {};
  for (const e of events) {
    if (e.closePrice != null) {
      const date = new Date(Number(e.time)).toISOString().slice(0, 10);
      pnls[date] = (pnls[date] || 0) + (Number(e.grossProfit) || 0);
      counts[date] = (counts[date] || 0) + 1;
    }
  }
  const dates = Object.keys(pnls).sort();
  if (!dates.length) {
    return { title: 'Daily P&L vs Count', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>', category: 'P&L & Returns' };
  }
  const vals = dates.map(d => pnls[d]);
  const countsArr = dates.map(d => counts[d]);
  const maxAbs = Math.max(1, ...vals.map(v => Math.abs(v)));
  const w = 1000, h = 400, pad = 50;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;
  const barW = Math.max(2, chartW / dates.length - 1);

  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:300px;">`;
  svg += `<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`;
  svg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}" stroke="#475569" />`;
  svg += `<line x1="${pad}" y1="${h / 2}" x2="${w - pad}" y2="${h / 2}" stroke="#334155" stroke-dasharray="4" />`;
  svg += `<text x="14" y="${h/2}" fill="#94a3b8" font-size="12" text-anchor="middle" transform="rotate(-90 14 ${h/2})">P&L ($)</text>`;
  svg += `<text x="${w/2}" y="${h - 10}" fill="#94a3b8" font-size="12" text-anchor="middle">Date</text>`;

  for (let i = 0; i < dates.length; i++) {
    const val = vals[i];
    const barH = (Math.abs(val) / maxAbs) * (chartH / 2);
    const x = pad + (i / dates.length) * chartW;
    const y = val >= 0 ? (h / 2) - barH : (h / 2);
    const color = val >= 0 ? '#22c55e' : '#ef4444';
    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${color}" rx="1" />`;
    svg += `<text x="${x + barW/2}" y="${h - pad + 14}" fill="#94a3b8" font-size="9" text-anchor="middle">${dates[i].slice(5)}</text>`;
    svg += `<text x="${x + barW/2}" y="${y - 6}" fill="#e2e8f0" font-size="10" text-anchor="middle">${countsArr[i]}</text>`;
  }
  svg += `</svg>`;

  return {
    title: 'Daily P&L vs Count',
    description: 'Daily P&L with trade count labels. Green = profitable, Red = losing. Numbers on bars = trades that day.',
    html: svg,
    category: 'P&L & Returns',
  };
}
