
import { Basket, Stock, SimulationResult, OHLC, AllocationDetail, PortfolioAllocation, MonteCarloPath, AssetForecast, ComparisonData } from "../types";

// --- Technical Indicators ---

function calculateEMA(data: number[], periods: number): number[] {
    const k = 2 / (periods + 1);
    let ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
        ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

function calculateRSI(data: number[], periods: number = 14): number[] {
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

function calculateMACD(data: number[]) {
    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = calculateEMA(macdLine, 9);
    return { macdLine, signalLine };
}

// --- Strategy Simulators ---

function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export type ForecastStrategy = 'normal' | 'target_sl' | 'momentum';

interface SimulationOptions {
    strategy: ForecastStrategy;
    sl?: number;
    tp?: number;
}

export function performMonteCarlo(
  history: OHLC[],
  initialValue: number,
  horizon: number = 252,
  simulations: number = 3000,
  options: SimulationOptions = { strategy: 'normal' }
): { paths: MonteCarloPath; probProfit: number; medianEndValue: number; endValues: number[] } {
  
  const closePrices = history.map(h => h.close);
  const returns = closePrices.slice(1).map((v, i) => (v - closePrices[i]) / closePrices[i]);
  const validReturns = returns.filter(r => r > -1);

  if (validReturns.length < 10 || initialValue <= 0) {
     return {
        paths: { p10: new Array(horizon + 1).fill(initialValue), p50: new Array(horizon + 1).fill(initialValue), p90: new Array(horizon + 1).fill(initialValue) },
        probProfit: 0, medianEndValue: initialValue, endValues: new Array(simulations).fill(initialValue)
     };
  }

  // Calculate Base Stats
  const logReturns = validReturns.map(r => Math.log(1 + r));
  const mu = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((a, b) => a + Math.pow(b - mu, 2), 0) / (logReturns.length - 1);
  const sigma = Math.sqrt(variance);
  const drift = mu - 0.5 * variance;

  // Strategy Setup
  let momentumMultiplier = 1.0;
  if (options.strategy === 'momentum') {
    const { macdLine, signalLine } = calculateMACD(closePrices);
    const rsi = calculateRSI(closePrices);
    let bullishDays = 0;
    let totalReturnsInBullish = 0;
    for (let i = 26; i < closePrices.length - 1; i++) {
        if (macdLine[i] > signalLine[i] && rsi[i] > 50) {
            bullishDays++;
            totalReturnsInBullish += returns[i];
        }
    }
    const avgBullReturn = bullishDays > 0 ? totalReturnsInBullish / bullishDays : mu;
    momentumMultiplier = avgBullReturn > mu ? avgBullReturn / (mu || 1) : 1.1; 
  }

  const dailySlices: number[][] = Array.from({ length: horizon + 1 }, () => []);
  const allEndValues: number[] = [];

  for (let s = 0; s < simulations; s++) {
    let currentPathValue = initialValue;
    let tradeEntryPoint = initialValue;
    dailySlices[0].push(currentPathValue);

    for (let t = 1; t <= horizon; t++) {
      const shock = sigma * randomNormal();
      const dailyDrift = options.strategy === 'momentum' ? (drift * momentumMultiplier) : drift;
      
      const change = Math.exp(dailyDrift + shock);
      currentPathValue *= change;

      if (options.strategy === 'target_sl') {
          const currentTradeReturn = (currentPathValue - tradeEntryPoint) / tradeEntryPoint;
          if (currentTradeReturn >= (options.tp || 0.06)) {
              currentPathValue = tradeEntryPoint * (1 + (options.tp || 0.06));
              tradeEntryPoint = currentPathValue; 
          } else if (currentTradeReturn <= (options.sl || -0.02)) {
              currentPathValue = tradeEntryPoint * (1 + (options.sl || -0.02));
              tradeEntryPoint = currentPathValue; 
          }
      }

      dailySlices[t].push(currentPathValue);
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
  const getFullData = (ticker: string, date: string) => stockMap.get(ticker)?.data.find(d => d.date === date);

  const liveDetails: AllocationDetail[] = [];
  let liveInvested = 0;
  const fixedQuantities: Record<string, number> = {};

  assets.forEach(a => {
    const dataNow = getFullData(a.ticker, endDate);
    const priceNow = dataNow?.close || 0;
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
  const years = (new Date(endDate).getTime() - new Date(commonDates[0]).getTime()) / (365.25 * 86400000);
  const cagr = years > 0.1 && startVal > 0 ? Math.pow(currentAssetVal / startVal, 1 / years) - 1 : 0;
  const vol = basketDailyReturns.length > 0 ? Math.sqrt(basketDailyReturns.reduce((a, b) => a + b * b, 0) / basketDailyReturns.length) * Math.sqrt(252) : 0;

  const forecast = performMonteCarlo(history, currentAssetVal, 252, 3000, { strategy: 'normal' });

  return {
    basketId: basket.id, history, initialAllocation: liveAllocation, liveAllocation: liveAllocation,
    metrics: {
      cagr, maxDrawdown: maxDD, totalReturn: startVal > 0 ? (currentAssetVal - startVal) / startVal : 0, 
      volatility: vol, sharpeRatio: vol > 0 ? (cagr - 0.06) / vol : 0,
      sortinoRatio: 0, calmarRatio: Math.abs(maxDD) > 0 ? cagr / Math.abs(maxDD) : 0,
      var95: 0, bestYear: 0, worstYear: 0
    },
    warnings: [], drawdownSeries, comparisonSeries,
    forecast: {
      paths: forecast.paths, probProfit: forecast.probProfit, medianEndValue: forecast.medianEndValue,
      assetForecasts: assets.map(a => ({ ticker: a.ticker, expectedReturn: 0, probProfit: 0, worstCase: 0, bestCase: 0 }))
    }
  };
}
