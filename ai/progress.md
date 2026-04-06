# Progress - Nansen Sentinel

## Current Status
Phase 1: PASSED. Phase 2-3: COMPLETE. Core engine built and running.
Phase 4 (dashboard) is NEXT.

## What's Done
- [x] Project directory created with ai/, scripts/, data/raw, data/processed, .ralph/
- [x] nansen-cli v1.26.0 installed globally
- [x] Nansen wallet created (x402 micropayments)
- [x] CLAUDE.md with vibecoder block + Phase 1 Gate
- [x] ai/memory.md with architecture, competitive landscape, risks
- [x] .claudeignore copied from template
- [x] .ralph/@fix_plan.md with 7 overnight build tasks
- [x] package.json + tsconfig.json + npm install done
- [x] Git repo initialized (main branch)
- [x] Calendar event: April 12 deadline with 3-day alarm
- [x] Reminder: April 9 at 9am (3 days before)
- [x] BountyBoard updated and published
- [x] PROJECTS.md updated
- [x] CLI schema verified - all needed endpoints exist:
  - research smart-money perp-trades (Hyperliquid labeled trades)
  - research smart-money dex-trades (labeled DEX swaps)
  - research smart-money netflow (aggregated token flows)
  - research token information/screener
  - research profiler balance/pnl/perp-positions

## What's Next
1. Fund wallet with $5-10 USDC (Base or Solana)
2. Test smart-money perp-trades endpoint
3. Test smart-money dex-trades endpoint
4. Test token information endpoint
5. Evaluate data quality -> pass/fail gate

## Wallet Addresses (send USDC here)
- Base: 0x0264d7Db9aca42c701E42c10414d6154b9EDfB95
- Solana: 6jw95PBMfBjBuvjcpQ9g3uAS1rJtkpk1VspVKJYS41i4

## Core Engine Results

### Collection Script (scripts/collect.ts)
- Fetches SM perp trades, DEX trades, and netflow from Nansen
- Live results: SM shorting $3M USA500 + $1.6M NVDA on Hyperliquid
- 3 API calls per scan, outputs scored alerts

### Drift Case Study (scripts/analyze-drift.ts)
- Price: $0.070 (Apr 1) -> $0.039 (Apr 4) = -43.3% decline
- Largest single-day drop: -36.2% on April 2
- 6 signals detected:
  - [HIGH] Custody vaults lost 30M DRIFT in 7 days
  - [HIGH] Bybit hot wallet gained 28.1M DRIFT (people depositing to sell)
  - [HIGH] Wintermute sold $155K DRIFT
  - [MEDIUM] Drift Protocol wallet lost 4.2M tokens
  - [MEDIUM] Trading bots sold $64K combined
- DRIFT too small for SM netflow tracking (not in top 30)
- 5 API calls for full case study

### API Call Count
- 23 raw data files in data/raw/
- Well over 10+ required API calls

## What Changed (Plain English)
The core brain of the tool is working. It can scan Nansen's data for signs of trouble (smart money selling + opening short bets). The Drift hack case study shows the tool would have caught 6 warning signals. Next step is building the visual dashboard to make this look impressive for the submission.
