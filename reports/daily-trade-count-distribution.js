export default async function dailyTradeCountDistribution(events) {
  const pos = {};
  for (const e of events) {
    if (e.closePrice != null) {
      pos[e.positionId] = e;
    }
  }
  const closed = Object.values(pos);

  const trades = {};
  for (const e of closed) {
    const date = new Date(Number(e.time)).toISOString().slice(0, 10);
    trades[date] = (trades[date] || 0) + 1;
  }
  const dates = Object.keys(trades).sort();
  const values = dates.map(d => trades[d]);
  if (!dates.length) {
    return { title: 'Daily Trade Count Distribution', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>', category: 'P&L & Returns' };
  }
  const max = Math.max(...values);
  const w = 1000, h = 300, pad = 50;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;
  const barW = Math.max(2, chartW / dates.length - 1);

  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:240px;">`;
  svg += `<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`;
  svg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}" stroke="#475569" />`;
  svg += `<text x="14" y="${h/2}" fill="#94a3b8" font-size="12" text-anchor="middle" transform="rotate(-90 14 ${h/2})">Trade Count</text>`;
  svg += `<text x="${w/2}" y="${h - 10}" fill="#94a3b8" font-size="12" text-anchor="middle">Date</text>`;

  for (let i = 0; i < dates.length; i++) {
    const val = values[i];
    const barH = (val / max) * chartH;
    const x = pad + (i / dates.length) * chartW;
    const y = h - pad - barH;
    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#22c55e" rx="1" />`;
    svg += `<text x="${x + barW/2}" y="${h - pad + 14}" fill="#94a3b8" font-size="9" text-anchor="middle">${dates[i].slice(5)}</text>`;
    svg += `<text x="${x + barW/2}" y="${y - 6}" fill="#e2e8f0" font-size="10" text-anchor="middle">${val}</text>`;
  }
  svg += `</svg>`;

  return {
    title: 'Daily Trade Count Distribution',
    description: 'Trade count per day over time.',
    html: svg,
    category: 'P&L & Returns',
  };
}
