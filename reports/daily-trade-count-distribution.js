export default async function dailyTradeCountDistribution(events) {
  const trades = {};
  for (const e of events) {
    if (e.closePrice != null) {
      const date = new Date(e.time).toISOString().slice(0, 10);
      trades[date] = (trades[date] || 0) + 1;
    }
  }
  const dates = Object.keys(trades).sort();
  const values = dates.map(d => trades[d]);
  const max = Math.max(...values);
  const svg = `<svg width="100%" height="300">`;
  for (let i = 0; i < dates.length; i++) {
    const val = values[i];
    const barHeight = (val / max) * 200;
    const x = i / dates.length * 100 + 5;
    const y = 250 - barHeight;
    svg += `<rect x="${x}" y="${y}" width="10" height="${barHeight}" fill="#22c55e" />`;
  }
  svg += `</svg>`;
  return {
    title: 'Daily Trade Count Distribution',
    description: 'Distribution of daily trade counts.',
    html: svg,
  };
}