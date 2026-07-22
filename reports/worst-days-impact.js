export default async function worstDaysImpact(events) {
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
  const dailyMap = {};
  for (const t of closed) {
    const d = new Date(Number(t.time));
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = (dailyMap[key] || 0) + (Number(t.grossProfit) || 0);
  }
  const days = Object.keys(dailyMap).sort();
  const actual = [];
  let actualCum = 0;
  for (const d of days) {
    actualCum += dailyMap[d];
    actual.push(actualCum);
  }

  const sortedDays = days.slice().sort((a, b) => dailyMap[a] - dailyMap[b]);
  const worst = sortedDays[0];
  const withoutWorst = [];
  let altCum = 0;
  for (const d of days) {
    if (d === worst) continue;
    altCum += dailyMap[d];
    withoutWorst.push(altCum);
  }
  if (!actual.length) return { title: 'Worst Days Impact', description: 'No closed trade data.', html: '<p style="color:#94a3b8">No data.</p>' };

  const len = Math.max(actual.length, withoutWorst.length);
  const vals = [...actual, ...withoutWorst];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const yMin = min - Math.abs(max - min) * 0.05;
  const yMax = max + Math.abs(max - min) * 0.05;
  const w = 1000, h = 400, pad = 50;
  const ch = h - pad * 2, cw = w - pad * 2;

  function sx(i, arr) { return pad + (i / (arr.length - 1 || 1)) * cw; }
  function sy(v) { return pad + ((yMax - v) / (yMax - yMin || 1)) * ch; }
  function line(arr, color) {
    let d = `M ${sx(0, arr)} ${sy(arr[0])}`;
    for (let i = 1; i < arr.length; i++) d += ` L ${sx(i, arr)} ${sy(arr[i])}`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" />`;
  }

  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:300px;">`;
  svg += `<line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="#475569" />`;
  svg += line(actual, '#38bdf8');
  svg += line(withoutWorst, '#f472b6');
  svg += `<text x="${w/2}" y="${h-8}" fill="#94a3b8" font-size="12" text-anchor="middle">Time</text>`;
  svg += `<text x="14" y="${h/2}" fill="#94a3b8" font-size="12" text-anchor="middle" transform="rotate(-90 14 ${h/2})">Cumulative P&L ($)</text>`;
  svg += `</svg>`;
  const legend = `<div style="display:flex;gap:16px;justify-content:center;margin-top:8px;color:#94a3b8;font-size:13px;">
    <span><span style="display:inline-block;width:12px;height:3px;background:#38bdf8;margin-right:4px;"></span>Actual</span>
    <span><span style="display:inline-block;width:12px;height:3px;background:#f472b6;margin-right:4px;"></span>Without worst day</span>
    <span>${worst} lost ${dailyMap[worst].toFixed(1)}</span>
  </div>`;
  return { title: 'Cumulative P&L Impact of Worst Days', description: 'Two equity curves showing damage from extreme losses.', html: svg + legend, category: 'P&L & Returns' };
}
