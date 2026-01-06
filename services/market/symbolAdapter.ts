/**
 * Normalizes any input symbol shape into a strict NSE format string.
 * This is the ONLY place where we handle objects or arrays.
 */
export function normalizeSymbol(input: unknown): string {
    if (!input) throw new Error("SymbolAdapter: Empty input provided");

    let raw = "";

    // Handle Accidental Arrays
    if (Array.isArray(input)) {
        const firstValid = input.find(v => typeof v === "string" || (typeof v === "object" && v !== null));
        if (!firstValid) throw new Error("SymbolAdapter: Empty symbol array");
        return normalizeSymbol(firstValid);
    }

    // Handle Strings
    if (typeof input === "string") {
        raw = input.trim();
    }
    // Handle Objects
    else if (typeof input === "object" && input !== null) {
        const obj = input as any;
        raw = (obj.ticker || obj.symbol || obj.value || obj.code || (obj.stock && obj.stock.symbol) || "").trim();
    }

    if (!raw) throw new Error("SymbolAdapter: Could not extract symbol from input");

    // Format to NSE requirement
    if (raw.startsWith("NSE:")) {
        return raw;
    }

    return `NSE:${raw}-EQ`;
}

/**
 * Extracts the clean ticker (e.g. RELIANCE) from a normalized symbol (NSE:RELIANCE-EQ).
 */
export function getTickerFromNormalized(symbol: string): string {
    return symbol.replace("NSE:", "").replace("-EQ", "");
}

