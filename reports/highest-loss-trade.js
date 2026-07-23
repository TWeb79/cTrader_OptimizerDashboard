export default async function highestLossTrade(events) {
  const closed = events.filter(e => e.closePrice != null);
  const losing = closed.filter(e => Number(e.grossProfit) < 0);
  if (!losing.length) {
    return { title: 'Highest Loss Trade', description: 'No losing trades available.', html: '<p style="color:#94a3b8">No data.</p>', category: 'Risk & Loss Analysis' };
  }
  const highestLoss = losing.reduce((max, current) => Number(current.grossProfit) < Number(max.grossProfit) ? current : max, { grossProfit: Infinity });
  if (!highestLoss.positionId) {
    return { title: 'Highest Loss Trade', description: 'No losing trades available.', html: '<p style="color:#94a3b8">No data.</p>', category: 'Risk & Loss Analysis' };
  }
  const html = `
    <h2>Highest Loss Trade</h2>
    <p><span class="trade-link" data-position-id="${highestLoss.positionId}">Click to inspect position #${highestLoss.positionId}</span></p>
    <p>Date: ${new Date(Number(highestLoss.time)).toISOString().slice(0, 10)}</p>
    <p>Time: ${new Date(Number(highestLoss.time)).toLocaleTimeString()}</p>
    <p>Volume: ${highestLoss.volume}</p>
    <p>Profit/Loss: ${highestLoss.grossProfit}</p>
  `;
  return {
    title: 'Highest Loss Trade',
    description: 'Insights for the highest loss trade',
    html,
    category: 'Risk & Loss Analysis',
  };
}
