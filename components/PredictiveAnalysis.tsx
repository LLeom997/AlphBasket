
import React from 'react';
import { SimulationResult } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Sparkles, BrainCircuit, Target, Percent, TrendingUp, TrendingDown, ShieldAlert, Zap, Layers, BarChart3 } from 'lucide-react';

interface PredictiveAnalysisProps {
  simulation: SimulationResult | null;
}

const PredictiveAnalysis: React.FC<PredictiveAnalysisProps> = ({ simulation }) => {
  if (!simulation || !simulation.forecast) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 p-10 text-center">
        <BrainCircuit size={48} className="mb-4 opacity-20" />
        <h3 className="font-black text-slate-600 uppercase tracking-widest text-sm mb-2">Forecasting Engine Offline</h3>
        <p className="font-bold text-[10px] text-slate-400 max-w-[200px]">Ensure your basket has active asset weights and overlap in historical data to initialize the Monte Carlo simulation.</p>
      </div>
    );
  }

  const { paths, assetForecasts, probProfit, medianEndValue } = simulation.forecast;
  
  // Prepare data for the Fan Chart
  const chartData = paths.p50.map((v, i) => ({
    step: i,
    p10: paths.p10[i],
    p50: paths.p50[i],
    p90: paths.p90[i]
  }));

  const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatPct = (n: number) => (n * 100).toFixed(1) + '%';

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Simulation Banner */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-indigo-100 shadow-sm">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Zap size={24} />
          </div>
          <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Active Forecast Engine</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase">5,000 Monte Carlo iterations based on complete asset history</p>
          </div>
          <div className="ml-auto hidden sm:block">
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Confidence {formatPct(probProfit)}</span>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
              <Target size={120} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Probability of Positive Return</p>
          <p className="text-4xl font-black">{formatPct(probProfit)}</p>
          <p className="mt-4 text-[9px] font-bold opacity-60 uppercase tracking-tighter leading-tight">Chance of the basket closing 1 year from now above its current market value.</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden group">
           <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-indigo-600">
               <TrendingUp size={120} />
           </div>
           <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Median End Value (P50)</p>
              <p className="text-3xl font-black text-slate-900">{formatINR(medianEndValue)}</p>
           </div>
           <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 mt-2">
              <div className="px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                  +{formatPct((medianEndValue - simulation.liveAllocation.totalCapital) / simulation.liveAllocation.totalCapital)} Projected
              </div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden group">
           <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-red-600">
               <ShieldAlert size={120} />
           </div>
           <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Downside VaR (P10)</p>
              <p className="text-3xl font-black text-slate-900">{formatINR(paths.p10[paths.p10.length - 1])}</p>
           </div>
           <div className="flex items-center gap-2 text-[10px] font-black text-red-500 mt-2">
              <div className="px-2 py-0.5 bg-red-50 rounded-full border border-red-100 uppercase">
                  Statistical Floor (10% Likelihood)
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
                <h3 className="text-slate-900 font-black flex items-center gap-2 uppercase text-xs tracking-[0.2em]">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Portfolio Fan Chart (252-Day)
                </h3>
                <p className="text-[9px] text-slate-400 font-black uppercase mt-1">Projection of future portfolio values based on historical return distributions</p>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-indigo-600"></div>
                    <span className="text-[9px] font-black text-slate-500 uppercase">Median Projection</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-indigo-100"></div>
                    <span className="text-[9px] font-black text-slate-500 uppercase">Probability Range</span>
                </div>
            </div>
        </div>

        <div className="h-[350px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="step" hide />
                <YAxis 
                    tickFormatter={formatINR} 
                    stroke="#94a3b8" 
                    tick={{fontSize: 9, fontWeight: 900}} 
                    axisLine={false} 
                    tickLine={false} 
                    width={80}
                />
                <Tooltip 
                   contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '900', padding: '16px' }}
                   labelFormatter={(step) => `Day ${step}`}
                   formatter={(val: number, name: string) => [formatINR(val), name.toUpperCase()]}
                />
                {/* Confidence Envelope */}
                <Area dataKey="p90" stroke="transparent" fill="#e0e7ff" fillOpacity={0.4} strokeWidth={0} />
                <Area dataKey="p10" stroke="transparent" fill="#ffffff" fillOpacity={1} strokeWidth={0} />
                {/* Median Line */}
                <Area type="monotone" dataKey="p50" stroke="#4f46e5" strokeWidth={4} fill="url(#colorProj)" />
              </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div>
                  <h3 className="text-xs text-slate-900 font-black uppercase tracking-widest flex items-center gap-2">
                      <Layers size={16} className="text-indigo-600" />
                      Individual Asset Forecasting
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Expected 1-Year forward performance per asset</p>
              </div>
              <BarChart3 size={20} className="text-slate-300" />
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] border-b border-slate-100 bg-slate-50/20">
                      <tr>
                          <th className="px-6 py-5">Ticker</th>
                          <th className="px-6 py-5 text-right">Exp. Growth (1Y)</th>
                          <th className="px-6 py-5 text-right">Floor (P10)</th>
                          <th className="px-6 py-5 text-right">Cap (P90)</th>
                          <th className="px-6 py-5 text-right">Profit Prob.</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {assetForecasts.map(f => (
                          <tr key={f.ticker} className="hover:bg-slate-50/80 transition-all group">
                              <td className="px-6 py-5 font-black text-xs text-slate-900">{f.ticker}</td>
                              <td className={`px-6 py-5 text-right text-xs font-black ${f.expectedReturn >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  <div className="flex items-center justify-end gap-1">
                                      {f.expectedReturn >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                      {f.expectedReturn >= 0 ? '+' : ''}{formatPct(f.expectedReturn)}
                                  </div>
                              </td>
                              <td className="px-6 py-5 text-right text-xs font-black text-slate-400">
                                  {formatPct(f.worstCase)}
                              </td>
                              <td className="px-6 py-5 text-right text-xs font-black text-indigo-400">
                                  +{formatPct(f.bestCase)}
                              </td>
                              <td className="px-6 py-5 text-right">
                                  <div className="flex items-center justify-end gap-3">
                                      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner hidden sm:block">
                                          <div 
                                              className={`h-full transition-all duration-1000 ${f.probProfit > 0.6 ? 'bg-emerald-500' : f.probProfit > 0.4 ? 'bg-indigo-500' : 'bg-red-400'}`}
                                              style={{ width: `${f.probProfit * 100}%` }}
                                          ></div>
                                      </div>
                                      <span className={`text-[11px] font-black ${f.probProfit > 0.5 ? 'text-slate-800' : 'text-slate-400'}`}>{formatPct(f.probProfit)}</span>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-100">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
                  Notice: Monte Carlo simulations are based on historical price volatility and returns. They do not account for future market events, corporate actions, or black swan occurrences. The results represent a statistical range of outcomes, not guaranteed future pricing.
              </p>
          </div>
      </div>
    </div>
  );
};

export default PredictiveAnalysis;
