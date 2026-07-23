export default async function consecutiveDaysImpact(events) {
  const closed = [];
  const pos = {};
  for (const e of events) {
    if (e.closePrice != null) {
      pos[e.positionId] = e;
    }
  }
  const sorted = Object.values(pos).sort((a, b) => Number(a.time) - Number(b.time));
  for (const t of sorted) closed.push(t);

  if (!closed.length) {
    return { title: 'Consecutive Days Impact', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const dateMap = {};
  for (const t of closed) {
    const d = new Date(Number(t.time)).toISOString().slice(0, 10);
    if (!dateMap[d]) dateMap[d] = { trades: [], profit: 0, wins: 0, losses: 0 };
    const p = Number(t.grossProfit) || 0;
    dateMap[d].trades.push(t);
    dateMap[d].profit += p;
    if (p > 0) dateMap[d].wins++;
    if (p < 0) dateMap[d].losses++;
  }

  const dates = Object.keys(dateMap).sort();
  const streaks = [];
  let currentStreak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      currentStreak++;
    } else {
      streaks.push({ length: currentStreak, start: dates[i - currentStreak], end: dates[i - 1] });
      currentStreak = 1;
    }
  }
  streaks.push({ length: currentStreak, start: dates[dates.length - currentStreak], end: dates[dates.length - 1] });

  const streakStats = {};
  for (let n = 1; n <= Math.max(...streaks.map(s => s.length)); n++) {
    const matching = streaks.filter(s => s.length === n);
    if (!matching.length) continue;
    const allDates = matching.flatMap(s => {
      const arr = [];
      const start = new Date(s.start);
      for (let i = 0; i < s.length; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        arr.push(d.toISOString().slice(0, 10));
      }
      return arr;
    });
    const trades = allDates.flatMap(d => dateMap[d]?.trades || []);
    const profit = trades.reduce((a, t) => a + (Number(t.grossProfit) || 0), 0);
    const wins = trades.filter(t => Number(t.grossProfit) > 0).length;
    streakStats[n] = {
      occurrences: matching.length,
      trades: trades.length,
      profit,
      winRate: trades.length ? (wins / trades.length) * 100 : 0,
    };
  }

  const restDays = [];
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff > 1) {
      const trades = dateMap[dates[i]]?.trades || [];
      const profit = trades.reduce((a, t) => a + (Number(t.grossProfit) || 0), 0);
      restDays.push({ afterGap: diff, trades: trades.length, profit });
    }
  }

  const html = [];
  html.push(`<div class="report-header"><h2>Consecutive Days Impact</h2><p>Does the bot need rest days? What happens when it trades N consecutive days?</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Trading Days', String(dates.length)],
    ['Max Streak', String(Math.max(...streaks.map(s => s.length)))],
    ['Avg Streak', streaks.length ? (streaks.reduce((a, s) => a + s.length, 0) / streaks.length).toFixed(1) : '0'],
    ['Rest Days', String(restDays.length)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  html.push(`<div class="report-body"><h3>Performance by Consecutive Streak Length</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Grouping trading days by how many days in a row the bot was active.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Streak Length</th><th style="padding:8px;text-align:right">Occurrences</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Total P&L</th></tr></thead><tbody>`);
  for (const [len, stats] of Object.entries(streakStats)) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">${len} day${Number(len) > 1 ? 's' : ''}</td><td style="padding:8px;text-align:right">${stats.occurrences}</td><td style="padding:8px;text-align:right">${stats.trades}</td><td style="padding:8px;text-align:right;color:${stats.winRate >= 50 ? '#22c55e' : '#ef4444'};">${stats.winRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${stats.profit >= 0 ? '#22c55e' : '#ef4444'};">${stats.profit.toFixed(1)}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  if (restDays.length) {
    html.push(`<div class="report-body"><h3>After Rest Day Performance</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Performance on the first trading day after a gap of 2+ days.</p>`);
    html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Gap (days)</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">P&L</th></tr></thead><tbody>`);
    const avgRest = restDays.reduce((a, r) => a + r.profit, 0) / restDays.length;
    for (const r of restDays) {
      html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${r.afterGap.toFixed(0)}</td><td style="padding:8px;text-align:right">${r.trades}</td><td style="padding:8px;text-align:right;color:${r.profit >= 0 ? '#22c55e' : '#ef4444'};">${r.profit.toFixed(1)}</td></tr>`);
    }
    html.push(`</tbody></table></div>`);
  }

  return { title: 'Consecutive Days Impact', description: 'Does the bot need rest days? What happens when it trades N consecutive days?', html: html.join(''), category: 'Risk & Loss Analysis' };
}
