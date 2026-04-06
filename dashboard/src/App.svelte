<script lang="ts">
  import { onMount } from 'svelte';

  interface PerpTrade {
    label: string;
    side: string;
    action: string;
    value_usd: number;
    timestamp: string;
  }

  interface PerpSentiment {
    symbol: string;
    longs: number;
    shorts: number;
    long_usd: number;
    short_usd: number;
    net_usd: number;
    long_traders: number;
    short_traders: number;
    bias: string;
    top_trades?: PerpTrade[];
  }

  interface Alert {
    token_symbol: string;
    chain: string;
    confidence: string;
    score: number;
    summary: string;
    timestamp: string;
    signals: any[];
  }

  interface PricePoint {
    date: string;
    price: number;
    net_flow: number;
    holders: number;
  }

  interface Holder {
    label: string;
    tokens: number;
    ownership_pct: number;
    change_7d: number;
    is_exchange: boolean;
  }

  interface DashboardData {
    generated_at: string;
    api_calls: number;
    perp_sentiment: PerpSentiment[];
    alerts: Alert[];
    drift_case_study: {
      token: { name: string; symbol: string; market_cap: number };
      event: { name: string; date: string; tvl_drop: string };
      price_timeline: PricePoint[];
      holders: Holder[];
      traders: any[];
      key_findings: string[];
      honest_assessment: {
        early_warning: string;
        what_it_shows: string;
        implication: string;
      };
    };
    metadata: {
      chains_scanned: string[];
      total_signals: number;
      false_positive_baseline: {
        solana: string;
        ethereum: string;
        measurement_date: string;
      };
    };
  }

  let data: DashboardData | null = $state(null);
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    try {
      const base = import.meta.env.BASE_URL;
      const res = await fetch(`${base}data/dashboard.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (e: any) {
      error = e.message || 'Failed to load data';
    } finally {
      loading = false;
    }
  });

  function fmtUsd(n: number): string {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
    if (abs >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'K';
    return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function fmtFullUsd(n: number): string {
    return '$' + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function fmtTokens(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function fmtPct(n: number): string {
    return n.toFixed(1) + '%';
  }

  function fmtPrice(n: number): string {
    return '$' + n.toFixed(4);
  }

  function sortedPerps(perps: PerpSentiment[]): PerpSentiment[] {
    return [...perps].sort((a, b) => Math.abs(b.net_usd) - Math.abs(a.net_usd));
  }

  function barWidth(val: number, maxVal: number): number {
    if (maxVal === 0) return 0;
    return Math.max(2, (Math.abs(val) / maxVal) * 100);
  }

  function confidenceClass(c: string): string {
    return 'badge-' + c.toLowerCase();
  }

  function cleanSymbol(sym: string): string {
    return sym.replace(/^(xyz:|cash:)/, '');
  }

  let expandedPerps: Set<string> = $state(new Set());

  function togglePerp(symbol: string) {
    const next = new Set(expandedPerps);
    if (next.has(symbol)) next.delete(symbol);
    else next.add(symbol);
    expandedPerps = next;
  }

  let majorPerps = $derived(data ? sortedPerps(data.perp_sentiment).filter(p => Math.abs(p.net_usd) > 5_000_000) : []);
  let otherPerps = $derived(data ? sortedPerps(data.perp_sentiment).filter(p => Math.abs(p.net_usd) <= 5_000_000) : []);
  let perpMaxUsd = $derived(data ? Math.max(...data.perp_sentiment.map(p => Math.max(p.long_usd, p.short_usd))) : 0);

  // SVG chart helpers - wider viewBox (900x220)
  function buildPricePath(timeline: PricePoint[]): string {
    if (!timeline.length) return '';
    const prices = timeline.map(p => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const rangeP = maxP - minP || 1;

    const w = 900;
    const h = 220;
    const padY = 20;

    return timeline.map((pt, i) => {
      const x = (i / (timeline.length - 1)) * w;
      const y = padY + (1 - (pt.price - minP) / rangeP) * (h - padY * 2);
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
  }

  function buildAreaPath(timeline: PricePoint[]): string {
    if (!timeline.length) return '';
    const prices = timeline.map(p => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const rangeP = maxP - minP || 1;

    const w = 900;
    const h = 220;
    const padY = 20;

    let path = timeline.map((pt, i) => {
      const x = (i / (timeline.length - 1)) * w;
      const y = padY + (1 - (pt.price - minP) / rangeP) * (h - padY * 2);
      return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');

    const lastX = ((timeline.length - 1) / (timeline.length - 1)) * w;
    path += ` L${lastX},${h} L0,${h} Z`;
    return path;
  }

  function hackDayX(timeline: PricePoint[]): number {
    const idx = timeline.findIndex(p => p.date === '2026-04-01');
    if (idx === -1) return -1;
    return (idx / (timeline.length - 1)) * 900;
  }

  function priceLabels(timeline: PricePoint[]): { y: number; label: string }[] {
    const prices = timeline.map(p => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const h = 220;
    const padY = 20;
    return [
      { y: padY, label: fmtPrice(maxP) },
      { y: h / 2, label: fmtPrice((maxP + minP) / 2) },
      { y: h - padY, label: fmtPrice(minP) },
    ];
  }

  function dateLabels(timeline: PricePoint[]): { x: number; label: string }[] {
    const w = 900;
    const step = Math.max(1, Math.floor(timeline.length / 5));
    const labels: { x: number; label: string }[] = [];
    for (let i = 0; i < timeline.length; i += step) {
      labels.push({
        x: (i / (timeline.length - 1)) * w,
        label: timeline[i].date.slice(5),
      });
    }
    const last = timeline.length - 1;
    if (labels[labels.length - 1]?.x !== (last / (timeline.length - 1)) * w) {
      labels.push({
        x: (last / (timeline.length - 1)) * w,
        label: timeline[last].date.slice(5),
      });
    }
    return labels;
  }

  function fmtDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }
</script>

{#if loading}
  <div class="loading-screen">
    <div class="loading-ring">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke="rgba(59,130,246,0.15)" stroke-width="3"/>
        <circle cx="24" cy="24" r="20" stroke="var(--accent-brand)" stroke-width="3" stroke-linecap="round" stroke-dasharray="30 100" class="spin-ring"/>
      </svg>
    </div>
    <p class="loading-text">Loading intelligence data</p>
  </div>
{:else if error}
  <div class="error-screen">
    <p class="error-text">Could not load data: {error}</p>
  </div>
{:else if data}

  <!-- Accent glow behind hero area -->
  <div class="hero-glow" aria-hidden="true"></div>

  <!-- Header -->
  <header class="header">
    <div class="header-left">
      <div class="logo-mark">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="var(--accent-brand)" stroke-width="1.5" opacity="0.5"/>
          <circle cx="14" cy="14" r="7" stroke="var(--accent-brand)" stroke-width="1" opacity="0.3"/>
          <circle cx="14" cy="14" r="3" fill="var(--accent-brand)"/>
        </svg>
      </div>
      <div>
        <h1 class="logo-text">Nansen Sentinel</h1>
        <p class="logo-sub">Smart Money Intelligence</p>
        <p class="header-desc">Cross-referencing perp positions, netflow, DEX trades, and exchange inflows across {data.metadata.chains_scanned.length} chains.</p>
      </div>
    </div>
    <div class="header-right">
      <span class="header-timestamp mono">Data from {fmtDate(data.generated_at)}</span>
      <span class="status-dot" title="Data is fresh"></span>
    </div>
  </header>

  <!-- Sticky Section Nav -->
  <nav class="section-nav">
    <div class="section-nav-inner">
      <a href="#perp-sentiment" class="section-nav-link">Perp Sentiment</a>
      <a href="#alerts" class="section-nav-link">Alerts</a>
      <a href="#case-study" class="section-nav-link">Case Study</a>
      <a href="#methodology" class="section-nav-link">Methodology</a>
    </div>
  </nav>

  <!-- Section 1: Perp Sentiment -->
  <section class="section" id="perp-sentiment">
    <h2 class="section-heading">Perp Sentiment</h2>
    <p class="section-desc">Smart money positioning on Hyperliquid perpetuals, sorted by absolute net exposure.</p>

    <div class="perp-list">
      {#each majorPerps as item}
        <button class="perp-row perp-clickable" class:perp-long={item.bias === 'LONG'} class:perp-short={item.bias !== 'LONG'} class:perp-major={true} class:perp-expanded={expandedPerps.has(item.symbol)} onclick={() => togglePerp(item.symbol)}>
          <div class="perp-left">
            <span class="perp-name mono">{cleanSymbol(item.symbol)}</span>
            <span class="perp-badge" class:perp-badge-long={item.bias === 'LONG'} class:perp-badge-short={item.bias !== 'LONG'}>
              {item.bias}
            </span>
            <span class="perp-expand-icon" class:rotated={expandedPerps.has(item.symbol)}>&#9662;</span>
          </div>

          <div class="perp-bars">
            <div class="bar-row">
              <span class="bar-label">L</span>
              <div class="bar-track">
                <div class="bar-fill bar-long" style="width: {barWidth(item.long_usd, perpMaxUsd)}%"></div>
              </div>
              <span class="bar-value mono">{fmtUsd(item.long_usd)}</span>
            </div>
            <div class="bar-row">
              <span class="bar-label">S</span>
              <div class="bar-track">
                <div class="bar-fill bar-short" style="width: {barWidth(item.short_usd, perpMaxUsd)}%"></div>
              </div>
              <span class="bar-value mono">{fmtUsd(item.short_usd)}</span>
            </div>
          </div>

          <div class="perp-net mono" class:text-long={item.net_usd >= 0} class:text-short={item.net_usd < 0}>
            {item.net_usd >= 0 ? '+' : ''}{fmtUsd(item.net_usd)}
          </div>
        </button>
        {#if expandedPerps.has(item.symbol)}
          <div class="perp-detail">
            <div class="perp-detail-stats">
              <div class="detail-stat">
                <span class="detail-label">Long Trades</span>
                <span class="detail-value mono text-long">{item.longs} trades &middot; {item.long_traders} traders &middot; {fmtFullUsd(item.long_usd)}</span>
              </div>
              <div class="detail-stat">
                <span class="detail-label">Short Trades</span>
                <span class="detail-value mono text-short">{item.shorts} trades &middot; {item.short_traders} traders &middot; {fmtFullUsd(item.short_usd)}</span>
              </div>
            </div>
            {#if item.top_trades && item.top_trades.length > 0}
              <div class="perp-detail-trades">
                <span class="detail-trades-label">Top Trades</span>
                {#each item.top_trades as trade}
                  <div class="detail-trade-row">
                    <span class="detail-trade-label" title={trade.label}>{trade.label.length > 35 ? trade.label.slice(0, 33) + '...' : trade.label}</span>
                    <span class="detail-trade-side" class:text-long={trade.side === 'Long'} class:text-short={trade.side !== 'Long'}>{trade.side} {trade.action}</span>
                    <span class="detail-trade-val mono">{fmtFullUsd(trade.value_usd)}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/each}

      {#if majorPerps.length > 0 && otherPerps.length > 0}
        <div class="perp-divider">
          <span class="perp-divider-line"></span>
          <span class="perp-divider-label">Other Positions</span>
          <span class="perp-divider-line"></span>
        </div>
      {/if}

      {#each otherPerps as item}
        <button class="perp-row perp-clickable" class:perp-long={item.bias === 'LONG'} class:perp-short={item.bias !== 'LONG'} class:perp-expanded={expandedPerps.has(item.symbol)} onclick={() => togglePerp(item.symbol)}>
          <div class="perp-left">
            <span class="perp-name mono">{cleanSymbol(item.symbol)}</span>
            <span class="perp-badge" class:perp-badge-long={item.bias === 'LONG'} class:perp-badge-short={item.bias !== 'LONG'}>
              {item.bias}
            </span>
            <span class="perp-expand-icon" class:rotated={expandedPerps.has(item.symbol)}>&#9662;</span>
          </div>

          <div class="perp-bars">
            <div class="bar-row">
              <span class="bar-label">L</span>
              <div class="bar-track">
                <div class="bar-fill bar-long" style="width: {barWidth(item.long_usd, perpMaxUsd)}%"></div>
              </div>
              <span class="bar-value mono">{fmtUsd(item.long_usd)}</span>
            </div>
            <div class="bar-row">
              <span class="bar-label">S</span>
              <div class="bar-track">
                <div class="bar-fill bar-short" style="width: {barWidth(item.short_usd, perpMaxUsd)}%"></div>
              </div>
              <span class="bar-value mono">{fmtUsd(item.short_usd)}</span>
            </div>
          </div>

          <div class="perp-net mono" class:text-long={item.net_usd >= 0} class:text-short={item.net_usd < 0}>
            {item.net_usd >= 0 ? '+' : ''}{fmtUsd(item.net_usd)}
          </div>
        </button>
        {#if expandedPerps.has(item.symbol)}
          <div class="perp-detail">
            <div class="perp-detail-stats">
              <div class="detail-stat">
                <span class="detail-label">Long Trades</span>
                <span class="detail-value mono text-long">{item.longs} trades &middot; {item.long_traders} traders &middot; {fmtFullUsd(item.long_usd)}</span>
              </div>
              <div class="detail-stat">
                <span class="detail-label">Short Trades</span>
                <span class="detail-value mono text-short">{item.shorts} trades &middot; {item.short_traders} traders &middot; {fmtFullUsd(item.short_usd)}</span>
              </div>
            </div>
            {#if item.top_trades && item.top_trades.length > 0}
              <div class="perp-detail-trades">
                <span class="detail-trades-label">Top Trades</span>
                {#each item.top_trades as trade}
                  <div class="detail-trade-row">
                    <span class="detail-trade-label" title={trade.label}>{trade.label.length > 35 ? trade.label.slice(0, 33) + '...' : trade.label}</span>
                    <span class="detail-trade-side" class:text-long={trade.side === 'Long'} class:text-short={trade.side !== 'Long'}>{trade.side} {trade.action}</span>
                    <span class="detail-trade-val mono">{fmtFullUsd(trade.value_usd)}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  </section>

  <!-- Section 2: Alerts -->
  <section class="section" id="alerts">
    <h2 class="section-heading">Alerts</h2>
    <p class="section-desc">Active signals from cross-referencing smart money flows, perp positions, and token anomalies.</p>

    <div class="alerts-grid">
      {#each data.alerts as alert}
        <div class="alert-card alert-{alert.confidence.toLowerCase()}">
          <div class="alert-top">
            <div class="alert-token-group">
              <span class="alert-token mono">{cleanSymbol(alert.token_symbol)}</span>
              <span class="alert-chain">{alert.chain}</span>
            </div>
            <span class="badge {confidenceClass(alert.confidence)}">{alert.confidence}</span>
          </div>
          <p class="alert-body">{alert.summary}</p>
          <div class="alert-score-bar">
            <div class="alert-score-fill" style="width: {alert.score}%"></div>
          </div>
          <div class="alert-meta mono">
            <span>Score {alert.score}/100</span>
            <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Section 3: Drift Case Study -->
  <section class="section section-drift" id="case-study">
    <div class="drift-header">
      <h2 class="drift-title">{data.drift_case_study.event.name}</h2>
      <div class="drift-meta-row">
        <span class="drift-date mono">{data.drift_case_study.event.date}</span>
        <span class="drift-sep"></span>
        <span class="drift-token">{data.drift_case_study.token.symbol}</span>
        <span class="drift-sep"></span>
        <span class="drift-mcap mono">{fmtUsd(data.drift_case_study.token.market_cap)}</span>
        <span class="drift-sep"></span>
        <span class="drift-tvl text-short">TVL: {data.drift_case_study.event.tvl_drop}</span>
      </div>
    </div>

    <!-- Price Chart -->
    <div class="chart-card">
      <h3 class="chart-label">DRIFT / USD (14-day)</h3>
      <div class="chart-wrap">
        <svg viewBox="-60 -4 970 260" class="price-chart" preserveAspectRatio="xMidYMid meet">
          <!-- Grid lines -->
          <line x1="0" y1="20" x2="900" y2="20" stroke="var(--border-subtle)" stroke-dasharray="3 6"/>
          <line x1="0" y1="110" x2="900" y2="110" stroke="var(--border-subtle)" stroke-dasharray="3 6"/>
          <line x1="0" y1="200" x2="900" y2="200" stroke="var(--border-subtle)" stroke-dasharray="3 6"/>

          <!-- Price labels on left -->
          {#each priceLabels(data.drift_case_study.price_timeline) as pl}
            <text x="-8" y={pl.y + 4} fill="var(--text-muted)" font-size="12" text-anchor="end" font-family="var(--font-mono)">{pl.label}</text>
          {/each}

          <!-- Hack day vertical line -->
          {#if hackDayX(data.drift_case_study.price_timeline) >= 0}
            <line
              x1={hackDayX(data.drift_case_study.price_timeline)}
              y1="0"
              x2={hackDayX(data.drift_case_study.price_timeline)}
              y2="240"
              stroke="var(--accent-red)"
              stroke-width="1.5"
              stroke-dasharray="6 4"
              opacity="0.6"
            />
            <text
              x={hackDayX(data.drift_case_study.price_timeline) + 8}
              y="14"
              fill="var(--accent-red)"
              font-size="12"
              font-weight="600"
              font-family="var(--font-mono)"
            >Exploit</text>
          {/if}

          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent-brand)" stop-opacity="0.40"/>
              <stop offset="100%" stop-color="var(--accent-brand)" stop-opacity="0"/>
            </linearGradient>
          </defs>

          <!-- Area fill -->
          <path d={buildAreaPath(data.drift_case_study.price_timeline)} fill="url(#areaGrad)"/>

          <!-- Price line -->
          <path
            d={buildPricePath(data.drift_case_study.price_timeline)}
            fill="none"
            stroke="var(--accent-brand)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Data points -->
          {#each data.drift_case_study.price_timeline as pt, i}
            {@const prices = data.drift_case_study.price_timeline.map(p => p.price)}
            {@const minP = Math.min(...prices)}
            {@const maxP = Math.max(...prices)}
            {@const rangeP = maxP - minP || 1}
            {@const cx = (i / (data.drift_case_study.price_timeline.length - 1)) * 900}
            {@const cy = 20 + (1 - (pt.price - minP) / rangeP) * (220 - 40)}
            <circle
              cx={cx}
              cy={cy}
              r="3.5"
              fill={pt.date === '2026-04-01' ? 'var(--accent-red)' : 'var(--accent-brand)'}
              stroke="var(--bg-surface)"
              stroke-width="1.5"
            />
          {/each}

          <!-- Date labels -->
          {#each dateLabels(data.drift_case_study.price_timeline) as dl}
            <text x={dl.x} y="240" fill="var(--text-muted)" font-size="12" text-anchor="middle" font-family="var(--font-mono)">{dl.label}</text>
          {/each}
        </svg>
      </div>
    </div>

    <!-- Key Findings -->
    <div class="findings-card">
      <h3 class="sub-label">Key Findings</h3>
      <ul class="findings-list">
        {#each data.drift_case_study.key_findings as finding}
          <li>
            <span class="dot"></span>
            <span>{finding}</span>
          </li>
        {/each}
      </ul>
    </div>

    <!-- Honest Assessment -->
    <div class="assessment-card">
      <h3 class="sub-label">Honest Assessment</h3>
      <div class="assessment-sections">
        <div class="assessment-block">
          <h4 class="assessment-heading">EARLY WARNING CAPABILITY</h4>
          <p>{data.drift_case_study.honest_assessment.early_warning}</p>
        </div>
        <div class="assessment-block">
          <h4 class="assessment-heading">WHAT THE DATA SHOWS</h4>
          <p>{data.drift_case_study.honest_assessment.what_it_shows}</p>
        </div>
        <div class="assessment-block">
          <h4 class="assessment-heading">IMPLICATION</h4>
          <p>{data.drift_case_study.honest_assessment.implication}</p>
        </div>
      </div>
    </div>

    <!-- Holders Table -->
    <div class="holders-card">
      <h3 class="sub-label">Top Holders &mdash; 7-Day Changes</h3>
      <div class="table-wrap">
        <table class="holders-table">
          <thead>
            <tr>
              <th>Holder</th>
              <th class="col-right">Tokens</th>
              <th class="col-right">Ownership</th>
              <th class="col-right">7D Change</th>
            </tr>
          </thead>
          <tbody>
            {#each data.drift_case_study.holders as holder}
              <tr class:exchange-row={holder.is_exchange}>
                <td class="cell-holder">
                  {#if holder.is_exchange}
                    <span class="ex-tag">EX</span>
                  {/if}
                  <span class="holder-name" title={holder.label}>
                    {holder.label.length > 42 ? holder.label.slice(0, 40) + '...' : holder.label}
                  </span>
                </td>
                <td class="col-right mono">{fmtTokens(holder.tokens)}</td>
                <td class="col-right mono">{fmtPct(holder.ownership_pct)}</td>
                <td class="col-right mono" class:text-long={holder.change_7d > 0} class:text-short={holder.change_7d < 0} class:text-muted={holder.change_7d === 0}>
                  {#if holder.change_7d !== 0}
                    {holder.change_7d > 0 ? '+' : ''}{fmtTokens(holder.change_7d)}
                  {:else}
                    --
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- Section 4: Methodology -->
  <section class="section" id="methodology">
    <h2 class="section-heading">Methodology</h2>

    <div class="method-grid">
      <div class="method-card">
        <span class="method-num mono">1</span>
        <div>
          <h4 class="method-title">SM Netflow Dump</h4>
          <p class="method-desc">Detect tokens with heavily negative smart money netflow over 24h/7d windows.</p>
        </div>
      </div>
      <div class="method-card">
        <span class="method-num mono">2</span>
        <div>
          <h4 class="method-title">SM Perp Shorts</h4>
          <p class="method-desc">Track labeled wallets opening short positions on Hyperliquid.</p>
        </div>
      </div>
      <div class="method-card">
        <span class="method-num mono">3</span>
        <div>
          <h4 class="method-title">Token Anomaly</h4>
          <p class="method-desc">Cross-reference price drops and volume spikes against historical averages.</p>
        </div>
      </div>
      <div class="method-card">
        <span class="method-num mono">4</span>
        <div>
          <h4 class="method-title">Exchange Inflow</h4>
          <p class="method-desc">Holder data showing tokens moving to exchange wallets signals intent to sell.</p>
        </div>
      </div>
    </div>

    <!-- Scoring -->
    <div class="scoring-card">
      <h4 class="scoring-title">Scoring Levels</h4>
      <div class="scoring-rows">
        <div class="scoring-row">
          <span class="badge badge-critical">CRITICAL</span>
          <span>All 4 signals on same token</span>
        </div>
        <div class="scoring-row">
          <span class="badge badge-high">HIGH</span>
          <span>Netflow dump + perp shorts</span>
        </div>
        <div class="scoring-row">
          <span class="badge badge-medium">MEDIUM</span>
          <span>Netflow dump + token anomaly</span>
        </div>
        <div class="scoring-row">
          <span class="badge badge-low">LOW</span>
          <span>Single signal only</span>
        </div>
      </div>
    </div>

    <!-- API Stats -->
    <div class="stats-card">
      <div class="stat-row">
        <span class="stat-label">API Calls Made</span>
        <span class="stat-value mono">{data.api_calls}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Chains Scanned</span>
        <span class="stat-value mono">{data.metadata.chains_scanned.join(', ')}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">False Positive Rate (Solana)</span>
        <span class="stat-value mono">{data.metadata.false_positive_baseline.solana}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">False Positive Rate (Ethereum)</span>
        <span class="stat-value mono">{data.metadata.false_positive_baseline.ethereum}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Data Generated</span>
        <span class="stat-value mono">{fmtDate(data.generated_at)}</span>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-container">
      <p>Built with <a href="https://docs.nansen.ai/reference/cli" target="_blank" rel="noopener">Nansen CLI</a> for <strong>#NansenCLI Challenge</strong></p>
      <p class="footer-link"><a href="https://github.com/Yonkoo11/nansen-sentinel" target="_blank" rel="noopener">GitHub</a></p>
      <p class="footer-fine">Real data from Nansen smart money labels. No mock data. No guarantees.</p>
    </div>
  </footer>
{/if}

<style>
  /* === LOADING / ERROR === */
  .loading-screen, .error-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: var(--sp-4);
    color: var(--text-secondary);
  }

  .loading-text {
    font-size: 14px;
    letter-spacing: 0.02em;
  }

  .error-text {
    font-size: 14px;
    color: var(--accent-red);
  }

  .loading-ring {
    animation: spin 1.2s ease-out infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* === HERO GLOW === */
  .hero-glow {
    position: fixed;
    top: -100px;
    left: 0;
    right: 0;
    height: 600px;
    background: radial-gradient(ellipse at 50% 0%, rgba(34,171,148,0.15) 0%, rgba(34,171,148,0.05) 40%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* === HEADER === */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--sp-6);
    border-bottom: 0.5px solid var(--border-hairline);
    margin-bottom: var(--sp-10);
    position: relative;
    z-index: 1;
    flex-wrap: wrap;
    gap: var(--sp-4);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }

  .logo-mark { flex-shrink: 0; }

  .logo-text {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.5px;
    margin: 0;
    line-height: 1.2;
  }

  .logo-sub {
    font-size: 13px;
    color: var(--text-muted);
    margin: 0;
    letter-spacing: 0.01em;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }

  .header-timestamp {
    font-size: 13px;
    color: var(--text-muted);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-green);
    box-shadow: 0 0 6px var(--accent-green-glow);
    animation: blink 2s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  /* === STICKY NAV === */
  .section-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(22, 22, 26, 0.95);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 0.5px solid var(--border-hairline);
    margin-bottom: var(--sp-10);
  }

  .section-nav-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--sp-3) var(--sp-6);
    display: flex;
    gap: var(--sp-6);
  }

  .section-nav-link {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    text-decoration: none;
    transition: color var(--duration-fast) var(--ease-out);
  }

  .section-nav-link:hover {
    color: var(--accent-brand);
    text-decoration: none;
  }

  /* === HEADER DESC === */
  .header-desc {
    font-size: 14px;
    color: var(--text-secondary);
    max-width: 500px;
    margin-top: var(--sp-1);
    line-height: 1.5;
  }

  /* === SECTIONS === */
  .section {
    margin-bottom: var(--sp-16);
    position: relative;
    z-index: 1;
  }

  .section-heading {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.3px;
    margin-bottom: var(--sp-2);
  }

  .section-desc {
    font-size: 14px;
    color: var(--text-muted);
    margin-bottom: var(--sp-6);
    line-height: 1.5;
  }

  /* === PERP SENTIMENT === */
  .perp-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .perp-row {
    display: grid;
    grid-template-columns: 150px 1fr 110px;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-3) var(--sp-4);
    background: var(--bg-surface);
    border: 0.5px solid var(--border-hairline);
    border-radius: var(--radius-sm);
    transition: background-color var(--duration-fast) var(--ease-out);
  }

  .perp-row:hover {
    background: var(--bg-surface-hover);
  }

  .perp-row.perp-long {
    border-left: 2px solid var(--accent-green);
  }

  .perp-row.perp-short {
    border-left: 2px solid var(--accent-red);
  }

  .perp-row.perp-major.perp-long {
    box-shadow: 0 0 25px rgba(34,171,148,0.10);
    background: linear-gradient(90deg, rgba(34,171,148,0.08) 0%, var(--bg-surface) 30%);
  }

  .perp-row.perp-major.perp-short {
    box-shadow: 0 0 25px rgba(242,54,69,0.10);
    background: linear-gradient(90deg, rgba(242,54,69,0.08) 0%, var(--bg-surface) 30%);
  }

  .perp-left {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .perp-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .perp-badge {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .perp-badge-long {
    background: rgba(34,171,148,0.15);
    color: var(--accent-green);
  }

  .perp-badge-short {
    background: rgba(242,54,69,0.15);
    color: var(--accent-red);
  }

  .perp-bars {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }

  .bar-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .bar-label {
    width: 14px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-align: center;
    flex-shrink: 0;
    font-family: var(--font-mono);
  }

  .bar-track {
    flex: 1;
    height: 12px;
    background: rgba(255,255,255,0.03);
    border-radius: 2px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width var(--duration-normal) var(--ease-out);
  }

  .bar-long {
    background: var(--accent-green);
    opacity: 0.85;
  }

  .bar-short {
    background: var(--accent-red);
    opacity: 0.85;
  }

  .bar-value {
    width: 64px;
    text-align: right;
    font-size: 13px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .perp-net {
    text-align: right;
    font-size: 14px;
    font-weight: 600;
  }

  .perp-divider {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2) 0;
  }

  .perp-divider-line {
    flex: 1;
    height: 0.5px;
    background: var(--border-hairline);
  }

  .perp-divider-label {
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .text-long { color: var(--accent-green); }
  .text-short { color: var(--accent-red); }
  .text-muted { color: var(--text-muted); }

  /* === PERP EXPAND === */
  .perp-clickable {
    cursor: pointer;
    width: 100%;
    font: inherit;
    color: inherit;
    text-align: left;
    outline: none;
  }

  .perp-clickable:focus-visible {
    outline: 2px solid var(--accent-brand);
    outline-offset: 2px;
  }

  .perp-expand-icon {
    font-size: 12px;
    color: var(--text-muted);
    transition: transform var(--duration-fast) var(--ease-out);
    margin-left: auto;
  }

  .perp-expand-icon.rotated {
    transform: rotate(180deg);
  }

  .perp-expanded {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .perp-detail {
    background: var(--bg-elevated);
    border: 0.5px solid var(--border-hairline);
    border-top: none;
    border-radius: 0 0 var(--radius-sm) var(--radius-sm);
    padding: var(--sp-4) var(--sp-5);
    margin-top: -1px;
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }

  .perp-detail-stats {
    display: flex;
    gap: var(--sp-8);
  }

  .detail-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .detail-label {
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .detail-value {
    font-size: 13px;
  }

  .perp-detail-trades {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .detail-trades-label {
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 2px;
  }

  .detail-trade-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: var(--sp-3);
    align-items: center;
    padding: var(--sp-1) 0;
    border-bottom: 0.5px solid var(--border-hairline);
  }

  .detail-trade-row:last-child {
    border-bottom: none;
  }

  .detail-trade-label {
    font-size: 13px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-trade-side {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .detail-trade-val {
    font-size: 13px;
    color: var(--text-primary);
    text-align: right;
  }

  /* === ALERTS === */
  .alerts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--sp-4);
  }

  .alert-card {
    background: var(--bg-surface);
    border: 0.5px solid var(--border-hairline);
    border-radius: var(--radius-md);
    padding: var(--sp-5);
    border-left: 3px solid transparent;
    transition: background-color var(--duration-fast) var(--ease-out),
                border-color var(--duration-fast) var(--ease-out);
  }

  .alert-card:hover {
    background: var(--bg-surface-hover);
  }

  .alert-card.alert-critical {
    border-left-color: var(--accent-red);
    box-shadow: 0 0 30px rgba(242,54,69,0.12), 0 0 60px rgba(242,54,69,0.08);
    background: linear-gradient(135deg, rgba(242,54,69,0.04) 0%, var(--bg-surface) 40%);
  }

  .alert-card.alert-high {
    border-left-color: var(--accent-amber);
    box-shadow: 0 0 25px rgba(245,166,35,0.08);
  }

  .alert-card.alert-medium {
    border-left-color: var(--accent-yellow);
    box-shadow: 0 0 20px rgba(234,179,8,0.08);
  }

  .alert-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--sp-3);
  }

  .alert-token-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .alert-token {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .alert-chain {
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 0.02em;
  }

  .alert-body {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.55;
    margin-bottom: var(--sp-4);
  }

  .alert-score-bar {
    height: 3px;
    background: rgba(255,255,255,0.04);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: var(--sp-2);
  }

  .alert-score-fill {
    height: 100%;
    background: var(--accent-brand);
    border-radius: 2px;
    opacity: 0.7;
  }

  .alert-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-muted);
  }

  /* === DRIFT CASE STUDY === */
  .section-drift {
    padding-top: var(--sp-8);
    border-top: 0.5px solid var(--border-hairline);
  }

  .drift-header {
    margin-bottom: var(--sp-8);
  }

  .drift-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.4px;
    margin-bottom: var(--sp-3);
  }

  .drift-meta-row {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    flex-wrap: wrap;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .drift-date { color: var(--text-muted); }

  .drift-sep {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--text-muted);
    flex-shrink: 0;
  }

  .drift-token {
    font-weight: 600;
    color: var(--text-primary);
  }

  .drift-mcap { color: var(--text-secondary); }

  .drift-tvl {
    font-weight: 600;
  }

  /* Chart card */
  .chart-card {
    background: linear-gradient(180deg, rgba(34,171,148,0.03) 0%, var(--bg-surface) 30%);
    border: 0.5px solid rgba(34,171,148,0.12);
    border-radius: var(--radius-md);
    padding: var(--sp-5);
    margin-bottom: var(--sp-6);
    overflow: hidden;
    box-shadow: 0 0 40px rgba(34,171,148,0.04);
  }

  .chart-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: var(--sp-4);
  }

  .chart-wrap {
    overflow-x: auto;
  }

  .price-chart {
    width: 100%;
    min-width: 600px;
    height: auto;
  }

  /* Findings */
  .findings-card {
    background: var(--bg-surface);
    border: 0.5px solid var(--border-hairline);
    border-radius: var(--radius-md);
    padding: var(--sp-5);
    margin-bottom: var(--sp-6);
  }

  .sub-label {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--sp-4);
  }

  .findings-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .findings-list li {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-3);
    font-size: 15px;
    color: var(--text-secondary);
    line-height: 1.55;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-brand);
    flex-shrink: 0;
    margin-top: 8px;
  }

  /* Holders */
  .holders-card {
    background: var(--bg-surface);
    border: 0.5px solid var(--border-hairline);
    border-radius: var(--radius-md);
    padding: var(--sp-5);
    margin-bottom: var(--sp-6);
    overflow: hidden;
  }

  .table-wrap {
    overflow-x: auto;
  }

  .holders-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  .holders-table th {
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    padding: var(--sp-2) var(--sp-3);
    border-bottom: 0.5px solid var(--border-hairline);
  }

  .holders-table td {
    padding: var(--sp-3);
    border-bottom: 0.5px solid rgba(255,255,255,0.03);
    color: var(--text-secondary);
  }

  .holders-table td.text-long {
    color: var(--accent-green);
  }

  .holders-table td.text-short {
    color: var(--accent-red);
  }

  .holders-table tr:last-child td {
    border-bottom: none;
  }

  .col-right {
    text-align: right;
  }

  .cell-holder {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .holder-name {
    font-size: 13px;
    white-space: nowrap;
  }

  .ex-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 18px;
    border-radius: var(--radius-sm);
    background: rgba(59,130,246,0.1);
    color: var(--accent-brand);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    flex-shrink: 0;
    font-family: var(--font-mono);
  }

  .exchange-row td {
    background: rgba(59,130,246,0.025);
  }

  /* Assessment */
  .assessment-card {
    background: linear-gradient(135deg, rgba(245,166,35,0.03) 0%, var(--bg-surface) 30%);
    border: 0.5px solid rgba(245,166,35,0.15);
    border-left: 3px solid var(--accent-amber);
    border-radius: var(--radius-md);
    padding: var(--sp-6);
    box-shadow: 0 0 30px rgba(245,166,35,0.04);
  }

  .assessment-sections {
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
  }

  .assessment-block {
    padding-bottom: var(--sp-5);
    border-bottom: 0.5px solid rgba(255,255,255,0.04);
  }

  .assessment-block:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }

  .assessment-heading {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent-amber);
    margin-bottom: var(--sp-2);
  }

  .assessment-block p {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  /* === METHODOLOGY === */
  .method-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--sp-4);
    margin-bottom: var(--sp-6);
  }

  .method-card {
    display: flex;
    gap: var(--sp-3);
    background: var(--bg-surface);
    border: 0.5px solid var(--border-hairline);
    border-radius: var(--radius-md);
    padding: var(--sp-4) var(--sp-5);
    transition: background-color var(--duration-fast) var(--ease-out);
  }

  .method-card:hover {
    background: var(--bg-surface-hover);
  }

  .method-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(59,130,246,0.1);
    color: var(--accent-brand);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .method-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--sp-1);
  }

  .method-desc {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  /* Scoring */
  .scoring-card {
    background: var(--bg-surface);
    border: 0.5px solid var(--border-hairline);
    border-radius: var(--radius-md);
    padding: var(--sp-5);
    margin-bottom: var(--sp-6);
  }

  .scoring-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--sp-4);
  }

  .scoring-rows {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    font-size: 14px;
    color: var(--text-secondary);
  }

  .scoring-row {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }

  /* Stats */
  .stats-card {
    background: var(--bg-surface);
    border: 0.5px solid var(--border-hairline);
    border-radius: var(--radius-md);
    padding: var(--sp-5);
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: var(--sp-2) 0;
    border-bottom: 0.5px solid rgba(255,255,255,0.03);
    font-size: 14px;
  }

  .stat-row:last-child {
    border-bottom: none;
  }

  .stat-label {
    color: var(--text-secondary);
  }

  .stat-value {
    color: var(--text-primary);
  }

  /* === FOOTER === */
  .footer {
    padding: var(--sp-10) 0 var(--sp-8);
    font-size: 14px;
    color: var(--text-secondary);
    position: relative;
    z-index: 1;
  }

  .footer-container {
    background: var(--bg-surface);
    border-top: 0.5px solid var(--border-hairline);
    border-radius: var(--radius-md);
    padding: var(--sp-6);
    text-align: center;
  }

  .footer strong {
    color: var(--accent-brand);
    font-weight: 600;
  }

  .footer-link {
    margin-top: var(--sp-3);
  }

  .footer-fine {
    margin-top: var(--sp-3);
    font-size: 12px;
    color: var(--text-muted);
  }

  /* === RESPONSIVE === */
  @media (max-width: 768px) {
    .section-nav-inner {
      padding: var(--sp-3) var(--sp-3);
      gap: var(--sp-4);
      overflow-x: auto;
    }

    .section-nav-link {
      font-size: 12px;
      white-space: nowrap;
    }

    .header {
      flex-direction: column;
      align-items: flex-start;
    }

    .perp-row {
      grid-template-columns: 1fr;
      gap: var(--sp-2);
    }

    .perp-net {
      text-align: left;
    }

    .alerts-grid {
      grid-template-columns: 1fr;
    }

    .method-grid {
      grid-template-columns: 1fr;
    }

    .drift-meta-row {
      gap: var(--sp-2);
    }

    .holder-name {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
</style>
