
import { Basket, Stock, SimulationResult, OHLC, AllocationDetail, PortfolioAllocation, MonteCarloPath, AssetForecast, ComparisonData } from "../types";

/**
 * Standard Normal Random Generator (Box-Muller Transform)
 */
function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Monte Carlo Simulation using Geometric Brownian Motion (GBM)
 * Correctly handles log-return drift and unbiased sample variance.
 */
function performMonteCarlo(
  simpleReturns: number[],
  initialValue: number,
  horizon: number = 252,
  simulations: number = 5000
): { paths: MonteCarloPath; probProfit: number; medianEndValue: number; endValues: number[] } {
  
  // Filter zero or invalid returns that might break log calculation
  const validReturns = simpleReturns.filter(r => r > -1);

  if (validReturns.length < 5 || initialValue <= 0) {
    return {
      paths: { p10: new Array(horizon + 1).fill(initialValue), p50: new Array(horizon + 1).fill(initialValue), p90: new Array(horizon + 1).fill(initialValue) },
      probProfit: 0,
      medianEndValue: initialValue,
      endValues: new Array(simulations).fill(initialValue)
    };
  }

  // 1. Calculate Log Returns: R_log = ln(1 + simple_return)
  const logReturns = validReturns.map(r => Math.log(1 + r));
  
  // 2. Compute Mean (mu) and Unbiased Sample Variance (sigma^2)
  const n = logReturns.length;
  const mu = logReturns.reduce((a, b) => a + b, 0) / n;
  const variance = logReturns.reduce((a, b) => a + Math.pow(b - mu, 2), 0) / (n - 1);
  const sigma = Math.sqrt(variance);

  // 3. Setup GBM parameters
  // The drift term for Geometric Brownian Motion is mu - 0.5 * sigma^2
  const drift = mu - 0.5 * variance;

  const percentilePaths: { [key: number]: number[] } = { 10: [], 50: [], 90: [] };
  const dailySlices: number[][] = Array.from({ length: horizon + 1 }, () => []);
  const allEndValues: number[] = [];

  // 4. Run Simulations
  for (let s = 0; s < simulations; s++) {
    let currentPathValue = initialValue;
    dailySlices[0].push(currentPathValue);
    
    for (let t = 1; t <= horizon; t++) {
      // S(t+1) = S(t) * exp( (mu - 0.5*sigma^2) + sigma * Z )
      const shock = sigma * randomNormal();
      currentPathValue = currentPathValue * Math.exp(drift + shock);
      dailySlices[t].push(currentPathValue);
    }
    allEndValues.push(currentPathValue);
  }

  // 5. Extract Percentile Paths across the time horizon
  for (let t = 0; t <= horizon; t++) {
    const slice = dailySlices[t].sort((a, b) => a - b);
    percentilePaths[10].push(slice[Math.floor(simulations * 0.10)]);
    percentilePaths[50].push(slice[Math.floor(simulations * 0.50)]);
    percentilePaths[90].push(slice[Math.floor(simulations * 0.90)]);
  }

  // Probability of ending higher than starting point (current market value)
  const probProfit = allEndValues.filter(v => v > initialValue).length / simulations;
  const medianEndValue = percentilePaths[50][horizon];

  return {
    paths: {
      p10: percentilePaths[10],
      p50: percentilePaths[50],
      p90: percentilePaths[90]
    },
    probProfit,
    medianEndValue,
    endValues: allEndValues
  };
}

