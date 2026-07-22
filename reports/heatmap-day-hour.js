export default async function heatmapDayHour(events) {
  const trades = {};
  for (const e of events) {
    if (e.closePrice != null) {
      const date = new Date(e.time);
      const day = date.toLocaleDateString();
      const hour = date.getHours();
      trades[day] = trades[day] || {};
      trades[day][hour] = (trades[day][hour] || 0) + 1;
    }
  }
  let svg = `<svg width="100%" height="300">`;
  for (const day in Object.keys(trades)) {
    for (const hour in Object.keys(trades[day])) {
      const count = trades[day][hour];
      const x = new Date(day).getTime() / (1000 * 60 * 60 * 24);
      const y = hour * 20;
      svg += `<rect x="${x}" y="${y}" width="10" height="10" fill="#22c55e" />`;
    }
  }
  svg += `</svg>`;
  return {
    title: 'Heatmap Day Hour',
    description: 'Heatmap of trades by day and hour.',
    html: svg,
  };
}