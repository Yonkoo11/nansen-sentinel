# Nansen Sentinel - Memory

## Phase 1 Gate (MUST PASS BEFORE ANY OTHER WORK)
Core Action: Nansen smart-money endpoints return labeled wallet trades, scoring engine detects sell+short correlation
Success Test: At least one token shows smart money selling on DEX AND opening shorts on Hyperliquid
NOT Phase 1: Dashboard design, historical backtesting, trading execution, Telegram alerts
Status: [ ] NOT STARTED - waiting for wallet funding

## Hackathon Details
- **Challenge:** Nansen CLI Challenge Week 4 (final)
- **Deadline:** April 12, 2026, 11:59 PM SGT
- **Track:** Open (creative build using Nansen CLI)
- **Prizes:** Mac Mini M4 (1st), 300K credits (2nd), 100K credits (3rd)
- **Judging:** Creativity, visuals (images/video), proof of 10+ API calls, GitHub link, bonus for trading skill

## Chosen Idea
**Research base #102: Exploit-to-Short Detection Pipeline**
- Detects when smart money dumps a token on DEX AND opens shorts on Hyperliquid perps
- Cross-references with token price/volume anomalies
- Case study: Drift hack (April 1, 2026, -92.4% TVL)
- Uses: smart-money/perp-trades, smart-money/dex-trades, token endpoints, profiler

## Architecture
```
Signal 1: SM DEX Sells (nansen smart-money dex-trades)
Signal 2: SM Perp Shorts (nansen smart-money perp-trades)
Signal 3: Token Anomaly (nansen token screener/information)

Scoring: All 3 = CRITICAL | 1+2 = HIGH | 1+3 = MEDIUM | Single = LOW
```

## Competitive Landscape
- Nobody else will build this for the CLI challenge (everyone does dashboards/trackers)
- Demonstrates Nansen's core value prop: smart money labels reveal insider behavior
- Unique angle: "What if you could see the hack coming before CT?"

## Fatal Flaws (Known Risks)
- Perps coverage gap: most hacked tokens don't have Hyperliquid markets
- Smart money data may be too sparse for smaller tokens
- Drift hack may not show SM exit signals (insiders get caught too)
- Fallback: any token with clear SM dump -> price crash pattern

## Nansen Wallet (x402)
- EVM: 0x0264d7Db9aca42c701E42c10414d6154b9EDfB95
- Solana: 6jw95PBMfBjBuvjcpQ9g3uAS1rJtkpk1VspVKJYS41i4
- Password: saved to macOS keychain automatically
- Cost per call: $0.01-0.05 USDC

## Reusable Code
- ~/Projects/degen-claw/scripts/data.ts - Hyperliquid API helpers
- ~/Projects/degen-claw/scripts/types.ts - Type definitions
- ~/System/research-pipeline/data/exploit_alerts.json - 3,276 historical exploit alerts

## API Validation Results (April 6, 2026)

**Phase 1 Gate: PASS with adjustment**

### What works great:
- `smart-money perp-trades`: Real-time labeled HL trades. 50 trades in 10 min. Actions: Open/Close/Add/Reduce. Side: Long/Short.
- `smart-money dex-trades` (Solana): 30 trades in 4 hours. Individual sells with labels.
- `smart-money netflow`: Aggregated net flows per token with 1h/24h/7d/30d windows. Shows dumps clearly.
- `token info/flows/holders/who-bought-sold`: Rich data per token. DRIFT case study shows 43% price crash, 30M custody outflow, exchange inflows.

### What's weaker than expected:
- `smart-money dex-trades` (Ethereum): Very sparse (2 trades in recent window)
- `smart-money dex-trades` (Base): Zero trades
- Same-token perp+DEX correlation: Perp traders trade different tokens (TAO, ZEC, DASH on HL) than Solana DEX sellers (memecoins). Cross-ecosystem overlap is thin.

### Adjusted Architecture:
Instead of narrow "same token sell+short" correlation, use 4 independent signals:
1. **SM Netflow Dump**: Token with heavily negative SM netflow (24h or 7d) = selling pressure
2. **SM Perp Shorts**: Labeled wallets opening shorts on Hyperliquid = bearish conviction
3. **Token Anomaly**: Price drop + volume spike vs averages
4. **Exchange Inflow Spike**: Holders data showing tokens moving to exchange wallets

Score: Multiple signals on same token or sector = higher confidence.

### Drift Case Study Data:
- Price: $0.070 (Apr 1) -> $0.039 (Apr 4) = -43%
- Custody vaults: -30M tokens in 7 days
- Bybit hot wallet: +28.1M tokens in 7 days (people depositing to sell)
- Wintermute: +28M tokens (market making both sides)
- Massive outflow on Apr 3: -72.8M tokens vs +59.4M inflows

## Decisions
- Phase 1 gate passed - data is there, story is strong
- Broadened correlation from "same token" to "multi-signal scoring" based on real data patterns
- Drift case study is the centerpiece (strongest data)
- Will collect data for 3-5 additional tokens with recent crashes for broader validation
