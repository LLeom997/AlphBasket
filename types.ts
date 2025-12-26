
export interface OHLC {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Stock {
  ticker: string;
  name: string;
  sector: string;
  universe: 'Nifty 50' | 'Nifty Next 50' | 'Midcap';
  marketCap: number; // in Crores
  volatility: number; // Daily volatility annualized
  alpha?: number; // Excess return vs benchmark
  beta?: number; // Sensitivity vs benchmark
  data: OHLC[]; // daily data
  currentPrice?: number;
  returns: {
    oneYear: number;
    twoYear: number;
    threeYear: number;
    fiveYear: number;
  };
}

export interface BasketItem {
  ticker: string;
  weight: number; // Used if mode is 'weight'
  shares?: number; // Used if mode is 'quantity'
  suppressed?: boolean;
  originalWeight?: number;
}

export interface Basket {
  id: string;
  name: string;
  description: string;
  category?: string;
  iconUrl?: string;
  items: BasketItem[];
  allocationMode: 'weight' | 'quantity';
  rebalanceInterval: 'none' | 'monthly' | 'quarterly' | 'yearly';
  initialInvestment: number;
  createdAt: number;
}

export interface ComparisonData {
  ticker: string;
  data: { date: string; value: number }[];
  color: string;
  totalReturn: number;
}

export interface AllocationDetail {
  ticker: string;
  targetWeight: number;
  targetAmount: number;
  priceAtBuy: number;
  sharesBought: number;
  actualAmount: number;
  actualWeight: number;
}

export interface PortfolioAllocation {
  totalCapital: number;
  investedCapital: number;
  uninvestedCash: number;
  details: AllocationDetail[];
}

export interface MonteCarloPath {
  p10: number[];
  p50: number[];
  p90: number[];
}

export interface AssetForecast {
  ticker: string;
  expectedReturn: number;
  probProfit: number;
  worstCase: number;
  bestCase: number;
}

export interface SimulationResult {
  basketId: string;
  history: OHLC[];
  buyAndHoldHistory?: OHLC[];
  initialAllocation: PortfolioAllocation;
  liveAllocation: PortfolioAllocation;
  metrics: {
    cagr: number;
    maxDrawdown: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    var95: number;
    totalReturn: number;
    volatility: number;
    bestYear: number;
    worstYear: number;
  };
  warnings: string[];
  drawdownSeries: { date: string; value: number }[];
  comparisonSeries: ComparisonData[];
  forecast?: {
    paths: MonteCarloPath;
    assetForecasts: AssetForecast[];
    probProfit: number;
    medianEndValue: number;
  };
}

export interface Snapshot {
    id: string;
    basketId: string;
    snapshotDate: string;
    label: string;
    metrics: SimulationResult['metrics'];
    forecast: SimulationResult['forecast'];
    basketState: {
        items: BasketItem[];
        allocationMode: string;
        initialInvestment: number;
    };
}

export type Period = '1Y' | '3Y' | '5Y' | 'ALL';
export type AppTab = 'history' | 'predictive' | 'allocation' | 'wealth' | 'snapshots';
