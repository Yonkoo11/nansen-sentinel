// Signal scoring engine for Nansen Sentinel
// Extracts smart money behavior signals from Nansen data.
// NOT a prediction engine. Shows what SM is doing so you can decide.

import type {
  SmartMoneyPerpTrade,
  SmartMoneyDexTrade,
  SmartMoneyNetflow,
  TokenHolder,
  Signal,
  ScoredAlert,
  SignalConfidence,
} from "./types.js";
import { THRESHOLDS, IGNORE_TOKENS } from "./types.js";

// === Signal Extractors ===

export function extractNetflowSignals(
  netflows: SmartMoneyNetflow[]
): Signal[] {
  const signals: Signal[] = [];

  for (const nf of netflows) {
    if (IGNORE_TOKENS.has(nf.token_symbol)) continue;

    const dump24h = nf.net_flow_24h_usd < THRESHOLDS.netflow_dump_24h_usd;
    const dump7d = nf.net_flow_7d_usd < THRESHOLDS.netflow_dump_7d_usd;

    if (dump24h || dump7d) {
      const severity = dump24h && dump7d ? "HIGH" : "MEDIUM";
      signals.push({
        type: "netflow_dump",
        token_symbol: nf.token_symbol,
        chain: nf.chain,
        confidence: severity,
        value_usd: Math.min(nf.net_flow_24h_usd, nf.net_flow_7d_usd),
        description: `SM net outflow: $${Math.abs(nf.net_flow_24h_usd).toLocaleString()} (24h), $${Math.abs(nf.net_flow_7d_usd).toLocaleString()} (7d)`,
        timestamp: new Date().toISOString(),
        raw_data: nf as unknown as Record<string, unknown>,
      });
    }
  }

  return signals;
}

export function extractPerpShortSignals(
  trades: SmartMoneyPerpTrade[]
): Signal[] {
  // Group shorts by token
  const shortsByToken = new Map<
    string,
    { total_usd: number; count: number; traders: Set<string> }
  >();

  for (const t of trades) {
    if (t.side !== "Short") continue;
    if (t.action !== "Open" && t.action !== "Add") continue;

    const existing = shortsByToken.get(t.token_symbol) ?? {
      total_usd: 0,
      count: 0,
      traders: new Set<string>(),
    };
    existing.total_usd += t.value_usd;
    existing.count++;
    existing.traders.add(t.trader_address);
    shortsByToken.set(t.token_symbol, existing);
  }

  const signals: Signal[] = [];

  for (const [symbol, data] of shortsByToken) {
    if (IGNORE_TOKENS.has(symbol)) continue;
    if (data.total_usd < THRESHOLDS.perp_short_min_usd) continue;

    const multiTrader = data.traders.size > 1;
    const confidence: SignalConfidence = multiTrader ? "HIGH" : "MEDIUM";

    signals.push({
      type: "perp_short",
      token_symbol: symbol,
      chain: "hyperliquid",
      confidence,
      value_usd: data.total_usd,
      description: `SM opening shorts: $${data.total_usd.toLocaleString()} across ${data.count} trades by ${data.traders.size} trader(s)`,
      timestamp: new Date().toISOString(),
      raw_data: {
        total_usd: data.total_usd,
        trade_count: data.count,
        unique_traders: data.traders.size,
      },
    });
  }

  return signals;
}

export function extractDexSellSignals(
  trades: SmartMoneyDexTrade[]
): Signal[] {
  // Group sells by sold token
  const sellsByToken = new Map<
    string,
    { total_usd: number; count: number; traders: Set<string>; chain: string }
  >();

  for (const t of trades) {
    const soldSym = t.token_sold_symbol;
    if (!soldSym || IGNORE_TOKENS.has(soldSym)) continue;

    const existing = sellsByToken.get(soldSym) ?? {
      total_usd: 0,
      count: 0,
      traders: new Set<string>(),
      chain: t.chain,
    };
    existing.total_usd += t.trade_value_usd;
    existing.count++;
    existing.traders.add(t.trader_address);
    sellsByToken.set(soldSym, existing);
  }

  const signals: Signal[] = [];

  for (const [symbol, data] of sellsByToken) {
    if (data.total_usd < 1000) continue; // Ignore dust

    signals.push({
      type: "price_anomaly", // DEX sell pressure from labeled wallets
      token_symbol: symbol,
      chain: data.chain,
      confidence: data.traders.size > 1 ? "HIGH" : "MEDIUM",
      value_usd: data.total_usd,
      description: `SM selling on DEX: $${data.total_usd.toLocaleString()} across ${data.count} trades by ${data.traders.size} trader(s)`,
      timestamp: new Date().toISOString(),
      raw_data: {
        total_usd: data.total_usd,
        trade_count: data.count,
        unique_traders: data.traders.size,
      },
    });
  }

  return signals;
}

