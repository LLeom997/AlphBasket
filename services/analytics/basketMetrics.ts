import { Basket } from "../../types";
import { calculateBasketHistory, ensureStockHistory, getStocks } from "../market/marketData";
import { saveProject } from "../database/projectService";

/**
 * Simulates a basket and updates all metrics including 1Y, 3Y, 5Y CAGR, Sharpe ratio, etc.
 * Returns the updated basket with all metrics populated.
 */
export async function simulateAndUpdateBasket(basket: Basket, userId: string): Promise<Basket> {
    try {
        // Ensure stock history is available
        const tickers = basket.items.map(i => i.ticker);
        await ensureStockHistory(tickers);

        // Run simulation
        const result = calculateBasketHistory(basket);

        // Calculate all metrics
        const history = result.history;
        const latestPoint = history[history.length - 1];
        const prevPoint = history.length > 1 ? history[history.length - 2] : latestPoint;

        // Daily change: difference between yesterday and today
        const dailyChange = prevPoint.close > 0 ? (latestPoint.close - prevPoint.close) / prevPoint.close : 0;

        // Inception return: since basket was created
        const inceptionValue = basket.inceptionValue || latestPoint.close;
        const inceptionReturn = inceptionValue > 0 ? (latestPoint.close - inceptionValue) / inceptionValue : 0;

        // Growth score
        const growthScore = Math.min(100, Math.max(0, (result.metrics.cagr / 0.30) * 100));

        // Update basket with all metrics
        const updatedBasket: Basket = {
            ...basket,
            cagr: result.metrics.cagr,
            cagr1y: result.metrics.cagr1y || 0,
            cagr3y: result.metrics.cagr3y || 0,
            cagr5y: result.metrics.cagr5y || 0,
            volatility: result.metrics.volatility,
            maxDrawdown: result.metrics.maxDrawdown,
            sharpeRatio: result.metrics.sharpeRatio,
            growthScore: growthScore,
            irr: result.metrics.irr,
            inceptionValue: inceptionValue,
            todayReturn: dailyChange,
            inceptionReturn: inceptionReturn
        };

        // Save to database
        await saveProject(updatedBasket, userId);

        return updatedBasket;
    } catch (error: any) {
        console.error(`Error simulating basket ${basket.id}:`, error);
        // Return basket with existing metrics if simulation fails
        return basket;
    }
}

/**
 * Simulates all baskets in parallel and updates their metrics
 */
export async function simulateAllBaskets(baskets: Basket[], userId: string): Promise<Basket[]> {
    // Simulate all baskets in parallel
    const results = await Promise.allSettled(
        baskets.map(basket => simulateAndUpdateBasket(basket, userId))
    );

    // Return updated baskets (or original if simulation failed)
    return results.map((result, index) =>
        result.status === "fulfilled" ? result.value : baskets[index]
    );
}

