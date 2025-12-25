
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

function calculateMetrics(history: OHLC[]) {
  if (history.length < 2) return { return1y: 0, return2y: 0, return5y: 0, volatility: 0 };
  
  const latest = history[history.length - 1].close;
  const p1y = history[Math.max(0, history.length - 252)]?.close ?? latest;
  const p2y = history[Math.max(0, history.length - 504)]?.close ?? latest;
  const p5y = history[0].close;

  const returns = history.slice(1).map((h, i) => (h.close - history[i].close) / history[i].close);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const annVol = Math.sqrt(variance) * Math.sqrt(252);

  return {
    return1y: (latest - p1y) / p1y,
    return2y: (latest - p2y) / p2y,
    return5y: (latest - p5y) / p5y,
    volatility: annVol
  };
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

    // 2. Check Supabase for cached metadata
    const { data: dbMeta } = await supabase
      .from("stocks_metadata")
      .select("*")
      .eq("ticker", ticker)
      .maybeSingle();

    const isStale = !dbMeta || (Date.now() - new Date(dbMeta.last_updated).getTime() > METADATA_THRESHOLD_HOURS * 3600000);

    // If metadata exists and is fresh, and we don't strictly need full candles right now (for UI display)
    if (dbMeta && !isStale && (!cached || cached.data.length === 0)) {
       const partialStock: Stock = {
        ticker,
        name: dbMeta.name || ticker,
        sector: dbMeta.sector || "Equity",
        universe: (dbMeta.universe as any) || "Nifty 50",
        marketCap: dbMeta.market_cap || 0,
        volatility: dbMeta.volatility || 0,
        data: [],
        currentPrice: dbMeta.current_price || 0,
        returns: {
          oneYear: dbMeta.return_1y || 0,
          twoYear: dbMeta.return_2y || 0,
          fiveYear: dbMeta.return_5y || 0
        }
      };
      stocksCache.set(ticker, partialStock);
      // If we only needed metadata for the card, return here. 
      // Full simulation will trigger a reload with candles.
      return partialStock;
    }

    // 3. API Fallback (Historical Data)
    const normalized = normalizeSymbol(ticker);
    const today = new Date();
    const to = today.toISOString().split("T")[0];
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 5);
    const from = fromDate.toISOString().split("T")[0];

    const history = await fetchStockHistory(normalized, "D", from, to);
    if (!history || history.length === 0) return null;

    const metrics = calculateMetrics(history);
    const latestPrice = history[history.length - 1].close;

    // Find master info for market cap or sector if available
    const masterInfo = nseMasterList.find(s => s.symbol === ticker);
    const mCap = masterInfo?.marketCap || dbMeta?.market_cap || 0;
    const sector = masterInfo?.industry || dbMeta?.sector || "Equity";

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
        fiveYear: metrics.return5y
      }
    };

    stocksCache.set(ticker, fullStock);

    // 4. Save/Update Supabase
    await supabase.from("stocks_metadata").upsert({
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
    });

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
