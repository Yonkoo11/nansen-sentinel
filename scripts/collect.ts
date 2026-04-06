#!/usr/bin/env npx tsx
// Collect data from Nansen CLI endpoints and run scoring engine
// Usage: npx tsx scripts/collect.ts [--chains solana,ethereum] [--limit 50]

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  getSmartMoneyPerpTrades,
  getSmartMoneyDexTrades,
  getSmartMoneyNetflow,
  getCallCount,
} from "./nansen.js";
import {
  extractNetflowSignals,
  extractPerpShortSignals,
  extractDexSellSignals,
  scoreAlerts,
  printAlerts,
} from "./score.js";
import type { Signal } from "./types.js";

const PROCESSED_DIR = join(import.meta.dirname, "..", "data", "processed");
mkdirSync(PROCESSED_DIR, { recursive: true });

// Parse CLI args
const args = process.argv.slice(2);
const chainArg = args.find((a) => a.startsWith("--chains="));
const limitArg = args.find((a) => a.startsWith("--limit="));

const chains = chainArg
  ? chainArg.split("=")[1].split(",")
  : ["solana", "ethereum"];
const limit = limitArg ? parseInt(limitArg.split("=")[1]) : 50;

async function main() {
  console.log(`\nNansen Sentinel — Data Collection`);
  console.log(`Chains: ${chains.join(", ")} | Limit: ${limit}\n`);

  const allSignals: Signal[] = [];

  // 1. Smart Money Perp Trades (Hyperliquid)
  console.log("--- Smart Money Perp Trades (Hyperliquid) ---");
  try {
    const perpTrades = getSmartMoneyPerpTrades(limit);
    console.log(`  Fetched ${perpTrades.length} perp trades`);
    const perpSignals = extractPerpShortSignals(perpTrades);
    allSignals.push(...perpSignals);
    console.log(`  Extracted ${perpSignals.length} short signals`);
  } catch (e) {
    console.log(`  Error fetching perp trades: ${(e as Error).message}`);
  }

  // 2. Smart Money DEX Trades (per chain)
  for (const chain of chains) {
    console.log(`\n--- Smart Money DEX Trades (${chain}) ---`);
    try {
      const dexTrades = getSmartMoneyDexTrades(chain, limit);
      console.log(`  Fetched ${dexTrades.length} DEX trades`);
      const dexSignals = extractDexSellSignals(dexTrades);
      allSignals.push(...dexSignals);
      console.log(`  Extracted ${dexSignals.length} sell signals`);
    } catch (e) {
      console.log(`  Error: ${(e as Error).message}`);
    }
  }

  // 3. Smart Money Netflow (per chain, sorted by biggest dumps)
  for (const chain of chains) {
    console.log(`\n--- Smart Money Netflow Dumps (${chain}) ---`);
    try {
      const netflows = getSmartMoneyNetflow(chain, limit, "net_flow_24h_usd:asc");
      console.log(`  Fetched ${netflows.length} netflow entries`);
      const netflowSignals = extractNetflowSignals(netflows);
      allSignals.push(...netflowSignals);
      console.log(`  Extracted ${netflowSignals.length} dump signals`);
    } catch (e) {
      console.log(`  Error: ${(e as Error).message}`);
    }
  }

  // Score all signals
  console.log(`\n--- Scoring ${allSignals.length} total signals ---`);
  const alerts = scoreAlerts(allSignals);

  // Print results
  printAlerts(alerts);

  // Save processed results
  const output = {
    timestamp: new Date().toISOString(),
    total_api_calls: getCallCount(),
    total_signals: allSignals.length,
    total_alerts: alerts.length,
    alerts,
    signals: allSignals,
  };

  const outputPath = join(PROCESSED_DIR, `scan-${Date.now()}.json`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to ${outputPath}`);
  console.log(`Total Nansen API calls: ${getCallCount()}`);
}

main().catch(console.error);
