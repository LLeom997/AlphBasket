import { useState } from "react";
import { Basket, SimulationResult } from "../types";
import { calculateBasketHistory, ensureStockHistory } from "../services/market/marketData";

/**
 * Custom hook for managing simulation state and execution
 */
export function useSimulation() {
    const [simulation, setSimulation] = useState<SimulationResult | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const runSimulation = async (basket: Basket) => {
        setErrorMsg(null);
        const activeItems = basket.items.filter(i => !i.suppressed);
        if (activeItems.length === 0) {
            setSimulation(null);
            return;
        }

        setIsSimulating(true);
        setShowSuccess(false);

        try {
            const tickers = basket.items.map(i => i.ticker);
            await ensureStockHistory(tickers);
            const result = calculateBasketHistory(basket);

            await new Promise(r => setTimeout(r, 600));
            setSimulation(result);

            const growthScore = Math.min(100, Math.max(0, (result.metrics.cagr / 0.30) * 100));
            const history = result.history;
            const latestPoint = history[history.length - 1];
            const prevPoint = history.length > 1 ? history[history.length - 2] : latestPoint;

            const todayReturn = prevPoint.close > 0 ? (latestPoint.close - prevPoint.close) / prevPoint.close : 0;
            const inceptionValue = basket.inceptionValue || latestPoint.close;
            const inceptionReturn = inceptionValue > 0 ? (latestPoint.close - inceptionValue) / inceptionValue : 0;

            // Calculate daily change: simulate till yesterday vs today
            let dailyChange = todayReturn; // Default to todayReturn calculation
            if (history.length >= 2) {
                // Get yesterday's value (second to last point)
                const yesterdayValue = history[history.length - 2].close;
                const todayValue = latestPoint.close;
                dailyChange = yesterdayValue > 0 ? (todayValue - yesterdayValue) / yesterdayValue : 0;
            }

            const updatedBasket: Basket = {
                ...basket,
                cagr: result.metrics.cagr,
                cagr1y: result.metrics.cagr1y,
                cagr3y: result.metrics.cagr3y,
                cagr5y: result.metrics.cagr5y,
                irr: result.metrics.irr,
                volatility: result.metrics.volatility,
                maxDrawdown: result.metrics.maxDrawdown,
                sharpeRatio: result.metrics.sharpeRatio,
                growthScore: growthScore,
                inceptionValue: inceptionValue,
                todayReturn: dailyChange, // Store daily change
                inceptionReturn: inceptionReturn
            };

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 1500);

            return updatedBasket;
        } catch (error: any) {
            setErrorMsg(error.message || "Simulation failed.");
            setSimulation(null);
            throw error;
        } finally {
            setIsSimulating(false);
        }
    };

    return {
        simulation,
        setSimulation,
        isSimulating,
        errorMsg,
        showSuccess,
        runSimulation
    };
}

