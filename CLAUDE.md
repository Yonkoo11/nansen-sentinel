# Vibecoder Mode - Paste this into any project's CLAUDE.md

## Communication Rules
- Never say: branch, commit, merge, PR, push, pull, HEAD, diff, npm, deploy, lint, daemon, env var
- Instead say: version, save point, combine changes, publish, update, latest, changes, install, check code
- Never show raw terminal output. Summarize in one sentence.
- Never show error messages directly. Say what happened and what you're doing to fix it.
- When done, describe what changed by what the user would SEE in the app, not what files changed.

## Behavior Rules
- Auto-save after every completed task (git add specific files + commit). Never ask "should I commit?"
- If you need to create a version, just do it silently.
- If tests fail, fix them without explaining test frameworks.
- After each task: update ai/progress.md with a "What Changed (Plain English)" section.
- Keep all explanations to 1-3 sentences. If the user wants more detail, they'll ask.

---

# Nansen Sentinel

## What This Is
Smart money exploit early warning system for the Nansen CLI Challenge Week 4.
Uses Nansen's smart-money labels + perp data to detect when institutional wallets dump a token AND open shorts simultaneously = potential exploit incoming.

## Hackathon Context
- **Challenge:** Nansen CLI Challenge Week 4 (final round)
- **Deadline:** April 12, 2026, 11:59 PM SGT
- **Prize:** Mac Mini M4 (1st), 300K credits (2nd), 100K credits (3rd)
- **Source idea:** Research base #102 (exploit-to-short detection) + #53 (continuous monitoring)

## Phase 1 Gate (MUST PASS BEFORE ANY OTHER WORK)
- Core Action: Run `nansen research smart-money perp-trades` and `dex-trades`, display correlated sell+short signals in a web page
- Success Test: At least one token shows smart money selling on DEX AND opening shorts on Hyperliquid in the same timeframe
- NOT Phase 1: Dashboard design, historical backtesting, trading execution, Telegram alerts

## Build Order (ENFORCED)
1. Core action works (API calls return data, correlation logic detects signals)
2. Data flows correctly (real Nansen data, not mocks)
3. Product complete (dashboard, case study, GitHub README, all submission requirements)
4. Visual polish LAST

## Tech Stack
- Node.js + TypeScript (tsx for execution)
- nansen-cli v1.26.0 for all API calls (x402 micropayments)
- Svelte + Vite for dashboard
- GitHub Pages for hosting

## Required Nansen Endpoints
- `research smart-money perp-trades` -- labeled Hyperliquid trades
- `research smart-money dex-trades` -- labeled DEX swaps
- `research smart-money netflow` -- aggregated token flows
- `research token information` -- token price/volume
- `research token screener` -- multi-token screening
- `research profiler balance` -- wallet holdings

## Submission Requirements
- X post with visuals, @nansen_ai tag, #NansenCLI hashtag, QT announcement thread
- GitHub link
- Proof of 10+ API calls (saved in data/raw/)
- Bonus: incorporate trading skill
