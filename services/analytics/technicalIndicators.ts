import { OHLC } from "../../types";

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], periods: number): number[] {
    const sma: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < periods - 1) {
            sma.push(data[i]);
        } else {
            const sum = data.slice(i - periods + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / periods);
        }
    }
    return sma;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], periods: number): number[] {
    const k = 2 / (periods + 1);
    let ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
        ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

/**
 * Calculates Relative Strength Index (RSI)
 */
export function calculateRSI(data: number[], periods: number = 14): number[] {
    let rsi = new Array(data.length).fill(50);
    if (data.length < periods) return rsi;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= periods; i++) {
        const diff = data[i] - data[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / periods;
    let avgLoss = losses / periods;

    for (let i = periods + 1; i < data.length; i++) {
        const diff = data[i] - data[i - 1];
        avgGain = (avgGain * (periods - 1) + (diff > 0 ? diff : 0)) / periods;
        avgLoss = (avgLoss * (periods - 1) + (diff < 0 ? -diff : 0)) / periods;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi[i] = 100 - (100 / (1 + rs));
    }
    return rsi;
}

/**
 * Calculates Average True Range (ATR)
 */
export function calculateATR(ohlc: OHLC[], periods: number = 14): number[] {
    if (ohlc.length < 2) return new Array(ohlc.length).fill(0);
    
    const trueRanges: number[] = [];
    for (let i = 1; i < ohlc.length; i++) {
        const high = ohlc[i].high;
        const low = ohlc[i].low;
        const prevClose = ohlc[i - 1].close;
        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        trueRanges.push(tr);
    }
    
    // First ATR value is SMA of first 'periods' true ranges
    const atr: number[] = new Array(ohlc.length).fill(0);
    if (trueRanges.length < periods) return atr;
    
    let sum = trueRanges.slice(0, periods).reduce((a, b) => a + b, 0);
    atr[periods] = sum / periods;
    
    // Subsequent ATR values use Wilder's smoothing (similar to EMA but different formula)
    for (let i = periods + 1; i < ohlc.length; i++) {
        atr[i] = (atr[i - 1] * (periods - 1) + trueRanges[i - 1]) / periods;
    }
    
    return atr;
}

/**
 * Calculates MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(data: number[]) {
    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = calculateEMA(macdLine, 9);
    return { macdLine, signalLine };
}

