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
  svg += `</svg>`;
  return {
    title: 'Daily P&L vs Count',
    description: 'Daily profit/loss vs trade count.',
    html: svg,
  };
}