
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
  volatility: number; // Daily volatility
  data: OHLC[]; // 5 years of daily data
  currentPrice?: number; // Latest traded price
  returns: {
    oneYear: number;
    twoYear: number;
    fiveYear: number;
  };
}

export interface BasketItem {
  ticker: string;
  weight: number; // Percentage 0-100
  suppressed?: boolean;
  originalWeight?: number; // Store weight before suppression
}

export interface Basket {
  id: string;
  name: string;
  description: string;
  items: BasketItem[];
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

export interface SimulationResult {
  basketId: string;
  history: OHLC[];
  buyAndHoldHistory?: OHLC[]; // History if no rebalancing was applied
  initialAllocation: {
      totalCapital: number;
      investedCapital: number;
      uninvestedCash: number;
      details: AllocationDetail[];
  };
  metrics: {
    cagr: number;
    maxDrawdown: number;
    sharpeRatio: number;
    totalReturn: number;
    volatility: number;
    bestYear: number;
    worstYear: number;
  };
  drawdownSeries: { date: string; value: number }[];
  comparisonSeries: ComparisonData[];
}

export type Period = '1Y' | '3Y' | '5Y' | 'ALL';
