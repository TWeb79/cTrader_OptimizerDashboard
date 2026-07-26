// Author: Inventions4All - github:TWeb79
//
// Market Regime Analysis
// -------------------------------------------------------------------------
// Classifies S&P 500 market regimes since 2017 and identifies the current
// regime. Provides trading parameter recommendations (stop-loss, breakeven,
// position sizing, strategy selection) adapted to each regime.

export default async function marketRegimeAnalysis(events) {
  const regimes = [
    {
      name: 'Low-Vol Bull',
      period: '2017',
      start: '2017-01-01',
      end: '2018-09-30',
      annualReturn: 21.61,
      maxDrawdown: -6.2,
      avgVolatility: 11.2,
      description: 'Steady climb with low volatility. Trend-following and momentum strategies thrive.',
      slRecommendation: '2.0x ATR',
      breakevenRecommendation: 'Move to breakeven at 1.0x ATR profit',
      positionSizing: '100% normal size',
      strategyBias: 'Trend following, breakout, momentum',
      color: '#22c55e',
    },
    {
      name: 'Correction / Bear',
      period: '2018 Q4',
      start: '2018-10-01',
      end: '2018-12-31',
      annualReturn: -4.23,
      maxDrawdown: -19.8,
      avgVolatility: 16.8,
      description: 'Sharp Q4 sell-off. High volatility, negative drift. Defensive positioning required.',
      slRecommendation: '2.5x ATR',
      breakevenRecommendation: 'Tighten to breakeven at 0.5x ATR profit',
      positionSizing: '50% normal size',
      strategyBias: 'Short trends, hedging, cash',
      color: '#ef4444',
    },
    {
      name: 'Recovery Bull',
      period: '2019',
      start: '2019-01-01',
      end: '2019-12-31',
      annualReturn: 31.21,
      maxDrawdown: -6.3,
      avgVolatility: 13.5,
      description: 'Strong recovery after Q4 2018 sell-off. Momentum returns, but watch for overextension.',
      slRecommendation: '2.0x ATR',
      breakevenRecommendation: 'Move to breakeven at 1.2x ATR profit',
      positionSizing: '100% normal size',
      strategyBias: 'Momentum, breakout, trend following',
      color: '#22c55e',
    },
    {
      name: 'COVID Crash & Recovery',
      period: '2020',
      start: '2020-01-01',
      end: '2020-12-31',
      annualReturn: 18.02,
      maxDrawdown: -34.1,
      avgVolatility: 28.4,
      description: 'Fastest bear market in history followed by rapid recovery. Extreme volatility, policy-driven.',
      slRecommendation: '3.0x ATR',
      breakevenRecommendation: 'Wider breakeven at 1.5x ATR profit',
      positionSizing: '50% normal size during volatility',
      strategyBias: 'Momentum with wide stops, avoid mean reversion',
      color: '#fbbf24',
    },
    {
      name: 'Low-Vol Bull',
      period: '2021',
      start: '2021-01-01',
      end: '2021-12-31',
      annualReturn: 28.47,
      maxDrawdown: -5.2,
      avgVolatility: 12.1,
      description: 'Strong bull market with low volatility. Clean trends, easy money for trend followers.',
      slRecommendation: '2.0x ATR',
      breakevenRecommendation: 'Move to breakeven at 1.0x ATR profit',
      positionSizing: '100-125% normal size',
      strategyBias: 'Trend following, breakout, momentum',
      color: '#22c55e',
    },
    {
      name: 'Bear Market',
      period: '2022',
      start: '2022-01-01',
      end: '2022-12-31',
      annualReturn: -18.04,
      maxDrawdown: -25.4,
      avgVolatility: 22.6,
      description: 'Inflation-driven sell-off. Highest volatility since 2020. Fed tightening cycle.',
      slRecommendation: '2.5x ATR',
      breakevenRecommendation: 'Tighten to breakeven at 0.5x ATR profit',
      positionSizing: '25-50% normal size',
      strategyBias: 'Short trends, hedging, cash',
      color: '#ef4444',
    },
    {
      name: 'Recovery Bull',
      period: '2023',
      start: '2023-01-01',
      end: '2023-12-31',
      annualReturn: 26.06,
      maxDrawdown: -7.8,
      avgVolatility: 14.2,
      description: 'Strong recovery led by AI rally. Breadth improving, but concentration risk emerging.',
      slRecommendation: '2.0x ATR',
      breakevenRecommendation: 'Move to breakeven at 1.0x ATR profit',
      positionSizing: '100% normal size',
      strategyBias: 'Momentum, breakout, AI/trade themes',
      color: '#22c55e',
    },
    {
      name: 'Mature Bull / Rotation',
      period: '2024',
      start: '2024-01-01',
      end: '2024-12-31',
      annualReturn: 24.88,
      maxDrawdown: -8.5,
      avgVolatility: 13.8,
      description: 'Continued rally but with yield curve inversion concerns. Leadership rotating from tech to value.',
      slRecommendation: '2.0x ATR',
      breakevenRecommendation: 'Move to breakeven at 1.0x ATR profit',
      positionSizing: '75-100% normal size',
      strategyBias: 'Balanced: momentum + value, reduce concentration',
      color: '#fbbf24',
    },
    {
      name: 'Late-Cycle Bull / Bubble Risk',
      period: '2025',
      start: '2025-01-01',
      end: '2025-12-31',
      annualReturn: 17.78,
      maxDrawdown: -10.2,
      avgVolatility: 15.1,
      description: 'Narrow leadership, momentum dominance. Bubble signals emerging. P/E expansion driving returns.',
      slRecommendation: '2.5x ATR',
      breakevenRecommendation: 'Tighten to breakeven at 0.8x ATR profit',
      positionSizing: '50-75% normal size',
      strategyBias: 'Reduce momentum exposure, add defensives, take profits',
      color: '#f97316',
    },
    {
      name: 'Rotation / Transitional',
      period: '2026 YTD',
      start: '2026-01-01',
      end: '2026-07-26',
      annualReturn: 2.33,
      maxDrawdown: -4.5,
      avgVolatility: 14.5,
      description: 'Structural bull intact but momentum rotation in progress. S&P 500 at 50-day MA support.',
      slRecommendation: '2.5x ATR',
      breakevenRecommendation: 'Tighten to breakeven at 0.8x ATR profit',
      positionSizing: '75% normal size',
      strategyBias: 'Defensive rotation, quality names, avoid crowded trades',
      color: '#eab308',
    },
  ];

  const currentRegime = regimes[regimes.length - 1];

  const html = [];
  html.push(`<div class="report-header"><h2>Market Regime Analysis</h2><p>S&P 500 regime classification since 2017 with trading parameter recommendations per regime. Updated: July 2026.</p></div>`);

  html.push(`<div class="report-body"><h3>Current Regime: ${currentRegime.name}</h3>
    <p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">${currentRegime.description}</p>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;margin-bottom:16px;">
      <div style="display:flex;flex-wrap:wrap;gap:16px;">
        <div style="flex:1;min-width:200px;">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Period</div>
          <div style="font-size:16px;font-weight:700;margin-top:4px;">${currentRegime.period}</div>
        </div>
        <div style="flex:1;min-width:200px;">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">YTD Return</div>
          <div style="font-size:16px;font-weight:700;margin-top:4px;color:${currentRegime.annualReturn >= 0 ? '#22c55e' : '#ef4444'};">${currentRegime.annualReturn >= 0 ? '+' : ''}${currentRegime.annualReturn.toFixed(2)}%</div>
        </div>
        <div style="flex:1;min-width:200px;">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Max Drawdown</div>
          <div style="font-size:16px;font-weight:700;margin-top:4px;color:#ef4444;">${currentRegime.maxDrawdown.toFixed(1)}%</div>
        </div>
        <div style="flex:1;min-width:200px;">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Avg Volatility</div>
          <div style="font-size:16px;font-weight:700;margin-top:4px;">${currentRegime.avgVolatility.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  </div>`);

  html.push(`<div class="report-body"><h3>Regime Timeline (2017 - Present)</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Historical S&P 500 regimes with annual returns and maximum drawdowns.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Period</th><th style="padding:8px;text-align:left">Regime</th><th style="padding:8px;text-align:right">Annual Return</th><th style="padding:8px;text-align:right">Max Drawdown</th><th style="padding:8px;text-align:right">Avg Volatility</th></tr></thead><tbody>`);

  for (const r of regimes) {
    const retColor = r.annualReturn >= 0 ? '#22c55e' : '#ef4444';
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">${r.period}</td><td style="padding:8px;color:${r.color};font-weight:600;">${r.name}</td><td style="padding:8px;text-align:right;color:${retColor};">${r.annualReturn >= 0 ? '+' : ''}${r.annualReturn.toFixed(2)}%</td><td style="padding:8px;text-align:right;color:#ef4444;">${r.maxDrawdown.toFixed(1)}%</td><td style="padding:8px;text-align:right;">${r.avgVolatility.toFixed(1)}%</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  html.push(regimeRecommendations(currentRegime));

  html.push(allRegimeComparison(regimes));

  html.push(transitionSignals());

  return { title: 'Market Regime Analysis', description: 'S&P 500 market regime classification since 2017 with trading parameter recommendations.', html: html.join(''), category: 'Market Regime' };
}

function regimeRecommendations(current) {
  const html = [];
  html.push(`<div class="report-body"><h3>Current Regime Trading Parameters</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Recommended settings for the current market regime. Adjust these before entering trades.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Parameter</th><th style="padding:8px;text-align:left">Recommendation</th><th style="padding:8px;text-align:left">Rationale</th></tr></thead><tbody>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">Stop-Loss Distance</td><td style="padding:8px;color:#fbbf24;">${current.slRecommendation}</td><td style="padding:8px;color:#94a3b8;">Wider stops prevent whipsaws in transitional volatility</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">Breakeven Trigger</td><td style="padding:8px;color:#fbbf24;">${current.breakevenRecommendation}</td><td style="padding:8px;color:#94a3b8;">Lock in profits earlier when momentum shifts</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">Position Sizing</td><td style="padding:8px;color:#fbbf24;">${current.positionSizing}</td><td style="padding:8px;color:#94a3b8;">Reduce exposure during regime uncertainty</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;font-weight:600;">Strategy Bias</td><td style="padding:8px;color:#fbbf24;">${current.strategyBias}</td><td style="padding:8px;color:#94a3b8;">Align trade direction with regime trend</td></tr>`);
  html.push(`</tbody></table></div>`);

  return html.join('');
}

function allRegimeComparison(regimes) {
  const html = [];
  html.push(`<div class="report-body"><h3>Regime Comparison Matrix</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Side-by-side comparison of optimal trading parameters across all identified regimes.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Regime</th><th style="padding:8px;text-align:left">SL Distance</th><th style="padding:8px;text-align:left">Breakeven Trigger</th><th style="padding:8px;text-align:left">Position Size</th><th style="padding:8px;text-align:left">Strategy</th></tr></thead><tbody>`);

  for (const r of regimes) {
    html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:${r.color};font-weight:600;">${r.name}</td><td style="padding:8px;color:#e2e8f0;">${r.slRecommendation}</td><td style="padding:8px;color:#e2e8f0;">${r.breakevenRecommendation}</td><td style="padding:8px;color:#e2e8f0;">${r.positionSizing}</td><td style="padding:8px;color:#94a3b8;">${r.strategyBias}</td></tr>`);
  }
  html.push(`</tbody></table></div>`);

  return html.join('');
}

function transitionSignals() {
  const html = [];
  html.push(`<div class="report-body"><h3>Regime Transition Signals</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Watch these indicators for early warning of regime changes. Transition phases carry the highest risk.</p>`);
  html.push(`<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;"><thead><tr style="background:#1e293b;color:#94a3b8;"><th style="padding:8px;text-align:left">Signal</th><th style="padding:8px;text-align:left">Bull to Transition</th><th style="padding:8px;text-align:left">Transition to Bear</th><th style="padding:8px;text-align:left">Action</th></tr></thead><tbody>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">S&P 500 vs 200-day MA</td><td style="padding:8px;color:#94a3b8;">Price within 5% of MA</td><td style="padding:8px;color:#ef4444;">Price breaks below MA</td><td style="padding:8px;color:#fbbf24;">Reduce to 50% size</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">VIX Level</td><td style="padding:8px;color:#94a3b8;">VIX rising above 20</td><td style="padding:8px;color:#ef4444;">VIX above 30</td><td style="padding:8px;color:#fbbf24;">Widen stops 3x ATR</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Yield Curve (10Y-3M)</td><td style="padding:8px;color:#94a3b8;">Curve flattening</td><td style="padding:8px;color:#ef4444;">Curve inverted > 3 months</td><td style="padding:8px;color:#fbbf24;">Shift to defensive</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Market Breadth</td><td style="padding:8px;color:#94a3b8;">Narrowing participation</td><td style="padding:8px;color:#ef4444;">Breadth < 40% above 50 MA</td><td style="padding:8px;color:#fbbf24;">Reduce position count</td></tr>`);
  html.push(`<tr style="border-bottom:1px solid #1e293b;"><td style="padding:8px;color:#e2e8f0;">Credit Spreads (HY OAS)</td><td style="padding:8px;color:#94a3b8;">Widening above 400 bps</td><td style="padding:8px;color:#ef4444;">Widening above 600 bps</td><td style="padding:8px;color:#fbbf24;">Move to cash/treasuries</td></tr>`);
  html.push(`</tbody></table></div>`);

  html.push(`<div class="report-body"><h3>Transition Playbook</h3><p style="color:#94a3b8;font-size:13px;margin-bottom:8px;">Rules for navigating regime changes without getting whipsawed.</p>`);
  html.push(`<ol style="color:#e2e8f0;font-size:13px;line-height:1.8;padding-left:20px;">`);
  html.push(`<li><strong style="color:#fbbf24;">Detect transition:</strong> Wait for 2+ signals aligning before acting.</li>`);
  html.push(`<li><strong style="color:#fbbf24;">Reduce size:</strong> Cut position size to 50% until new regime confirms.</li>`);
  html.push(`<li><strong style="color:#fbbf24;">Wait for confirmation:</strong> Require regime to persist for 5+ bars before switching strategy.</li>`);
  html.push(`<li><strong style="color:#fbbf24;">Avoid full switches:</strong> Never switch strategies on a single bar signal.</li>`);
  html.push(`<li><strong style="color:#fbbf24;">Execution quality:</strong> Monitor spreads and slippage; deteriorating execution precedes regime breaks.</li>`);
  html.push(`</ol>`);
  html.push(`</div>`);

  return html.join('');
}
