import React from 'react';
import { SimulationResult, Stock } from '../types';
import { PieChart, TrendingUp, TrendingDown, Shield, Info, Activity } from 'lucide-react';

interface AllocationDetailsProps {
  simulation: SimulationResult | null;
  stocks: Stock[];
}

const AllocationDetails: React.FC<AllocationDetailsProps> = ({ simulation, stocks }) => {
  if (!simulation || !simulation.initialAllocation) return null;

  const { totalCapital, investedCapital, uninvestedCash, details } = simulation.initialAllocation;
  const formatMoney = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatPct = (n: number) => (n * 100).toFixed(1) + '%';
  const formatWeight = (n: number) => n.toFixed(1) + '%';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
            <h3 className="text-slate-800 font-black flex items-center gap-2 uppercase text-xs tracking-widest">
                <PieChart className="w-4 h-4 text-indigo-600"/>
                Asset Intelligence
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">Individual performance and risk metrics</p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs font-black">
            <div className="flex flex-col items-end">
                <span className="text-[9px] text-slate-400 uppercase">Utilized</span>
                <span className="text-emerald-600">{formatWeight(investedCapital / totalCapital * 100)}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[9px] text-slate-400 uppercase">Cash</span>
                <span className="text-amber-600">{formatMoney(uninvestedCash)}</span>
            </div>
        </div>
      </div>
      
      <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-200">
                  <tr>
                      <th className="px-4 py-4 sticky left-0 bg-slate-50 z-10">Asset</th>
                      <th className="px-4 py-4 text-right">Weight</th>
                      <th className="px-4 py-4 text-right">1Y Perf</th>
                      <th className="px-4 py-4 text-right">Volatility</th>
                      <th className="px-4 py-4 text-right">Shares</th>
                      <th className="px-4 py-4 text-right">Allocated</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {details.map((item) => {
                      const stockInfo = stocks.find(s => s.ticker === item.ticker);
                      const isPositive = (stockInfo?.returns.oneYear || 0) >= 0;
                      
                      return (
                          <tr key={item.ticker} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 border-r border-slate-50">
                                  <div className="flex flex-col">
                                      <span className="font-black text-xs text-slate-900">{item.ticker}</span>
                                      <span className="text-[9px] text-slate-400 font-bold truncate max-w-[80px]">
                                          {stockInfo?.sector || 'Equity'}
                                      </span>
                                  </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                  <div className="text-xs font-black text-slate-700">{formatWeight(item.actualWeight)}</div>
                                  <div className="text-[9px] text-slate-400 font-bold">Target {formatWeight(item.targetWeight)}</div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                  <div className={`text-xs font-black flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                      {formatPct(stockInfo?.returns.oneYear || 0)}
                                  </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                  <div className="text-xs font-black text-slate-700 flex items-center justify-end gap-1">
                                      <Shield size={10} className="text-amber-500" />
                                      {stockInfo?.volatility ? formatPct(stockInfo.volatility * Math.sqrt(252)) : 'N/A'}
                                  </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                   <span className="text-xs font-black text-slate-600">
                                       {item.sharesBought}
                                   </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                   <div className="text-xs font-black text-slate-900">{formatMoney(item.actualAmount)}</div>
                                   <div className="text-[9px] text-slate-400 font-bold">@ {formatMoney(item.priceAtBuy)}</div>
                              </td>
                          </tr>
                      );
                  })}
              </tbody>
          </table>
      </div>
      
      <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex items-start gap-3">
          <Info size={14} className="text-indigo-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              KPIs derived from trailing 252-day market data. "Volatility" represents annualized standard deviation. 
              Simulation accounts for whole-share purchasing constraints.
          </p>
      </div>
    </div>
  );
};

export default AllocationDetails;
