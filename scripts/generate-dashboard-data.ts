#!/usr/bin/env npx tsx
// Generates all data the dashboard needs in one pass.
// Runs each Nansen query, saves raw + processed, writes dashboard JSON.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  getSmartMoneyPerpTrades,
  getSmartMoneyDexTrades,
  getSmartMoneyNetflow,
  getTokenInfo,
  getTokenFlows,
  getTokenHolders,
  getWhoBoughtSold,
  getCallCount,
} from "./nansen.js";
import {
  extractNetflowSignals,
  extractPerpShortSignals,
  extractDexSellSignals,
  scoreAlerts,
} from "./score.js";
import type { Signal } from "./types.js";

const DASH_DIR = join(import.meta.dirname, "..", "dashboard", "public", "data");
mkdirSync(DASH_DIR, { recursive: true });

const DRIFT_TOKEN = "DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7";

function main() {
  console.log("Generating dashboard data...\n");

  // === 1. Live SM Perp Sentiment ===
  console.log("[1/6] SM Perp Trades (Hyperliquid)");
  const perpTrades = getSmartMoneyPerpTrades(100);

  // Aggregate by token
  const perpAgg = new Map<string, {
    longs: number; shorts: number;
    long_usd: number; short_usd: number;
    long_traders: Set<string>; short_traders: Set<string>;
  }>();

  for (const t of perpTrades) {
    const existing = perpAgg.get(t.token_symbol) ?? {
      longs: 0, shorts: 0, long_usd: 0, short_usd: 0,
      long_traders: new Set(), short_traders: new Set(),
    };
    if (t.side === "Long") {
      existing.longs++;
      existing.long_usd += t.value_usd;
      existing.long_traders.add(t.trader_address);
    } else {
      existing.shorts++;
      existing.short_usd += t.value_usd;
      existing.short_traders.add(t.trader_address);
    }
    perpAgg.set(t.token_symbol, existing);
  }

  const perpSentiment = [...perpAgg.entries()]
    .map(([symbol, d]) => ({
      symbol,
      longs: d.longs,
      shorts: d.shorts,
      long_usd: Math.round(d.long_usd),
      short_usd: Math.round(d.short_usd),
      net_usd: Math.round(d.long_usd - d.short_usd),
      long_traders: d.long_traders.size,
      short_traders: d.short_traders.size,
      bias: d.long_usd > d.short_usd ? "LONG" : "SHORT",
    }))
    .sort((a, b) => Math.abs(b.net_usd) - Math.abs(a.net_usd));

  console.log(`  ${perpTrades.length} trades -> ${perpSentiment.length} tokens`);

  // === 2. SM Netflow (dumps across chains) ===
  console.log("[2/6] SM Netflow Dumps");
  const allSignals: Signal[] = [];

  for (const chain of ["solana", "ethereum"]) {
    const netflows = getSmartMoneyNetflow(chain, 30, "net_flow_24h_usd:asc");
    const signals = extractNetflowSignals(netflows);
    allSignals.push(...signals);
    console.log(`  ${chain}: ${netflows.length} tokens, ${signals.length} dump signals`);
  }

  // === 3. SM DEX Sells ===
  console.log("[3/6] SM DEX Sells");
  for (const chain of ["solana"]) {
    const dexTrades = getSmartMoneyDexTrades(chain, 30);
    const signals = extractDexSellSignals(dexTrades);
    allSignals.push(...signals);
    console.log(`  ${chain}: ${dexTrades.length} trades, ${signals.length} sell signals`);
  }

  // Perp short signals
  const perpSignals = extractPerpShortSignals(perpTrades);
  allSignals.push(...perpSignals);

  // === 4. Score everything ===
  const alerts = scoreAlerts(allSignals);
  console.log(`[4/6] Scored ${allSignals.length} signals -> ${alerts.length} alerts`);

  // === 5. Drift Case Study ===
  console.log("[5/6] Drift Case Study");
  const driftInfo = getTokenInfo("solana", DRIFT_TOKEN);
  const driftFlows = getTokenFlows("solana", DRIFT_TOKEN, 14);
  const driftHolders = getTokenHolders("solana", DRIFT_TOKEN, 10);
  const driftWbs = getWhoBoughtSold("solana", DRIFT_TOKEN, 10);

  driftFlows.sort((a, b) => a.date.localeCompare(b.date));

  const driftCaseStudy = {
    token: {
      name: driftInfo.name,
      symbol: driftInfo.symbol,
      market_cap: driftInfo.token_details.market_cap_usd,
    },
    event: {
      name: "Drift Protocol Exploit",
      date: "2026-04-01",
      tvl_drop: "-92.4% in 1h ($23.7M -> $1.8M)",
    },
    price_timeline: driftFlows.map((f) => ({
      date: f.date,
      price: f.price_usd,
      net_flow: f.total_inflows_count + f.total_outflows_count,
      holders: f.holders_count,
    })),
    holders: driftHolders.map((h) => ({
      label: h.address_label,
      tokens: h.token_amount,
      ownership_pct: h.ownership_percentage * 100,
      change_7d: h.balance_change_7d,
      is_exchange: ["Binance", "Bybit", "OKX", "Coinbase", "Upbit", "Kraken", "Bithumb"]
        .some((ex) => h.address_label.toLowerCase().includes(ex.toLowerCase())),
    })),
    traders: driftWbs.map((w) => ({
      label: w.address_label,
      bought_usd: w.bought_volume_usd,
      sold_usd: w.sold_volume_usd,
      net_usd: w.bought_volume_usd - w.sold_volume_usd,
    })),
    key_findings: [
      "Price crashed 43.3% over 3 days (Apr 1-4)",
      "DRIFT Custody Vaults lost 30M tokens in 7 days",
      "Bybit hot wallet gained 28.1M tokens (users depositing to sell)",
      "Wintermute Market Making absorbed 28M tokens",
      "40 consecutive sells on April 1, zero buys during crash",
      "SOL Big Brain label sold $20K at $0.050-0.052 during dead cat bounce",
      "High Balance wallet systematically sold $70K at $0.047-0.050 post-crash",
    ],
    honest_assessment: {
      early_warning: "NOT PROVEN. All observed selling occurred AFTER the price had already crashed from $0.070 to $0.026. The token was too small for SM netflow tracking.",
      what_it_shows: "SM reaction speed. Labeled wallets sold within hours of the crash while retail was still figuring out what happened. Custody vault outflows and exchange inflows are clear retrospective signals.",
      implication: "Nansen data is most useful for real-time reaction analysis and post-event forensics, not pre-event prediction for small-cap exploits.",
    },
  };

  // === 6. Write dashboard JSON files ===
  console.log("[6/6] Writing dashboard data");

  const dashboardData = {
    generated_at: new Date().toISOString(),
    api_calls: getCallCount(),
    perp_sentiment: perpSentiment,
    alerts,
    drift_case_study: driftCaseStudy,
    metadata: {
      chains_scanned: ["solana", "ethereum"],
      total_signals: allSignals.length,
      false_positive_baseline: {
        solana: "0/50 tokens triggered (0%)",
        ethereum: "1/50 tokens triggered (2%)",
        measurement_date: "2026-04-06",
      },
    },
  };

  writeFileSync(
    join(DASH_DIR, "dashboard.json"),
    JSON.stringify(dashboardData, null, 2)
  );

  // Also write individual files for incremental loading
  writeFileSync(
    join(DASH_DIR, "perp-sentiment.json"),
    JSON.stringify(perpSentiment, null, 2)
  );
  writeFileSync(
    join(DASH_DIR, "alerts.json"),
    JSON.stringify(alerts, null, 2)
  );
  writeFileSync(
    join(DASH_DIR, "drift-case-study.json"),
    JSON.stringify(driftCaseStudy, null, 2)
  );

  console.log(`\nDone. ${getCallCount()} API calls. Data written to ${DASH_DIR}`);
}

main();
