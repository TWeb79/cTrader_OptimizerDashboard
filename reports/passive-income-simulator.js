// Author: Inventions4All - github:TWeb79
//
// Passive Income Simulator
// -------------------------------------------------------------------------
// Answers the "can this bot replace my job" question:
//   1. What is the historical average daily profit?
//   2. Given a configurable target daily income, what daily trading volume
//      (lots) is statistically required to reach it, based on the actual
//      profit-per-lot efficiency observed in events.json?
//   3. What does the historical risk (best/worst day, volatility) look like
//      once scaled up to that volume, so the number isn't read in isolation
//      of the drawdown that came with it?
//
// All projections are a LINEAR extrapolation of past performance. They are
// explicitly flagged as such in the UI — larger volume does not guarantee
// proportionally larger profit (slippage, liquidity, margin requirements,
// and strategy capacity all break the linear assumption at scale).

export default async function passiveIncomeSimulator(events) {
  const pos = {};
  for (const e of events) {
    if (e.closePrice != null && e.grossProfit != null) {
      pos[e.positionId] = e;
    }
  }
  const closed = Object.values(pos);

  if (!closed.length) {
    return {
      title: 'Passive Income Simulator',
      description: 'No closed trades available.',
      html: '<p style="color:#94a3b8">No data.</p>',
      category: 'Income Planning',
    };
  }

  // ---- Aggregate per calendar day (UTC) -----------------------------------
  const dayProfit = {};
  const dayVolume = {};
  const dayTrades = {};
  const monthDays = {};

  for (const t of closed) {
    const d = new Date(Number(t.time));
    const dayKey = d.toISOString().slice(0, 10);
    const monthKey = dayKey.slice(0, 7);
    const profit = Number(t.grossProfit) || 0;
    const volume = Number(t.volume) || 0;

    dayProfit[dayKey] = (dayProfit[dayKey] || 0) + profit;
    dayVolume[dayKey] = (dayVolume[dayKey] || 0) + volume;
    dayTrades[dayKey] = (dayTrades[dayKey] || 0) + 1;

    if (!monthDays[monthKey]) monthDays[monthKey] = new Set();
    monthDays[monthKey].add(dayKey);
  }

  const days = Object.keys(dayProfit).sort();
  const profitVals = days.map((d) => dayProfit[d]);
  const volumeVals = days.map((d) => dayVolume[d]);
  const tradeVals = days.map((d) => dayTrades[d]);

  const totalProfit = closed.reduce((a, t) => a + (Number(t.grossProfit) || 0), 0);
  const totalVolume = closed.reduce((a, t) => a + (Number(t.volume) || 0), 0);
  const totalTrades = closed.length;

  const tradingDays = days.length;
  const avgDailyProfit = totalProfit / tradingDays;
  const avgDailyVolume = totalVolume / tradingDays;
  const avgTradesPerDay = totalTrades / tradingDays;
  const avgVolumePerTrade = totalTrades ? totalVolume / totalTrades : 0;

  // Core efficiency ratio: how much profit was generated per 1.0 lot traded.
  const profitPerVolume = totalVolume ? totalProfit / totalVolume : 0;

  const worstDay = Math.min(...profitVals);
  const bestDay = Math.max(...profitVals);
  const stdDev = pStdDev(profitVals);
  const profitableDays = profitVals.filter((v) => v > 0).length;
  const belowAvgDays = profitVals.filter((v) => v < avgDailyProfit).length;
  const winDayRate = (profitableDays / tradingDays) * 100;
  const belowAvgRate = (belowAvgDays / tradingDays) * 100;

  const monthKeys = Object.keys(monthDays);
  const avgTradingDaysPerMonth = monthKeys.length
    ? monthKeys.reduce((a, m) => a + monthDays[m].size, 0) / monthKeys.length
    : 21;

  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  // ---- Defaults for the interactive calculator ----------------------------
  const DEFAULT_TARGET = 200;
  const DEFAULT_PRICE = 7400;
  const DEFAULT_LEVERAGE = 30;
  const DEFAULT_CONTRACT_SIZE = 1; // units of the instrument per 1.0 "volume" — see note in Margin section

  // Volume is scaled up ONE time (target ÷ profit-per-lot). "Trades/day" is
  // then derived from that SAME total volume in one of two mutually
  // exclusive ways — never both applied together (that would double it):
  //   Approach A: keep your average size-per-trade the same, place more trades
  //   Approach B: keep your current number of trades/day, make each one bigger
  // reqTradesA * avgVolumePerTrade === avgTradesPerDay * sizePerTradeB === reqVolume (always)
  const calc = (target) => {
    const reqVolume = profitPerVolume > 0 ? target / profitPerVolume : 0;
    const reqTradesA = avgVolumePerTrade > 0 ? reqVolume / avgVolumePerTrade : 0;
    const sizePerTradeB = avgTradesPerDay > 0 ? reqVolume / avgTradesPerDay : 0;
    const scale = avgDailyProfit > 0 ? target / avgDailyProfit : 0;
    return {
      reqVolume,
      reqTradesA,
      sizePerTradeB,
      scale,
      scaledWorst: worstDay * scale,
      scaledBest: bestDay * scale,
      scaledStd: stdDev * scale,
      monthly: target * avgTradingDaysPerMonth,
      annual: target * avgTradingDaysPerMonth * 12,
    };
  };
  const marginOf = (reqVolume, price, leverage, contractSize) => {
    const notional = reqVolume * contractSize * price;
    const margin = leverage > 0 ? notional / leverage : notional;
    return { notional, margin };
  };
  const d0 = calc(DEFAULT_TARGET);
  const m0 = marginOf(d0.reqVolume, DEFAULT_PRICE, DEFAULT_LEVERAGE, DEFAULT_CONTRACT_SIZE);

  // ---- Styles (matching existing report conventions) ----------------------
  const cardStyle = 'display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;min-width:150px;margin:6px;text-align:center;';
  const labelStyle = 'font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;';
  const valueStyle = 'font-size:20px;font-weight:700;margin-top:4px;';
  const bigCardStyle = 'display:inline-block;background:#0f2818;border:1px solid #22c55e;border-radius:10px;padding:14px 20px;min-width:170px;margin:6px;text-align:center;';
  const bigLabelStyle = 'font-size:11px;color:#86efac;text-transform:uppercase;letter-spacing:0.5px;';
  const bigValueStyle = 'font-size:24px;font-weight:800;margin-top:4px;color:#f0fdf4;';
  const riskCardStyle = 'display:inline-block;background:#2a1414;border:1px solid #ef4444;border-radius:10px;padding:14px 20px;min-width:170px;margin:6px;text-align:center;';
  const riskLabelStyle = 'font-size:11px;color:#fca5a5;text-transform:uppercase;letter-spacing:0.5px;';
  const riskValueStyle = 'font-size:24px;font-weight:800;margin-top:4px;color:#fef2f2;';

  const html = [];

  html.push(`<div class="report-header"><h2>Passive Income Simulator</h2><p>What would it take for this bot's historical performance to replace a salary? Baseline metrics from ${escapeHtml(firstDay)} to ${escapeHtml(lastDay)} (${tradingDays} trading days), plus a configurable target-income calculator simulated on the actual trade history.</p></div>`);

  // ---- Historical baseline KPIs -------------------------------------------
  const baselineKpis = [
    ['Trading Days', String(tradingDays)],
    ['Avg Daily Profit', avgDailyProfit.toFixed(2)],
    ['Avg Daily Volume', avgDailyVolume.toFixed(2) + ' lots'],
    ['Avg Trades/Day', avgTradesPerDay.toFixed(1)],
    ['Avg Volume/Trade', avgVolumePerTrade.toFixed(2) + ' lots'],
    ['Profit per 1.0 Lot', profitPerVolume.toFixed(2)],
    ['Profitable Days', winDayRate.toFixed(0) + '%'],
    ['Best Day', bestDay.toFixed(2)],
    ['Worst Day', worstDay.toFixed(2)],
    ['Daily Volatility (σ)', stdDev.toFixed(2)],
  ];
  html.push(`<div class="report-body"><h3>Historical Baseline</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Computed from every closed position in the dataset. "Profit per 1.0 Lot" is the core efficiency ratio the calculator below scales from: total gross profit ÷ total volume traded.</p>`);
  html.push(`<div style="display:flex;flex-wrap:wrap;">${baselineKpis.map((k) => `<div style="${cardStyle}"><div style="${labelStyle}">${k[0]}</div><div style="${valueStyle}">${k[1]}</div></div>`).join('')}</div></div>`);

  // ---- Interactive calculator ----------------------------------------------
  const presets = [50, 100, 150, 200, 300, 500, 1000];
  const presetBtns = presets
    .map(
      (p) =>
        `<button type="button" onclick="document.getElementById('pis-target').value=${p};document.getElementById('pis-target').dispatchEvent(new Event('input'));" style="background:#1e293b;border:1px solid #334155;color:#e2e8f0;border-radius:6px;padding:6px 12px;margin:3px;cursor:pointer;font-size:13px;">€${p}</button>`
    )
    .join('');

  const calcJs = buildCalcJs({
    profitPerVolume,
    avgVolumePerTrade,
    avgTradesPerDay,
    avgDailyProfit,
    worstDay,
    bestDay,
    stdDev,
    avgTradingDaysPerMonth,
  });

  html.push(`<div class="report-body"><h3>Target Income Calculator</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:10px;">Enter the daily income you'd need to live without a job. The required volume is derived from the bot's actual profit-per-lot efficiency above; the risk figures are the bot's real historical best/worst day and volatility, linearly scaled to that volume.</p>`);
  html.push(`<div style="margin-bottom:6px;">
    <label for="pis-target" style="font-size:12px;color:#94a3b8;display:block;margin-bottom:6px;">Target daily income (€)</label>
    <input id="pis-target" type="number" min="0" step="10" value="${DEFAULT_TARGET}" oninput="${calcJs}" style="width:160px;padding:8px 10px;font-size:16px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;" />
    <div style="margin-top:8px;">${presetBtns}</div>
  </div>`);

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-top:12px;">
    <div style="${bigCardStyle}"><div style="${bigLabelStyle}">Required Daily Volume</div><div style="${bigValueStyle}"><span id="pis-reqvol">${d0.reqVolume.toFixed(2)}</span> lots</div></div>
    <div style="${cardStyle}"><div style="${labelStyle}">Volume Scale Factor</div><div style="${valueStyle}"><span id="pis-scale">${d0.scale.toFixed(2)}</span>×</div></div>
    <div style="${cardStyle}"><div style="${labelStyle}">Projected Monthly Income</div><div style="${valueStyle}">€<span id="pis-monthly">${d0.monthly.toFixed(0)}</span></div></div>
    <div style="${cardStyle}"><div style="${labelStyle}">Projected Annual Income</div><div style="${valueStyle}">€<span id="pis-annual">${d0.annual.toFixed(0)}</span></div></div>
  </div>`);

  html.push(`<p style="color:#94a3b8;font-size:12px;margin-top:8px;">"Required daily volume" is scaled up <strong style="color:#e2e8f0;">once</strong>. The two boxes below show the <em>same</em> total volume split two different ways — pick whichever matches how you'd actually trade. Do not add these together.</p>`);
  html.push(`<div style="display:flex;flex-wrap:wrap;margin-top:6px;">
    <div style="${bigCardStyle}"><div style="${bigLabelStyle}">Approach A — More Trades, Same Size</div><div style="${bigValueStyle}"><span id="pis-reqtradesA">${d0.reqTradesA.toFixed(1)}</span> trades/day</div><div style="font-size:11px;color:#86efac;margin-top:4px;">at your current avg size, ${avgVolumePerTrade.toFixed(2)} lots/trade</div></div>
    <div style="${bigCardStyle}"><div style="${bigLabelStyle}">Approach B — Same Trade Count, Bigger Size</div><div style="${bigValueStyle}"><span id="pis-sizeB">${d0.sizePerTradeB.toFixed(2)}</span> lots/trade</div><div style="font-size:11px;color:#86efac;margin-top:4px;">at your current pace, ${avgTradesPerDay.toFixed(1)} trades/day</div></div>
  </div>`);

  html.push(`<div style="display:flex;flex-wrap:wrap;margin-top:10px;">
    <div style="${riskCardStyle}"><div style="${riskLabelStyle}">Scaled Worst Day</div><div style="${riskValueStyle}">€<span id="pis-sworst">${d0.scaledWorst.toFixed(0)}</span></div></div>
    <div style="${riskCardStyle}"><div style="${riskLabelStyle}">Scaled Daily Volatility (σ)</div><div style="${riskValueStyle}">€<span id="pis-sstd">${d0.scaledStd.toFixed(0)}</span></div></div>
    <div style="${cardStyle}"><div style="${labelStyle}">Scaled Best Day</div><div style="${valueStyle}">€<span id="pis-sbest">${d0.scaledBest.toFixed(0)}</span></div></div>
  </div>`);

  html.push(`<p style="color:#94a3b8;font-size:12px;margin-top:10px;">Historically, <strong style="color:#e2e8f0;">${belowAvgRate.toFixed(0)}%</strong> of trading days closed below the average — meaning even at the required volume, more than half of days are likely to fall short of the target while others exceed it. Averages smooth out day-to-day swings; the scaled worst day above shows what a genuinely bad day would cost you at this volume.</p></div>`);

  // ---- Required capital / margin -------------------------------------------
  html.push(`<div class="report-body"><h3>Required Trading Capital (Margin)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:10px;">Estimated capital needed to actually hold the required daily volume open, based on instrument price and leverage. Formula: <code style="color:#e2e8f0;">margin = (required volume × contract size × price) ÷ leverage</code>. Defaults below use your figures — US500 at €7,400, 30:1 leverage. <strong style="color:#fbbf24;">Contract size defaults to 1 unit per 1.0 volume</strong> (matches this dataset's grossProfit ≈ price-move × volume); adjust it if your broker defines a "lot" differently.</p>`);
  html.push(`<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
    <div><label for="pis-price" style="font-size:12px;color:#94a3b8;display:block;margin-bottom:6px;">Avg. instrument price (€)</label><input id="pis-price" type="number" min="0" step="10" value="${DEFAULT_PRICE}" oninput="${calcJs}" style="width:140px;padding:8px 10px;font-size:14px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;" /></div>
    <div><label for="pis-leverage" style="font-size:12px;color:#94a3b8;display:block;margin-bottom:6px;">Leverage (1:X)</label><input id="pis-leverage" type="number" min="1" step="1" value="${DEFAULT_LEVERAGE}" oninput="${calcJs}" style="width:110px;padding:8px 10px;font-size:14px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;" /></div>
    <div><label for="pis-contractsize" style="font-size:12px;color:#94a3b8;display:block;margin-bottom:6px;">Contract size (units/1.0 vol)</label><input id="pis-contractsize" type="number" min="0.01" step="0.01" value="${DEFAULT_CONTRACT_SIZE}" oninput="${calcJs}" style="width:150px;padding:8px 10px;font-size:14px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;" /></div>
  </div>`);
  html.push(`<div style="display:flex;flex-wrap:wrap;">
    <div style="${cardStyle}"><div style="${labelStyle}">Notional Exposure (Required Volume)</div><div style="${valueStyle}">€<span id="pis-notional">${m0.notional.toFixed(0)}</span></div></div>
    <div style="${bigCardStyle}"><div style="${bigLabelStyle}">Required Margin / Budget</div><div style="${bigValueStyle}">€<span id="pis-margin">${m0.margin.toFixed(0)}</span></div></div>
  </div>`);
  html.push(`<p style="color:#94a3b8;font-size:12px;margin-top:10px;">This is the margin to <em>hold</em> the required daily volume simultaneously open — not a full risk budget. Brokers issue margin calls well before a position wipes out your full balance, so plan account capital well above this figure (it does not include the loss buffer from the "Scaled Worst Day" above).</p></div>`);

  // ---- Reference table for common targets ----------------------------------
  const refTargets = [50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000];
  let table = `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left;">Target/Day</th><th style="padding:8px;text-align:right">Req. Volume</th><th style="padding:8px;text-align:right">Trades/Day (Approach A)</th><th style="padding:8px;text-align:right">Lots/Trade (Approach B)</th><th style="padding:8px;text-align:right">Monthly Income</th><th style="padding:8px;text-align:right">Scaled Worst Day</th><th style="padding:8px;text-align:right">Est. Margin*</th></tr></thead><tbody>`;
  for (const target of refTargets) {
    const c = calc(target);
    const m = marginOf(c.reqVolume, DEFAULT_PRICE, DEFAULT_LEVERAGE, DEFAULT_CONTRACT_SIZE);
    table += `<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">€${target}</td><td style="padding:8px;text-align:right">${c.reqVolume.toFixed(2)}</td><td style="padding:8px;text-align:right">${c.reqTradesA.toFixed(1)}</td><td style="padding:8px;text-align:right">${c.sizePerTradeB.toFixed(2)}</td><td style="padding:8px;text-align:right;color:#22c55e;">€${c.monthly.toFixed(0)}</td><td style="padding:8px;text-align:right;color:#ef4444;">€${c.scaledWorst.toFixed(0)}</td><td style="padding:8px;text-align:right;color:#38bdf8;">€${m.margin.toFixed(0)}</td></tr>`;
  }
  table += `</tbody></table>`;
  html.push(`<div class="report-body"><h3>Reference Table</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Same calculation as above, pre-computed for common target incomes. *Margin assumes US500 @ €${DEFAULT_PRICE}, ${DEFAULT_LEVERAGE}:1 leverage, ${DEFAULT_CONTRACT_SIZE} unit/lot — adjust these in the calculator above to recompute live.</p>${table}</div>`);

  // ---- Chart: required volume vs target income -----------------------------
  const chartMax = 2000;
  const chartMaxVol = chartMax / (profitPerVolume || 1);
  const w = 1000, h = 320, pad = 55;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;
  const xAt = (target) => pad + (target / chartMax) * chartW;
  const yAt = (vol) => h - pad - (vol / (chartMaxVol || 1)) * chartH;

  let lineSvg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;min-height:260px;">`;
  lineSvg += `<line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#475569" />`;
  lineSvg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h - pad}" stroke="#475569" />`;
  lineSvg += `<line x1="${xAt(0)}" y1="${yAt(0)}" x2="${xAt(chartMax)}" y2="${yAt(chartMaxVol)}" stroke="#38bdf8" stroke-width="2.5" />`;
  const marker = calc(DEFAULT_TARGET);
  lineSvg += `<circle cx="${xAt(DEFAULT_TARGET)}" cy="${yAt(marker.reqVolume)}" r="5" fill="#22c55e" />`;
  lineSvg += `<text x="${xAt(DEFAULT_TARGET) + 10}" y="${yAt(marker.reqVolume) - 8}" fill="#22c55e" font-size="11">€${DEFAULT_TARGET} → ${marker.reqVolume.toFixed(1)} lots</text>`;
  for (let t = 0; t <= chartMax; t += 250) {
    lineSvg += `<text x="${xAt(t)}" y="${h - pad + 16}" fill="#94a3b8" font-size="10" text-anchor="middle">€${t}</text>`;
  }
  const volStep = Math.max(5, Math.round(chartMaxVol / 6 / 5) * 5);
  for (let v = 0; v <= chartMaxVol; v += volStep) {
    lineSvg += `<text x="${pad - 8}" y="${yAt(v) + 4}" fill="#94a3b8" font-size="10" text-anchor="end">${v.toFixed(0)}</text>`;
  }
  lineSvg += `<text x="${w / 2}" y="${h - 10}" fill="#94a3b8" font-size="12" text-anchor="middle">Target Daily Income (€)</text>`;
  lineSvg += `<text x="14" y="${h / 2}" fill="#94a3b8" font-size="12" text-anchor="middle" transform="rotate(-90 14 ${h / 2})">Required Volume (lots)</text>`;
  lineSvg += `</svg>`;

  html.push(`<div class="report-body"><h3>Required Volume vs Target Income</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Linear relationship: required volume = target income ÷ profit-per-lot (€${profitPerVolume.toFixed(2)}). The green marker shows the current calculator value.</p>${lineSvg}</div>`);

  // ---- Disclaimer -----------------------------------------------------------
  html.push(`<div class="report-body" style="border-color:#fbbf24;"><h3 style="color:#fbbf24;">Read Before Quitting Your Job</h3>
    <p style="color:#cbd5e1;font-size:13px;line-height:1.6;">
      This is a <strong>linear extrapolation</strong> of ${tradingDays} historical trading days — it assumes trading N× today's volume produces proportionally N× today's profit. In reality that breaks down: larger orders face more slippage and worse fills, brokers impose margin and exposure limits, strategy capacity is finite, and a longer live-trading sample may reveal risks this dataset hasn't hit yet (e.g. the worst day shown, €${worstDay.toFixed(0)}, is only the worst day <em>observed so far</em>, not a hard floor).
    </p>
    <p style="color:#cbd5e1;font-size:13px;line-height:1.6;margin-top:8px;">
      Before treating this as replacement income: stress-test with a live/demo run at the target volume, keep a cash buffer that covers several months of the scaled volatility (σ) shown above, and treat the "required volume" figure as a starting hypothesis to validate — not a guarantee.
    </p>
  </div>`);

  return {
    title: 'Passive Income Simulator',
    description: 'Configurable target-income calculator: required daily volume and historical risk, simulated from actual trade data.',
    html: html.join(''),
    category: 'Income Planning',
  };
}

