export default async function (events) {
  const positionEnds = new Map();

  for (const e of events) {
    if (e.closePrice != null && e.grossProfit != null) {
      positionEnds.set(e.positionId, e);
    }
  }

  const closedTrades = Array.from(positionEnds.values());
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cellData = {};

  for (const trade of closedTrades) {
    const d = new Date(Number(trade.time));
    const day = dayNames[d.getDay()];
    const hour = d.getHours();
    const key = `${day}|${hour}`;
    if (!cellData[key]) cellData[key] = { sum: 0, count: 0 };
    cellData[key].sum += Number(trade.grossProfit) || 0;
    cellData[key].count += 1;
  }

  const cells = [];
  for (const [key, val] of Object.entries(cellData)) {
    const [day, hourStr] = key.split('|');
    cells.push({
      day,
      hour: parseInt(hourStr, 10),
      avg: val.sum / val.count,
      count: val.count,
    });
  }

  const values = cells.map((c) => c.avg);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  function getColor(value) {
    if (max === min) return 'rgb(200,200,200)';
    const t = (value - min) / (max - min);
    let r, g, b;
    if (t < 0.5) {
      const s = t * 2;
      r = Math.round(239 + (251 - 239) * s);
      g = Math.round(68 + (191 - 68) * s);
      b = Math.round(68 + (36 - 68) * s);
    } else {
      const s = (t - 0.5) * 2;
      r = Math.round(251 + (34 - 251) * s);
      g = Math.round(191 + (197 - 191) * s);
      b = Math.round(36 + (94 - 36) * s);
    }
    return `rgb(${r},${g},${b})`;
  }

  let html = `<div class="heatmap-wrap"><table class="heatmap"><thead><tr><th>Day</th>`;
  for (let h = 0; h < 24; h++) {
    html += `<th>${String(h).padStart(2, '0')}:00</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (const day of dayNames) {
    html += `<tr><th>${day}</th>`;
    for (let h = 0; h < 24; h++) {
      const cell = cells.find((c) => c.day === day && c.hour === h);
      if (cell) {
        html += `<td class="cell" style="background:${getColor(cell.avg)}" title="Avg profit: ${cell.avg.toFixed(2)} (${cell.count} trades)">${cell.avg.toFixed(1)}</td>`;
      } else {
        html += `<td class="cell empty">-</td>`;
      }
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  html += `<div class="heatmap-legend"><span>Low</span><div class="bar"></div><span>High</span></div>`;
  html += `</div>`;

  return {
    title: 'Day & Hour Performance Heatmap',
    description: 'Average gross profit of closed trades grouped by day of week and hour of day. Empty cells indicate no trades.',
    html,
  };
}
