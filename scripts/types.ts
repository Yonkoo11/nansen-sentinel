// Core data types for Nansen Sentinel
// All types mirror the actual Nansen API response shapes

// === Nansen API Response Types ===

export interface NansenResponse<T> {
  success: boolean;
  data: {
    data: T;
    pagination?: {
      page: number;
      per_page: number;
      is_last_page: boolean;
    };
  };
}

export interface SmartMoneyPerpTrade {
  trader_address_label: string;
  trader_address: string;
  token_symbol: string;
  side: "Long" | "Short";
  action: "Open" | "Add" | "Close" | "Reduce";
  token_amount: number;
  price_usd: number;
  value_usd: number;
  type: "Market" | "Limit";
  block_timestamp: string;
  transaction_hash: string;
}

export interface SmartMoneyDexTrade {
  chain: string;
  block_timestamp: string;
  transaction_hash: string;
  trader_address: string;
  trader_address_label: string;
  token_bought_address: string;
  token_sold_address: string;
  token_bought_amount: number;
  token_sold_amount: number;
  token_bought_symbol: string;
  token_sold_symbol: string;
  token_bought_age_days: number;
  token_sold_age_days: number;
  token_bought_market_cap: number | null;
  token_sold_market_cap: number | null;
  token_bought_fdv: number | null;
  token_sold_fdv: number | null;
  trade_value_usd: number;
}

export interface SmartMoneyNetflow {
  token_address: string;
  token_symbol: string;
  net_flow_1h_usd: number;
  net_flow_24h_usd: number;
  net_flow_7d_usd: number;
  net_flow_30d_usd: number;
  chain: string;
  token_sectors: string[];
  trader_count: number;
  token_age_days: number;
  market_cap_usd: number;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  contract_address: string;
  logo: string;
  token_details: {
    token_deployment_date: string;
    website: string;
    x: string;
    telegram: string;
    market_cap_usd: number;
    fdv_usd: number;
    circulating_supply: number;
    total_supply: number;
  };
  spot_metrics: {
    volume_total_usd: number;
    buy_volume_usd: number;
    sell_volume_usd: number;
    total_buys: number;
    total_sells: number;
    unique_buyers: number;
    unique_sellers: number;
    liquidity_usd: number;
    total_holders: number;
  };
}

export interface TokenFlow {
  date: string;
  price_usd: number;
  token_amount: number;
  value_usd: number;
  holders_count: number;
  total_inflows_count: number;
  total_outflows_count: number;
}

export interface TokenHolder {
  address: string;
  address_label: string;
  token_amount: number;
  total_outflow: number;
  total_inflow: number;
  balance_change_24h: number;
  balance_change_7d: number;
  balance_change_30d: number;
  ownership_percentage: number;
  value_usd: number;
}

export interface WhoBoughtSold {
  address: string;
  address_label: string;
  bought_token_volume: number;
  sold_token_volume: number;
  token_trade_volume: number;
  bought_volume_usd: number;
  sold_volume_usd: number;
  trade_volume_usd: number;
}

// === Sentinel Signal Types ===

export type SignalConfidence = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Signal {
  type: "netflow_dump" | "perp_short" | "price_anomaly" | "exchange_inflow";
  token_symbol: string;
  chain: string;
  confidence: SignalConfidence;
  value_usd: number;
  description: string;
  timestamp: string;
  raw_data: Record<string, unknown>;
}

export interface ScoredAlert {
  token_symbol: string;
  chain: string;
  confidence: SignalConfidence;
  signals: Signal[];
  score: number; // 0-100
  timestamp: string;
  summary: string;
}

export interface CaseStudy {
  token_symbol: string;
  chain: string;
  event_name: string;
  event_date: string;
  price_before: number;
  price_after: number;
  price_change_pct: number;
  signals_detected: Signal[];
  detection_lead_time_minutes: number;
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  timestamp: string;
  event: string;
  source: string;
  data?: Record<string, unknown>;
}

// === Collection Config ===

export interface CollectConfig {
  chains: string[];
  netflow_limit: number;
  perp_limit: number;
  dex_limit: number;
  output_dir: string;
}

export const DEFAULT_CONFIG: CollectConfig = {
  chains: ["solana", "ethereum", "base"],
  netflow_limit: 50,
  perp_limit: 100,
  dex_limit: 50,
  output_dir: "data/raw",
};

// === Scoring Thresholds ===
// Calibrated from baseline measurement April 6 2026:
// - Solana: 0/50 tokens triggered at -$10K 24h threshold
// - Ethereum: 1/50 tokens triggered at -$10K 24h (MAV, -$17K)
// - Ethereum: 2/50 tokens triggered at -$50K 7d
// False positive rate: ~0-2% per chain per scan. Acceptable.

export const THRESHOLDS = {
  netflow_dump_24h_usd: -10_000,
  netflow_dump_7d_usd: -50_000,

  perp_short_min_usd: 500,

  price_drop_pct: -10,

  exchange_inflow_7d_pct: 10,

  // Weights reflect signal reliability, not prediction accuracy.
  // SM perp trades are highest-signal (real money conviction).
  // Netflow is second (aggregated across all SM wallets).
  // DEX sells and exchange inflows are weaker (many benign reasons).
  weights: {
    netflow_dump: 30,
    perp_short: 30,
    price_anomaly: 20,
    exchange_inflow: 20,
  },
} as const;

// Stablecoins and base tokens to exclude from signal detection
export const IGNORE_TOKENS = new Set([
  "USDC", "USDT", "DAI", "BUSD", "TUSD", "FRAX", "USD1",
  "SOL", "ETH", "WETH", "WSOL", "BTC", "WBTC",
]);
