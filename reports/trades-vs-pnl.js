export default async function tradesVsPnl(events) {
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
    if (!dayMap[key]) dayMap[key] = { pnl: 0, count: 0 };
    dayMap[key].pnl += Number(t.grossProfit) || 0;
    dayMap[key].count += 1;
  }
  const days = Object.keys(dayMap).sort();
  const points = days.map(d => [dayMap[d].count, dayMap[d].pnl, dayMap[d].pnl >= 0 ? '#22c55e' : '#ef4444']);

  const corr = pearson(points.map(p => p[0]), points.map(p => p[1]));
  const svg = scatterSvg(points, 800, 400, 'Trades', 'Daily P&L', '#ef4444');
  const label = `<div style="text-align:center;margin-top:8px;color:#94a3b8;font-size:13px;">Correlation = ${corr.toFixed(3)} &nbsp;|&nbsp; ${points.length} days</div>`;

  return {
    title: 'Trades per Day vs Daily P&L',
    description: 'Relationship between number of trades and daily profit/loss.',
    html: svg + label,
  };
}

function pearson(x, y) {
  const n = x.length;
  if (!n) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

function scatterSvg(points, w, h, xlabel, ylabel, neutralColor) {
  const pad = 50;
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:300px;">`;
  svg += `<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`;
  svg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}" stroke="#475569" />`;
  svg += `<text x="${w / 2}" y="${h - 8}" fill="#94a3b8" font-size="12" text-anchor="middle">${xlabel}</text>`;
  svg += `<text x="16" y="${h / 2}" fill="#94a3b8" font-size="12" text-anchor="middle" transform="rotate(-90 16 ${h / 2})">${ylabel}</text>`;

  for (const [x, y, c] of points) {
    const cx = pad + ((x - minX) / rangeX) * (w - pad * 2);
    const cy = (h - pad) - ((y - minY) / rangeY) * (h - pad * 2);
    svg += `<circle cx="${cx}" cy="${cy}" r="4" fill="${c || neutralColor || '#38bdf8'}" opacity="0.85" />`;
  }
  svg += `</svg>`;
  return svg;
}
