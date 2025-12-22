
import { Basket, Stock, SimulationResult, OHLC, AllocationDetail } from "../types";

/**
 * Pure simulation engine. 
 * Orchestrates calculations using provided basket and pre-cached stock data.
 */
export function runSimulation(
  basket: Basket,
  stockMap: Map<string, Stock>
): SimulationResult {
  const assets = basket.items.filter(i => !i.suppressed);
  if (assets.length === 0) throw new Error("SimulationEngine: No active assets.");

  // Identify common dates across all selected assets
  const dateSets = assets.map(a => new Set(stockMap.get(a.ticker)?.data.map(d => d.date) || []));
  const commonDates = Array.from(dateSets[0]).filter(date => 
    dateSets.every(set => set.has(date))
  ).sort();

  if (commonDates.length < 5) {
    throw new Error("SimulationEngine: Insufficient overlapping data for these assets.");
  }

  const initialCapital = basket.initialInvestment;
  const history: OHLC[] = [];
  const getPrice = (ticker: string, date: string) =>
    stockMap.get(ticker)?.data.find(d => d.date === date)?.close || 0;

  const startDate = commonDates[0];
  const initialShares: Record<string, number> = {};
  let currentAlloc: Record<string, number> = {};

  // Setup Initial State
  assets.forEach(a => {
    const target = initialCapital * (a.weight / 100);
    const price = getPrice(a.ticker, startDate);
    if (price > 0) {
      currentAlloc[a.ticker] = target;
      initialShares[a.ticker] = target / price;
    }
  });

  let lastRebMonth = new Date(startDate).getMonth();
  let lastRebYear = new Date(startDate).getFullYear();

  // Simulation Loop
  commonDates.forEach((date, idx) => {
    const dateObj = new Date(date);
    let totalValue = 0;

    assets.forEach(a => {
      const price = getPrice(a.ticker, date);
      const prev = getPrice(a.ticker, commonDates[Math.max(0, idx - 1)]);
      if (idx > 0 && prev > 0) {
        currentAlloc[a.ticker] *= price / prev;
      }
      totalValue += currentAlloc[a.ticker];
    });

    // Rebalancing
    if (basket.rebalanceInterval !== "none" && idx > 0) {
      const m = dateObj.getMonth();
      const y = dateObj.getFullYear();
      let reb = false;

      if (basket.rebalanceInterval === "monthly" && m !== lastRebMonth) reb = true;
      if (basket.rebalanceInterval === "quarterly" && Math.floor(m / 3) !== Math.floor(lastRebMonth / 3)) reb = true;
      if (basket.rebalanceInterval === "yearly" && y !== lastRebYear) reb = true;

      if (reb) {
        assets.forEach(a => { currentAlloc[a.ticker] = totalValue * (a.weight / 100); });
        lastRebMonth = m; lastRebYear = y;
      }
    }

    history.push({ date, open: totalValue, high: totalValue, low: totalValue, close: totalValue, volume: 0 });
  });

  // Calculate Comparison Stats
  const finalValue = history[history.length - 1].close;
  const totalReturn = (finalValue - initialCapital) / initialCapital;
  
  const years = (new Date(commonDates[commonDates.length - 1]).getTime() - new Date(startDate).getTime()) / (365.25 * 86400000);
  const cagr = years > 0 ? Math.pow(finalValue / initialCapital, 1 / years) - 1 : totalReturn;

  const dailyReturns = history.slice(1).map((h, i) => (h.close - history[i].close) / history[i].close);
  const meanRet = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const varRet = dailyReturns.reduce((a, b) => a + (b - meanRet) ** 2, 0) / dailyReturns.length;
  const annVolatility = Math.sqrt(varRet) * Math.sqrt(252);

  // Buy & Hold (No Rebalancing) History
  const buyAndHoldHistory = commonDates.map(d => ({
    date: d,
    open: assets.reduce((sum, a) => sum + initialShares[a.ticker] * getPrice(a.ticker, d), 0),
    high: 0, low: 0, close: assets.reduce((sum, a) => sum + initialShares[a.ticker] * getPrice(a.ticker, d), 0),
    volume: 0
  }));

  // Drawdown
  let peak = -Infinity;
  const drawdownSeries = history.map(h => {
    if (h.close > peak) peak = h.close;
    return { date: h.date, value: (h.close - peak) / peak };
  });

  // Allocation Details
  const latestDate = commonDates[commonDates.length - 1];
  const details: AllocationDetail[] = assets.map(a => {
    const price = getPrice(a.ticker, latestDate);
    const targetAmount = initialCapital * (a.weight / 100);
    const shares = Math.floor(targetAmount / price);
    const actual = shares * price;
    return {
      ticker: a.ticker,
      targetWeight: a.weight,
      targetAmount,
      priceAtBuy: price,
      sharesBought: shares,
      actualAmount: actual,
      actualWeight: (actual / initialCapital) * 100
    };
  });

  return {
    basketId: basket.id,
    history,
    buyAndHoldHistory,
    initialAllocation: {
      totalCapital: initialCapital,
      investedCapital: details.reduce((sum, d) => sum + d.actualAmount, 0),
      uninvestedCash: initialCapital - details.reduce((sum, d) => sum + d.actualAmount, 0),
      details
    },
    metrics: {
      cagr,
      maxDrawdown: Math.min(...drawdownSeries.map(d => d.value)),
      sharpeRatio: annVolatility > 0 ? (cagr - 0.05) / annVolatility : 0,
      totalReturn,
      volatility: annVolatility,
      bestYear: 0,
      worstYear: 0
    },
    drawdownSeries,
    comparisonSeries: assets.map((a, i) => ({
      ticker: a.ticker,
      color: `hsl(${(i * 137.5) % 360}, 70%, 50%)`,
      totalReturn: (getPrice(a.ticker, latestDate) - getPrice(a.ticker, startDate)) / getPrice(a.ticker, startDate),
      data: commonDates.map(d => ({
        date: d,
        value: (getPrice(a.ticker, d) / getPrice(a.ticker, startDate)) * initialCapital
      }))
    }))
  };
}
