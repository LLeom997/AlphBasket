import { OHLC } from "../../types";
import { EDGE_FUNCTION_URL } from "../../utils/constants";

/**
 * Fetch OHLC candles directly from Supabase Edge Function.
 * Normalizes symbol before calling.
 */
export async function fetchStockHistory(
    symbol: string,
    resolution: "D" | "60" | "30" | "15" | "5",
    rangeFrom: string,
    rangeTo: string
): Promise<OHLC[]> {

    if (!symbol || typeof symbol !== "string") {
        throw new Error(`MarketApi: Invalid symbol string: ${symbol}`);
    }

    // convert NSE:TATASTEEL-EQ → TATASTEEL
    const rawSymbol = symbol
        .replace("NSE:", "")
        .replace("-EQ", "")
        .toUpperCase()
        .trim();

    const url = `${EDGE_FUNCTION_URL}?symbol=${rawSymbol}`;

    const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`[OHLC fetch failed for ${rawSymbol}] ${text}`);
    }

    const data = await response.json();

    // Edge function returns already-flattened array of candles
    if (!Array.isArray(data)) {
        console.error(`[OHLC invalid format for ${rawSymbol}] got:`, data);
        return [];
    }

    // Optional: filter data by range
    const filtered = data.filter((row: any) => {
        if (!row.date) return false;
        const d = row.date;
        return (!rangeFrom || d >= rangeFrom) && (!rangeTo || d <= rangeTo);
    });

    return filtered.map((c: any) => ({
        date: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume
    }));
}

