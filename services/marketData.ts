
import { Stock, Basket, SimulationResult, OHLC } from "../types";
import { fetchStockHistory } from "./marketApi";
import { normalizeSymbol, getTickerFromNormalized } from "./symbolAdapter";
import { runSimulation } from "./simulationEngine";
import { supabase } from "./supabase";

// Internal singleton cache
const stocksCache = new Map<string, Stock>();
let nseMasterList: any[] = [];

const METADATA_THRESHOLD_HOURS = 24;

/**
 * Fetches the master list of NSE companies.
 */
export async function getNseMasterList(): Promise<any[]> {
  if (nseMasterList.length > 0) return nseMasterList;
  try {
    const response = await fetch("https://gtmyjimhspaycvhzjxby.supabase.co/functions/v1/getNseCompanies");
    const data = await response.json();
    nseMasterList = Array.isArray(data) ? data : (data.data || []);
    return nseMasterList;
  } catch (err) {
    console.error("Failed to fetch NSE Master List", err);
    return [];
  }
}

/**
 * Calculates CAGR for various windows.
 */
function calculateMetrics(history: OHLC[]) {
  if (history.length < 2) return { 
    return1y: 0, return2y: 0, return3y: 0, return5y: 0, return10y: 0, return15y: 0, volatility: 0 
  };
  
  const latest = history[history.length - 1].close;
  
  const getCAGR = (days: number) => {
      if (history.length <= days) return 0;
      const startPrice = history[history.length - days].close;
      if (startPrice <= 0) return 0;
      const years = days / 252;
      return Math.pow(latest / startPrice, 1 / years) - 1;
  };

  // We use approximate trading days: 252 per year
  const metrics = {
    return1y: getCAGR(252),
    return2y: getCAGR(504),
    return3y: getCAGR(756),
    return5y: getCAGR(1260),
    return10y: getCAGR(2520),
    return15y: getCAGR(3780),
    volatility: 0
  };

  // Calculate daily volatility (annualized)
  const returns = history.slice(-252).map((h, i, arr) => {
    if (i === 0) return 0;
    return (h.close - arr[i-1].close) / arr[i-1].close;
  }).slice(1);

  if (returns.length > 0) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      metrics.volatility = Math.sqrt(variance) * Math.sqrt(252);
  }

  return metrics;
}

/**
 * Synchronizes a single stock by checking Memory -> Supabase -> API.
 */
export async function syncSingleStock(ticker: string): Promise<Stock | null> {
  try {
    // 1. Check Memory Cache
    const cached = stocksCache.get(ticker);
    if (cached && cached.data.length > 0 && cached.currentPrice! > 0) {
      return cached;
    }

    // 2. API Call (Historical Data) - We fetch 15 years to satisfy the requested CAGRs
    const normalized = normalizeSymbol(ticker);
    const today = new Date();
    const to = today.toISOString().split("T")[0];
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 15);
    const from = fromDate.toISOString().split("T")[0];

    const history = await fetchStockHistory(normalized, "D", from, to);
    if (!history || history.length === 0) return null;

    const metrics = calculateMetrics(history);
    const latestPrice = history[history.length - 1].close;

    // Find master info for market cap or sector if available
    const masterInfo = nseMasterList.find(s => s.symbol === ticker);
    
    // Check Supabase only if masterInfo is missing for MC/Sector
    let dbMC = 0;
    let dbSec = "Equity";
    if (!masterInfo) {
        const { data: dbMeta } = await supabase
          .from("stocks_metadata")
          .select("market_cap, sector")
          .eq("ticker", ticker)
          .maybeSingle();
        dbMC = dbMeta?.market_cap || 0;
        dbSec = dbMeta?.sector || "Equity";
    }

    const mCap = masterInfo?.marketCap || dbMC;
    const sector = masterInfo?.industry || dbSec;

    const fullStock: Stock = {
      ticker,
      name: masterInfo?.companyName || ticker,
      sector: sector,
      universe: "Nifty 50",
      marketCap: mCap,
      volatility: metrics.volatility,
      data: history,
      currentPrice: latestPrice,
      returns: {
        oneYear: metrics.return1y,
        twoYear: metrics.return2y,
        threeYear: metrics.return3y,
        fiveYear: metrics.return5y,
        tenYear: metrics.return10y,
        fifteenYear: metrics.return15y
      }
    };

    stocksCache.set(ticker, fullStock);

    // 4. Save/Update Supabase (Keeping the DB schema as-is for base fields)
    supabase.from("stocks_metadata").upsert({
      ticker,
      name: fullStock.name,
      sector: fullStock.sector,
      market_cap: mCap,
      volatility: metrics.volatility,
      return_1y: metrics.return1y,
      return_2y: metrics.return2y,
      return_5y: metrics.return5y,
      current_price: latestPrice,
      last_updated: new Date().toISOString()
    }).then(); // Async fire-and-forget

    return fullStock;
  } catch (err) {
    console.error(`[MarketData] Sync failed for ${ticker}`, err);
    return null;
  }
}

/**
 * Legacy initialization
 */
export async function ensureStockHistory(tickers: string[] = []) {
  for (const ticker of tickers) {
    await syncSingleStock(ticker);
  }
}

/**
 * Getter for UI
 */
export function getStocks(): Stock[] {
  return Array.from(stocksCache.values());
}

/**
 * Simulation orchestration
 */
export function calculateBasketHistory(basket: Basket): SimulationResult {
  return runSimulation(basket, stocksCache);
}
