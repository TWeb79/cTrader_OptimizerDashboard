export default async function winRateBySize(events) {
  const wins = {};
  const losses = {};
  for (const e of events) {
    if (e.closePrice != null) {
      const v = Number(e.volume) || 0;
      let key;
      if (v < 1) key = '<1';
      else if (v < 2) key = '1-2';
      else if (v < 5) key = '2-5';
      else if (v < 10) key = '5-10';
      else if (v < 20) key = '10-20';
      else key = '20+';
      wins[key] = (wins[key] || 0) + (e.grossProfit > 0 ? 1 : 0);
      losses[key] = (losses[key] || 0) + (e.grossProfit < 0 ? 1 : 0);
    }
  }
  const sizes = ['<1', '1-2', '2-5', '5-10', '10-20', '20+'];
  const rates = sizes.map(s => {
    const w = wins[s] || 0;
    const l = losses[s] || 0;
    const total = w + l;
    return total === 0 ? 0 : (w / total) * 100;
  });

  const w = 960, h = 300, pad = 50;
  const chartW = w - pad * 2;
  const barW = Math.max(4, chartW / sizes.length - 12);

  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:240px;">`;
  svg += `<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`;
  svg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}" stroke="#475569" />`;
  for (let i = 0; i < sizes.length; i++) {
    const x = pad + (i + 0.5) * (chartW / sizes.length);
    const barH = (rates[i] / 100) * (h - pad * 2);
    const y = h - pad - barH;
    svg += `<rect x="${x - barW/2}" y="${y}" width="${barW}" height="${barH}" fill="#22c55e" rx="2" />`;
    svg += `<text x="${x}" y="${h - pad + 16}" fill="#94a3b8" font-size="10" text-anchor="middle">${sizes[i]}</text>`;
    svg += `<text x="${x}" y="${y - 6}" fill="#e2e8f0" font-size="11" text-anchor="middle">${rates[i].toFixed(0)}%</text>`;
  }
  svg += `<text x="14" y="${h/2}" fill="#94a3b8" font-size="11" text-anchor="middle" transform="rotate(-90 14 ${h/2})">Win Rate (%)</text>`;
  svg += `<text x="${w/2}" y="${h - 10}" fill="#94a3b8" font-size="12" text-anchor="middle">Volume</text>`;
  svg += `</svg>`;

  return {
    title: 'Win Rate by Size',
    description: 'Win rate by position size bucket.',
    html: svg,
    category: 'Trade Quality & Sizing',
  };
}