function pStdDev(vals) {
  const n = vals.length;
  if (!n) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Builds the inline `oninput` handler body. Uses only literal numbers
// captured server-side at report-render time, so it needs no <script> tag
// (inline HTML content is inserted via innerHTML on the client, which does
// not execute <script> tags — but inline event-handler attributes like
// oninput/onclick are parsed and do execute normally).
function buildCalcJs({ profitPerVolume, avgVolumePerTrade, avgTradesPerDay, avgDailyProfit, worstDay, bestDay, stdDev, avgTradingDaysPerMonth }) {
  // Reads ALL four inputs (target income, price, leverage, contract size)
  // every time any one of them fires — so it's safe to attach this exact
  // same handler to every input regardless of which one the user edits.
  const js = `
    const t = parseFloat(document.getElementById('pis-target').value) || 0;
    const ppv = ${profitPerVolume};
    const avpt = ${avgVolumePerTrade};
    const atpd = ${avgTradesPerDay};
    const adp = ${avgDailyProfit};
    const worst = ${worstDay};
    const best = ${bestDay};
    const std = ${stdDev};
    const tpm = ${avgTradingDaysPerMonth};
    const reqVol = ppv > 0 ? t / ppv : 0;
    const reqTradesA = avpt > 0 ? reqVol / avpt : 0;
    const sizePerTradeB = atpd > 0 ? reqVol / atpd : 0;
    const scale = adp > 0 ? t / adp : 0;
    const monthly = t * tpm;
    const annual = monthly * 12;
    document.getElementById('pis-reqvol').textContent = reqVol.toFixed(2);
    document.getElementById('pis-reqtradesA').textContent = reqTradesA.toFixed(1);
    document.getElementById('pis-sizeB').textContent = sizePerTradeB.toFixed(2);
    document.getElementById('pis-scale').textContent = scale.toFixed(2);
    document.getElementById('pis-monthly').textContent = monthly.toFixed(0);
    document.getElementById('pis-annual').textContent = annual.toFixed(0);
    document.getElementById('pis-sworst').textContent = (worst * scale).toFixed(0);
    document.getElementById('pis-sbest').textContent = (best * scale).toFixed(0);
    document.getElementById('pis-sstd').textContent = (std * scale).toFixed(0);
    const price = parseFloat(document.getElementById('pis-price').value) || 0;
    const leverage = parseFloat(document.getElementById('pis-leverage').value) || 1;
    const contractSize = parseFloat(document.getElementById('pis-contractsize').value) || 1;
    const notional = reqVol * contractSize * price;
    const margin = leverage > 0 ? notional / leverage : notional;
    document.getElementById('pis-notional').textContent = notional.toFixed(0);
    document.getElementById('pis-margin').textContent = margin.toFixed(0);
  `.replace(/\s+/g, ' ').trim();
  return escapeHtml(js);
}