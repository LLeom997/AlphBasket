
import { Basket, Stock, SimulationResult, OHLC, AllocationDetail, MonteCarloPath, AssetForecast } from "../types";

/**
 * Enhanced simulation engine with full quantitative financial metrics.
 */
export function runSimulation(
  basket: Basket,
  stockMap: Map<string, Stock>
): SimulationResult {
  const assets = basket.items.filter(i => !i.suppressed);
  const warnings: string[] = [];
  
  if (assets.length === 0) throw new Error("SimulationEngine: No active assets.");

  // Check data maturity
  assets.forEach(a => {
    const s = stockMap.get(a.ticker);
    if (s && s.data.length < 200) {
      warnings.push(`${a.ticker}: History is less than 1 year. Annualized metrics may be unreliable.`);
    }
  });

  const dateSets = assets.map(a => new Set(stockMap.get(a.ticker)?.data.map(d => d.date) || []));
  const commonDates = Array.from(dateSets[0]).filter(date => 
    dateSets.every(set => set.has(date))
  ).sort();

  if (commonDates.length < 20) {
    throw new Error("SimulationEngine: Insufficient overlapping data for backtest.");
  }

  const startDate = commonDates[0];
  const endDate = commonDates[commonDates.length - 1];
  const getPrice = (ticker: string, date: string) =>
    stockMap.get(ticker)?.data.find(d => d.date === date)?.close || 0;

  // 1. Calculate Initial Allocation & Capital
  let initialCapital = basket.initialInvestment;
  const initialShares: Record<string, number> = {};
  
  if (basket.allocationMode === 'quantity') {
    let totalComputedCapital = 0;
    assets.forEach(a => {
      const price = getPrice(a.ticker, startDate);
      const qty = a.shares || 0;
      initialShares[a.ticker] = qty;
      totalComputedCapital += (qty * price);
    });
    initialCapital = totalComputedCapital;
  } else {
    assets.forEach(a => {
      const target = initialCapital * (a.weight / 100);
      const price = getPrice(a.ticker, startDate);
      if (price > 0) {
        const qty = Math.floor(target / price);
        initialShares[a.ticker] = qty;
      }
    });
  }

  // 2. Generate Portfolio History & Drawdowns
  const history: OHLC[] = [];
  const drawdownSeries: { date: string; value: number }[] = [];
  let peakValue = 0;
  let maxDD = 0;

  commonDates.forEach((date) => {
    let totalValue = 0;
    assets.forEach(a => {
      const price = getPrice(a.ticker, date);
      const shares = initialShares[a.ticker] || 0;
      totalValue += shares * price;
    });

    history.push({ date, open: totalValue, high: totalValue, low: totalValue, close: totalValue, volume: 0 });
    
    // Drawdown calc
    if (totalValue > peakValue) peakValue = totalValue;
    const currentDD = peakValue > 0 ? (totalValue - peakValue) / peakValue : 0;
    if (currentDD < maxDD) maxDD = currentDD;
    drawdownSeries.push({ date, value: currentDD });
  });

  // 3. Calculate Performance Metrics
  const finalValue = history[history.length - 1].close;
  const totalReturn = (finalValue - initialCapital) / initialCapital;
  const yearsTotal = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (365.25 * 86400000);
  const cagr = yearsTotal > 0.1 ? Math.pow(finalValue / initialCapital, 1 / yearsTotal) - 1 : totalReturn;

  // Daily returns for risk metrics
  const dailyReturns: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const ret = (history[i].close - history[i - 1].close) / history[i - 1].close;
    dailyReturns.push(ret);
  }

  const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / dailyReturns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252);
  
  // Downside Deviation for Sortino
  const downsideReturns = dailyReturns.filter(r => r < 0);
  const downsideVariance = downsideReturns.length > 0 
    ? downsideReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / dailyReturns.length 
    : 0;
  const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(252);

  const RISK_FREE_RATE = 0.06; // 6% Indian Risk Free Rate Proxy
  const sharpeRatio = volatility > 0 ? (cagr - RISK_FREE_RATE) / volatility : 0;
  const sortinoRatio = downsideDeviation > 0 ? (cagr - RISK_FREE_RATE) / downsideDeviation : 0;
  const calmarRatio = Math.abs(maxDD) > 0 ? cagr / Math.abs(maxDD) : 0;

  // 4. Monte Carlo Forecasting (Fixed Log-Drift GBM)
  const steps = 252;
  const sims = 500;
  const generateGBM = (initial: number, mu: number, sigma: number, steps: number) => {
    const dt = 1 / 252;
    const logMu = Math.log(1 + mu); 
    const path = [initial];
    for (let i = 0; i < steps; i++) {
      const z = normalRandom();
      const drift = (logMu - 0.5 * Math.pow(sigma, 2)) * dt;
      const diffusion = sigma * Math.sqrt(dt) * z;
      const next = path[path.length - 1] * Math.exp(drift + diffusion);
      path.push(next);
    }
    return path;
  };

  const normalRandom = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  const assetForecasts: AssetForecast[] = assets.map(a => {
    const stock = stockMap.get(a.ticker)!;
    const mu = stock.returns.oneYear;
    const sigma = stock.volatility > 0 ? stock.volatility : 0.25;
    const paths: number[] = [];
    for (let i = 0; i < sims; i++) {
      const p = generateGBM(1, mu, sigma, steps);
      paths.push(p[p.length - 1]);
    }
    paths.sort((a, b) => a - b);
    return {
      ticker: a.ticker,
      expectedReturn: paths[Math.floor(sims * 0.5)] - 1,
      probProfit: paths.filter(v => v > 1).length / sims,
      worstCase: paths[Math.floor(sims * 0.1)] - 1,
      bestCase: paths[Math.floor(sims * 0.9)] - 1
    };
  });

  const simulationResultsMatrix: number[][] = [];
  const basketEndValues: number[] = [];
  for (let s = 0; s < sims; s++) {
      let simBasketPath = new Array(steps + 1).fill(0);
      assets.forEach(a => {
          const stock = stockMap.get(a.ticker)!;
          const startVal = (initialShares[a.ticker] || 0) * getPrice(a.ticker, endDate);
          const path = generateGBM(startVal, stock.returns.oneYear, stock.volatility || 0.25, steps);
          path.forEach((val, i) => simBasketPath[i] += val);
      });
      simulationResultsMatrix.push(simBasketPath);
      basketEndValues.push(simBasketPath[steps]);
  }

  const p10: number[] = [];
  const p50: number[] = [];
  const p90: number[] = [];
  for (let t = 0; t <= steps; t++) {
      const stepValues = simulationResultsMatrix.map(sim => sim[t]).sort((a, b) => a - b);
      p10.push(stepValues[Math.floor(sims * 0.1)]);
      p50.push(stepValues[Math.floor(sims * 0.5)]);
      p90.push(stepValues[Math.floor(sims * 0.9)]);
  }

  const details: AllocationDetail[] = assets.map(a => {
    const price = getPrice(a.ticker, endDate);
    const shares = initialShares[a.ticker] || 0;
    const actual = shares * price;
    return {
      ticker: a.ticker,
      targetWeight: a.weight,
      targetAmount: initialCapital * (a.weight / 100),
      priceAtBuy: price,
      sharesBought: shares,
      actualAmount: actual,
      actualWeight: (actual / initialCapital) * 100
    };
  });

  return {
    basketId: basket.id,
    history,
    initialAllocation: {
      totalCapital: initialCapital,
      investedCapital: details.reduce((sum, d) => sum + d.actualAmount, 0),
      uninvestedCash: Math.max(0, initialCapital - details.reduce((sum, d) => sum + d.actualAmount, 0)),
      details
    },
    metrics: {
      cagr,
      maxDrawdown: maxDD, 
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      var95: 0, // Simplified for now
      totalReturn,
      volatility,
      bestYear: 0,
      worstYear: 0
    },
    warnings,
    drawdownSeries,
    comparisonSeries: [],
    forecast: {
        paths: { p10, p50, p90 },
        assetForecasts,
        probProfit: basketEndValues.filter(v => v > finalValue).length / sims,
        medianEndValue: p50[p50.length - 1]
    }
  };
}
