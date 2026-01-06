import { Basket, Stock, SimulationResult, OHLC, AllocationDetail, PortfolioAllocation, AssetForecast, ComparisonData } from "../../types";
import { performMonteCarlo } from "./monteCarlo";
import { getTodayDate, calculateYears, getTradingDaysForNextYear } from "../../utils/dateUtils";

/**
 * Runs a portfolio simulation for a given basket
 */
export function runSimulation(basket: Basket, stockMap: Map<string, Stock>): SimulationResult {
    const assets = basket.items.filter(i => !i.suppressed);
    if (assets.length === 0) throw new Error("No active assets.");

    const todayStr = getTodayDate();

    // Find the latest start date among all assets to ensure a valid common backtest period
    let latestStartDate = "1900-01-01";
    const assetStartDates: { ticker: string, start: string }[] = [];

    assets.forEach(a => {
        const stockData = stockMap.get(a.ticker)?.data;
        if (stockData && stockData.length > 0) {
            const start = stockData[0].date;
            assetStartDates.push({ ticker: a.ticker, start });
            if (start > latestStartDate) latestStartDate = start;
        }
    });

    const warnings: string[] = [];
    assetStartDates.forEach(as => {
        if (as.start === latestStartDate && assetStartDates.length > 1 && assetStartDates.some(other => other.start < latestStartDate)) {
            warnings.push(`Backtest period truncated to ${new Date(latestStartDate).getFullYear()} due to limited history for ${as.ticker}.`);
        }
    });

    const commonDates = Array.from(new Set(assets.flatMap(a => stockMap.get(a.ticker)?.data.map(d => d.date) || [])))
        .filter(date => date >= latestStartDate && date <= todayStr)
        .sort();

    if (commonDates.length < 20) throw new Error(`Insufficient common historical data. Simulation requires at least 20 days of overlap starting from ${latestStartDate}.`);

    const endDate = commonDates[commonDates.length - 1];
    const getFullData = (ticker: string, date: string) => stockMap.get(ticker)?.data.find(d => d.date === date);

    const liveDetails: AllocationDetail[] = [];
    let liveInvested = 0;
    const fixedQuantities: Record<string, number> = {};

    assets.forEach(a => {
        const dataNow = getFullData(a.ticker, endDate);
        const priceNow = dataNow?.close || 0;
        let qty = 0;
        if (basket.allocationMode === "quantity" && a.shares !== undefined) {
            qty = a.shares;
        } else {
            const targetAmt = basket.initialInvestment * (a.weight / 100);
            qty = priceNow > 0 ? Math.floor(targetAmt / priceNow) : 0;
        }
        const actualAmt = qty * priceNow;
        liveInvested += actualAmt;
        fixedQuantities[a.ticker] = qty;
        liveDetails.push({
            ticker: a.ticker, targetWeight: a.weight, targetAmount: basket.initialInvestment * (a.weight / 100),
            priceAtBuy: priceNow, sharesBought: qty, actualAmount: actualAmt,
            actualWeight: (actualAmt / basket.initialInvestment) * 100
        });
    });

    const liveAllocation: PortfolioAllocation = {
        totalCapital: basket.initialInvestment, investedCapital: liveInvested,
        uninvestedCash: Math.max(0, basket.initialInvestment - liveInvested), details: liveDetails
    };

    const history: OHLC[] = [];
    const basketDailyReturns: number[] = [];
    const drawdownSeries: { date: string; value: number }[] = [];
    const comparisonSeries: ComparisonData[] = assets.map(a => ({ ticker: a.ticker, data: [], color: "", totalReturn: 0 }));

    let peak = 0;
    let maxDD = 0;

    commonDates.forEach((date, idx) => {
        let portfolioAssetValue = 0;
        let openValue = 0, highValue = 0, lowValue = 0;

        assets.forEach((a, aIdx) => {
            const d = getFullData(a.ticker, date);
            if (d) {
                portfolioAssetValue += fixedQuantities[a.ticker] * d.close;
                openValue += fixedQuantities[a.ticker] * d.open;
                highValue += fixedQuantities[a.ticker] * d.high;
                lowValue += fixedQuantities[a.ticker] * d.low;
                comparisonSeries[aIdx].data.push({ date, value: fixedQuantities[a.ticker] * d.close });
            }
        });

        history.push({ date, open: openValue, high: highValue, low: lowValue, close: portfolioAssetValue, volume: 0 });

        if (idx > 0) {
            const prevVal = history[idx - 1].close;
            basketDailyReturns.push(prevVal > 0 ? (portfolioAssetValue - prevVal) / prevVal : 0);
        }

        if (portfolioAssetValue > peak) peak = portfolioAssetValue;
        const dd = peak > 0 ? (portfolioAssetValue - peak) / peak : 0;
        if (dd < maxDD) maxDD = dd;
        drawdownSeries.push({ date, value: dd });
    });

    const startVal = history[0].close;
    const currentAssetVal = history[history.length - 1].close;
    const years = calculateYears(commonDates[0], endDate);
    const cagr = years > 0.1 && startVal > 0 ? Math.pow(currentAssetVal / startVal, 1 / years) - 1 : 0;
    const vol = basketDailyReturns.length > 0 ? Math.sqrt(basketDailyReturns.reduce((a, b) => a + b * b, 0) / basketDailyReturns.length) * Math.sqrt(252) : 0;

    // Calculate 1Y, 3Y, 5Y CAGR
    const getCAGR = (days: number) => {
        if (history.length <= days) return 0;
        const startPrice = history[history.length - days].close;
        if (startPrice <= 0) return 0;
        const years = days / 252;
        return Math.pow(currentAssetVal / startPrice, 1 / years) - 1;
    };

    const cagr1y = getCAGR(252);
    const cagr3y = getCAGR(756);
    const cagr5y = getCAGR(1260);

    // Calculate Life-to-Date IRR (Point-to-Point Annualized)
    const totalReturn = startVal > 0 ? (currentAssetVal - startVal) / startVal : 0;
    const irr = years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : 0;

    const forecastHorizon = getTradingDaysForNextYear();
    const forecast = performMonteCarlo(history, currentAssetVal, forecastHorizon, 3000, { strategy: "normal" });

    return {
        basketId: basket.id, history, initialAllocation: liveAllocation, liveAllocation: liveAllocation,
        metrics: {
            cagr,
            cagr1y,
            cagr3y,
            cagr5y,
            irr,
            maxDrawdown: maxDD,
            totalReturn: totalReturn,
            volatility: vol,
            sharpeRatio: vol > 0 ? (cagr - 0.06) / vol : 0,
            sortinoRatio: 0,
            calmarRatio: Math.abs(maxDD) > 0 ? cagr / Math.abs(maxDD) : 0,
            var95: 0,
            bestYear: 0,
            worstYear: 0
        },
        warnings, drawdownSeries, comparisonSeries,
        forecast: {
            paths: forecast.paths, probProfit: forecast.probProfit, medianEndValue: forecast.medianEndValue,
            assetForecasts: assets.map(a => ({ ticker: a.ticker, expectedReturn: 0, probProfit: 0, worstCase: 0, bestCase: 0 }))
        }
    };
}

