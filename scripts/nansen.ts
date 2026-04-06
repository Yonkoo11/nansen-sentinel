// Typed wrapper around the nansen CLI
// Shells out to `nansen` binary and parses JSON responses.
// Every call saves raw output to data/raw/ for submission proof.

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  NansenResponse,
  SmartMoneyPerpTrade,
  SmartMoneyDexTrade,
  SmartMoneyNetflow,
  TokenInfo,
  TokenFlow,
  TokenHolder,
  WhoBoughtSold,
} from "./types.js";

const DATA_DIR = join(import.meta.dirname, "..", "data", "raw");
mkdirSync(DATA_DIR, { recursive: true });

let callCount = 0;

function run(args: string[], tag: string): string {
  callCount++;
  const fullArgs = [...args, "--format", "json"];
  console.log(`[nansen #${callCount}] nansen ${fullArgs.join(" ")}`);

  const raw = execFileSync("nansen", fullArgs, {
    encoding: "utf-8",
    timeout: 30_000,
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });

  // The CLI may prepend an [x402] line before the JSON
  const jsonStart = raw.indexOf("{");
  const json = jsonStart >= 0 ? raw.slice(jsonStart) : raw;

  // Save raw response
  const filename = `${tag}-${Date.now()}.json`;
  writeFileSync(join(DATA_DIR, filename), json);

  return json;
}

function parse<T>(json: string): T {
  const parsed = JSON.parse(json) as NansenResponse<T>;
  if (!parsed.success) {
    throw new Error(`Nansen API error: ${JSON.stringify(parsed)}`);
  }
  return parsed.data.data;
}

// === Smart Money ===

export function getSmartMoneyPerpTrades(
  limit = 50,
  sort = "value_usd:desc"
): SmartMoneyPerpTrade[] {
  const json = run(
    ["research", "smart-money", "perp-trades", "--limit", String(limit), "--sort", sort],
    "sm-perp"
  );
  return parse<SmartMoneyPerpTrade[]>(json);
}

export function getSmartMoneyDexTrades(
  chain: string,
  limit = 50
): SmartMoneyDexTrade[] {
  const json = run(
    ["research", "smart-money", "dex-trades", "--chain", chain, "--limit", String(limit)],
    `sm-dex-${chain}`
  );
  return parse<SmartMoneyDexTrade[]>(json);
}

export function getSmartMoneyNetflow(
  chain: string,
  limit = 50,
  sort = "net_flow_24h_usd:asc"
): SmartMoneyNetflow[] {
  const json = run(
    ["research", "smart-money", "netflow", "--chain", chain, "--limit", String(limit), "--sort", sort],
    `sm-netflow-${chain}`
  );
  return parse<SmartMoneyNetflow[]>(json);
}

// === Token Data ===

export function getTokenInfo(
  chain: string,
  tokenAddress: string
): TokenInfo {
  const json = run(
    ["research", "token", "info", "--chain", chain, "--token-address", tokenAddress],
    "token-info"
  );
  return parse<TokenInfo>(json);
}

export function getTokenFlows(
  chain: string,
  tokenAddress: string,
  limit = 30
): TokenFlow[] {
  const json = run(
    ["research", "token", "flows", "--chain", chain, "--token-address", tokenAddress, "--limit", String(limit)],
    "token-flows"
  );
  return parse<TokenFlow[]>(json);
}

export function getTokenHolders(
  chain: string,
  tokenAddress: string,
  limit = 20
): TokenHolder[] {
  const json = run(
    ["research", "token", "holders", "--chain", chain, "--token-address", tokenAddress, "--limit", String(limit)],
    "token-holders"
  );
  return parse<TokenHolder[]>(json);
}

export function getWhoBoughtSold(
  chain: string,
  tokenAddress: string,
  limit = 20
): WhoBoughtSold[] {
  const json = run(
    ["research", "token", "who-bought-sold", "--chain", chain, "--token-address", tokenAddress, "--limit", String(limit)],
    "token-wbs"
  );
  return parse<WhoBoughtSold[]>(json);
}

// === Utility ===

export function getCallCount(): number {
  return callCount;
}
