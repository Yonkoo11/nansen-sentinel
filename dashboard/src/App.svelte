<script lang="ts">
  import { onMount } from 'svelte';

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

  // SVG chart helpers
  function buildPricePath(timeline: PricePoint[]): string {
    if (!timeline.length) return '';
    const prices = timeline.map(p => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const rangeP = maxP - minP || 1;

    const w = 700;
    const h = 200;
    const padY = 16;

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

    const w = 700;
    const h = 200;
    const padY = 16;

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
    return (idx / (timeline.length - 1)) * 700;
  }

  function priceLabels(timeline: PricePoint[]): { y: number; label: string }[] {
    const prices = timeline.map(p => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const h = 200;
    const padY = 16;
    return [
      { y: padY, label: fmtPrice(maxP) },
      { y: h / 2, label: fmtPrice((maxP + minP) / 2) },
      { y: h - padY, label: fmtPrice(minP) },
    ];
  }

  function dateLabels(timeline: PricePoint[]): { x: number; label: string }[] {
    const w = 700;
    const step = Math.max(1, Math.floor(timeline.length / 5));
    const labels: { x: number; label: string }[] = [];
    for (let i = 0; i < timeline.length; i += step) {
      labels.push({
        x: (i / (timeline.length - 1)) * w,
        label: timeline[i].date.slice(5), // MM-DD
      });
    }
    // Always include last
    const last = timeline.length - 1;
    if (labels[labels.length - 1]?.x !== (last / (timeline.length - 1)) * w) {
      labels.push({
        x: (last / (timeline.length - 1)) * w,
        label: timeline[last].date.slice(5),
      });
    }
    return labels;
  }
</script>

{#if loading}
  <div class="loading-screen">
    <div class="loading-pulse"></div>
    <p>Loading Sentinel data...</p>
  </div>
{:else if error}
  <div class="error-screen">
    <p>Failed to load: {error}</p>
  </div>
{:else if data}
  <!-- Header -->
  <header class="header">
    <div class="header-left">
      <div class="logo-mark">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="var(--accent-blue)" stroke-width="2" opacity="0.6"/>
          <circle cx="14" cy="14" r="6" fill="var(--accent-blue)" opacity="0.4"/>
          <circle cx="14" cy="14" r="3" fill="var(--accent-blue)"/>
        </svg>
      </div>
      <div>
        <h1 class="logo-text">Nansen Sentinel</h1>
        <p class="logo-sub">Smart Money Early Warning System</p>
      </div>
    </div>
    <div class="header-right">
      <div class="header-stat">
        <span class="header-stat-label">Signals</span>
        <span class="header-stat-value mono">{data.metadata.total_signals}</span>
      </div>
      <div class="header-stat">
        <span class="header-stat-label">API Calls</span>
        <span class="header-stat-value mono">{data.api_calls}</span>
      </div>
      <div class="header-stat">
        <span class="header-stat-label">Chains</span>
        <span class="header-stat-value mono">{data.metadata.chains_scanned.length}</span>
      </div>
    </div>
  </header>

  <!-- Section 1: Perp Sentiment -->
  <section class="section">
    <p class="section-title">Smart Money Positioning</p>
    <h2 class="section-heading">Smart Money Perp Positions &mdash; Hyperliquid</h2>

    <div class="perp-grid">
      {#each sortedPerps(data.perp_sentiment) as item}
        {@const maxUsd = Math.max(
          ...data.perp_sentiment.map(p => Math.max(p.long_usd, p.short_usd))
        )}
        <div class="perp-row card">
          <div class="perp-symbol">
            <span class="perp-name">{cleanSymbol(item.symbol)}</span>
            <span class="badge {item.bias === 'LONG' ? 'badge-long' : 'badge-short'}">
              {item.bias}
            </span>
          </div>

          <div class="perp-bars">
            <div class="bar-row">
              <span class="bar-label mono">Long</span>
              <div class="bar-track">
                <div
                  class="bar-fill bar-long"
                  style="width: {barWidth(item.long_usd, maxUsd)}%"
                ></div>
              </div>
              <span class="bar-value mono">{fmtUsd(item.long_usd)}</span>
              <span class="bar-count mono">{item.longs}t / {item.long_traders}w</span>
            </div>
            <div class="bar-row">
              <span class="bar-label mono">Short</span>
              <div class="bar-track">
                <div
                  class="bar-fill bar-short"
                  style="width: {barWidth(item.short_usd, maxUsd)}%"
                ></div>
              </div>
              <span class="bar-value mono">{fmtUsd(item.short_usd)}</span>
              <span class="bar-count mono">{item.shorts}t / {item.short_traders}w</span>
            </div>
          </div>

          <div class="perp-net mono {item.net_usd >= 0 ? 'text-green' : 'text-red'}">
            Net: {item.net_usd >= 0 ? '+' : ''}{fmtUsd(item.net_usd)}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Section 2: Alerts -->
  <section class="section">
    <p class="section-title">Active Monitoring</p>
    <h2 class="section-heading">Smart Money Signals</h2>

    <div class="alerts-grid">
      {#each data.alerts as alert}
        <div class="alert-card card alert-{alert.confidence.toLowerCase()}">
          <div class="alert-header">
            <span class="alert-token">{cleanSymbol(alert.token_symbol)}</span>
            <span class="badge {confidenceClass(alert.confidence)}">{alert.confidence}</span>
          </div>
          <div class="alert-chain mono">{alert.chain}</div>
          <p class="alert-summary">{alert.summary}</p>
          <div class="alert-footer">
            <span class="alert-score mono">Score: {alert.score}</span>
            <span class="alert-time mono">{new Date(alert.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Section 3: Drift Case Study -->
  <section class="section">
    <p class="section-title">Case Study</p>
    <h2 class="section-heading">Drift Protocol Exploit &mdash; April 1, 2026</h2>

    <div class="drift-meta">
      <div class="drift-meta-item">
        <span class="drift-meta-label">Token</span>
        <span class="drift-meta-value">{data.drift_case_study.token.symbol}</span>
      </div>
      <div class="drift-meta-item">
        <span class="drift-meta-label">Market Cap</span>
        <span class="drift-meta-value mono">{fmtUsd(data.drift_case_study.token.market_cap)}</span>
      </div>
      <div class="drift-meta-item">
        <span class="drift-meta-label">TVL Impact</span>
        <span class="drift-meta-value text-red">{data.drift_case_study.event.tvl_drop}</span>
      </div>
    </div>

    <!-- Price Chart -->
    <div class="chart-container card">
      <h3 class="chart-title">DRIFT Price + Net Flow (14 days)</h3>
      <div class="chart-wrap">
        <svg viewBox="0 0 700 240" class="price-chart" preserveAspectRatio="xMidYMid meet">
          <!-- Grid lines -->
          <line x1="0" y1="16" x2="700" y2="16" stroke="var(--border-subtle)" stroke-dasharray="4 4"/>
          <line x1="0" y1="100" x2="700" y2="100" stroke="var(--border-subtle)" stroke-dasharray="4 4"/>
          <line x1="0" y1="184" x2="700" y2="184" stroke="var(--border-subtle)" stroke-dasharray="4 4"/>

          <!-- Price labels -->
          {#each priceLabels(data.drift_case_study.price_timeline) as pl}
            <text x="-4" y={pl.y + 4} fill="var(--text-muted)" font-size="10" text-anchor="end" font-family="var(--font-mono)">{pl.label}</text>
          {/each}

          <!-- Hack day vertical line -->
          {#if hackDayX(data.drift_case_study.price_timeline) >= 0}
            <line
              x1={hackDayX(data.drift_case_study.price_timeline)}
              y1="0"
              x2={hackDayX(data.drift_case_study.price_timeline)}
              y2="220"
              stroke="var(--accent-red)"
              stroke-width="2"
              stroke-dasharray="6 3"
              opacity="0.7"
            />
            <text
              x={hackDayX(data.drift_case_study.price_timeline) + 6}
              y="12"
              fill="var(--accent-red)"
              font-size="10"
              font-family="var(--font-mono)"
            >EXPLOIT</text>
          {/if}

          <!-- Area fill -->
          <path d={buildAreaPath(data.drift_case_study.price_timeline)} fill="url(#priceGradient)" opacity="0.3"/>

          <!-- Price line -->
          <path d={buildPricePath(data.drift_case_study.price_timeline)} fill="none" stroke="var(--accent-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

          <!-- Data points -->
          {#each data.drift_case_study.price_timeline as pt, i}
            {@const prices = data.drift_case_study.price_timeline.map(p => p.price)}
            {@const minP = Math.min(...prices)}
            {@const maxP = Math.max(...prices)}
            {@const rangeP = maxP - minP || 1}
            {@const cx = (i / (data.drift_case_study.price_timeline.length - 1)) * 700}
            {@const cy = 16 + (1 - (pt.price - minP) / rangeP) * (200 - 32)}
            <circle
              cx={cx}
              cy={cy}
              r="3"
              fill={pt.date === '2026-04-01' ? 'var(--accent-red)' : 'var(--accent-blue)'}
              stroke="var(--bg-card)"
              stroke-width="1.5"
            />
          {/each}

          <!-- Date labels -->
          {#each dateLabels(data.drift_case_study.price_timeline) as dl}
            <text x={dl.x} y="220" fill="var(--text-muted)" font-size="10" text-anchor="middle" font-family="var(--font-mono)">{dl.label}</text>
          {/each}

          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent-blue)" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="var(--accent-blue)" stop-opacity="0"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>

    <!-- Key Findings -->
    <div class="findings card">
      <h3 class="subsection-title">Key Findings</h3>
      <ul class="findings-list">
        {#each data.drift_case_study.key_findings as finding}
          <li>
            <span class="finding-dot"></span>
            {finding}
          </li>
        {/each}
      </ul>
    </div>

    <!-- Honest Assessment -->
    <div class="assessment card assessment-glow">
      <h3 class="subsection-title">Honest Assessment</h3>
      <div class="assessment-grid">
        <div class="assessment-item">
          <h4 class="assessment-label">Early Warning Capability</h4>
          <p class="assessment-text">{data.drift_case_study.honest_assessment.early_warning}</p>
        </div>
        <div class="assessment-item">
          <h4 class="assessment-label">What the Data Shows</h4>
          <p class="assessment-text">{data.drift_case_study.honest_assessment.what_it_shows}</p>
        </div>
        <div class="assessment-item">
          <h4 class="assessment-label">Implication</h4>
          <p class="assessment-text">{data.drift_case_study.honest_assessment.implication}</p>
        </div>
      </div>
    </div>

    <!-- Holders Table -->
    <div class="holders card">
      <h3 class="subsection-title">Top Holders &mdash; 7-Day Changes</h3>
      <div class="table-wrap">
        <table class="holders-table">
          <thead>
            <tr>
              <th>Holder</th>
              <th class="text-right">Tokens</th>
              <th class="text-right">Ownership</th>
              <th class="text-right">7d Change</th>
            </tr>
          </thead>
          <tbody>
            {#each data.drift_case_study.holders as holder}
              <tr class={holder.is_exchange ? 'exchange-row' : ''}>
                <td class="holder-label">
                  {#if holder.is_exchange}
                    <span class="exchange-icon" title="Exchange">E</span>
                  {/if}
                  <span class="holder-name" title={holder.label}>
                    {holder.label.length > 40 ? holder.label.slice(0, 38) + '...' : holder.label}
                  </span>
                </td>
                <td class="text-right mono">{fmtTokens(holder.tokens)}</td>
                <td class="text-right mono">{fmtPct(holder.ownership_pct)}</td>
                <td class="text-right mono {holder.change_7d > 0 ? 'text-green' : holder.change_7d < 0 ? 'text-red' : 'text-muted'}">
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

  <!-- Section 4: Methodology / Footer -->
  <section class="section">
    <p class="section-title">Methodology</p>
    <h2 class="section-heading">How It Works</h2>

    <div class="method-grid">
      <div class="method-card card">
        <div class="method-num">1</div>
        <h4>SM Netflow Dump</h4>
        <p>Detect tokens with heavily negative smart money netflow over 24h/7d windows. When labeled wallets sell en masse, something may be wrong.</p>
      </div>
      <div class="method-card card">
        <div class="method-num">2</div>
        <h4>SM Perp Shorts</h4>
        <p>Track labeled wallets opening short positions on Hyperliquid. Bearish conviction from informed traders is a signal.</p>
      </div>
      <div class="method-card card">
        <div class="method-num">3</div>
        <h4>Token Anomaly</h4>
        <p>Cross-reference price drops and volume spikes against historical averages. SM selling on DEX during anomalies adds weight.</p>
      </div>
      <div class="method-card card">
        <div class="method-num">4</div>
        <h4>Exchange Inflow</h4>
        <p>Holder data showing tokens moving to exchange wallets signals intent to sell. Combined with other signals, this raises confidence.</p>
      </div>
    </div>

    <div class="scoring-explainer card">
      <h4>Scoring</h4>
      <div class="scoring-grid">
        <div><span class="badge badge-critical">CRITICAL</span> All 4 signals on same token</div>
        <div><span class="badge badge-high">HIGH</span> Netflow dump + perp shorts</div>
        <div><span class="badge badge-medium">MEDIUM</span> Netflow dump + token anomaly</div>
        <div><span class="badge badge-low">LOW</span> Single signal only</div>
      </div>
    </div>

    <!-- Stats / Meta -->
    <div class="meta-stats card">
      <div class="meta-row">
        <span class="meta-label">API Calls Made</span>
        <span class="meta-value mono">{data.api_calls}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Chains Scanned</span>
        <span class="meta-value mono">{data.metadata.chains_scanned.join(', ')}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">False Positive Rate (Solana)</span>
        <span class="meta-value mono">{data.metadata.false_positive_baseline.solana}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">False Positive Rate (Ethereum)</span>
        <span class="meta-value mono">{data.metadata.false_positive_baseline.ethereum}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Measurement Date</span>
        <span class="meta-value mono">{data.metadata.false_positive_baseline.measurement_date}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Data Generated</span>
        <span class="meta-value mono">{new Date(data.generated_at).toLocaleString()}</span>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <p>Built with <a href="https://docs.nansen.ai/reference/cli" target="_blank" rel="noopener">Nansen CLI</a> for <strong>#NansenCLI Challenge</strong></p>
    <p class="footer-links">
      <a href="https://github.com/nansen-sentinel" target="_blank" rel="noopener">GitHub</a>
    </p>
    <p class="footer-sub">Real data from Nansen smart money labels. No mock data. No guarantees.</p>
  </footer>
{/if}

<style>
  /* Loading */
  .loading-screen, .error-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: var(--sp-4);
    color: var(--text-secondary);
  }

  .loading-pulse {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent-blue);
    animation: pulse 1.5s ease-out infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(2.5); }
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--sp-8);
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: var(--sp-10);
    flex-wrap: wrap;
    gap: var(--sp-4);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }

  .logo-mark {
    flex-shrink: 0;
  }

  .logo-text {
    font-size: 24px;
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
  }

  .header-right {
    display: flex;
    gap: var(--sp-6);
  }

  .header-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .header-stat-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .header-stat-value {
    font-size: 18px;
    font-weight: 600;
    color: var(--accent-blue);
  }

  /* Sections */
  .section {
    margin-bottom: var(--sp-16);
  }

  /* Perp Sentiment */
  .perp-grid {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .perp-row {
    display: grid;
    grid-template-columns: 140px 1fr 120px;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-4) var(--sp-5);
    transition: background var(--duration-fast) var(--ease-out);
  }

  .perp-symbol {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .perp-name {
    font-weight: 600;
    font-size: 15px;
    color: var(--text-primary);
  }

  .badge-long {
    background: var(--accent-green-dim);
    color: var(--accent-green);
    font-size: 10px;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-weight: 700;
    letter-spacing: 0.06em;
  }

  .badge-short {
    background: var(--accent-red-dim);
    color: var(--accent-red);
    font-size: 10px;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-weight: 700;
    letter-spacing: 0.06em;
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
    width: 40px;
    font-size: 11px;
    color: var(--text-muted);
    text-align: right;
    flex-shrink: 0;
  }

  .bar-track {
    flex: 1;
    height: 10px;
    background: rgba(255, 255, 255, 0.03);
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
    box-shadow: 0 0 8px var(--accent-green-glow);
  }

  .bar-short {
    background: var(--accent-red);
    box-shadow: 0 0 8px var(--accent-red-glow);
  }

  .bar-value {
    width: 60px;
    text-align: right;
    font-size: 12px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .bar-count {
    width: 55px;
    text-align: right;
    font-size: 11px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .perp-net {
    text-align: right;
    font-size: 14px;
    font-weight: 600;
  }

  /* Alerts */
  .alerts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--sp-4);
  }

  .alert-card {
    padding: var(--sp-5);
    transition: box-shadow var(--duration-fast) var(--ease-out),
                background var(--duration-fast) var(--ease-out);
  }

  .alert-card.alert-critical {
    border-color: rgba(239, 68, 68, 0.2);
    box-shadow: var(--shadow-card), 0 0 24px var(--accent-red-glow);
  }

  .alert-card.alert-high {
    border-color: rgba(249, 115, 22, 0.15);
    box-shadow: var(--shadow-card), 0 0 16px var(--accent-orange-glow);
  }

  .alert-card.alert-medium {
    border-color: rgba(234, 179, 8, 0.1);
  }

  .alert-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--sp-2);
  }

  .alert-token {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .alert-chain {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: var(--sp-3);
  }

  .alert-summary {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: var(--sp-4);
  }

  .alert-footer {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-muted);
  }

  .alert-score {
    color: var(--text-secondary);
  }

  /* Drift Case Study */
  .drift-meta {
    display: flex;
    gap: var(--sp-6);
    margin-bottom: var(--sp-6);
    flex-wrap: wrap;
  }

  .drift-meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .drift-meta-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .drift-meta-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  /* Chart */
  .chart-container {
    margin-bottom: var(--sp-6);
    overflow: hidden;
  }

  .chart-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: var(--sp-4);
  }

  .chart-wrap {
    overflow-x: auto;
    padding-left: 50px;
  }

  .price-chart {
    width: 100%;
    min-width: 500px;
    height: auto;
  }

  /* Findings */
  .findings {
    margin-bottom: var(--sp-6);
  }

  .subsection-title {
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
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .finding-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-blue);
    flex-shrink: 0;
    margin-top: 7px;
  }

  /* Assessment */
  .assessment {
    margin-bottom: var(--sp-6);
    border-color: rgba(239, 68, 68, 0.12);
  }

  .assessment-glow {
    box-shadow: var(--shadow-card), inset 0 1px 0 rgba(239, 68, 68, 0.08);
  }

  .assessment-grid {
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
  }

  .assessment-item {
    padding-bottom: var(--sp-5);
    border-bottom: 1px solid var(--border-subtle);
  }

  .assessment-item:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }

  .assessment-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent-red);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: var(--sp-2);
  }

  .assessment-text {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  /* Holders Table */
  .holders {
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
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    padding: var(--sp-2) var(--sp-3);
    border-bottom: 1px solid var(--border-card);
  }

  .holders-table td {
    padding: var(--sp-3);
    border-bottom: 1px solid var(--border-subtle);
    color: var(--text-secondary);
  }

  .holders-table tr:last-child td {
    border-bottom: none;
  }

  .text-right {
    text-align: right;
  }

  .holder-label {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .holder-name {
    font-size: 13px;
    white-space: nowrap;
  }

  .exchange-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: var(--radius-sm);
    background: var(--accent-blue-glow);
    color: var(--accent-blue);
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .exchange-row td {
    background: rgba(59, 130, 246, 0.03);
  }

  /* Color utilities */
  .text-green { color: var(--accent-green); }
  .text-red { color: var(--accent-red); }
  .text-muted { color: var(--text-muted); }

  /* Methodology */
  .method-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--sp-4);
    margin-bottom: var(--sp-6);
  }

  .method-card {
    padding: var(--sp-5);
    transition: background var(--duration-fast) var(--ease-out);
  }

  .method-card h4 {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--sp-2);
  }

  .method-card p {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .method-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--accent-blue-glow);
    color: var(--accent-blue);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    font-family: var(--font-mono);
    margin-bottom: var(--sp-3);
  }

  /* Scoring */
  .scoring-explainer {
    margin-bottom: var(--sp-6);
  }

  .scoring-explainer h4 {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--sp-4);
  }

  .scoring-grid {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    font-size: 14px;
    color: var(--text-secondary);
  }

  .scoring-grid > div {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }

  /* Meta stats */
  .meta-stats {
    margin-bottom: var(--sp-6);
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    padding: var(--sp-2) 0;
    border-bottom: 1px solid var(--border-subtle);
    font-size: 14px;
  }

  .meta-row:last-child {
    border-bottom: none;
  }

  .meta-label {
    color: var(--text-secondary);
  }

  .meta-value {
    color: var(--text-primary);
  }

  /* Footer */
  .footer {
    text-align: center;
    padding: var(--sp-10) 0 var(--sp-8);
    border-top: 1px solid var(--border-subtle);
    font-size: 14px;
    color: var(--text-secondary);
  }

  .footer strong {
    color: var(--accent-blue);
    font-weight: 600;
  }

  .footer-links {
    margin-top: var(--sp-3);
  }

  .footer-sub {
    margin-top: var(--sp-3);
    font-size: 12px;
    color: var(--text-muted);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .perp-row {
      grid-template-columns: 1fr;
      gap: var(--sp-2);
    }

    .perp-net {
      text-align: left;
    }

    .method-grid {
      grid-template-columns: 1fr;
    }

    .alerts-grid {
      grid-template-columns: 1fr;
    }

    .header {
      flex-direction: column;
      align-items: flex-start;
    }

    .holder-name {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
</style>