export function runSimulation(basket: Basket, stockMap: Map<string, Stock>): SimulationResult {
  const assets = basket.items.filter(i => !i.suppressed);
  if (assets.length === 0) throw new Error("No active assets.");

  const todayStr = new Date().toISOString().split('T')[0];
  const commonDates = Array.from(new Set(assets.flatMap(a => stockMap.get(a.ticker)?.data.map(d => d.date) || [])))
    .filter(date => date <= todayStr)
    .sort();

  if (commonDates.length < 20) throw new Error("Insufficient historical overlap.");

  const endDate = commonDates[commonDates.length - 1];
  const getPrice = (ticker: string, date: string) => stockMap.get(ticker)?.data.find(d => d.date === date)?.close || 0;

  // 1. CALCULATE LIVE ALLOCATION (Current Market State)
  const liveDetails: AllocationDetail[] = [];
  let liveInvested = 0;
  const fixedQuantities: Record<string, number> = {};

  assets.forEach(a => {
    const priceNow = getPrice(a.ticker, endDate);
    let qty = 0;
    
    if (basket.allocationMode === 'quantity' && a.shares !== undefined) {
      qty = a.shares;
    } else {
      const targetAmt = basket.initialInvestment * (a.weight / 100);
      qty = priceNow > 0 ? Math.floor(targetAmt / priceNow) : 0;
    }

    const actualAmt = qty * priceNow;
    liveInvested += actualAmt;
    fixedQuantities[a.ticker] = qty;
    
    liveDetails.push({
      ticker: a.ticker,
      targetWeight: a.weight,
      targetAmount: basket.initialInvestment * (a.weight / 100),
      priceAtBuy: priceNow,
      sharesBought: qty,
      actualAmount: actualAmt,
      actualWeight: (actualAmt / basket.initialInvestment) * 100
    });
  });

  const uninvestedCash = Math.max(0, basket.initialInvestment - liveInvested);
  const liveAllocation: PortfolioAllocation = {
    totalCapital: basket.initialInvestment,
    investedCapital: liveInvested,
    uninvestedCash: uninvestedCash,
    details: liveDetails
  };

  // 2. CONSTRUCT ASSET-ONLY HISTORY (Instrument Performance)
  const history: OHLC[] = [];
  const basketDailyReturns: number[] = [];
  const drawdownSeries: { date: string; value: number }[] = [];
  const comparisonSeries: ComparisonData[] = assets.map(a => ({ ticker: a.ticker, data: [], color: "", totalReturn: 0 }));

  let peak = 0;
  let maxDD = 0;

  commonDates.forEach((date, idx) => {
    let portfolioAssetValue = 0;
    assets.forEach((a, aIdx) => {
      const p = getPrice(a.ticker, date);
      portfolioAssetValue += fixedQuantities[a.ticker] * p;
      comparisonSeries[aIdx].data.push({ date, value: p });
    });

    const totalVal = portfolioAssetValue; 
    history.push({ date, open: totalVal, high: totalVal, low: totalVal, close: totalVal, volume: 0 });

    if (idx > 0) {
      const prevVal = history[idx - 1].close;
      basketDailyReturns.push(prevVal > 0 ? (totalVal - prevVal) / prevVal : 0);
    }

    if (totalVal > peak) peak = totalVal;
    const dd = peak > 0 ? (totalVal - peak) / peak : 0;
    if (dd < maxDD) maxDD = dd;
    drawdownSeries.push({ date, value: dd });
  });

  // 3. METRICS & FORECAST
  const startVal = history[0].close;
  const currentAssetVal = history[history.length - 1].close; // Terminal value of the stock portion
  
  const totalReturn = startVal > 0 ? (currentAssetVal - startVal) / startVal : 0;
  const years = (new Date(endDate).getTime() - new Date(commonDates[0]).getTime()) / (365.25 * 86400000);
  const cagr = years > 0.1 && startVal > 0 ? Math.pow(currentAssetVal / startVal, 1 / years) - 1 : totalReturn;
  const vol = basketDailyReturns.length > 0 ? Math.sqrt(basketDailyReturns.reduce((a, b) => a + b * b, 0) / basketDailyReturns.length) * Math.sqrt(252) : 0;

  // Forecast starts at the current market value of the assets (e.g. ₹92,260)
  // Uses upgraded Geometric Brownian Motion math
  const forecast = performMonteCarlo(basketDailyReturns, currentAssetVal, 252, 5000);

  return {
    basketId: basket.id,
    history,
    initialAllocation: liveAllocation,
    liveAllocation: liveAllocation,
    metrics: {
      cagr, maxDrawdown: maxDD, totalReturn, volatility: vol,
      sharpeRatio: vol > 0 ? (cagr - 0.06) / vol : 0,
      sortinoRatio: 0, calmarRatio: Math.abs(maxDD) > 0 ? cagr / Math.abs(maxDD) : 0,
      var95: 0, bestYear: 0, worstYear: 0
    },
    warnings: [],
    drawdownSeries,
    comparisonSeries,
    forecast: {
      paths: forecast.paths,
      probProfit: forecast.probProfit,
      medianEndValue: forecast.medianEndValue,
      assetForecasts: assets.map(a => ({
        ticker: a.ticker, expectedReturn: 0, probProfit: 0, worstCase: 0, bestCase: 0
      }))
    }
  };
}
