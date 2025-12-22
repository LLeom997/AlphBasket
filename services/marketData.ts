import { Stock, Basket, SimulationResult } from "../types";
import { fetchStockHistory } from "./marketApi";
import { normalizeSymbol, getTickerFromNormalized } from "./symbolAdapter";
import { runSimulation } from "./simulationEngine";

// Internal singleton cache
const stocksCache = new Map<string, Stock>();

// Full Nifty 50 universe
const STOCK_UNIVERSE = [
    "SHRIRAMFIN",
    "MAXHEALTH",
    "BEL",
    "TMPV",
    "POWERGRID",
    "BAJAJ-AUTO",
    "EICHERMOT",
    "JIOFIN",
    "APOLLOHOSP",
    "RELIANCE",
    "HDFCLIFE",
    "LT",
    "CIPLA",
    "ASIANPAINT",
    "TATACONSUM",
    "BAJAJFINSV",
    "TRENT",
    "NESTLEIND",
    "INFY",
    "HINDUNILVR",
    "ADANIENT",
    "BAJFINANCE",
    "SBILIFE",
    "HDFCBANK",
    "ETERNAL",
    "M&M",
    "NTPC",
    "MARUTI",
    "TATASTEEL",
    "ONGC",
    "TITAN",
    "ULTRACEMCO",
    "GRASIM",
    "SBIN",
    "TECHM",
    "TCS",
    "AXISBANK",
    "WIPRO",
    "ITC",
    "ADANIPORTS",
    "DRREDDY",
    "SUNPHARMA",
    "INDIGO",
    "BHARTIARTL",
    "COALINDIA",
    "ICICIBANK",
    "JSWSTEEL",
    "KOTAKBANK",
    "HINDALCO",
    "HCLTECH"
  ];

// Rate limiting constants
const MIN_DELAY = 150;
const MAX_RETRIES = 5;

/**
 * Exponential backoff wrapper for API calls
 */
async function fetchWithBackoff<T>(
  fn: () => Promise<T>
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit =
        err?.code === 429 || err?.message?.includes("429");

      if (!isRateLimit || attempt >= MAX_RETRIES) {
        throw err;
      }

      const waitTime = Math.pow(2, attempt) * 1000;
      console.warn(
        `[MarketData] 429 hit. Retrying in ${waitTime} ms`
      );

      await new Promise(r => setTimeout(r, waitTime));
      attempt++;
    }
  }
}

/**
 * Ensures historical data is loaded sequentially
 */
export async function ensureStockHistory(
  tickers: string[] = STOCK_UNIVERSE
) {
  const today = new Date();
  const to = today.toISOString().split("T")[0];

  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 5);
  const from = fromDate.toISOString().split("T")[0];

  for (let i = 0; i < tickers.length; i++) {
    const raw = tickers[i];

    try {
      const normalized = normalizeSymbol(raw);
      const ticker = getTickerFromNormalized(normalized);

      if (stocksCache.has(ticker)) {
        console.log(
          `[MarketData] ${ticker} already cached. Skipping`
        );
        continue;
      }

      if (i > 0) {
        await new Promise(r => setTimeout(r, MIN_DELAY));
      }

      console.log(`[MarketData] Fetching ${ticker}`);

      const history = await fetchWithBackoff(() =>
        fetchStockHistory(normalized, "D", from, to)
      );

      const latestPrice =
        history[history.length - 1]?.close || 0;

      const oneYearAgo =
        history[Math.max(0, history.length - 252)]?.close ||
        latestPrice;

      const return1Y =
        oneYearAgo !== 0
          ? (latestPrice - oneYearAgo) / oneYearAgo
          : 0;

      stocksCache.set(ticker, {
        ticker,
        name: ticker,
        sector: "Equity",
        universe: "Nifty 50",
        marketCap: 0,
        volatility: 0,
        data: history,
        currentPrice: latestPrice,
        returns: {
          oneYear: return1Y,
          twoYear: 0,
          fiveYear: 0
        }
      });

      console.log(`[MarketData] Loaded ${ticker}`);
    } catch (err) {
      console.error(
        `[MarketData] Failed for ${raw}`,
        err
      );
    }
  }
}

/**
 * Getter for UI
 */
export function getStocks(): Stock[] {
  return STOCK_UNIVERSE.map(ticker => {
    return (
      stocksCache.get(ticker) || {
        ticker,
        name: ticker,
        sector: "Equity",
        universe: "Nifty 50",
        marketCap: 0,
        volatility: 0,
        data: [],
        returns: {
          oneYear: 0,
          twoYear: 0,
          fiveYear: 0
        }
      }
    );
  });
}

/**
 * Simulation orchestration
 */
export function calculateBasketHistory(
  basket: Basket
): SimulationResult {
  return runSimulation(basket, stocksCache);
}

// Legacy alias
export const loadStockHistory = fetchStockHistory;
