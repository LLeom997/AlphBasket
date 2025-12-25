
import React from 'react';
import { SimulationResult } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, BrainCircuit, Target, Percent, TrendingUp, TrendingDown, ShieldAlert } from 'lucide-react';

interface PredictiveAnalysisProps {
  simulation: SimulationResult | null;
}

const PredictiveAnalysis: React.FC<PredictiveAnalysisProps> = ({ simulation }) => {
  if (!simulation || !simulation.forecast) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
        <BrainCircuit size={48} className="mb-4 opacity-20" />
        <p className="font-black uppercase tracking-widest text-xs">Run a valid simulation to see forecasts</p>
      </div>
    );
  }

  const { paths, assetForecasts, probProfit, medianEndValue } = simulation.forecast;
  
  // Convert paths for Recharts
  const chartData = paths.p50.map((v, i) => ({
    step: i,
    p10: paths.p10[i],
    p50: paths.p50[i],
    p90: paths.p90[i]
  }));

  const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatPct = (n: number) => (n * 100).toFixed(1) + '%';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-5 rounded-2xl text-white shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Probability of Profit</p>
          <p className="text-3xl font-black">{formatPct(probProfit)}</p>
          <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-lg p-2">
            <Target size={14} />
            <span className="text-[10px] font-bold">12-Month Monte Carlo Forecast</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
           <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Median Projection</p>
              <p className="text-2xl font-black text-slate-800">{formatINR(medianEndValue)}</p>
           </div>
           <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 mt-2">
              <TrendingUp size={12} />
              +{formatPct((medianEndValue - simulation.initialAllocation.totalCapital) / simulation.initialAllocation.totalCapital)}
           </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
           <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">90th Percentile (Max Risk)</p>
              <p className="text-2xl font-black text-slate-800">{formatINR(paths.p10[paths.p10.length - 1])}</p>
           </div>
           <div className="flex items-center gap-1 text-[10px] font-black text-red-500 mt-2">
              <ShieldAlert size={12} />
              VaR 10% Likelihood
           </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-slate-800 font-black flex items-center gap-2 uppercase text-xs tracking-widest">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Basket Fan Chart
            </h3>
            <div className="flex items-center gap-4 text-[9px] font-black uppercase">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> P50 (Median)</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-100"></div> P10 - P90 Range</span>
            </div>
        </div>
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="step" hide />
                <YAxis tickFormatter={formatINR} stroke="#94a3b8" tick={{fontSize: 9, fontWeight: 700}} axisLine={false} tickLine={false} />
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px' }}
                   labelFormatter={() => 'Projected Path'}
                   formatter={(val: number, name: string) => [formatINR(val), name.toUpperCase()]}
                />
                <Area dataKey="p90" stroke="transparent" fill="#e0e7ff" fillOpacity={0.3} connectNulls />
                <Area dataKey="p10" stroke="transparent" fill="#ffffff" fillOpacity={1} connectNulls />
                <Area type="monotone" dataKey="p50" stroke="#4f46e5" strokeWidth={3} fill="url(#colorProjection)" />
              </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Individual Asset Forecasts</h3>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                          <th className="px-4 py-3">Asset</th>
                          <th className="px-4 py-3 text-right">Expected Path</th>
                          <th className="px-4 py-3 text-right">Worst Case (10%)</th>
                          <th className="px-4 py-3 text-right">Best Case (90%)</th>
                          <th className="px-4 py-3 text-right">Profit Prob.</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {assetForecasts.map(f => (
                          <tr key={f.ticker} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-black text-xs text-slate-900">{f.ticker}</td>
                              <td className={`px-4 py-3 text-right text-xs font-black ${f.expectedReturn >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {f.expectedReturn >= 0 ? '+' : ''}{formatPct(f.expectedReturn)}
                              </td>
                              <td className="px-4 py-3 text-right text-xs font-black text-red-400">{formatPct(f.worstCase)}</td>
                              <td className="px-4 py-3 text-right text-xs font-black text-emerald-400">+{formatPct(f.bestCase)}</td>
                              <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-indigo-500" style={{ width: `${f.probProfit * 100}%` }}></div>
                                      </div>
                                      <span className="text-[10px] font-black text-slate-600">{formatPct(f.probProfit)}</span>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default PredictiveAnalysis;
