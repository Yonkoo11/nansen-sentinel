# Design Research Brief — Nansen Sentinel

## Product Category: Crypto Smart Money Intelligence Dashboard
## Comparables Studied: Coinglass, Arkham Intelligence, Dune Analytics, Linear, Hyperliquid

## Common Patterns (table stakes):
- Dark theme with near-black backgrounds
- Green/red for directional signals (long/short, buy/sell)
- Monospace/tabular-figures for all financial data
- Dense data layouts with minimal padding
- Live updating elements (streaming data, tickers, feeds)

## Differentiation Opportunities:
- Wallet-keyed sentiment heatmap (Coinglass does asset-keyed, nobody does wallet-keyed)
- Honest assessment section (no competitor admits what their tool can't do)
- Cross-signal scoring visible in the UI (methodology transparency)

## Design Constraints:
- Static data (JSON files), not live streaming - but should FEEL like it could be live
- Desktop-first (judges view on desktop)
- Must load on GitHub Pages (no server-side rendering)

## Stolen Elements:
- From Coinglass: heatmap-as-primary-view, color intensity = signal strength
- From Arkham: hairline borders, red accent glow for alerts, "intelligence file" card pattern
- From Dune: editorial typography weight, protocol color coding in legends
- From Linear: dim chrome / bright data principle, warm near-black background, three-tier text hierarchy
- From Hyperliquid: animated bar-fills behind data cells, position row live-color, minimal padding

## Anti-patterns:
- Stats row at top (SIGNALS 6 | API CALLS 8 | CHAINS 2) — AI slop
- Same card treatment on every component
- Generic subtitle ("Early Warning System")
- Flat backgrounds with no depth or glow

## Color Direction:
- Base: #16161a (warm near-black, Linear-inspired)
- Card: #1e1e24 stepping up
- Accent green: #22AB94 (Hyperliquid long)
- Accent red: #F23645 (Hyperliquid short)
- Accent amber: #F5A623 (high alert)
- Text: white primary, #8b8d9a secondary, #5a5c6a muted
- Color is earned by data, not used for decoration

## Typography Direction:
- Section headers: Inter Display or DM Sans 600 weight
- Body: Inter/system-ui 400
- Numbers: JetBrains Mono tabular-nums
- Minimum 12px, body minimum 14px

## Liveness Requirements:
- Animated bar-fills behind perp sentiment cells
- Pulsing dot on header to show "data is fresh"
- Confidence badge color intensity tied to score
- Background: base + radial accent glow behind hero section
