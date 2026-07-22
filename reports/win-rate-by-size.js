export default async function winRateBySize(events) {
  const wins = {};
  const losses = {};
  for (const e of events) {
    if (e.closePrice != null) {
      const size = e.positionSize;
      wins[size] = (wins[size] || 0) + (e.grossProfit > 0 ? 1 : 0);
      losses[size] = (losses[size] || 0) + (e.grossProfit < 0 ? 1 : 0);
    }
  }
  const sizes = Object.keys(wins);
  const svg = `<svg width="100%" height="300">`;
  for (const size of sizes) {
    const winCount = wins[size] || 0;
    const lossCount = losses[size] || 0;
    const winRate = winCount / (winCount + lossCount);
    const x = sizes.indexOf(size) * 50;
    const y = 250 - winRate * 200;
    svg += `<rect x="${x}" y="${y}" width="40" height="${winRate * 200}" fill="#22c55e" />`;
  }
  svg += `</svg>`;
  return {
    title: 'Win Rate by Size',
    description: 'Win rate by position size.',
    html: svg,
  };
}