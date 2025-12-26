
import { Basket, Stock, SimulationResult, OHLC, AllocationDetail, PortfolioAllocation, MonteCarloPath, AssetForecast, ComparisonData } from "../types";

/**
 * Standard Normal Random Generator (Box-Muller)
 */
function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Monte Carlo Simulation
 */
function performMonteCarlo(
  returns: number[],
  initialValue: number,
  horizon: number = 252,
  simulations: number = 5000
): { paths: MonteCarloPath; probProfit: number; medianEndValue: number; endValues: number[] } {

  if (returns.length < 5 || initialValue <= 0) {
    return {
      paths: { p10: [], p50: [], p90: [] },
      probProfit: 0,
      medianEndValue: initialValue,
      endValues: []
    };
  }

  const logReturns = returns.map(r => Math.log(1 + r));
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / logReturns.length;
  const stdDev = Math.sqrt(variance);

  const allEndValues: number[] = [];
  const percentilePaths: { [key: number]: number[] } = { 10: [], 50: [], 90: [] };
  const dailySlices: number[][] = Array.from({ length: horizon + 1 }, () => []);

  for (let s = 0; s < simulations; s++) {
    let current = initialValue;
    dailySlices[0].push(current);
    for (let t = 1; t <= horizon; t++) {
      const drift = mean - 0.5 * variance;
      const shock = stdDev * randomNormal();
      current = current * Math.exp(drift + shock);
      dailySlices[t].push(current);
    }
    allEndValues.push(current);
  }

  for (let t = 0; t <= horizon; t++) {
    const slice = dailySlices[t].sort((a, b) => a - b);
    percentilePaths[10].push(slice[Math.floor(simulations * 0.1)]);
    percentilePaths[50].push(slice[Math.floor(simulations * 0.5)]);
    percentilePaths[90].push(slice[Math.floor(simulations * 0.9)]);
  }

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

/**
 * RUN SIMULATION ENGINE
 */
export function runSimulation(
  basket: Basket,
  stockMap: Map<string, Stock>
): SimulationResult {
  const assets = basket.items.filter(i => !i.suppressed);
  const warnings: string[] = [];
  
  if (assets.length === 0) throw new Error("SimulationEngine: No active assets.");

  const dateSets = assets.map(a => new Set(stockMap.get(a.ticker)?.data.map(d => d.date) || []));
  const commonDates = Array.from(dateSets[0]).filter(date => 
    dateSets.every(set => set.has(date))
  ).sort();

  if (commonDates.length < 20) throw new Error("SimulationEngine: Not enough overlapping history.");

  const startDate = commonDates[0];
  const endDate = commonDates[commonDates.length - 1];
  const getPrice = (ticker: string, date: string) =>
    stockMap.get(ticker)?.data.find(d => d.date === date)?.close || 0;

  let initialCapital = basket.initialInvestment;

  // 1. HISTORICAL BACKTEST ALLOCATION (Discrete Shares at Start of Period)
  const backtestShares: Record<string, number> = {};
  let backtestInvestedTotal = 0;
  const backtestDetails: AllocationDetail[] = [];

  assets.forEach(a => {
    const startPrice = getPrice(a.ticker, startDate);
    const targetAmt = initialCapital * (a.weight / 100);
    const qty = startPrice > 0 ? Math.floor(targetAmt / startPrice) : 0;
    const actualAmt = qty * startPrice;
    backtestShares[a.ticker] = qty;
    backtestInvestedTotal += actualAmt;
    backtestDetails.push({
      ticker: a.ticker,
      targetWeight: a.weight,
      targetAmount: targetAmt,
      priceAtBuy: startPrice,
      sharesBought: qty,
      actualAmount: actualAmt,
      actualWeight: (actualAmt / initialCapital) * 100
    });
  });

  const backtestAllocation: PortfolioAllocation = {
    totalCapital: initialCapital,
    investedCapital: backtestInvestedTotal,
    uninvestedCash: Math.max(0, initialCapital - backtestInvestedTotal),
    details: backtestDetails
  };

  // 2. LIVE ALLOCATION TODAY (Using Strict Discrete Valuation)
  const liveDetails: AllocationDetail[] = [];
  let liveInvestedTotal = 0;

  assets.forEach(a => {
    const latestPrice = getPrice(a.ticker, endDate);
    let qty = 0;
    
    if (basket.allocationMode === 'quantity' && a.shares !== undefined) {
      qty = a.shares;
    } else {
      const targetAmt = initialCapital * (a.weight / 100);
      qty = latestPrice > 0 ? Math.floor(targetAmt / latestPrice) : 0;
    }

    const actualAmt = qty * latestPrice;
    liveInvestedTotal += actualAmt;
    
    liveDetails.push({
      ticker: a.ticker,
      targetWeight: a.weight,
      targetAmount: initialCapital * (a.weight / 100),
      priceAtBuy: latestPrice,
      sharesBought: qty,
      actualAmount: actualAmt,
      actualWeight: (actualAmt / initialCapital) * 100
    });
  });

  const liveAllocation: PortfolioAllocation = {
    totalCapital: initialCapital,
    investedCapital: liveInvestedTotal,
    uninvestedCash: Math.max(0, initialCapital - liveInvestedTotal),
    details: liveDetails
  };

  // 3. BACKTEST HISTORY BUILD
  const history: OHLC[] = [];
  const basketDailyReturns: number[] = [];
  const drawdownSeries: { date: string; value: number }[] = [];
  const comparisonSeries: ComparisonData[] = assets.map(a => ({
    ticker: a.ticker,
    data: [],
    color: "#000",
    totalReturn: 0
  }));

  let peakValue = 0;
  let maxDD = 0;
  const backtestCash = initialCapital - backtestInvestedTotal;

  commonDates.forEach((date, idx) => {
    let portfolioValue = 0;

    assets.forEach((a, aIdx) => {
      const p = getPrice(a.ticker, date);
      portfolioValue += (backtestShares[a.ticker] || 0) * p;
      comparisonSeries[aIdx].data.push({ date, value: p });
    });

    const totalValue = portfolioValue + backtestCash;
    history.push({
      date,
      open: totalValue,
      high: totalValue,
      low: totalValue,
      close: totalValue,
      volume: 0
    });

    if (idx > 0) {
      const prevValue = history[idx - 1].close;
      basketDailyReturns.push((totalValue - prevValue) / prevValue);
    }

    if (totalValue > peakValue) peakValue = totalValue;
    const dd = peakValue > 0 ? (totalValue - peakValue) / peakValue : 0;
    if (dd < maxDD) maxDD = dd;
    drawdownSeries.push({ date, value: dd });
  });

  // 4. METRICS
  const finalValue = history[history.length - 1].close;
  const totalReturn = (finalValue - initialCapital) / initialCapital;
  const yearsTotal = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (365.25 * 86400000);
  const cagr = yearsTotal > 0.1 ? Math.pow(finalValue / initialCapital, 1 / yearsTotal) - 1 : totalReturn;

  const volatility = Math.sqrt(
    basketDailyReturns.reduce((a, b) => a + b * b, 0) / basketDailyReturns.length
  ) * Math.sqrt(252);

  // 5. TRUE CURRENT BUCKET VALUE FOR FORECAST
  // We use the liveInvestedTotal which now correctly represents exactly qty * price
  const currentBucketValue = liveInvestedTotal;

  const basketForecast = performMonteCarlo(
    basketDailyReturns,
    currentBucketValue,
    252,
    5000
  );

  const assetForecasts: AssetForecast[] = assets.map(a => {
    const stock = stockMap.get(a.ticker);
    if (!stock)
      return { ticker: a.ticker, expectedReturn: 0, probProfit: 0, worstCase: 0, bestCase: 0 };

    const stockReturns: number[] = [];
    for (let i = 1; i < stock.data.length; i++) {
      stockReturns.push((stock.data[i].close - stock.data[i - 1].close) / stock.data[i - 1].close);
    }

    const assetMC = performMonteCarlo(stockReturns, stock.currentPrice || 100, 252, 1000);
    const currentPrice = stock.currentPrice || 1;

    return {
      ticker: a.ticker,
      expectedReturn: (assetMC.medianEndValue - currentPrice) / currentPrice,
      probProfit: assetMC.probProfit,
      worstCase: (assetMC.paths.p10[252] - currentPrice) / currentPrice,
      bestCase: (assetMC.paths.p90[252] - currentPrice) / currentPrice
    };
  });

  return {
    basketId: basket.id,
    history,
    initialAllocation: backtestAllocation,
    liveAllocation: liveAllocation,
    metrics: {
      cagr,
      maxDrawdown: maxDD,
      sharpeRatio: volatility > 0 ? (cagr - 0.06) / volatility : 0,
      sortinoRatio: 0,
      calmarRatio: Math.abs(maxDD) > 0 ? cagr / Math.abs(maxDD) : 0,
      var95: 0,
      totalReturn,
      volatility,
      bestYear: 0,
      worstYear: 0
    },
    warnings,
    drawdownSeries,
    comparisonSeries,
    forecast: {
      paths: basketForecast.paths,
      assetForecasts,
      probProfit: basketForecast.probProfit,
      medianEndValue: basketForecast.medianEndValue
    }
  };
}
