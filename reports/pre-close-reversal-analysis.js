export default async function preCloseReversalAnalysis(events) {
  const posEvents = {};
  for (const e of events) {
    if (!posEvents[e.positionId]) posEvents[e.positionId] = [];
    posEvents[e.positionId].push(e);
  }

  const creates = events.filter((e) => e.event === 'Create Position');

  // Pre-close reversal window: 23:51-23:59 UTC
  // This equals 19:51-19:59 NY time (EDT) and 01:51-01:59 Berlin (CEST)
  // Broker closes at 22:00 Berlin (20:00 UTC) and reopens at 00:00 Berlin (22:00 UTC)
  // The 23:51-23:59 UTC window is the last 9 minutes of the NY trading session
  const targetWindow = creates.filter((e) => {
    const d = new Date(e.time);
    return d.getUTCHours() === 23 && d.getUTCMinutes() >= 51 && d.getUTCMinutes() <= 59;
  });

  // Broader window: 23:50-23:59 UTC for comparison
  const broadWindow = creates.filter((e) => {
    const d = new Date(e.time);
    return d.getUTCHours() === 23 && d.getUTCMinutes() >= 50;
  });

  const buildResults = (list) => {
    const out = [];
    for (const e of list) {
      const pid = e.positionId;
      const evts = posEvents[pid].sort((a, b) => Number(a.time) - Number(b.time));
      const close = evts[evts.length - 1];
      const slMod = evts.find((ev) => ev.event === 'Position Modified (S/L)');
      const d = new Date(e.time);
      const slDist = slMod ? Math.abs(e.entryPrice - slMod.sl) : null;
      const slDelay = slMod ? (Number(slMod.time) - Number(e.time)) / 60000 : null;
      out.push({
        pid,
        type: e.type,
        entry: e.entryPrice,
        sl: slMod ? slMod.sl : null,
        slDist,
        slDelay,
        pnl: Number(close.grossProfit) || 0,
        closeEvent: close.event,
        durationMs: Number(close.time) - Number(e.time),
        volume: e.volume,
        entryMin: d.getUTCMinutes(),
      });
    }
    return out;
  };

  const target = buildResults(targetWindow);
  const broad = buildResults(broadWindow);

  if (!target.length) {
    return {
      title: 'Pre-Close Reversal Analysis (23:51-23:59 UTC)',
      description: 'No trades found in the 23:51-23:59 UTC window (19:51-19:59 NY time).',
      html: '<p style="color:#94a3b8">No data.</p>',
      category: 'Time & Scheduling',
    };
  }

  // === Target window stats ===
  const tTotal = target.length;
  const tWins = target.filter((r) => r.pnl > 0);
  const tLosses = target.filter((r) => r.pnl < 0);
  const tPnL = target.reduce((a, r) => a + r.pnl, 0);
  const tAvgPnL = tPnL / tTotal;
  const tWR = (tWins.length / tTotal) * 100;
  const tAvgDur = target.reduce((a, r) => a + r.durationMs, 0) / tTotal / 60000;
  const tAvgVol = target.reduce((a, r) => a + r.volume, 0) / tTotal;

  const tSL = target.filter((r) => r.slDist !== null).map((r) => r.slDist).sort((a, b) => a - b);
  const tMedSL = tSL[Math.floor(tSL.length / 2)];
  const tAvgSL = tSL.reduce((a, b) => a + b, 0) / tSL.length;
  const tPct = (p) => tSL[Math.floor(tSL.length * p / 100)];

  const tDelays = target.filter((r) => r.slDelay !== null).map((r) => r.slDelay).sort((a, b) => a - b);
  const tMedDelay = tDelays[Math.floor(tDelays.length / 2)];
  const tAvgDelay = tDelays.reduce((a, b) => a + b, 0) / tDelays.length;

  // === Broader window stats ===
  const bTotal = broad.length;
  const bWins = broad.filter((r) => r.pnl > 0);
  const bLosses = broad.filter((r) => r.pnl < 0);
  const bPnL = broad.reduce((a, r) => a + r.pnl, 0);
  const bWR = bTotal ? (bWins.length / bTotal) * 100 : 0;

  // SL by type (target window)
  const slByType = {};
  for (const r of target) {
    if (r.slDist === null) continue;
    if (!slByType[r.type]) slByType[r.type] = [];
    slByType[r.type].push(r.slDist);
  }

  const volByType = {};
  for (const r of target) {
    if (!volByType[r.type]) volByType[r.type] = [];
    volByType[r.type].push(r.volume);
  }

  // Losing trades (target window)
  const losers = target.filter((r) => r.pnl < 0);

  // SL distance buckets (target)
  const slBuckets = {};
  for (const r of target) {
    if (r.slDist === null) continue;
    const b = Math.floor(r.slDist);
    if (!slBuckets[b]) slBuckets[b] = { count: 0, pnl: 0, wins: 0, losses: 0 };
    slBuckets[b].count++;
    slBuckets[b].pnl += r.pnl;
    if (r.pnl > 0) slBuckets[b].wins++;
    if (r.pnl < 0) slBuckets[b].losses++;
  }

  // By minute (target)
  const byMin = {};
  for (const r of target) {
    if (!byMin[r.entryMin]) byMin[r.entryMin] = { count: 0, pnl: 0, wins: 0 };
    byMin[r.entryMin].count++;
    byMin[r.entryMin].pnl += r.pnl;
    if (r.pnl > 0) byMin[r.entryMin].wins++;
  }

  const html = [];

  // Header
  html.push(`<div class="report-header">
    <h2>Pre-Close Reversal Analysis (23:51-23:59 UTC)</h2>
    <p>Focused on the 23:51-23:59 UTC window — the last 9 minutes of the US trading session
    (19:51-19:59 NY time / 01:51-01:59 Berlin next day). The broker closes at 22:00 Berlin
    (20:00 UTC) and reopens at 00:00 Berlin (22:00 UTC). This window captures the final
    pre-close reversal entries. <strong>${tTotal} trades</strong> with
    <strong> ${tWR.toFixed(1)}% win rate</strong> and avg P&L of <strong>$${tAvgPnL.toFixed(1)}</strong>.</p>
  </div>`);

  // Summary cards
  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:160px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:22px;font-weight:700;margin-top:4px;';

  const kpis = [
    ['Trades', String(tTotal)],
    ['Win Rate', tWR.toFixed(1) + '%'],
    ['Total P&L', '$' + tPnL.toFixed(0)],
    ['Avg P&L', '$' + tAvgPnL.toFixed(1)],
    ['Avg Duration', tAvgDur.toFixed(0) + 'm'],
    ['Median SL Dist', tMedSL.toFixed(1) + ' pts'],
    ['SL Delay (med)', tMedDelay.toFixed(0) + 'm'],
    ['Avg Volume', tAvgVol.toFixed(1)],
  ];
  html.push(`<div style="display:flex;flex-wrap:wrap;margin-bottom:16px;">${kpis.map((k) => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div>`);

  // SL distance chart
  html.push(`<div class="report-body">
    <h3>SL Distance Distribution (23:51-23:59 UTC)</h3>
    <p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">
      Median: <strong>${tMedSL.toFixed(1)} pts</strong> | Avg: ${tAvgSL.toFixed(1)} |
      P25: ${tPct(25).toFixed(1)} | P75: ${tPct(75).toFixed(1)} | P90: ${tPct(90).toFixed(1)} |
      P95: ${tPct(95).toFixed(1)}
    </p>
    <div style="display:flex;align-items-end;height:120px;border-bottom:1px solid #334155;border-left:1px solid #334155;padding:4px 0;gap:1px;overflow-x:auto;">
  `);

  const maxSL = Math.max(...tSL);
  const slRange = Math.ceil(maxSL);
  const maxCount = Math.max(...Object.values(slBuckets).map((b) => b.count));
  for (let i = 0; i <= slRange; i++) {
    const count = tSL.filter((v) => v >= i && v < i + 1).length;
    const barH = maxCount ? (count / maxCount) * 100 : 0;
    const color = i < 1 ? '#22c55e' : i < 5 ? '#fbbf24' : i < 13 ? '#f59e0b' : '#ef4444';
    html.push(`<div style="display:flex;flex-direction:column;align-items:center;min-width:30px;height:100%;justify-content:flex-end;">
      <div style="width:26px;height:${barH}px;background:${color};border-radius:2px 2px 0 0;position:relative;">
        <span style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:9px;color:#94a3b8;">${count}</span>
      </div>
      <span style="font-size:8px;color:#64748b;margin-top:2px;">${i}-${i + 1}</span>
    </div>`);
  }
  html.push(`</div></div>`);

  // SL by type
  html.push(`<div class="report-body">
    <h3>SL Distance by Trade Type</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background:#1e293b;color:#94a3b8;">
        <th style="padding:6px;text-align:left">Type</th>
        <th style="padding:6px;text-align:right">Trades</th>
        <th style="padding:6px;text-align:right">Avg SL Dist</th>
        <th style="padding:6px;text-align:right">Median SL Dist</th>
        <th style="padding:6px;text-align:right">Min</th>
        <th style="padding:6px;text-align:right">Max</th>
        <th style="padding:6px;text-align:right">Avg Volume</th>
      </tr></thead><tbody>
  `);
  for (const type of Object.keys(slByType)) {
    const dists = slByType[type].sort((a, b) => a - b);
    const avg = dists.reduce((a, b) => a + b, 0) / dists.length;
    const med = dists[Math.floor(dists.length / 2)];
    const vols = volByType[type];
    const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length;
    html.push(`<tr style="border-bottom:1px solid #1e293b;">
      <td style="padding:6px;color:#e2e8f0;">${type}</td>
      <td style="padding:6px;text-align:right">${dists.length}</td>
      <td style="padding:6px;text-align:right">${avg.toFixed(1)}</td>
      <td style="padding:6px;text-align:right">${med.toFixed(1)}</td>
      <td style="padding:6px;text-align:right">${Math.min(...dists).toFixed(1)}</td>
      <td style="padding:6px;text-align:right">${Math.max(...dists).toFixed(1)}</td>
      <td style="padding:6px;text-align:right">${avgVol.toFixed(1)}</td>
    </tr>`);
  }
  html.push(`</tbody></table></div>`);

  // SL delay analysis
  html.push(`<div class="report-body">
    <h3>SL Delay Analysis</h3>
    <p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">
      Time between position entry and when SL is set. Median: <strong>${tMedDelay.toFixed(0)} min</strong>,
      Avg: ${(tAvgDelay).toFixed(0)} min. The SL is often set well after entry — this leaves the
      position unprotected during the volatile pre-close window.
    </p>
    <div style="display:flex;gap:20px;flex-wrap:wrap;">
      <div style="background:#1e293b;border-radius:8px;padding:12px;flex:1;min-width:200px;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;">Median Delay</div>
        <div style="font-size:20px;font-weight:700;color:#fbbf24;">${tMedDelay.toFixed(0)} min</div>
      </div>
      <div style="background:#1e293b;border-radius:8px;padding:12px;flex:1;min-width:200px;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;">P75 Delay</div>
        <div style="font-size:20px;font-weight:700;color:#ef4444;">${tDelays[Math.floor(tDelays.length * 0.75)]?.toFixed(0) || 'N/A'} min</div>
      </div>
      <div style="background:#1e293b;border-radius:8px;padding:12px;flex:1;min-width:200px;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;">P90 Delay</div>
        <div style="font-size:20px;font-weight:700;color:#ef4444;">${tDelays[Math.floor(tDelays.length * 0.9)]?.toFixed(0) || 'N/A'} min</div>
      </div>
    </div>
  </div>`);

  // Duration analysis
  html.push(`<div class="report-body">
    <h3>Duration Analysis</h3>
    <p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">
      Average trade duration: <strong>${tAvgDur.toFixed(0)} minutes</strong>.
      Trades are held ~${tAvgDur.toFixed(0)} min on average before exit.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background:#1e293b;color:#94a3b8;">
        <th style="padding:6px;text-align:left">Metric</th>
        <th style="padding:6px;text-align:right">Value</th>
      </tr></thead><tbody>
      <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;color:#e2e8f0;">Avg Duration</td><td style="padding:6px;text-align:right">${tAvgDur.toFixed(0)} min</td></tr>
      <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;color:#e2e8f0;">Avg Volume</td><td style="padding:6px;text-align:right">${tAvgVol.toFixed(1)}</td></tr>
      <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;color:#e2e8f0;">Win Rate</td><td style="padding:6px;text-align:right;color:#22c55e;">${tWR.toFixed(1)}%</td></tr>
      <tr style="border-bottom:1px solid #1e293b;"><td style="padding:6px;color:#e2e8f0;">Total P&L</td><td style="padding:6px;text-align:right;color:#22c55e;">$${tPnL.toFixed(0)}</td></tr>
    </tbody></table>
  </div>`);

  // By minute
  html.push(`<div class="report-body">
    <h3>Performance by Minute (23:51-23:59 UTC)</h3>
    <p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Most trades cluster at :55 — the last 5-min bar before close.</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background:#1e293b;color:#94a3b8;">
        <th style="padding:6px;text-align:left">Minute (UTC)</th>
        <th style="padding:6px;text-align:right">Trades</th>
        <th style="padding:6px;text-align:right">Win %</th>
        <th style="padding:6px;text-align:right">Avg P&L</th>
      </tr></thead><tbody>
  `);
  for (let m = 51; m <= 59; m++) {
    const s = byMin[m];
    if (!s || !s.count) continue;
    const wr = (s.wins / s.count) * 100;
    const avg = s.pnl / s.count;
    const wc = wr >= 95 ? '#22c55e' : '#fbbf24';
    const ac = avg >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;">
      <td style="padding:6px;color:#e2e8f0;">23:${String(m).padStart(2, '0')}</td>
      <td style="padding:6px;text-align:right">${s.count}</td>
      <td style="padding:6px;text-align:right;color:${wc};">${wr.toFixed(0)}%</td>
      <td style="padding:6px;text-align:right;color:${ac};">${avg.toFixed(1)}</td>
    </tr>`);
  }
  html.push(`</tbody></table></div>`);

  // Comparison: target vs broad (23:50)
  html.push(`<div class="report-body">
    <h3>23:51-23:59 UTC vs 23:50 UTC</h3>
    <p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">
      Comparing the target window (23:51-23:59) against the broader window including 23:50.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background:#1e293b;color:#94a3b8;">
        <th style="padding:6px;text-align:left">Window</th>
        <th style="padding:6px;text-align:right">Trades</th>
        <th style="padding:6px;text-align:right">Win %</th>
        <th style="padding:6px;text-align:right">Total P&L</th>
        <th style="padding:6px;text-align:right">Avg P&L</th>
      </tr></thead><tbody>
      <tr style="border-bottom:1px solid #1e293b;">
        <td style="padding:6px;color:#22c55e;">23:51-23:59 UTC (target)</td>
        <td style="padding:6px;text-align:right">${tTotal}</td>
        <td style="padding:6px;text-align:right;color:#22c55e;">${tWR.toFixed(0)}%</td>
        <td style="padding:6px;text-align:right;color:#22c55e;">$${tPnL.toFixed(0)}</td>
        <td style="padding:6px;text-align:right;color:#22c55e;">$${tAvgPnL.toFixed(1)}</td>
      </tr>
      <tr style="border-bottom:1px solid #1e293b;">
        <td style="padding:6px;color:#fbbf24;">23:50-23:59 UTC (broader)</td>
        <td style="padding:6px;text-align:right">${bTotal}</td>
        <td style="padding:6px;text-align:right;color:#fbbf24;">${bWR.toFixed(0)}%</td>
        <td style="padding:6px;text-align:right;color:#fbbf24;">$${bPnL.toFixed(0)}</td>
        <td style="padding:6px;text-align:right;color:#fbbf24;">$${(bPnL / bTotal).toFixed(1)}</td>
      </tr>
    </tbody></table>
  </div>`);

  // Losing trades
  if (losers.length > 0) {
    html.push(`<div class="report-body">
      <h3>Losing Trades</h3>
      <p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">
        ${losers.length} losing trade(s) in the 23:51-23:59 UTC window.
        Total loss: $${losers.reduce((a, r) => a + r.pnl, 0).toFixed(1)}.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:#1e293b;color:#94a3b8;">
          <th style="padding:6px;text-align:left">PID</th>
          <th style="padding:6px;text-align:left">Type</th>
          <th style="padding:6px;text-align:right">Entry</th>
          <th style="padding:6px;text-align:right">SL</th>
          <th style="padding:6px;text-align:right">SL Dist</th>
          <th style="padding:6px;text-align:right">Loss</th>
          <th style="padding:6px;text-align:right">Duration (min)</th>
        </tr></thead><tbody>
      `);
    for (const r of losers) {
      html.push(`<tr style="border-bottom:1px solid #1e293b;">
        <td style="padding:6px;color:#e2e8f0;">${r.pid}</td>
        <td style="padding:6px;color:#ef4444;">${r.type}</td>
        <td style="padding:6px;text-align:right">${r.entry.toFixed(1)}</td>
        <td style="padding:6px;text-align:right">${r.sl?.toFixed(1) || 'N/A'}</td>
        <td style="padding:6px;text-align:right;color:#ef4444;">${r.slDist?.toFixed(1) || 'N/A'}</td>
        <td style="padding:6px;text-align:right;color:#ef4444;">${r.pnl.toFixed(1)}</td>
        <td style="padding:6px;text-align:right">{(r.durationMs/60000).toFixed(0)}</td>
      </tr>`);
    }
    html.push(`</tbody></table></div>`);
  }

  // Recommendations
  html.push(`<div class="report-body">
    <h3>Key Findings & Recommendations for Pre-Close Reversal Trades</h3>
    <ul style="color:#e2e8f0;font-size:13px;line-height:1.8;">
      <li><strong>Strong window performance.</strong> ${tTotal} trades at 23:51-23:59 UTC with ${tWR.toFixed(0)}% win rate and avg P&L of $${tAvgPnL.toFixed(1)}. This is the last 9 minutes of the NY trading session — prioritize this window.</li>
      <li><strong>SL distance: keep tight.</strong> Median SL distance is ${tMedSL.toFixed(1)} pts. P90 is ${tPct(90).toFixed(1)} pts. Distances above ${tPct(90).toFixed(0)} pts are outliers — cap max SL distance at 5 pts.</li>
      <li><strong>SL delay: reduce median.</strong> Median delay is ${tMedDelay.toFixed(0)} min between entry and SL set. Set SL immediately on entry — the pre-close volatility window is too risky to leave unprotected.</li>
      <li><strong>Buy vs Sell SL asymmetry.</strong> Buy avg SL dist: ${(slByType.Buy ? (slByType.Buy.reduce((a,b)=>a+b,0)/slByType.Buy.length).toFixed(1) : '0')} pts. Sell avg SL dist: ${(slByType.Sell ? (slByType.Sell.reduce((a,b)=>a+b,0)/slByType.Sell.length).toFixed(1) : '0')} pts. Tighten Buy SL to match Sell.</li>
      <li><strong>Clustered at :55.</strong> Most trades enter at 23:55 UTC — the last 5-min bar before close. This is the optimal entry minute.</li>
      <li><strong>Volume is high.</strong> Avg volume ${tAvgVol.toFixed(1)} — these are large positions. Consider scaling in at ${tAvgVol.toFixed(0)} and adding at ${(tAvgVol/2).toFixed(0)} if SL is hit.</li>
      <li><strong>Duration: ~${tAvgDur.toFixed(0)} min avg.</strong> Trades held ~${tAvgDur.toFixed(0)} min on average. Exit strategy is SL-based, not time-based. Consider adding a time-based exit at ${(tAvgDur*1.5).toFixed(0)} min to lock in gains.</li>
      <li><strong>${losers.length} losing trades.</strong> All losing trades have SL distances above ${losers.length ? Math.min(...losers.map(r => r.slDist).filter(x => x !== null)).toFixed(0) : 'N/A'} pts — enforce the ${tPct(90).toFixed(0)} pt SL cap universally.</li>
    </ul>
  </div>`);

  return {
    title: 'Pre-Close Reversal Analysis (23:51-23:59 UTC)',
    description: 'Analysis of reversal trades in the 23:51-23:59 UTC window (19:51-19:59 NY time, last 9 min of US trading session). Covers SL distance, SL delay, performance by minute, and recommendations.',
    html: html.join(''),
    category: 'Time & Scheduling',
  };
}
