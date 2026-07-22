export default async function cumulativePnLWithDrawdown(events) {
  const closed = [];
  const pos = {};
  for (const e of events) {
    if (e.closePrice != null && e.grossProfit != null) {
      pos[e.positionId] = e;
    }
  }
  for (const k of Object.keys(pos)) closed.push(pos[k]);
  closed.sort((a, b) => Number(a.time) - Number(b.time));

  let cum = 0;
  let peak = 0;
  const pts = [];
  for (const t of closed) {
    cum += Number(t.grossProfit) || 0;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    const d = new Date(Number(t.time));
    pts.push({ day: d.toISOString().slice(0, 10), cum, dd, peak });
  }
  if (!pts.length) {
    return { title: 'Cumulative P&L with Drawdown', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }
  const maxCum = Math.max(...pts.map(p => p.cum));
  const minCum = Math.min(...pts.map(p => p.cum));
  const maxDd = Math.max(...pts.map(p => p.dd));
  const yMax = maxCum + maxDd * 0.1;
  const yMin = minCum - maxDd * 0.1;
  const w = 1000, h = 400, pad = 50;
  const cw = w - pad * 2, ch = h - pad * 2;

  function sy(v) { return pad + ((yMax - v) / (yMax - yMin || 1)) * ch; }
  function sx(i) { return pad + (i / (pts.length - 1 || 1)) * cw; }

  let path = `M ${sx(0)} ${sy(pts[0].cum)}`;
  let area = `M ${sx(0)} ${sy(pts[0].peak)}`;
  for (let i = 1; i < pts.length; i++) {
    path += ` L ${sx(i)} ${sy(pts[i].cum)}`;
    area += ` L ${sx(i)} ${sy(pts[i].peak)}`;
  }
  area += ` L ${sx(pts.length - 1)} ${sy(pts[pts.length - 1].cum)}`;
  area += ` Z`;

  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:300px;">`;
  svg += `<path d="${area}" fill="#ef4444" opacity="0.15" />`;
  svg += `<path d="${path}" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linejoin="round" />`;
  svg += `<line x1="${pad}" y1="${pad}" x2="${w - pad}" y2="${pad}" stroke="#334155" stroke-dasharray="3" />`;
  svg += `<text x="${w / 2}" y="${h - 8}" fill="#94a3b8" font-size="12" text-anchor="middle">Time</text>`;
  svg += `<text x="14" y="${h/2}" fill="#94a3b8" font-size="12" text-anchor="middle" transform="rotate(-90 14 ${h/2})">Equity / Drawdown ($)</text>`;
  svg += `</svg>`;
  const legend = `<div style="display:flex;gap:16px;justify-content:center;margin-top:8px;color:#94a3b8;font-size:13px;">
    <span><span style="display:inline-block;width:12px;height:3px;background:#38bdf8;margin-right:4px;"></span>Equity</span>
    <span><span style="display:inline-block;width:12px;height:8px;background:#ef4444;opacity:0.4;margin-right:4px;"></span>Drawdown</span>
  </div>`;
  return { title: 'Cumulative P&L with Drawdown', description: 'Account growth over time with drawdown shaded.', html: svg + legend, category: 'P&L & Returns' };
}
