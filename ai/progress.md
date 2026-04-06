# Progress - Nansen Sentinel

## Current Status
SUBMISSION READY. Demo video + interactive dashboard deployed.
Dashboard: https://yonkoo11.github.io/nansen-sentinel/
Repo: https://github.com/Yonkoo11/nansen-sentinel
Demo Video: video/nansen-sentinel-demo.mp4 (83s, 5.3MB)

### What Changed (Plain English)
- Perp rows are now clickable. Click any trading position to see who's behind it: labeled wallet names, individual trade sizes, side (long/short), and action (open/close/reduce). BTC shows 4 traders making 18 short trades worth $20.9M.
- Demo video created: 83 seconds, 6 segments, Brian voiceover with ambient music. Shows the dashboard live, explains the scoring engine, walks through the Drift case study, and ends with the honest assessment.

### Remaining for Submission Day (April 12):
1. Refresh data: `npx tsx scripts/generate-dashboard-data.ts` then rebuild + redeploy
2. Re-enrich dashboard JSON with trade details (run the Python enrichment script)
3. Take 4 screenshots for X post
4. Post on X: @nansen_ai #NansenCLI + QT announcement + video + GitHub link
5. Optional: re-record demo video with fresh data

### Design Audit (April 6) - THREE ROUNDS COMPLETED
Round 1: Switched accent to Nansen brand teal (#22AB94). Fixed white bg bleed.
Round 2: Liveness fixes - visible teal glow (0.15), noise texture (0.035), card depth hierarchy.
Round 3: Segment-by-segment review. Fixed holders 7D color (CSS specificity bug), alert number decimals, 10px font.
design-qa.sh passes 6/6. Built enforcement script at ~/System/scripts/design-qa.sh.

### Round 4 (COMPLETED):
Sticky nav, perp grouping, assessment reorder, OG image (1200x630), font-display swap, header desc, footer card, chart gradient boost, medium alert glow. All deployed.

### Round 5 (IN PROGRESS — fix before submission):
Self-critique found 6 weaknesses. Prioritized fixes:
Deep critique as UI designer + UX architect + frontend engineer found these issues:

**Must fix (ranked by impact for hackathon):**
1. Add OpenGraph meta tags + og:image screenshot — judges click from X, see blank preview
2. Add sticky section nav with anchor links — judges jump to case study directly
3. Move "Honest Assessment" BEFORE holders table — don't bury the differentiator
4. Add font-display: swap for Google Fonts — prevent render-blocking
5. Group perp rows: "Major (>$5M)" vs "Other" with divider — break visual monotony
6. Boost MEDIUM alert card glow — too subtle vs LOW cards at full-page zoom
7. Header needs brief intro line or closer proximity to first section
8. Footer needs subtle top border or container
9. Chart gradient fill should be more visible against card bg

1. [TODO] Add click-to-expand on perp rows (show individual SM trades) — changes perception from "report" to "tool"
2. [TODO] Run scorer against 3-5 more tokens with recent price drops — validate or honestly report detection rate
3. [TODO] Deduplicate data/raw/ filenames — show 9 unique endpoint types clearly
4. [TODO] Add "9 unique endpoints, 65 total calls" to dashboard metadata instead of just "9"
5. [TODO] Run /ui-revamp (Phase 4 polish) for final design pass
6. [TODO] Create demo video (/demo-video) before submission
7. [TODO] Re-read submission rules to ensure we meet all requirements

### Submission Requirements (from challenge):
- Install CLI (agents.nansen.ai) ✅
- Minimum 10 API calls ✅ (65+)
- Build something creative using the CLI ✅
- Share on X: tag @nansen_ai, #NansenCLI hashtag, QT announcement thread
- Bonus: include visuals/video demo, proof of API calls, GitHub link, trading skill

### Remaining before April 12:
1. Refresh dashboard data closer to submission (run `npx tsx scripts/generate-dashboard-data.ts` then rebuild + redeploy)
2. Consider adding a Nansen Alerts integration (nansen CLI has `alerts create` — could show we use their alert system)
3. Consider adding more chains to the scan (currently solana + ethereum, could add base/arbitrum)
4. Write X post (user posts manually): @nansen_ai #NansenCLI + QT announcement thread + screenshots + GitHub link
5. Optional: /demo-video for extra impact

### What the submission needs on post day:
- Fresh data (same day, run generate-dashboard-data.ts -> npm run build -> npx gh-pages -d dashboard/dist)
- 4 screenshots: perp sentiment, alerts, drift case study chart, honest assessment
- X post template:
  "Built Nansen Sentinel — a smart money intelligence tool using @nansen_ai CLI.

   What it does: cross-references SM perp positions, netflow dumps, DEX sells, and exchange inflows to surface what labeled wallets are doing.

   Case study: analyzed the Drift Protocol exploit using Nansen data.

   44+ API calls, 9 endpoints, 2 chains.

   Live: [dashboard URL]
   Code: [github URL]

   #NansenCLI"

  Then QT the announcement thread.

### High-Impact Additions (do before submission):
1. Use `nansen agent` command to query about SM sentiment — shows deeper CLI usage
2. Use `nansen alerts create` to create a real SM monitoring alert — shows production thinking
3. Add base/arbitrum chains to netflow scan — one line change, more coverage
4. Add trading skill section to dashboard — bonus points per challenge rules
5. Competitors: ~40 submissions per week, most are CLI scripts/integrations. Our dashboard is already above average. The case study + honest assessment differentiates us.
6. DONE: Added Base chain to netflow scan (3 chains total)
7. DONE: Added trading skill integration section to README (bonus points)
8. DONE: 56 raw API call files as proof
9. CAN'T DO: `nansen agent` and `nansen alerts create` require API key (not x402). Documented in README.
10. STILL TODO: On submission day, refresh data + redeploy + screenshots + X post

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

## Dashboard (Task 5) - COMPLETE
- [x] Built full Svelte 5 dashboard with 4 sections
- [x] Dark theme with accent glow effects (blue/green/red)
- [x] Perp sentiment horizontal bar charts sorted by net USD
- [x] Alert cards color-coded by confidence level
- [x] Drift case study with SVG price chart, key findings, holders table
- [x] Honest assessment section (critical for judges)
- [x] Methodology footer with 4-signal explanation and false positive stats
- [x] Build passes with 0 errors, 0 warnings
- [x] Design checks: no banned CSS patterns (no transition:all, no linear easing, no scale(0))
- Files: dashboard/src/App.svelte, dashboard/src/app.css, dashboard/index.html

## Dashboard Redesign (April 6, 2026)
- [x] Full visual overhaul: warm near-black base, Arkham/Coinglass-inspired
- [x] Header simplified to logo + timestamp + pulsing green status dot
- [x] Perp rows have colored left border (green for long, red for short), taller bars
- [x] Alerts in 2-column grid with left border severity colors and thin score bar
- [x] Drift case study: wider chart, gradient area fill, "Exploit" label on hack day
- [x] Honest assessment with amber left border instead of red
- [x] Methodology cards use horizontal layout with numbered badge
- [x] Subtle blue radial glow behind the top of the page
- [x] Build: 0 errors, 0 warnings. Design checks: 0 banned patterns.

## What Changed (Plain English)
The dashboard now looks like a professional trading terminal instead of a generic dark-themed page. The background has a warm tone with a subtle blue glow at the top. The header is cleaner: just the name with a small green pulsing dot showing data is fresh. Each trading position row has a colored left stripe (green or red) so you can instantly scan who's long vs short. Alert cards now have a thin progress bar showing their score and colored left borders by severity. The Drift case study chart is wider and has a blue gradient fill under the price line with a clearly labeled "Exploit" marker. The honest assessment section has an amber border instead of red to signal "we're being transparent" rather than "danger." Overall the page feels more like Arkham Intelligence or Coinglass and less like a template.
