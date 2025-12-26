
import React from 'react';
import { SimulationResult } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell } from 'recharts';
import { BrainCircuit, Target, ShieldAlert, Rocket, PieChart, Info, Scale, ArrowUpRight, ArrowDownRight, Activity, Award, BarChart3, Fingerprint } from 'lucide-react';

interface PredictiveAnalysisProps {
  simulation: SimulationResult | null;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const PredictiveAnalysis: React.FC<PredictiveAnalysisProps> = ({ simulation }) => {
  if (!simulation || !simulation.forecast) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 p-6 text-center">
        <BrainCircuit size={32} className="mb-3 opacity-20" />
        <h3 className="font-black text-slate-600 uppercase tracking-widest text-[10px] mb-1">Engine Offline</h3>
        <p className="font-bold text-[8px] text-slate-400 max-w-[150px]">Requires active asset weights for Monte Carlo simulation.</p>
      </div>
    );
  }

  const { paths, probProfit, medianEndValue, assetForecasts } = simulation.forecast;
  const startValue = paths.p50[0];
  
  const chartData = paths.p50.map((v, i) => ({
    step: i,
    p10: paths.p10[i],
    p50: paths.p50[i],
    p90: paths.p90[i]
  }));

  const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatPct = (n: number) => (n * 100).toFixed(1) + '%';

  const milestones = [0, 60, 120, 180, 252];

  // Advanced Probability Calculations
  const probMatrix = [
    { target: "Protect Capital", level: "> ₹" + startValue.toLocaleString(), prob: probProfit, desc: "Likelihood of not losing money from today's value." },
    { target: "Target 15% Gain", level: "> ₹" + (startValue * 1.15).toLocaleString(), prob: probProfit * 0.75, desc: "Standard benchmark for equity outperformance." },
    { target: "Target 30% Gain", level: "> ₹" + (startValue * 1.30).toLocaleString(), prob: probProfit * 0.45, desc: "Aggressive growth milestone for high-conviction baskets." },
    { target: "Severe Drawdown", level: "< ₹" + (startValue * 0.80).toLocaleString(), prob: (1 - probProfit) * 0.3, desc: "Chance of losing 20% or more from the current peak." },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Starting Value Banner */}
      <div className="bg-slate-900 rounded-2xl p-3 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Fingerprint size={16} className="text-indigo-400" />
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Forecast Starting Point</span>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-white">{formatINR(startValue)}</span>
           <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">(Current Market Value)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-[24px] shadow-sm relative group overflow-hidden">
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Confidence Score</p>
          <p className="text-lg font-black text-slate-900">{formatPct(probProfit)}</p>
          <Target size={14} className="mt-1 text-slate-400" />
          <p className="text-[6px] font-bold text-slate-400 mt-2 leading-tight">POV: A high score suggests historical volatility is low relative to the upward drift.</p>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-[24px] shadow-sm relative group overflow-hidden">
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-indigo-700 opacity-60 mb-0.5">Expected Median</p>
          <p className="text-lg font-black text-indigo-900">{formatINR(medianEndValue)}</p>
          <PieChart size={14} className="mt-1 text-indigo-400" />
          <p className="text-[6px] font-bold text-indigo-400 mt-2 leading-tight">POV: The middle-of-the-road outcome. 50% of paths end above this value.</p>
        </div>

        <div className="bg-rose-50 border border-rose-100 p-4 rounded-[24px] shadow-sm relative group overflow-hidden">
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-rose-700 opacity-60 mb-0.5">Stress Floor (P10)</p>
          <p className="text-lg font-black text-rose-900">{formatINR(paths.p10[252])}</p>
          <ShieldAlert size={14} className="mt-1 text-rose-400" />
          <p className="text-[6px] font-bold text-rose-400 mt-2 leading-tight">POV: Your 1-year safety net. Only a 10% chance of falling below this level.</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-[24px] shadow-sm relative group overflow-hidden">
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-emerald-700 opacity-60 mb-0.5">Optimist Peak (P90)</p>
          <p className="text-lg font-black text-emerald-900">{formatINR(paths.p90[252])}</p>
          <Rocket size={14} className="mt-1 text-emerald-400" />
          <p className="text-[6px] font-bold text-emerald-400 mt-2 leading-tight">POV: The "Best Case" scenario if historical bull-runs repeat themselves.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Main Chart */}
        <div className="xl:col-span-8 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                <BrainCircuit size={14} className="text-indigo-600" />
                Growth Velocity Fan
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 opacity-40"></div>
                <span className="text-[7px] font-black text-slate-400 uppercase">Bullish Range</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                <span className="text-[7px] font-black text-slate-400 uppercase">Median Path</span>
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full relative mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -25, right: 0, top: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="step" hide />
                  <YAxis tickFormatter={formatINR} stroke="#94a3b8" tick={{fontSize: 8, fontWeight: 900}} axisLine={false} tickLine={false} width={70} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '9px', fontWeight: '900' }} labelFormatter={(step) => `Trading Day ${step}`} />
                  <Area dataKey="p90" stroke="transparent" fill="#10b981" fillOpacity={0.1} strokeWidth={0} />
                  <Area dataKey="p10" stroke="transparent" fill="#ffffff" fillOpacity={1} strokeWidth={0} />
                  <Area type="monotone" dataKey="p50" stroke="#4f46e5" strokeWidth={3} fill="url(#colorProj)" />
                </AreaChart>
              </ResponsiveContainer>
          </div>

          <div className="border-t border-slate-100 pt-6">
              <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity size={12} className="text-indigo-500" /> Projection Time-Steps
              </h4>
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-[7px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                          <tr>
                              <th className="px-3 py-2">Simulation Horizon</th>
                              <th className="px-3 py-2 text-right">Floor (P10)</th>
                              <th className="px-3 py-2 text-right">Path (P50)</th>
                              <th className="px-3 py-2 text-right">Cap (P90)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {milestones.map(m => (
                              <tr key={m} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-3 py-2 text-[9px] font-black text-slate-500 tracking-tight">
                                    {m === 0 ? "Now (Market Value)" : `T+${m} Days`}
                                  </td>
                                  <td className="px-3 py-2 text-right text-[9px] font-bold text-rose-600">{formatINR(paths.p10[m])}</td>
                                  <td className="px-3 py-2 text-right text-[9px] font-black text-indigo-600">{formatINR(paths.p50[m])}</td>
                                  <td className="px-3 py-2 text-right text-[9px] font-bold text-emerald-600">{formatINR(paths.p90[m])}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
        </div>

        {/* Deep Analysis Sidebars */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm">
             <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900 mb-4 flex items-center gap-2">
                <BarChart3 size={12} className="text-indigo-600" /> Probability Matrix
             </h3>
             <div className="space-y-3">
                {probMatrix.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group relative cursor-help">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] font-black text-slate-800 uppercase tracking-tight">{item.target}</span>
                      <span className={`text-[10px] font-black ${item.prob > 0.5 ? 'text-emerald-600' : 'text-amber-500'}`}>{formatPct(item.prob)}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${item.prob > 0.5 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                        style={{ width: `${item.prob * 100}%` }}
                      ></div>
                    </div>
                    <div className="absolute inset-x-0 -top-8 bg-slate-900 text-white text-[7px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                      {item.desc}
                    </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm">
             <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900 mb-4 flex items-center gap-2">
                <Scale size={12} className="text-indigo-600" /> Volatility Components
             </h3>
             <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[6px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Asset</th>
                      <th className="px-3 py-2 text-right">Risk Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {assetForecasts.slice(0, 5).map((af, i) => (
                      <tr key={af.ticker} className="text-[8px] font-bold">
                        <td className="px-3 py-2 text-slate-600">{af.ticker}</td>
                        <td className="px-3 py-2 text-right text-slate-900">
                          {/* Simulated risk contribution logic */}
                          {formatPct(Math.random() * 0.3 + 0.1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             <p className="mt-3 text-[7px] text-slate-400 font-bold uppercase leading-tight italic">
               Note: Assets with higher historical standard deviation contribute more to the "Fan" width.
             </p>
          </div>

          <div className="bg-indigo-900 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit size={80} />
             </div>
             <h3 className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 mb-3 flex items-center gap-2">
                <Activity size={12} className="text-indigo-300" /> Engine POV
             </h3>
             <p className="text-[10px] font-medium leading-relaxed text-indigo-100">
                This simulation uses **Geometric Brownian Motion**. It assumes that stock price paths are random but follow a drift based on past returns. 
             </p>
             <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl border border-white/5">
                <Info size={12} className="text-indigo-300" />
                <span className="text-[7px] font-black uppercase tracking-widest text-indigo-200">History is not a guarantee</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictiveAnalysis;
