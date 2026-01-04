import React from 'react';
import { SimulationResult, Stock } from '../types';
import { PieChart, Layers, Scale, Loader2, Sigma } from 'lucide-react';

interface AllocationDetailsProps {
  simulation: SimulationResult | null;
  stocks: Stock[];
}

const AllocationDetails: React.FC<AllocationDetailsProps> = ({ simulation, stocks }) => {
  if (!simulation || !simulation.liveAllocation) return (
      <div className="bg-white p-16 rounded-xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400 space-y-3">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
          <p className="text-[9px] font-semibold uppercase tracking-widest">Generating Execution Map...</p>
      </div>
  );

  const { totalCapital, details } = simulation.liveAllocation;
  
  const totalShares = details.reduce((sum, d) => sum + d.sharesBought, 0);
  const totalActualAmount = details.reduce((sum, d) => sum + d.actualAmount, 0);
  const totalActualWeight = details.reduce((sum, d) => sum + d.actualWeight, 0);
  const totalTargetWeight = details.reduce((sum, d) => sum + d.targetWeight, 0);

  const formatMoney = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatPct = (n: number) => n.toFixed(2) + '%';

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl shadow-sm">
              <p className="text-[8px] font-bold uppercase tracking-widest text-indigo-700 opacity-70 mb-1">Effective Deployed</p>
              <p className="text-lg font-bold text-indigo-900">{formatMoney(totalActualAmount)}</p>
              <div className="mt-1 flex items-center justify-between text-[8px] font-semibold text-indigo-600">
                  <span>Cash: {formatMoney(totalCapital - totalActualAmount)}</span>
                  <span>{formatPct(totalActualWeight)} Deployed</span>
              </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm">
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600 opacity-70 mb-1">Total Lot Size</p>
              <p className="text-lg font-bold text-slate-900">{totalShares.toLocaleString()} Units</p>
              <Layers size={12} className="mt-1 text-slate-400" />
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl shadow-sm">
              <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-700 opacity-70 mb-1">Allocation Drift</p>
              <p className="text-lg font-bold text-emerald-900">{formatPct(Math.abs(totalTargetWeight - totalActualWeight))}</p>
              <Scale size={12} className="mt-1 text-emerald-400" />
          </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-slate-800 font-bold text-[10px] uppercase tracking-wider flex items-center gap-2">
                <PieChart size={14} className="text-indigo-600"/>
                Strategy Execution Plan
            </h3>
            <span className="text-[8px] text-indigo-600 font-bold uppercase tracking-widest px-2 py-0.5 bg-white rounded border border-slate-200">Real-Time Sync</span>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[8px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                        <th className="px-5 py-3">Asset Ticker</th>
                        <th className="px-5 py-3 text-center">Growth Profile (1Y | 3Y | 5Y)</th>
                        <th className="px-5 py-3 text-right">Actual Weight</th>
                        <th className="px-5 py-3 text-right">Target Qty</th>
                        <th className="px-5 py-3 text-right">Capital Allocated</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {details.map((item) => {
                        const stock = stocks.find(s => s.ticker === item.ticker);
                        const ret1Y = stock?.returns?.oneYear || 0;
                        const ret3Y = stock?.returns?.threeYear || 0;
                        const ret5Y = stock?.returns?.fiveYear || 0;
                        
                        return (
                            <tr key={item.ticker} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-5 py-3">
                                    <span className="font-bold text-[11px] text-slate-900">{item.ticker}</span>
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="text-center px-1">
                                            <p className={`text-[10px] font-semibold ${ret1Y >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatPct(ret1Y * 100)}</p>
                                        </div>
                                        <div className="w-px h-3 bg-slate-200" />
                                        <div className="text-center px-1">
                                            <p className={`text-[10px] font-semibold ${ret3Y >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatPct(ret3Y * 100)}</p>
                                        </div>
                                        <div className="w-px h-3 bg-slate-200" />
                                        <div className="text-center px-1">
                                            <p className={`text-[10px] font-semibold ${ret5Y >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatPct(ret5Y * 100)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <span className="text-[10px] font-semibold text-slate-800">{formatPct(item.actualWeight)}</span>
                                    <span className="text-[8px] text-slate-400 block font-medium">Goal: {formatPct(item.targetWeight)}</span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                     <span className="text-[10px] font-semibold text-slate-600">{item.sharesBought} SH</span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                     <div className="text-[10px] font-bold text-slate-900">{formatMoney(item.actualAmount)}</div>
                                     <div className="text-[8px] text-slate-400 font-medium">Buy: {formatMoney(item.priceAtBuy)}</div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="bg-slate-900 text-white">
                    <tr>
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                                <Sigma size={12} className="text-indigo-400" />
                                <span className="text-[9px] font-bold uppercase tracking-wider">Total Position</span>
                            </div>
                        </td>
                        <td className="px-5 py-4 text-right"></td>
                        <td className="px-5 py-4 text-right">
                            <span className="text-[10px] font-bold">{formatPct(totalActualWeight)}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                            <span className="text-[10px] font-bold">{totalShares.toLocaleString()} Units</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                            <div className="text-xs font-bold text-indigo-300">{formatMoney(totalActualAmount)}</div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
      </div>
    </div>
  );
};

export default AllocationDetails;