export default async function dailyPnl(events) {
  const closed = [];
  const pos = {};
  for (const e of events) {
    if (e.closePrice != null && e.grossProfit != null) {
      pos[e.positionId] = e;
    }
  }
  for (const k of Object.keys(pos)) closed.push(pos[k]);

  const dayMap = {};
  for (const t of closed) {
    const d = new Date(Number(t.time));
    const key = d.toISOString().slice(0, 10);
    dayMap[key] = (dayMap[key] || 0) + (Number(t.grossProfit) || 0);
  }
  const days = Object.keys(dayMap).sort();
  if (!days.length) {
    return { title: 'Daily P&L', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }
  const vals = days.map(d => dayMap[d]);
  const maxAbs = Math.max(1, ...vals.map(v => Math.abs(v)));
  const w = 1000;
  const h = 400;
  const pad = 50;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;

  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:300px;">`;
  svg += `<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`;
  svg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}" stroke="#475569" />`;
  svg += `<line x1="${pad}" y1="${h / 2}" x2="${w - pad}" y2="${h / 2}" stroke="#334155" stroke-dasharray="4" />`;

  const barW = Math.max(2, chartW / days.length - 1);
  for (let i = 0; i < days.length; i++) {
    const val = vals[i];
    const barH = (Math.abs(val) / maxAbs) * (chartH / 2);
    const x = pad + (i / days.length) * chartW;
    const y = val >= 0 ? (h / 2) - barH : (h / 2);
    const color = val >= 0 ? '#22c55e' : '#ef4444';
    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${color}" rx="1" />`;
  }
  // labels
  const step = Math.max(1, Math.floor(days.length / 8));
  for (let i = 0; i < days.length; i += step) {
    const x = pad + (i / days.length) * chartW + barW / 2;
    svg += `<text x="${x}" y="${h - pad + 16}" fill="#94a3b8" font-size="10" text-anchor="middle">${days[i].slice(5)}</text>`;
  }
  svg += `</svg>`;

  return {
    title: 'Daily P&L (Chronological)',
    description: 'Daily profit/loss for each trading day. Green = profitable, Red = losing.',
    html: svg,
  };
}