export function extractExchangeInflowSignals(
  holders: TokenHolder[],
  tokenSymbol: string,
  chain: string
): Signal[] {
  const signals: Signal[] = [];
  const exchangeLabels = ["Binance", "Bybit", "OKX", "Coinbase", "Upbit", "Kraken"];

  for (const h of holders) {
    const isExchange = exchangeLabels.some((ex) =>
      h.address_label.toLowerCase().includes(ex.toLowerCase())
    );
    if (!isExchange) continue;

    // Large 7-day inflow to exchange = people depositing to sell
    if (h.balance_change_7d > 0 && h.value_usd > 100_000) {
      const changePct =
        h.token_amount > 0
          ? (h.balance_change_7d / (h.token_amount - h.balance_change_7d)) * 100
          : 0;

      if (changePct > THRESHOLDS.exchange_inflow_7d_pct) {
        signals.push({
          type: "exchange_inflow",
          token_symbol: tokenSymbol,
          chain,
          confidence: changePct > 50 ? "HIGH" : "MEDIUM",
          value_usd: h.balance_change_7d,
          description: `${h.address_label}: +${h.balance_change_7d.toLocaleString()} tokens (${changePct.toFixed(1)}% increase) in 7d`,
          timestamp: new Date().toISOString(),
          raw_data: h as unknown as Record<string, unknown>,
        });
      }
    }
  }

  return signals;
}

// === Alert Scorer ===

export function scoreAlerts(signals: Signal[]): ScoredAlert[] {
  // Group all signals by token
  const byToken = new Map<string, Signal[]>();

  for (const s of signals) {
    const key = s.token_symbol;
    const existing = byToken.get(key) ?? [];
    existing.push(s);
    byToken.set(key, existing);
  }

  const alerts: ScoredAlert[] = [];

  for (const [symbol, tokenSignals] of byToken) {
    const types = new Set(tokenSignals.map((s) => s.type));
    const chains = [...new Set(tokenSignals.map((s) => s.chain))];

    // Score based on signal diversity and strength
    let score = 0;
    for (const s of tokenSignals) {
      const weight =
        THRESHOLDS.weights[s.type as keyof typeof THRESHOLDS.weights] ?? 10;
      const confMultiplier =
        s.confidence === "HIGH" ? 1.0 : s.confidence === "MEDIUM" ? 0.6 : 0.3;
      score += weight * confMultiplier;
    }

    // Bonus for multiple signal types (cross-confirmation)
    if (types.size >= 3) score *= 1.5;
    else if (types.size >= 2) score *= 1.2;

    score = Math.min(100, Math.round(score));

    // Determine overall confidence
    let confidence: SignalConfidence;
    if (score >= 70 || types.size >= 3) confidence = "CRITICAL";
    else if (score >= 40 || types.size >= 2) confidence = "HIGH";
    else if (score >= 20) confidence = "MEDIUM";
    else confidence = "LOW";

    const summary = tokenSignals.map((s) => s.description).join(" | ");

    alerts.push({
      token_symbol: symbol,
      chain: chains.join(", "),
      confidence,
      signals: tokenSignals,
      score,
      timestamp: new Date().toISOString(),
      summary,
    });
  }

  // Sort by score descending
  alerts.sort((a, b) => b.score - a.score);
  return alerts;
}

// === Pretty Print ===

export function printAlerts(alerts: ScoredAlert[]): void {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`  NANSEN SENTINEL — Smart Money Intelligence`);
  console.log(`  ${new Date().toISOString()}`);
  console.log(`${"=".repeat(80)}\n`);

  if (alerts.length === 0) {
    console.log("  No alerts at this time.\n");
    return;
  }

  for (const a of alerts) {
    const icon =
      a.confidence === "CRITICAL"
        ? "!!!"
        : a.confidence === "HIGH"
          ? "!!"
          : a.confidence === "MEDIUM"
            ? "!"
            : ".";

    console.log(
      `  [${icon}] ${a.token_symbol} (${a.chain}) — ${a.confidence} [score: ${a.score}]`
    );
    for (const s of a.signals) {
      console.log(`      ${s.type}: ${s.description}`);
    }
    console.log();
  }
}
