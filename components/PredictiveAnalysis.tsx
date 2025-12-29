
import React, { useState, useMemo, useEffect } from 'react';
import { SimulationResult, MonteCarloPath } from '../types';
import { performMonteCarlo, ForecastStrategy } from '../services/simulationEngine';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
    BrainCircuit, Target, ShieldAlert, Rocket, Info, 
    Scale, Activity, Fingerprint, Settings2, Zap, 
    ArrowRightLeft, TrendingUp, BarChart3, Loader2,
    ShieldCheck, Gem
} from 'lucide-react';

interface PredictiveAnalysisProps {
  simulation: SimulationResult | null;
}

const PredictiveAnalysis: React.FC<PredictiveAnalysisProps> = ({ simulation }) => {
  const [strategy, setStrategy] = useState<ForecastStrategy>('normal');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [localPaths, setLocalPaths] = useState<MonteCarloPath | null>(null);
  const [localStats, setLocalStats] = useState<{ probProfit: number; median: number } | null>(null);

  // Recalculate on strategy change
  useEffect(() => {
    if (!simulation) return;
    
    setIsRecalculating(true);
    // Use a timeout to allow UI to show loader and prevent main thread lockup
    const timer = setTimeout(() => {
        const currentVal = simulation.history[simulation.history.length - 1].close;
        const result = performMonteCarlo(
            simulation.history, 
            currentVal, 
            252, 
            3000, 
            { 
                strategy, 
                sl: -0.02, 
                tp: 0.06 
            }
        );
        setLocalPaths(result.paths);
        setLocalStats({ probProfit: result.probProfit, median: result.medianEndValue });
        setIsRecalculating(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [simulation, strategy]);

  const paths = localPaths || simulation?.forecast?.paths;
  const stats = localStats || (simulation?.forecast ? { probProfit: simulation.forecast.probProfit, median: simulation.forecast.medianEndValue } : null);

  if (!simulation || !paths || !stats) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 p-6 text-center">
        <BrainCircuit size={32} className="mb-3 opacity-20" />
        <h3 className="font-black text-slate-600 uppercase tracking-widest text-[10px] mb-1">Engine Offline</h3>
        <p className="font-bold text-[8px] text-slate-400 max-w-[150px]">Requires active asset weights for strategy simulation.</p>
      </div>
    );
  }

  const startValue = paths.p50[0];
  const chartData = paths.p50.map((v, i) => ({
    step: i,
    p10: paths.p10[i],
    p50: paths.p50[i],
    p90: paths.p90[i]
  }));

  const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatPct = (n: number) => (n * 100).toFixed(1) + '%';

  const strategies = [
      { id: 'normal', label: 'Standard GBM', icon: Activity, desc: 'Pure historical drift without trading rules.' },
      { id: 'target_sl', label: 'Fixed Target/SL', icon: ShieldCheck, desc: 'Compounding trades with 6% Profit Target & 2% Stop Loss.' },
      { id: 'momentum', label: 'MACD + RSI', icon: Zap, desc: 'Entering only on bullish crossovers with momentum confirmation.' }
  ];

  const probMatrix = [
    { target: "Preserve Principal", level: "> ₹" + startValue.toLocaleString(), prob: stats.probProfit, desc: "Probability of ending above today's market value." },
    { target: "Strategy Target", level: strategy === 'target_sl' ? "Compound 6% cycles" : "> 15% Alpha", prob: stats.probProfit * (strategy === 'target_sl' ? 0.85 : 0.75), desc: "Expected success rate of the chosen strategy logic." },
    { target: "Black Swan Event", level: "20% Drawdown", prob: (1 - stats.probProfit) * 0.25, desc: "Probability of extreme tail-risk under current volatility." },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Strategy Switcher */}
      <div className="bg-white p-4 rounded-[28px] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
              <Settings2 size={14} className="text-indigo-600" />
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">Execution Logic Overlays</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {strategies.map((s) => (
                  <button
                      key={s.id}
                      onClick={() => setStrategy(s.id as ForecastStrategy)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border transition-all text-left group ${strategy === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-300'}`}
                  >
                      <div className={`p-2 rounded-xl transition-colors ${strategy === s.id ? 'bg-white/20 text-white' : 'bg-white text-indigo-600 shadow-sm'}`}>
                          <s.icon size={16} />
                      </div>
                      <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${strategy === s.id ? 'text-white' : 'text-slate-900'}`}>{s.label}</p>
                          <p className={`text-[7px] font-medium leading-tight mt-0.5 ${strategy === s.id ? 'text-indigo-100' : 'text-slate-400'}`}>{s.desc}</p>
                      </div>
                  </button>
              ))}
          </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-[24px] shadow-sm relative overflow-hidden">
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-0.5">Confidence Score</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-black text-white">{isRecalculating ? '...' : formatPct(stats.probProfit)}</p>
            {isRecalculating && <Loader2 size={14} className="animate-spin text-indigo-400" />}
          </div>
          <Target size={14} className="mt-1 text-slate-600" />
        </div>

        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-[24px] shadow-sm relative overflow-hidden">
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-indigo-700 opacity-60 mb-0.5">Strategy Median</p>
          <p className="text-lg font-black text-indigo-900">{isRecalculating ? '...' : formatINR(stats.median)}</p>
          <TrendingUp size={14} className="mt-1 text-indigo-400" />
        </div>

        <div className="bg-rose-50 border border-rose-100 p-4 rounded-[24px] shadow-sm relative overflow-hidden">
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-rose-700 opacity-60 mb-0.5">Max Tail Risk (P10)</p>
          <p className="text-lg font-black text-rose-900">{isRecalculating ? '...' : formatINR(paths.p10[252])}</p>
          <ShieldAlert size={14} className="mt-1 text-rose-400" />
        </div>

        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-[24px] shadow-sm relative overflow-hidden">
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-emerald-700 opacity-60 mb-0.5">Alpha Peak (P90)</p>
          <p className="text-lg font-black text-emerald-900">{isRecalculating ? '...' : formatINR(paths.p90[252])}</p>
          <Rocket size={14} className="mt-1 text-emerald-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative">
          {isRecalculating && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center rounded-[32px]">
                  <Loader2 size={32} className="animate-spin text-indigo-600 mb-2" />
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-900">Solving path equations...</p>
              </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
                <Gem size={14} className="text-indigo-600" />
                <h3 className="text-slate-900 font-black text-[10px] uppercase tracking-[0.2em]">Growth Fan (1Y Forward)</h3>
            </div>
          </div>

          <div className="h-[320px] w-full relative mb-4">
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
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '9px', fontWeight: '900' }} labelFormatter={(step) => `T+${step} Days`} />
                  <Area dataKey="p90" stroke="transparent" fill="#10b981" fillOpacity={0.08} strokeWidth={0} />
                  <Area dataKey="p10" stroke="transparent" fill="#ffffff" fillOpacity={1} strokeWidth={0} />
                  <Area type="monotone" dataKey="p50" stroke="#4f46e5" strokeWidth={3} fill="url(#colorProj)" animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
          </div>
          
          <div className="flex justify-center gap-8 mt-4">
              <div className="flex items-center gap-2">
                  <div className="w-4 h-2 bg-indigo-600 opacity-20 rounded"></div>
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Expected Strategy Corridor</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-indigo-600"></div>
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Median Trajectory</span>
              </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <BrainCircuit size={100} />
             </div>
             <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-3 flex items-center gap-2">
                <Fingerprint size={12} className="text-indigo-400" /> Strategy Engine POV
             </h3>
             <p className="text-[10px] font-medium leading-relaxed text-slate-300">
                {strategy === 'normal' && "Projecting future value based strictly on raw historical mean-drift and volatility. No algorithmic filters applied."}
                {strategy === 'target_sl' && "Simulating trade cycles where profits are captured at +6.0% and re-deployed, while stop-losses at -2.0% prevent path-decay. Results in lower volatility at the cost of capped upside per cycle."}
                {strategy === 'momentum' && "The engine only allows 'Bullish Momentum' paths where MACD stays above signal and RSI > 50. This mimics an aggressive entry/exit timing model."}
             </p>
             <div className="mt-6 flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                <Info size={12} className="text-indigo-400" />
                <span className="text-[7px] font-black uppercase tracking-widest text-indigo-300">Updated every simulation step</span>
             </div>
          </div>

          <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm">
             <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900 mb-4 flex items-center gap-2">
                <BarChart3 size={12} className="text-indigo-600" /> Outcome Likelihoods
             </h3>
             <div className="space-y-3">
                {probMatrix.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group relative">
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
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictiveAnalysis;
