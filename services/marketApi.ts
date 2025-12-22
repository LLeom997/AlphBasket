
import { OHLC } from "../types";

const EDGE_FUNCTION_URL = "https://gtmyjimhspaycvhzjxby.supabase.co/functions/v1/fyersHistory";

/**
 * Low-level API caller. 
 * Accepts ONLY strict normalized symbol strings (e.g., "NSE:RELIANCE-EQ").
 * Includes exponential backoff retry logic for rate limits.
 */
export async function fetchStockHistory(
  symbol: string,
  resolution: "D" | "60" | "30" | "15" | "5",
  rangeFrom: string,
  rangeTo: string
): Promise<OHLC[]> {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error(`MarketApi: Invalid symbol string provided: ${symbol}`);
  }

  const maxRetries = 5;
  let attempt = 0;

  const url = new URL(EDGE_FUNCTION_URL);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("resolution", resolution);
  url.searchParams.set("range_from", rangeFrom);
  url.searchParams.set("range_to", rangeTo);

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (response.status === 429) {
        if (attempt === maxRetries) {
          throw new Error(`Market API: Rate limit exceeded. Max retries (${maxRetries}) reached for ${symbol}.`);
        }
        
        // Exponential backoff: t = 2^n * 1000ms
        const backoffTime = Math.pow(2, attempt) * 1000;
        console.warn(`[MarketApi] 429 Rate Limit for ${symbol}. Retrying in ${backoffTime}ms (Attempt ${attempt + 1}/${maxRetries})...`);
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        attempt++;
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Market API fetch failed with status ${response.status}: ${text}`);
      }

      const data = await response.json();

      if (!data || data.s !== "ok" || !Array.isArray(data.candles)) {
        throw new Error(`Market API: No valid data returned for ${symbol}`);
      }

      return data.candles.map((c: number[]) => ({
        date: new Date(c[0] * 1000).toISOString().split("T")[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5]
      }));

    } catch (error: any) {
      if (attempt === maxRetries || error.message.includes("normalized symbol")) {
        throw error;
      }
      console.error(`[MarketApi] Error fetching ${symbol}: ${error.message}. Retrying...`);
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`Market API: Failed to fetch data for ${symbol} after ${maxRetries} attempts.`);
}
