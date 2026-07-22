export default async function dailyLossDistribution(events) {
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
  const losses = Object.values(dayMap).filter(v => v < 0);
  if (!losses.length) {
    return { title: 'Distribution of Daily Losses', description: 'No losing days found.', html: '<p style="color:#94a3b8">No data.</p>' };
  }
  const mean = losses.reduce((a, b) => a + b, 0) / losses.length;
  const sorted = losses.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  const min = Math.min(...losses);
  const max = Math.max(...losses);
  const bins = 10;
  const width = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const v of losses) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    counts[idx] += 1;
  }
  const maxCount = Math.max(...counts);
  const barW = 60;
  const chartH = 250;
  const pad = 40;
  const totalW = pad * 2 + bins * (barW + 4);

  let svg = `<svg viewBox="0 0 ${totalW} 300" style="width:100%;height:auto;min-height:250px;">`;
  for (let i = 0; i < bins; i++) {
    const x = pad + i * (barW + 4);
    const barH = maxCount ? (counts[i] / maxCount) * chartH : 0;
    const y = 250 - barH;
    const label = (min + i * width).toFixed(0);
    svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#ef4444" rx="2" />`;
    svg += `<text x="${x + barW / 2}" y="${265}" fill="#94a3b8" font-size="9" text-anchor="middle">${label}</text>`;
  }
  const meanY = 250 - (mean - min) / (max - min || 1) * chartH;
  const medY = 250 - (median - min) / (max - min || 1) * chartH;
  svg += `<line x1="${pad}" y1="${meanY}" x2="${totalW - pad}" y2="${meanY}" stroke="#38bdf8" stroke-dasharray="3" />`;
  svg += `<line x1="${pad}" y1="${medY}" x2="${totalW - pad}" y2="${medY}" stroke="#22d3ee" stroke-dasharray="3" />`;
  svg += `<text x="${totalW/2}" y="296" fill="#94a3b8" font-size="11" text-anchor="middle">Loss Amount ($)</text>`;
  svg += `<text x="14" y="150" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 150)">Frequency</text>`;
  svg += `</svg>`;
  const legend = `<div style="display:flex;gap:16px;justify-content:center;margin-top:8px;color:#94a3b8;font-size:13px;">
    <span>Days: ${losses.length}</span>
    <span>Mean: ${mean.toFixed(1)}</span>
    <span>Median: ${median.toFixed(1)}</span>
  </div>`;
  return { title: 'Distribution of Daily Losses', description: 'Histogram of losing days with mean and median markers.', html: svg + legend, category: 'P&L & Returns' };
}
