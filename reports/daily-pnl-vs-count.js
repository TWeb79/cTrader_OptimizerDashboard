export default async function dailyPnlVsCount(events) {
  const pnls = {};
  const counts = {};
  for (const e of events) {
    if (e.closePrice != null) {
      const date = new Date(e.time).toISOString().slice(0, 10);
      pnls[date] = (pnls[date] || 0) + e.grossProfit;
      counts[date] = (counts[date] || 0) + 1;
    }
  }
  const dates = Object.keys(pnls);
  let svg = `<svg width="100%" height="300">`;
  for (const date of dates) {
    const pnl = pnls[date];
    const count = counts[date];
    const x = dates.indexOf(date) * 50;
    const y = 250 - (pnl / count) * 200;
    svg += `<rect x="${x}" y="${y}" width="40" height="${(pnl / count) * 200}" fill="#22c55e" />`;
  }
  svg += `<text x="${dates.length * 25}" y="290" fill="#94a3b8" font-size="11" text-anchor="middle">Date</text>`;
  svg += `<text x="14" y="150" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 150)">Avg P&L ($)</text>`;
  svg += `</svg>`;
  return {
    title: 'Daily P&L vs Count',
    description: 'Daily profit/loss vs trade count.',
    html: svg,
    category: 'P&L & Returns',
  };
}