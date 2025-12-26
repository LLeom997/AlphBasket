
import React from 'react';
import { SimulationResult, Stock } from '../types';
import { PieChart, Wallet, Layers, Scale, Loader2 } from 'lucide-react';

interface AllocationDetailsProps {
  simulation: SimulationResult | null;
  stocks: Stock[];
}

const AllocationDetails: React.FC<AllocationDetailsProps> = ({ simulation, stocks }) => {
  if (!simulation || !simulation.liveAllocation) return (
      <div className="bg-white p-16 rounded-[32px] border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400 space-y-3">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
          <p className="text-[9px] font-black uppercase tracking-widest">Compiling Execution Data...</p>
      </div>
  );

  const { totalCapital, investedCapital, uninvestedCash, details } = simulation.liveAllocation;
  
  const totalShares = details.reduce((sum, d) => sum + d.sharesBought, 0);
  const totalActualWeight = (investedCapital / totalCapital) * 100;
  const totalTargetWeight = details.reduce((sum, d) => sum + d.targetWeight, 0);

  const formatMoney = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatPct = (n: number) => n.toFixed(2) + '%';

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-[24px] shadow-sm">
              <p className="text-[7px] font-black uppercase tracking-widest text-indigo-700 opacity-70 mb-0.5">Effective Invested</p>
              <p className="text-lg font-black text-indigo-900">{formatMoney(investedCapital)}</p>
              <div className="mt-1 flex items-center justify-between text-[8px] font-bold text-indigo-600">
                  <span>Unused Cash: {formatMoney(uninvestedCash)}</span>
                  <span>{formatPct(totalActualWeight)} Use</span>
              </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-[24px] shadow-sm">
              <p className="text-[7px] font-black uppercase tracking-widest text-slate-600 opacity-70 mb-0.5">Total Lot Units</p>
              <p className="text-lg font-black text-slate-900">{totalShares.toLocaleString()} SH</p>
              <Layers size={12} className="mt-1 text-slate-400" />
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-[24px] shadow-sm">
              <p className="text-[7px] font-black uppercase tracking-widest text-emerald-700 opacity-70 mb-0.5">Strategy Drift</p>
              <p className="text-lg font-black text-emerald-900">{formatPct(totalTargetWeight - totalActualWeight)}</p>
              <Scale size={12} className="mt-1 text-emerald-400" />
          </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-slate-800 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-600"/>
                Execution Plan
            </h3>
            <span className="text-[8px] text-indigo-600 font-black uppercase tracking-widest px-2 py-1 bg-white rounded-lg border border-slate-200">Live Prices</span>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[7px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-200">
                    <tr>
                        <th className="px-5 py-3">Ticker</th>
                        <th className="px-5 py-3 text-right">All-Time CAGR</th>
                        <th className="px-5 py-3 text-right">Actual Weight</th>
                        <th className="px-5 py-3 text-right">Qty</th>
                        <th className="px-5 py-3 text-right">Allocation</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {details.map((item) => {
                        const stock = stocks.find(s => s.ticker === item.ticker);
                        const allTimeCAGR = stock?.returns?.fiveYear || 0;
                        
                        return (
                            <tr key={item.ticker} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-5 py-3">
                                    <span className="font-black text-[11px] text-slate-900">{item.ticker}</span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <span className={`text-[10px] font-black ${allTimeCAGR >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {formatPct(allTimeCAGR * 100)}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <span className="text-[10px] font-black text-slate-800">{formatPct(item.actualWeight)}</span>
                                    <span className="text-[8px] text-slate-400 block font-bold">Target: {formatPct(item.targetWeight)}</span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                     <span className="text-[10px] font-black text-slate-600">{item.sharesBought} <span className="text-[8px] opacity-60">SH</span></span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                     <div className="text-[10px] font-black text-slate-900">{formatMoney(item.actualAmount)}</div>
                                     <div className="text-[8px] text-slate-400 font-bold">@ {formatMoney(item.priceAtBuy)}</div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default AllocationDetails;
