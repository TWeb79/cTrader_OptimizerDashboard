export default async function positionSizeVsPnl(events) {
  const sizes = {};
  for (const e of events) {
    if (e.closePrice != null) {
      const size = e.positionSize;
      sizes[size] = (sizes[size] || 0) + e.grossProfit;
    }
  }
  const sizeKeys = Object.keys(sizes);
  let svg = `<svg width="100%" height="300">`;
  for (const size of sizeKeys) {
    const pnl = sizes[size];
    const x = sizeKeys.indexOf(size) * 50;
    const y = 250 - (pnl / Math.max(...Object.values(sizes))) * 200;
    svg += `<rect x="${x}" y="${y}" width="40" height="${(pnl / Math.max(...Object.values(sizes))) * 200}" fill="#22c55e" />`;
  }
  svg += `</svg>`;
  return {
    title: 'Position Size vs P&L',
    description: 'Profit/loss by position size.',
    html: svg,
  };
}