export default async function gapTradeSessionEdge(events) {
  const closed = [];
  const pos = {};
  for (const e of events) {
    if (e.closePrice != null) {
      pos[e.positionId] = e;
    }
  }
  for (const k of Object.keys(pos)) closed.push(pos[k]);

  if (!closed.length) {
    return { title: 'Gap-Trade Session Edge', description: 'No closed trades available.', html: '<p style="color:#94a3b8">No data.</p>' };
  }

  const sessions = {
    'Asian': { hours: [0,1,2,3,4,5,6,7] },
    'European': { hours: [8,9,10,11,12] },
    'US': { hours: [13,14,15,16,17,18,19,20,21] },
    'Off-hours': { hours: [22,23] },
  };

  const getSession = (time) => {
    const hour = new Date(Number(time)).getHours();
    for (const [name, data] of Object.entries(sessions)) {
      if (data.hours.includes(hour)) return name;
    }
    return 'Off-hours';
  };

  const dayMap = {};
  for (const t of closed) {
    const d = new Date(Number(t.time));
    const dayKey = d.toISOString().slice(0, 10);
    if (!dayMap[dayKey]) dayMap[dayKey] = [];
    dayMap[dayKey].push(t);
  }

  const days = Object.keys(dayMap).sort();
  const prevDayMap = {};
  for (let i = 1; i < days.length; i++) {
    prevDayMap[days[i]] = days[i - 1];
  }

  const gapUpDays = [];
  const gapDownDays = [];
  const noGapDays = [];

  for (const day of days) {
    if (!prevDayMap[day]) continue;
    const trades = dayMap[day];
    const prevTrades = dayMap[prevDayMap[day]] || [];
    if (!trades.length || !prevTrades.length) continue;

    const dayOpen = Math.min(...trades.map(t => Number(t.entryPrice)));
    const dayClose = Math.max(...trades.map(t => Number(t.closePrice)));
    const prevClose = Math.max(...prevTrades.map(t => Number(t.closePrice)));
    const prevOpen = Math.min(...prevTrades.map(t => Number(t.entryPrice)));

    const gapUp = dayOpen > prevClose;
    const gapDown = dayOpen < prevClose;

    const dayData = { day, trades, dayOpen, dayClose, prevClose, prevOpen, gapUp, gapDown };

    if (gapUp) gapUpDays.push(dayData);
    else if (gapDown) gapDownDays.push(dayData);
    else noGapDays.push(dayData);
  }

  const analyzeDirection = (days) => {
    const allBuys = [];
    const allSells = [];
    for (const d of days) {
      for (const t of d.trades) {
        if (t.type === 'Buy') allBuys.push(t);
        else if (t.type === 'Sell') allSells.push(t);
      }
    }

    const calc = (arr) => {
      if (!arr.length) return { trades: 0, wins: 0, winRate: 0, totalPnl: 0, avgPnl: 0 };
      const wins = arr.filter(t => Number(t.grossProfit) > 0);
      const total = arr.reduce((a, t) => a + (Number(t.grossProfit) || 0), 0);
      return {
        trades: arr.length,
        wins: wins.length,
        winRate: (wins.length / arr.length) * 100,
        totalPnl: total,
        avgPnl: total / arr.length,
      };
    };

    const buys = calc(allBuys);
    const sells = calc(allSells);

    return { buys, sells, totalTrades: allBuys.length + allSells.length };
  };

  const analyzeBySession = (days) => {
    const sessionStats = {};
    for (const d of days) {
      for (const t of d.trades) {
        const session = getSession(t.time);
        if (!sessionStats[session]) {
          sessionStats[session] = { buys: [], sells: [] };
        }
        if (t.type === 'Buy') sessionStats[session].buys.push(t);
        else if (t.type === 'Sell') sessionStats[session].sells.push(t);
      }
    }

    const result = {};
    for (const [session, data] of Object.entries(sessionStats)) {
      const buysCalc = (() => {
        if (!data.buys.length) return { trades: 0, wins: 0, winRate: 0, totalPnl: 0, avgPnl: 0 };
        const wins = data.buys.filter(t => Number(t.grossProfit) > 0);
        const total = data.buys.reduce((a, t) => a + (Number(t.grossProfit) || 0), 0);
        return { trades: data.buys.length, wins: wins.length, winRate: (wins.length / data.buys.length) * 100, totalPnl: total, avgPnl: total / data.buys.length };
      })();
      const sellsCalc = (() => {
        if (!data.sells.length) return { trades: 0, wins: 0, winRate: 0, totalPnl: 0, avgPnl: 0 };
        const wins = data.sells.filter(t => Number(t.grossProfit) > 0);
        const total = data.sells.reduce((a, t) => a + (Number(t.grossProfit) || 0), 0);
        return { trades: data.sells.length, wins: wins.length, winRate: (wins.length / data.sells.length) * 100, totalPnl: total, avgPnl: total / data.sells.length };
      })();
      result[session] = { buys: buysCalc, sells: sellsCalc, total: data.buys.length + data.sells.length };
    }
    return result;
  };

  const gapUpStats = analyzeDirection(gapUpDays);
  const gapDownStats = analyzeDirection(gapDownDays);
  const noGapStats = analyzeDirection(noGapDays);
  const gapUpBySession = analyzeBySession(gapUpDays);
  const gapDownBySession = analyzeBySession(gapDownDays);

  const html = [];
  html.push(`<div class="report-header"><h2>Gap-Trade Session Edge</h2><p>Analyzes gap-up and gap-down sessions by market session to determine whether longs or shorts performed better after gaps.</p></div>`);

  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Gap-Up Days', String(gapUpDays.length)],
    ['Gap-Down Days', String(gapDownDays.length)],
    ['No-Gap Days', String(noGapDays.length)],
    ['Total Gap Trades', String(gapUpStats.totalTrades + gapDownStats.totalTrades)],
  ];

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map(k => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  const renderTable = (title, stats, desc) => {
    const rows = [
      ['Buy (Long)', stats.buys],
      ['Sell (Short)', stats.sells],
    ];
    let table = `<div class="report-body"><h3>${title}</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">${desc}</p>`;
    table += `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Direction</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Wins</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Total P&L</th><th style="padding:8px;text-align:right">Avg P&L</th></tr></thead><tbody>`;
    for (const [label, s] of rows) {
      table += `<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">${label}</td><td style="padding:8px;text-align:right">${s.trades}</td><td style="padding:8px;text-align:right">${s.wins}</td><td style="padding:8px;text-align:right;color:${s.winRate >= 50 ? '#22c55e' : '#ef4444'};">${s.winRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${s.totalPnl >= 0 ? '#22c55e' : '#ef4444'};">${s.totalPnl.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${s.avgPnl >= 0 ? '#22c55e' : '#ef4444'};">${s.avgPnl.toFixed(1)}</td></tr>`;
    }
    table += `</tbody></table></div>`;
    return table;
  };

  const renderSessionTable = (title, stats, desc) => {
    let table = `<div class="report-body"><h3>${title}</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">${desc}</p>`;
    table += `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Session</th><th style="padding:8px;text-align:left">Direction</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Wins</th><th style="padding:8px;text-align:right">Win Rate</th><th style="padding:8px;text-align:right">Total P&L</th><th style="padding:8px;text-align:right">Avg P&L</th></tr></thead><tbody>`;
    for (const [session, data] of Object.entries(stats)) {
      table += `<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;" rowspan="2">${session}</td><td style="padding:8px;color:#94a3b8;">Buy (Long)</td><td style="padding:8px;text-align:right">${data.buys.trades}</td><td style="padding:8px;text-align:right">${data.buys.wins}</td><td style="padding:8px;text-align:right;color:${data.buys.winRate >= 50 ? '#22c55e' : '#ef4444'};">${data.buys.winRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${data.buys.totalPnl >= 0 ? '#22c55e' : '#ef4444'};">${data.buys.totalPnl.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${data.buys.avgPnl >= 0 ? '#22c55e' : '#ef4444'};">${data.buys.avgPnl.toFixed(1)}</td></tr>`;
      table += `<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#94a3b8;">Sell (Short)</td><td style="padding:8px;text-align:right">${data.sells.trades}</td><td style="padding:8px;text-align:right">${data.sells.wins}</td><td style="padding:8px;text-align:right;color:${data.sells.winRate >= 50 ? '#22c55e' : '#ef4444'};">${data.sells.winRate.toFixed(1)}%</td><td style="padding:8px;text-align:right;color:${data.sells.totalPnl >= 0 ? '#22c55e' : '#ef4444'};">${data.sells.totalPnl.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${data.sells.avgPnl >= 0 ? '#22c55e' : '#ef4444'};">${data.sells.avgPnl.toFixed(1)}</td></tr>`;
    }
    table += `</tbody></table></div>`;
    return table;
  };

  html.push(renderTable('Gap-Up Session Edge', gapUpStats, 'Performance of Buy vs Sell trades on days that gapped up from the previous close.'));
  html.push(renderSessionTable('Gap-Up by Market Session', gapUpBySession, 'Buy vs Sell performance within each market session on gap-up days.'));
  html.push(renderTable('Gap-Down Session Edge', gapDownStats, 'Performance of Buy vs Sell trades on days that gapped down from the previous close.'));
  html.push(renderSessionTable('Gap-Down by Market Session', gapDownBySession, 'Buy vs Sell performance within each market session on gap-down days.'));

  html.push(`<div class="report-body"><h3>Session Details</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Individual gap session details with entry/close prices.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Date</th><th style="padding:8px;text-align:left">Type</th><th style="padding:8px;text-align:right">Trades</th><th style="padding:8px;text-align:right">Prev Close</th><th style="padding:8px;text-align:right">Day Open</th><th style="padding:8px;text-align:right">Day Close</th><th style="padding:8px;text-align:right">Gap %</th></tr></thead><tbody>`);
  const allSessions = [
    ...gapUpDays.map(d => ({ ...d, sessionType: 'Gap Up' })),
    ...gapDownDays.map(d => ({ ...d, sessionType: 'Gap Down' })),
  ].sort((a, b) => b.day.localeCompare(a.day));

  for (const s of allSessions.slice(0, 50)) {
    const gapPct = s.prevClose > 0 ? ((s.dayOpen - s.prevClose) / s.prevClose) * 100 : 0;
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${s.day}</td><td style="padding:8px;color:${s.gapUp ? '#22c55e' : '#ef4444'};">${s.sessionType}</td><td style="padding:8px;text-align:right">${s.trades.length}</td><td style="padding:8px;text-align:right">${s.prevClose.toFixed(1)}</td><td style="padding:8px;text-align:right">${s.dayOpen.toFixed(1)}</td><td style="padding:8px;text-align:right">${s.dayClose.toFixed(1)}</td><td style="padding:8px;text-align:right;color:${gapPct >= 0 ? '#22c55e' : '#ef4444'};">${gapPct.toFixed(2)}%</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return { title: 'Gap-Trade Session Edge', description: 'Analyzes gap-up and gap-down sessions by market session to determine whether longs or shorts performed better after gaps.', html: html.join(''), category: 'Time & Scheduling' };
}
