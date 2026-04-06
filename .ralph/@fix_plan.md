# Fix Plan - Nansen Sentinel

## Tasks

- [ ] Task 1: Build data collection script (scripts/collect.ts)
  - Acceptance: Running `npx tsx scripts/collect.ts` fetches data from 5+ Nansen endpoints and saves JSON to data/raw/
  - Files: scripts/collect.ts, package.json, tsconfig.json

- [ ] Task 2: Build scoring engine (scripts/score.ts)
  - Acceptance: Takes collected data, outputs scored alerts with CRITICAL/HIGH/MEDIUM/LOW confidence
  - Files: scripts/score.ts, scripts/types.ts

- [ ] Task 3: Build historical backtest (scripts/backtest.ts)
  - Acceptance: Cross-references exploit_alerts.json with Nansen data, produces detection rate report
  - Files: scripts/backtest.ts

- [ ] Task 4: Build dashboard data generator (scripts/report.ts)
  - Acceptance: Generates static JSON data files for the Svelte dashboard
  - Files: scripts/report.ts

- [x] Task 5: Build Svelte dashboard
  - Acceptance: Dashboard loads locally showing heatmap, alert feed, and case study
  - Files: dashboard/src/*, dashboard/package.json

- [ ] Task 6: Deploy to GitHub Pages
  - Acceptance: Dashboard accessible at https://[username].github.io/nansen-sentinel/
  - Files: .github/workflows/deploy.yml or manual deploy

- [ ] Task 7: Write README and prepare submission
  - Acceptance: README has architecture diagram, usage instructions, API proof. X post drafted.
  - Files: README.md

## Completed
(builder fills this in)
