import { fetchStockHistory } from "./marketApi";

/**
 * Fetches daily stock history using Fyers API (wrapper around marketApi)
 */
export function getDailyHistory(
    symbol: string,
    from: string,
    to: string
) {
    return fetchStockHistory(symbol, "D", from, to);
}

