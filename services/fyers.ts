// src/services/fyers.ts

// Fix: Import fetchStockHistory from its source in marketApi instead of marketData
import { fetchStockHistory } from "./marketApi"

export function getDailyHistory(
  symbol: string,
  from: string,
  to: string
) {
  return fetchStockHistory(symbol, "D", from, to)
}