export default async function winRateBySize(events) {
  const wins = {};
  const losses = {};
  for (const e of events) {
    if (e.closePrice != null) {
      const size = e.volume;
      wins[size] = (wins[size] || 0) + (e.grossProfit > 0 ? 1 : 0);
      losses[size] = (losses[size] || 0) + (e.grossProfit < 0 ? 1 : 0);
    }
  }
  const sizes = Object.keys(wins);
  let svg = `<svg width="100%" height="300">`;
  for (const size of sizes) {
    const winCount = wins[size] || 0;
    const lossCount = losses[size] || 0;
    const winRate = winCount / (winCount + lossCount);
    const x = sizes.indexOf(size) * 50;
    const y = 250 - winRate * 200;
    svg += `<rect x="${x}" y="${y}" width="40" height="${winRate * 200}" fill="#22c55e" />`;
  }
  svg += `<text x="${sizes.length * 50 / 2 || 0}" y="290" fill="#94a3b8" font-size="11" text-anchor="middle">Volume</text>`;
  svg += `<text x="14" y="150" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 150)">Win Rate</text>`;
  svg += `</svg>`;
  return {
    title: 'Win Rate by Size',
    description: 'Win rate by position size.',
    html: svg,
    category: 'Trade Quality & Sizing',
  };
}