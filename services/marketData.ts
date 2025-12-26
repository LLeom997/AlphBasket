
import { Stock, Basket, SimulationResult, OHLC } from "../types";
import { fetchStockHistory } from "./marketApi";
import { normalizeSymbol } from "./symbolAdapter";
import { runSimulation } from "./simulationEngine";
import { supabase } from "./supabase";

// Internal singleton cache
const stocksCache = new Map<string, Stock>();
let nseMasterList: any[] = [];
let nifty50History: OHLC[] = [];

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
 * Ensures Nifty 50 history is available for Alpha/Beta calculation
 */
async function ensureBenchmark() {
    if (nifty50History.length > 0) return;
    try {
        const today = new Date();
        const to = today.toISOString().split("T")[0];
        const fromDate = new Date();
        fromDate.setFullYear(fromDate.getFullYear() - 6); // Fetch 6 years for 5Y CAGR
        const from = fromDate.toISOString().split("T")[0];
        nifty50History = await fetchStockHistory("NIFTY_50", "D", from, to);
    } catch (e) {
        console.error("Failed to load benchmark index", e);
    }
}

/**
 * Calculates CAGR for various windows and risk metrics.
 */
function calculateMetrics(history: OHLC[]) {
  if (history.length < 2) return { 
    return1y: 0, return2y: 0, return3y: 0, return5y: 0, volatility: 0, alpha: 0, beta: 1 
  };
  
  const latest = history[history.length - 1].close;
  
  const getCAGR = (days: number) => {
      if (history.length <= days) return 0;
      const startPrice = history[history.length - days].close;
      if (startPrice <= 0) return 0;
      const years = days / 252;
      return Math.pow(latest / startPrice, 1 / years) - 1;
  };

  const metrics = {
    return1y: getCAGR(252),
    return2y: getCAGR(504),
    return3y: getCAGR(756),
    return5y: getCAGR(1260),
    volatility: 0,
    alpha: 0,
    beta: 1
  };

  // 1. Annualized Volatility
  const returns = history.slice(-252).map((h, i, arr) => {
    if (i === 0) return 0;
    return (h.close - arr[i-1].close) / arr[i-1].close;
  }).slice(1);

  if (returns.length > 0) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      metrics.volatility = Math.sqrt(variance) * Math.sqrt(252);
  }

  // 2. Alpha & Beta calculation (simplified)
  if (nifty50History.length > 0) {
      const window = 252;
      const assetSlice = history.slice(-window);
      const marketSlice = nifty50History.slice(-window);
      
      const assetReturns = [];
      const marketReturns = [];
      
      // Align dates roughly (last 252 trading days)
      const count = Math.min(assetSlice.length, marketSlice.length);
      for(let i = 1; i < count; i++) {
          assetReturns.push((assetSlice[i].close - assetSlice[i-1].close) / assetSlice[i-1].close);
          marketReturns.push((marketSlice[i].close - marketSlice[i-1].close) / marketSlice[i-1].close);
      }

      if (assetReturns.length > 10) {
          const meanAsset = assetReturns.reduce((a, b) => a + b, 0) / assetReturns.length;
          const meanMarket = marketReturns.reduce((a, b) => a + b, 0) / marketReturns.length;
          
          let covariance = 0;
          let marketVar = 0;
          for(let i = 0; i < assetReturns.length; i++) {
              covariance += (assetReturns[i] - meanAsset) * (marketReturns[i] - meanMarket);
              marketVar += Math.pow(marketReturns[i] - meanMarket, 2);
          }
          
          metrics.beta = marketVar === 0 ? 1 : (covariance / marketVar);
          // Simplified Alpha: Annual Excess Return - Beta * Market Annual Excess Return (assuming risk-free ~6%)
          const rf = 0.06;
          const marketRet = metrics.return1y; // Proxy using 1y CAGR
          metrics.alpha = metrics.return1y - (rf + metrics.beta * (marketRet - rf));
      }
  }

  return metrics;
}

/**
 * Synchronizes a single stock by checking Memory -> API.
 */
export async function syncSingleStock(ticker: string): Promise<Stock | null> {
  try {
    const cached = stocksCache.get(ticker);
    if (cached && cached.data.length > 0) return cached;

    await ensureBenchmark();
    const normalized = normalizeSymbol(ticker);
    const today = new Date();
    const to = today.toISOString().split("T")[0];
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 6);
    const from = fromDate.toISOString().split("T")[0];

    const history = await fetchStockHistory(normalized, "D", from, to);
    if (!history || history.length === 0) return null;

    const metrics = calculateMetrics(history);
    const latestPrice = history[history.length - 1].close;
    const masterInfo = nseMasterList.find(s => s.symbol === ticker);
    
    const fullStock: Stock = {
      ticker,
      name: masterInfo?.companyName || ticker,
      sector: masterInfo?.industry || "Equity",
      universe: "Nifty 50",
      marketCap: masterInfo?.marketCap || 0,
      volatility: metrics.volatility,
      alpha: metrics.alpha,
      beta: metrics.beta,
      data: history,
      currentPrice: latestPrice,
      returns: {
        oneYear: metrics.return1y,
        twoYear: metrics.return2y,
        threeYear: metrics.return3y,
        fiveYear: metrics.return5y
      }
    };

    stocksCache.set(ticker, fullStock);
    return fullStock;
  } catch (err) {
    console.error(`[MarketData] Sync failed for ${ticker}`, err);
    return null;
  }
}

export async function ensureStockHistory(tickers: string[] = []) {
  for (const ticker of tickers) {
    await syncSingleStock(ticker);
  }
}

export function getStocks(): Stock[] {
  return Array.from(stocksCache.values());
}

export function calculateBasketHistory(basket: Basket): SimulationResult {
  return runSimulation(basket, stocksCache);
}
