# Nansen Sentinel

Smart money intelligence tool that shows what labeled wallets are doing across Hyperliquid perps and on-chain DEX markets. Built with [Nansen CLI](https://agents.nansen.ai) for the #NansenCLI Challenge.

**[Live Dashboard](https://yonkoo11.github.io/nansen-sentinel/)**

## What It Does

Nansen Sentinel combines 4 signal sources from the Nansen CLI into a single intelligence feed:

1. **SM Perp Positioning** -- What are labeled wallets longing/shorting on Hyperliquid right now?
2. **SM Netflow Dumps** -- Which tokens are smart money exiting across Solana and Ethereum?
3. **SM DEX Sells** -- Where are labeled wallets actively selling on-chain?
4. **Exchange Inflows** -- Are tokens moving to exchange wallets (intent to sell)?

When multiple signals fire on the same token, confidence increases.

## Case Study: Drift Protocol Exploit (April 1, 2026)

The Drift Protocol hack caused a 92.4% TVL drop ($23.7M to $1.8M) and a 43.3% price decline over 3 days.

Using Nansen's token holders and flows data, Sentinel identified:
- DRIFT Custody Vaults lost 30M tokens in 7 days
- Bybit hot wallet gained 28.1M tokens (users depositing to sell)
- Wintermute Market Making absorbed 28M tokens
- 40 consecutive sells on April 1, zero buys during the crash
- "SOL Big Brain" label sold $20K during the dead cat bounce

**Honest assessment:** The early warning thesis is NOT proven for this event. All observed selling occurred AFTER the price had already crashed from $0.070 to $0.026. The token was too small for SM netflow tracking. What the data shows is SM *reaction speed* -- labeled wallets sold within hours while retail was still figuring out what happened.

## Architecture

```
nansen CLI (x402 micropayments)
    |
    +-- smart-money perp-trades (Hyperliquid)
    +-- smart-money dex-trades (Solana/Ethereum)
    +-- smart-money netflow (per-chain aggregates)
    +-- token info / flows / holders / who-bought-sold
    |
scripts/
    +-- nansen.ts       -- typed CLI wrapper (execFileSync, raw JSON saved)
    +-- types.ts        -- all Nansen response types + scoring config
    +-- score.ts        -- 4-signal extraction + scoring engine
    +-- collect.ts      -- live market scan
    +-- analyze-drift.ts    -- Drift case study
    +-- generate-dashboard-data.ts  -- produces dashboard JSON
    |
dashboard/              -- Svelte + Vite
    +-- public/data/    -- real Nansen data (JSON)
    +-- src/App.svelte  -- single-page dark dashboard
```

## API Endpoints Used

| Endpoint | What It Returns | Calls |
|----------|----------------|-------|
| `research smart-money perp-trades` | Labeled Hyperliquid trades (side, action, value) | 5+ |
| `research smart-money dex-trades` | Labeled DEX swaps per chain | 8+ |
| `research smart-money netflow` | Aggregated SM token flows (1h/24h/7d/30d) | 6+ |
| `research token info` | Token metadata, spot metrics | 3+ |
| `research token flows` | Daily price + holder flow time series | 3+ |
| `research token holders` | Per-address holdings with balance changes | 3+ |
| `research token who-bought-sold` | Per-address buy/sell volumes | 3+ |
| `research token screener` | Market-wide token screening | 2+ |
| `research token dex-trades` | Per-token DEX trade history | 2+ |

**Total: 65+ raw API responses** saved in `data/raw/`. Chains scanned: Solana, Ethereum, Base.

## Scoring

Thresholds calibrated against baseline measurements (April 6, 2026):
- Solana: 0/50 tokens triggered at -$10K 24h threshold (0% false positive)
- Ethereum: 1/50 tokens triggered (2% false positive)

| Confidence | Criteria |
|-----------|----------|
| CRITICAL | All 4 signals on same token |
| HIGH | Netflow dump + perp shorts |
| MEDIUM | Netflow dump + token anomaly |
| LOW | Single signal only |

## Run Locally

```bash
# Install
npm install -g nansen-cli
git clone https://github.com/Yonkoo11/nansen-sentinel
cd nansen-sentinel && npm install

# Set up Nansen auth (x402 pay-per-call)
nansen wallet create
# Fund with $3-5 USDC on Base or Solana

# Run live scan
npx tsx scripts/collect.ts

# Run Drift case study
npx tsx scripts/analyze-drift.ts

# Generate dashboard data
npx tsx scripts/generate-dashboard-data.ts

# Run dashboard
cd dashboard && npm install && npm run dev
```

## Tech

- TypeScript + tsx (Node.js)
- Svelte 5 + Vite (dashboard)
- nansen-cli v1.26.0 (x402 micropayments on Base)
- GitHub Pages (hosting)
- No external charting libraries. Pure SVG + CSS.

## Trading Skill Integration

Sentinel's signals pair naturally with the [Nansen Trading Skill](https://clawhub.ai/nansen-devops/nansen-trading). When the scoring engine flags a HIGH or CRITICAL alert, the trading skill can execute a hedge:

```bash
# Sentinel detects: SM heavily shorting BTC ($18.7M net short)
# Trading skill response: hedge long exposure
nansen trade quote --chain solana --from SOL --to USDC --amount 10 --amount-unit token
nansen trade execute
```

The signals Sentinel surfaces (SM net shorts, netflow dumps, exchange inflows) are the decision layer. The trading skill is the execution layer. Together they form a complete intelligence-to-action pipeline.

Currently Sentinel operates as the intelligence layer only. Automated execution requires position sizing, stop-loss logic, and false-positive filtering that aren't in scope for this challenge.

## What This Is Not

This is not a prediction engine. It does not tell you what will happen next. It shows you what smart money is doing *right now* so you can make better decisions. The Drift case study demonstrates that Nansen's labeled wallet data reveals institutional behavior patterns that aren't visible on price charts alone.

---

Built for [#NansenCLI Challenge](https://agents.nansen.ai) Week 4 by [@soligxbt](https://twitter.com/soligxbt)
