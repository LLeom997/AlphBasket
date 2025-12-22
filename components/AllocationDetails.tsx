
import React from 'react';
import { SimulationResult } from '../types';
import { IndianRupee, PieChart, Info, AlertTriangle } from 'lucide-react';

interface AllocationDetailsProps {
  simulation: SimulationResult | null;
}

const AllocationDetails: React.FC<AllocationDetailsProps> = ({ simulation }) => {
  if (!simulation || !simulation.initialAllocation) return null;

  const { totalCapital, investedCapital, uninvestedCash, details } = simulation.initialAllocation;
  const formatMoney = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatPct = (n: number) => n.toFixed(2) + '%';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="text-slate-800 font-bold flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600"/>
            Realistic Allocation Breakdown
        </h3>
        <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">
           Based on start date prices
        </span>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <div className="p-4 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Capital</div>
              <div className="text-lg font-bold text-slate-800">{formatMoney(totalCapital)}</div>
          </div>
          <div className="p-4 text-center bg-emerald-50/30">
              <div className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Invested</div>
              <div className="text-lg font-bold text-emerald-700">{formatMoney(investedCapital)}</div>
          </div>
          <div className="p-4 text-center bg-amber-50/30">
              <div className="text-[10px] uppercase font-bold text-amber-600 mb-1">Uninvested Cash</div>
              <div className="text-lg font-bold text-amber-700">{formatMoney(uninvestedCash)}</div>
          </div>
      </div>

      {/* Warning if cash drag is high */}
      {uninvestedCash / totalCapital > 0.05 && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                  <span className="font-bold">High Cash Drag:</span> Due to share prices and capital constraints, {(uninvestedCash/totalCapital * 100).toFixed(1)}% of your capital is sitting in cash. Consider increasing capital or adjusting weights.
              </p>
          </div>
      )}

      {/* Details Table */}
      <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Target (₹)</th>
                      <th className="px-4 py-3 text-center">Shares</th>
                      <th className="px-4 py-3 text-right">Actual (₹)</th>
                      <th className="px-4 py-3 text-right">Error</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {details.map((item) => (
                      <tr key={item.ticker} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2 font-bold text-slate-700">{item.ticker}</td>
                          <td className="px-4 py-2 text-right font-mono text-slate-500">{formatMoney(item.priceAtBuy)}</td>
                          <td className="px-4 py-2 text-right text-slate-500">
                              <div>{formatMoney(item.targetAmount)}</div>
                              <div className="text-[9px] opacity-60">({formatPct(item.targetWeight)})</div>
                          </td>
                          <td className="px-4 py-2 text-center">
                               <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-200">
                                   {item.sharesBought}
                               </span>
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800">
                               <div>{formatMoney(item.actualAmount)}</div>
                               <div className="text-[9px] font-normal text-slate-400">({formatPct(item.actualWeight)})</div>
                          </td>
                          <td className="px-4 py-2 text-right text-slate-400">
                              {formatMoney(item.targetAmount - item.actualAmount)}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
      <div className="p-3 bg-slate-50 text-[10px] text-slate-400 border-t border-slate-200 flex gap-2">
         <Info size={14} />
         <p>Simulation buys only whole shares. "Error" represents the amount that could not be invested in that specific asset due to share price constraints.</p>
      </div>
    </div>
  );
};

export default AllocationDetails;
