import { OHLC, MonteCarloPath, Trade } from "../../types";
import { calculateMACD, calculateRSI, calculateATR, calculateSMA } from "./technicalIndicators";
import { randomNormal } from "../../utils/randomUtils";
import { getTodayDate } from "../../utils/dateUtils";

export type ForecastStrategy = "normal" | "target_sl" | "momentum";

export interface SimulationOptions {
    strategy: ForecastStrategy;
    sl?: number;
    tp?: number;
}

/**
 * Performs Monte Carlo simulation for portfolio forecasting
 * 
 * Strategy 1 (normal): Hold entirely till the end of the year - basic buy and hold
 * Strategy 2 (target_sl): Rule-based with 2% stop loss and 6% profit target
 * Strategy 3 (momentum): MACD and RSI crossover strategy
 */
export function performMonteCarlo(
    history: OHLC[],
    initialValue: number,
    horizon: number = 252,
    simulations: number = 3000,
    options: SimulationOptions = { strategy: "normal" }
): { paths: MonteCarloPath; probProfit: number; medianEndValue: number; endValues: number[]; trades: Trade[] } {

    const closePrices = history.map(h => h.close);
    const returns = closePrices.slice(1).map((v, i) => (v - closePrices[i]) / closePrices[i]);
    const validReturns = returns.filter(r => r > -1);

    if (validReturns.length < 10 || initialValue <= 0) {
        return {
            paths: { p10: new Array(horizon + 1).fill(initialValue), p50: new Array(horizon + 1).fill(initialValue), p90: new Array(horizon + 1).fill(initialValue) },
            probProfit: 0, medianEndValue: initialValue, endValues: new Array(simulations).fill(initialValue),
            trades: []
        };
    }

    // Calculate Base Stats
    const logReturns = validReturns.map(r => Math.log(1 + r));
    const mu = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
    const variance = logReturns.reduce((a, b) => a + Math.pow(b - mu, 2), 0) / (validReturns.length - 1);
    const sigma = Math.sqrt(variance);
    const drift = mu - 0.5 * variance;

    // Pre-calculate indicators for momentum strategy
    let macdData: { macdLine: number[]; signalLine: number[] } | null = null;
    let rsiData: number[] | null = null;
    let atrData: number[] | null = null;
    let smaAtrData: number[] | null = null;

    if (options.strategy === "momentum" || options.strategy === "target_sl") {
        macdData = calculateMACD(closePrices);
        rsiData = calculateRSI(closePrices);
        
        if (options.strategy === "target_sl") {
            atrData = calculateATR(history, 14);
            smaAtrData = calculateSMA(atrData, 14);
        }
    }

    const dailySlices: number[][] = Array.from({ length: horizon + 1 }, () => []);
    const allEndValues: number[] = [];
    
    // Track trades for the median path (p50 simulation)
    const trades: Trade[] = [];
    const startDate = new Date(history[history.length - 1].date);
    
    // Helper to get date string for a day offset
    const getDateForDay = (dayOffset: number): string => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + dayOffset);
        return date.toISOString().split("T")[0];
    };

    for (let s = 0; s < simulations; s++) {
        let currentPathValue = initialValue;
        dailySlices[0].push(currentPathValue);

        // Strategy 1: Normal (Hold till end) - just apply random walk
        if (options.strategy === "normal") {
            // Track single hold trade for median path
            if (s === Math.floor(simulations * 0.50)) {
                trades.push({
                    entryDate: getDateForDay(0),
                    exitDate: getDateForDay(horizon),
                    entryPrice: initialValue,
                    exitPrice: null, // Will be set at end
                    returnPct: null,
                    reason: "hold"
                });
            }
            
            for (let t = 1; t <= horizon; t++) {
                const shock = sigma * randomNormal();
                const change = Math.exp(drift + shock);
                currentPathValue *= change;
                dailySlices[t].push(currentPathValue);
            }
            
            // Update exit price for median path
            if (s === Math.floor(simulations * 0.50) && trades.length > 0) {
                const lastTrade = trades[trades.length - 1];
                lastTrade.exitPrice = currentPathValue;
                lastTrade.returnPct = (currentPathValue - initialValue) / initialValue;
            }
        }
        // Strategy 2: Rule-based with ATR, 2% SL, 6% TP
        // Entry: Entry price = open of entry candle, only one trade active at a time
        // Stop Loss: 2% drop from entry price (not ATR-based)
        // Target: 6% profit from entry price (not ATR-based)
        // ATR(14) and SMA of ATR are computed for reference but not used in SL/TP calculation
        else if (options.strategy === "target_sl") {
            let inTrade = false;
            let entryPrice = 0;
            let entryDay = -1;
            const stopLossPct = 0.02; // 2% stop loss from entry price
            const targetPct = 0.06; // 6% target profit from entry price

            // ATR and SMA of ATR are computed but not used for SL/TP (as per requirements)
            // They are available for reference: atrData and smaAtrData

            for (let t = 1; t <= horizon; t++) {
                const shock = sigma * randomNormal();
                const change = Math.exp(drift + shock);
                const previousValue = currentPathValue;
                currentPathValue *= change;

                // Simulate daily price action (open, high, low, close)
                const dailyOpen = previousValue; // Open = previous day's close
                const dailyClose = currentPathValue;
                const dailyHigh = Math.max(dailyOpen, dailyClose) * (1 + Math.abs(shock) * 0.3);
                const dailyLow = Math.min(dailyOpen, dailyClose) * (1 - Math.abs(shock) * 0.3);

                if (!inTrade) {
                    // Entry: Entry price = open of entry candle
                    // Only one trade may be active at a time
                    entryPrice = dailyOpen;
                    entryDay = t;
                    inTrade = true;
                    
                    // Track trade for median path
                    if (s === Math.floor(simulations * 0.50)) {
                        trades.push({
                            entryDate: getDateForDay(t),
                            exitDate: null,
                            entryPrice: entryPrice,
                            exitPrice: null,
                            returnPct: null,
                            reason: "target" // Will be updated on exit
                        });
                    }
                }

                // Check exit conditions (only one trade active, so check both SL and TP)
                if (inTrade) {
                    const currentReturn = (dailyClose - entryPrice) / entryPrice;
                    let exitReason: "target" | "stop_loss" | null = null;
                    
                    // Stop Loss: 2% drop from entry price
                    if (currentReturn <= -stopLossPct) {
                        // Exit at stop loss - price drops 2% from entry
                        currentPathValue = entryPrice * (1 - stopLossPct);
                        inTrade = false;
                        exitReason = "stop_loss";
                    }
                    // Target: 6% profit from entry price
                    else if (currentReturn >= targetPct) {
                        // Exit at target - price reaches 6% profit from entry
                        currentPathValue = entryPrice * (1 + targetPct);
                        inTrade = false;
                        exitReason = "target";
                    }
                    
                    // Update trade for median path
                    if (exitReason && s === Math.floor(simulations * 0.50) && trades.length > 0) {
                        const lastTrade = trades[trades.length - 1];
                        lastTrade.exitDate = getDateForDay(t);
                        lastTrade.exitPrice = currentPathValue;
                        lastTrade.returnPct = currentReturn;
                        lastTrade.reason = exitReason;
                    }
                }

                dailySlices[t].push(currentPathValue);
            }
            
            // Close any open trade at end of period for median path
            if (s === Math.floor(simulations * 0.50) && inTrade && trades.length > 0) {
                const lastTrade = trades[trades.length - 1];
                lastTrade.exitDate = getDateForDay(horizon);
                lastTrade.exitPrice = currentPathValue;
                lastTrade.returnPct = (currentPathValue - entryPrice) / entryPrice;
                lastTrade.reason = "end_of_period";
            }
        }
        // Strategy 3: Momentum (MACD/RSI crossover)
        else if (options.strategy === "momentum") {
            if (!macdData || !rsiData || macdData.macdLine.length < 26) {
                // Fallback to normal if indicators not available
                for (let t = 1; t <= horizon; t++) {
                    const shock = sigma * randomNormal();
                    const change = Math.exp(drift + shock);
                    currentPathValue *= change;
                    dailySlices[t].push(currentPathValue);
                }
            } else {
                // Use historical MACD/RSI to determine momentum bias
                // Calculate average return during bullish periods (MACD > Signal AND RSI > 50)
                let bullishDays = 0;
                let totalBullishReturn = 0;
                const historicalReturns = closePrices.slice(1).map((v, i) => (v - closePrices[i]) / closePrices[i]);
                
                // Analyze historical data for momentum periods
                for (let i = 26; i < macdData.macdLine.length && i < historicalReturns.length + 1; i++) {
                    const macdBullish = macdData.macdLine[i] > macdData.signalLine[i];
                    const rsiBullish = rsiData[i] > 50;
                    
                    if (macdBullish && rsiBullish) {
                        bullishDays++;
                        if (i > 0 && i - 1 < historicalReturns.length) {
                            totalBullishReturn += historicalReturns[i - 1];
                        }
                    }
                }
                
                // Calculate momentum multiplier based on historical bullish performance
                const avgBullishReturn = bullishDays > 0 ? totalBullishReturn / bullishDays : mu;
                const momentumMultiplier = avgBullishReturn > mu ? Math.max(1.0, avgBullishReturn / (mu || 0.0001)) : 1.0;
                
                // Check if we're currently in a bullish phase (entry signal)
                const lastIdx = macdData.macdLine.length - 1;
                const currentlyBullish = macdData.macdLine[lastIdx] > macdData.signalLine[lastIdx] && rsiData[lastIdx] > 50;
                
                // Track trades for median path
                let inTrade = currentlyBullish;
                let entryPrice = initialValue;
                let entryDay = 0;
                let lastMacdBullish = currentlyBullish;
                
                if (s === Math.floor(simulations * 0.50) && currentlyBullish) {
                    trades.push({
                        entryDate: getDateForDay(0),
                        exitDate: null,
                        entryPrice: initialValue,
                        exitPrice: null,
                        returnPct: null,
                        reason: "crossover"
                    });
                }
                
                // Apply momentum-adjusted drift
                const adjustedDrift = currentlyBullish ? (drift * momentumMultiplier) : drift;
                
                for (let t = 1; t <= horizon; t++) {
                    const shock = sigma * randomNormal();
                    const change = Math.exp(adjustedDrift + shock);
                    const previousValue = currentPathValue;
                    currentPathValue *= change;
                    
                    // Simulate MACD crossover detection (simplified for forward projection)
                    // In real implementation, we'd recalculate MACD each day, but for MC we approximate
                    const priceChange = (currentPathValue - previousValue) / previousValue;
                    const simulatedMacdBullish = priceChange > 0 && lastMacdBullish; // Simplified: maintain bullish if positive momentum
                    
                    // Detect crossover: MACD crosses above signal (entry) or below (exit)
                    const macdBullishCrossover = simulatedMacdBullish && !lastMacdBullish;
                    const macdBearishCrossover = !simulatedMacdBullish && lastMacdBullish;
                    
                    // Entry on bullish crossover
                    if (!inTrade && macdBullishCrossover && s === Math.floor(simulations * 0.50)) {
                        entryPrice = currentPathValue;
                        entryDay = t;
                        inTrade = true;
                        trades.push({
                            entryDate: getDateForDay(t),
                            exitDate: null,
                            entryPrice: entryPrice,
                            exitPrice: null,
                            returnPct: null,
                            reason: "crossover"
                        });
                    }
                    
                    // Exit on bearish crossover
                    if (inTrade && macdBearishCrossover && s === Math.floor(simulations * 0.50)) {
                        const exitPrice = currentPathValue;
                        const returnPct = (exitPrice - entryPrice) / entryPrice;
                        if (trades.length > 0) {
                            const lastTrade = trades[trades.length - 1];
                            lastTrade.exitDate = getDateForDay(t);
                            lastTrade.exitPrice = exitPrice;
                            lastTrade.returnPct = returnPct;
                            lastTrade.reason = "crossover";
                        }
                        inTrade = false;
                    }
                    
                    lastMacdBullish = simulatedMacdBullish;
                    dailySlices[t].push(currentPathValue);
                }
                
                // Close any open trade at end
                if (s === Math.floor(simulations * 0.50) && inTrade && trades.length > 0) {
                    const lastTrade = trades[trades.length - 1];
                    lastTrade.exitDate = getDateForDay(horizon);
                    lastTrade.exitPrice = currentPathValue;
                    lastTrade.returnPct = (currentPathValue - entryPrice) / entryPrice;
                    lastTrade.reason = "end_of_period";
                }
            }
        }

        allEndValues.push(currentPathValue);
    }

    const percentilePaths: MonteCarloPath = { p10: [], p50: [], p90: [] };
    for (let t = 0; t <= horizon; t++) {
        const slice = dailySlices[t].sort((a, b) => a - b);
        percentilePaths.p10.push(slice[Math.floor(simulations * 0.10)]);
        percentilePaths.p50.push(slice[Math.floor(simulations * 0.50)]);
        percentilePaths.p90.push(slice[Math.floor(simulations * 0.90)]);
    }

    return {
        paths: percentilePaths,
        probProfit: allEndValues.filter(v => v > initialValue).length / simulations,
        medianEndValue: percentilePaths.p50[horizon],
        endValues: allEndValues,
        trades: trades
    };
}
