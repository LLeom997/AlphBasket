
import React from 'react';
import { SimulationResult, Stock } from '../types';
import { PieChart, Shield, Info, AlertCircle, CheckCircle2, Wallet, Layers, Scale, IndianRupee, Clock, Loader2 } from 'lucide-react';

interface AllocationDetailsProps {
  simulation: SimulationResult | null;
  stocks: Stock[];
}

const AllocationDetails: React.FC<AllocationDetailsProps> = ({ simulation, stocks }) => {
  if (!simulation || !simulation.liveAllocation) return (
      <div className="bg-white p-20 rounded-[40px] border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400 space-y-4">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <div className="text-center">
            <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em]">Strategy Deployment Logic</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Calculating optimal lot sizes and capital distribution...</p>
          </div>
      </div>
  );

  const { totalCapital, investedCapital, uninvestedCash, details } = simulation.liveAllocation;
  
  const totalShares = details.reduce((sum, d) => sum + d.sharesBought, 0);
  const totalActualWeight = (investedCapital / totalCapital) * 100;
  const totalTargetWeight = details.reduce((sum, d) => sum + d.targetWeight, 0);

  const formatMoney = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatPct = (n: number) => n.toFixed(2) + '%';

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 p-4 rounded-3xl">
          <Clock className="text-indigo-600" size={24} />
          <div>
              <h2 className="text-sm font-black text-indigo-900 uppercase tracking-widest leading-none">Live Deployment Audit</h2>
              <p className="text-[10px] text-indigo-500 font-bold mt-1">Calculated using the latest market price ({simulation.history[simulation.history.length-1].date})</p>
          </div>
      </div>

      {/* Summary KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Wallet size={80} />
              </div>
              <div className="flex items-center gap-2 text-indigo-500 mb-2">
                  <IndianRupee size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Effective Invested</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{formatMoney(investedCapital)}</p>
              <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>Residual: {formatMoney(uninvestedCash)}</span>
                  <span className="text-indigo-600">{formatPct(totalActualWeight)} Utilization</span>
              </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Layers size={80} />
              </div>
              <div className="flex items-center gap-2 text-indigo-500 mb-2">
                  <Layers size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Actionable Shares</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{totalShares.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 font-bold mt-2">Whole units only</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Scale size={80} />
              </div>
              <div className="flex items-center gap-2 text-indigo-500 mb-2">
                  <Scale size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Drift Analysis</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{formatPct(totalTargetWeight - totalActualWeight)}</p>
              <p className="text-[10px] text-slate-400 font-bold mt-2">Unused weightage</p>
          </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-slate-800 font-black flex items-center gap-2 uppercase text-xs tracking-widest">
                <PieChart className="w-5 h-5 text-indigo-600"/>
                Strategy Deployment Plan
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">Exact units required to match target weights at current prices</p>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[10px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">Asset Ticker</th>
                        <th className="px-6 py-4 text-right">Feasibility</th>
                        <th className="px-6 py-4 text-right">Target vs Actual %</th>
                        <th className="px-6 py-4 text-right">Qty to Buy</th>
                        <th className="px-6 py-4 text-right">Deployed Capital</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {details.map((item) => {
                        const hasConstraintIssue = item.sharesBought === 0 && item.targetWeight > 0;
                        return (
                            <tr key={item.ticker} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-xs text-slate-900">{item.ticker}</span>
                                        <span className="text-[9px] text-slate-400 font-bold">NSE Equities</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {hasConstraintIssue ? (
                                        <div className="inline-flex items-center gap-1 text-red-500 font-black text-[9px] uppercase px-2 py-1 bg-red-50 rounded-full border border-red-100">
                                            <AlertCircle size={10} /> Price Gap
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1 text-emerald-500 font-black text-[9px] uppercase px-2 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                                            <CheckCircle2 size={10} /> Executable
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="text-xs font-black text-slate-800">
                                        {formatPct(item.actualWeight)}
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-bold">Limit: {formatPct(item.targetWeight)}</div>
                                </td>
                                <td className="px-6 py-4 text-right text-xs font-black text-slate-600">
                                     {item.sharesBought.toLocaleString()} <span className="text-[9px] text-slate-400">SH</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                     <div className="text-xs font-black text-slate-900">{formatMoney(item.actualAmount)}</div>
                                     <div className="text-[9px] text-slate-400 font-bold">Current: {formatMoney(item.priceAtBuy)}</div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                    <tr>
                        <td className="px-6 py-5 text-xs uppercase tracking-widest">Plan Aggregates</td>
                        <td className="px-6 py-5"></td>
                        <td className="px-6 py-5 text-right text-xs">
                            <span className="text-indigo-600">{formatPct(totalActualWeight)}</span>
                            <span className="text-slate-300 mx-2">/</span>
                            <span className="text-slate-400">{formatPct(totalTargetWeight)}</span>
                        </td>
                        <td className="px-6 py-5 text-right text-xs">
                            {totalShares.toLocaleString()} Units
                        </td>
                        <td className="px-6 py-5 text-right text-xs text-emerald-600">
                            {formatMoney(investedCapital)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Info size={14} className="text-indigo-500" /> Capital Preservation Logic
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                        To prevent capital overflow, the engine uses whole-share floor logic based on the **Current Price**. If your designated budget for an asset (Capital × Target %) is lower than the price of a single share, that asset is skipped. Unallocated funds ({formatMoney(uninvestedCash)}) remain as a non-deployed cash reserve.
                    </p>
                </div>
                {uninvestedCash > 0 && (
                    <div className="shrink-0 bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                            <IndianRupee size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unused Budget</p>
                            <p className="text-lg font-black text-slate-900">{formatMoney(uninvestedCash)}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AllocationDetails;
