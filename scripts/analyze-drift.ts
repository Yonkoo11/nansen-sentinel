#!/usr/bin/env npx tsx
// Drift Hack Case Study — April 1, 2026
// Demonstrates how Nansen smart money data could detect the exploit early

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  getTokenInfo,
  getTokenFlows,
  getTokenHolders,
  getWhoBoughtSold,
  getSmartMoneyNetflow,
  getCallCount,
} from "./nansen.js";
import type { CaseStudy, TimelineEntry, Signal } from "./types.js";

const PROCESSED_DIR = join(import.meta.dirname, "..", "data", "processed");
mkdirSync(PROCESSED_DIR, { recursive: true });

const DRIFT_TOKEN = "DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7";
const DRIFT_CHAIN = "solana";

async function main() {
  console.log("=".repeat(80));
  console.log("  DRIFT HACK CASE STUDY — April 1, 2026");
  console.log("  Analyzing smart money behavior before/after the exploit");
  console.log("=".repeat(80));

  // 1. Token Info
  console.log("\n--- Token Info ---");
  const info = getTokenInfo(DRIFT_CHAIN, DRIFT_TOKEN);
  console.log(`  ${info.name} (${info.symbol})`);
  console.log(`  Market cap: $${info.token_details.market_cap_usd.toLocaleString()}`);
  console.log(`  Holders: ${info.spot_metrics.total_holders.toLocaleString()}`);
  console.log(`  24h volume: $${info.spot_metrics.volume_total_usd.toLocaleString()}`);
  console.log(`  Buy/sell ratio: ${(info.spot_metrics.buy_volume_usd / info.spot_metrics.sell_volume_usd).toFixed(2)}`);

  // 2. Token Flows (daily price + holder data)
  console.log("\n--- Daily Token Flows (last 14 days) ---");
  const flows = getTokenFlows(DRIFT_CHAIN, DRIFT_TOKEN, 14);

  // Sort chronologically
  flows.sort((a, b) => a.date.localeCompare(b.date));

  const timeline: TimelineEntry[] = [];

  for (const f of flows) {
    const netFlow = f.total_inflows_count + f.total_outflows_count;
    const flowDir = netFlow >= 0 ? "+" : "";
    console.log(
      `  ${f.date}: $${f.price_usd.toFixed(4)} | holders: ${f.holders_count} | net flow: ${flowDir}${netFlow.toLocaleString()} tokens`
    );

    timeline.push({
      timestamp: f.date,
      event: `Price: $${f.price_usd.toFixed(4)}, Net flow: ${flowDir}${Math.round(netFlow).toLocaleString()} tokens`,
      source: "nansen_token_flows",
      data: f as unknown as Record<string, unknown>,
    });
  }

  // Find the hack: biggest price drop day-over-day
  let maxDrop = 0;
  let hackDay = "";
  for (let i = 1; i < flows.length; i++) {
    const drop = (flows[i].price_usd - flows[i - 1].price_usd) / flows[i - 1].price_usd;
    if (drop < maxDrop) {
      maxDrop = drop;
      hackDay = flows[i].date;
    }
  }

  console.log(`\n  Largest single-day drop: ${(maxDrop * 100).toFixed(1)}% on ${hackDay}`);

  // Find pre-hack and post-hack prices
  const preHackFlow = flows.find((f) => f.date === "2026-04-01");
  const postHackFlow = flows.find((f) => f.date === "2026-04-04");

  if (preHackFlow && postHackFlow) {
    const totalDrop =
      ((postHackFlow.price_usd - preHackFlow.price_usd) / preHackFlow.price_usd) *
      100;
    console.log(
      `\n  Pre-hack (Apr 1): $${preHackFlow.price_usd.toFixed(4)}`
    );
    console.log(
      `  Post-hack (Apr 4): $${postHackFlow.price_usd.toFixed(4)}`
    );
    console.log(`  Total decline: ${totalDrop.toFixed(1)}%`);
  }

  // 3. Top Holders — balance changes reveal institutional behavior
  console.log("\n--- Top Holders & Balance Changes ---");
  const holders = getTokenHolders(DRIFT_CHAIN, DRIFT_TOKEN, 15);

  const exchangeLabels = ["Binance", "Bybit", "OKX", "Coinbase", "Upbit", "Kraken"];
  const signals: Signal[] = [];

  for (const h of holders) {
    const isExchange = exchangeLabels.some((ex) =>
      h.address_label.toLowerCase().includes(ex.toLowerCase())
    );
    const tag = isExchange ? " [EXCHANGE]" : "";
    const change7d =
      h.balance_change_7d >= 0
        ? `+${h.balance_change_7d.toLocaleString()}`
        : h.balance_change_7d.toLocaleString();

    console.log(
      `  ${h.address_label.substring(0, 45)}${tag}`
    );
    console.log(
      `    Holdings: ${h.token_amount.toLocaleString()} (${(h.ownership_percentage * 100).toFixed(2)}%) | 7d change: ${change7d}`
    );

    // Flag exchange inflows as signals
    if (isExchange && h.balance_change_7d > 1_000_000) {
      signals.push({
        type: "exchange_inflow",
        token_symbol: "DRIFT",
        chain: DRIFT_CHAIN,
        confidence: h.balance_change_7d > 10_000_000 ? "HIGH" : "MEDIUM",
        value_usd: h.balance_change_7d * (preHackFlow?.price_usd ?? 0.04),
        description: `${h.address_label.substring(0, 30)}: +${h.balance_change_7d.toLocaleString()} DRIFT in 7 days`,
        timestamp: "2026-04-01",
        raw_data: h as unknown as Record<string, unknown>,
      });
    }

    // Flag large custody outflows
    if (h.balance_change_7d < -1_000_000) {
      signals.push({
        type: "netflow_dump",
        token_symbol: "DRIFT",
        chain: DRIFT_CHAIN,
        confidence: h.balance_change_7d < -10_000_000 ? "HIGH" : "MEDIUM",
        value_usd: Math.abs(h.balance_change_7d) * (preHackFlow?.price_usd ?? 0.04),
        description: `${h.address_label.substring(0, 30)}: ${h.balance_change_7d.toLocaleString()} DRIFT in 7 days`,
        timestamp: "2026-04-01",
        raw_data: h as unknown as Record<string, unknown>,
      });
    }

    timeline.push({
      timestamp: "2026-04-01",
      event: `Holder ${h.address_label.substring(0, 30)}: 7d change ${change7d}`,
      source: "nansen_token_holders",
    });
  }

  // 4. Who Bought/Sold — identify smart money behavior
  console.log("\n--- Who Bought / Sold DRIFT ---");
  const wbs = getWhoBoughtSold(DRIFT_CHAIN, DRIFT_TOKEN, 15);

  for (const w of wbs) {
    const net = w.bought_volume_usd - w.sold_volume_usd;
    const direction = net >= 0 ? "NET BUYER" : "NET SELLER";
    console.log(
      `  ${w.address_label.substring(0, 45)} — ${direction}`
    );
    console.log(
      `    Bought: $${w.bought_volume_usd.toLocaleString()} | Sold: $${w.sold_volume_usd.toLocaleString()}`
    );

    if (w.sold_volume_usd > 10_000) {
      signals.push({
        type: "netflow_dump",
        token_symbol: "DRIFT",
        chain: DRIFT_CHAIN,
        confidence: w.sold_volume_usd > 100_000 ? "HIGH" : "MEDIUM",
        value_usd: w.sold_volume_usd,
        description: `${w.address_label.substring(0, 30)} sold $${w.sold_volume_usd.toLocaleString()} DRIFT`,
        timestamp: "2026-04-01",
        raw_data: w as unknown as Record<string, unknown>,
      });
    }
  }

  // 5. SM Netflow for Solana (was DRIFT showing up in the dumps?)
  console.log("\n--- SM Netflow Dumps (Solana, 7d) ---");
  const netflows = getSmartMoneyNetflow(DRIFT_CHAIN, 30, "net_flow_7d_usd:asc");
  const driftNetflow = netflows.find(
    (nf) => nf.token_symbol === "DRIFT" || nf.token_address === DRIFT_TOKEN
  );

  if (driftNetflow) {
    console.log(`  DRIFT found in SM netflow!`);
    console.log(`    24h: $${driftNetflow.net_flow_24h_usd.toLocaleString()}`);
    console.log(`    7d: $${driftNetflow.net_flow_7d_usd.toLocaleString()}`);
    console.log(`    30d: $${driftNetflow.net_flow_30d_usd.toLocaleString()}`);
  } else {
    console.log("  DRIFT not in top 30 SM netflow dumps (token may be too small for SM tracking)");
  }

  // === Build Case Study ===
  const caseStudy: CaseStudy = {
    token_symbol: "DRIFT",
    chain: DRIFT_CHAIN,
    event_name: "Drift Protocol Exploit",
    event_date: "2026-04-01",
    price_before: preHackFlow?.price_usd ?? 0.0696,
    price_after: postHackFlow?.price_usd ?? 0.0394,
    price_change_pct: preHackFlow && postHackFlow
      ? ((postHackFlow.price_usd - preHackFlow.price_usd) / preHackFlow.price_usd) * 100
      : -43.4,
    signals_detected: signals,
    detection_lead_time_minutes: 0, // Would need intraday data to calculate
    timeline,
  };

  console.log("\n" + "=".repeat(80));
  console.log("  CASE STUDY SUMMARY");
  console.log("=".repeat(80));
  console.log(`\n  Token: ${caseStudy.token_symbol}`);
  console.log(`  Event: ${caseStudy.event_name} (${caseStudy.event_date})`);
  console.log(`  Price impact: ${caseStudy.price_change_pct.toFixed(1)}%`);
  console.log(`  Signals detected: ${caseStudy.signals_detected.length}`);

  for (const s of signals) {
    console.log(`    [${s.confidence}] ${s.type}: ${s.description}`);
  }

  console.log(`\n  Total Nansen API calls: ${getCallCount()}`);

  // Save
  const outputPath = join(PROCESSED_DIR, `drift-case-study-${Date.now()}.json`);
  writeFileSync(outputPath, JSON.stringify(caseStudy, null, 2));
  console.log(`  Saved to ${outputPath}\n`);
}

main().catch(console.error);
