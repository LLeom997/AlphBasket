import React, { useState, useEffect } from 'react';
import { SimulationResult, MonteCarloPath } from '../types';
import { performMonteCarlo, ForecastStrategy } from '../services/simulationEngine';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
    BrainCircuit, Target, ShieldAlert, Rocket, Info, 
    Activity, Settings2, Zap, 
    TrendingUp, BarChart3, Loader2,
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

  useEffect(() => {
    if (!simulation) return;
    setIsRecalculating(true);
    const timer = setTimeout(() => {
        const currentVal = simulation.history[simulation.history.length - 1].close;
        const result = performMonteCarlo(simulation.history, currentVal, 252, 3000, { strategy, sl: -0.02, tp: 0.06 });
        setLocalPaths(result.paths);
        setLocalStats({ probProfit: result.probProfit, median: result.medianEndValue });
        setIsRecalculating(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [simulation, strategy]);

  const paths = localPaths || simulation?.forecast?.paths;
  const stats = localStats || (simulation?.forecast ? { probProfit: simulation.forecast.probProfit, median: simulation.forecast.medianEndValue } : null);

  if (!simulation || !paths || !stats) return null;

  const startValue = paths.p50[0];
  const chartData = paths.p50.map((v, i) => ({ step: i, p10: paths.p10[i], p50: paths.p50[i], p90: paths.p90[i] }));
  const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatPct = (n: number) => (n * 100).toFixed(1) + '%';

  const strategies = [
      { id: 'normal', label: 'Raw GBM', icon: Activity, desc: 'Pure historical drift.' },
      { id: 'target_sl', label: 'Rule Based', icon: ShieldCheck, desc: '6% TP / 2% SL Cycles.' },
      { id: 'momentum', label: 'Momentum', icon: Zap, desc: 'Trend-following filters.' }
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
              <Settings2 size={14} className="text-indigo-600" />
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-900">Forward Execution Models</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {strategies.map((s) => (
                  <button key={s.id} onClick={() => setStrategy(s.id as ForecastStrategy)} className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${strategy === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-300'}`}>
                      <div className={`p-1.5 rounded-md ${strategy === s.id ? 'bg-white/10 text-white' : 'bg-white text-indigo-600 border border-indigo-50 shadow-sm'}`}><s.icon size={14} /></div>
                      <div>
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${strategy === s.id ? 'text-white' : 'text-slate-900'}`}>{s.label}</p>
                          <p className={`text-[8px] font-medium leading-tight mt-0.5 ${strategy === s.id ? 'text-indigo-100' : 'text-slate-400'}`}>{s.desc}</p>
                      </div>
                  </button>
              ))}
          </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
            { label: 'Conviction', val: formatPct(stats.probProfit), color: 'text-indigo-600', bg: 'bg-white', icon: Target },
            { label: 'Median T+252', val: formatINR(stats.median), color: 'text-indigo-600', bg: 'bg-white', icon: TrendingUp },
            { label: 'Tail Risk', val: formatINR(paths.p10[252]), color: 'text-rose-600', bg: 'bg-white', icon: ShieldAlert },
            { label: 'Peak Potential', val: formatINR(paths.p90[252]), color: 'text-emerald-600', bg: 'bg-white', icon: Rocket }
        ].map((m, i) => (
            <div key={i} className={`${m.bg} border border-slate-200 p-4 rounded-xl shadow-sm`}>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{m.label}</p>
                <div className="flex items-center justify-between">
                    <span className={`text-base font-bold ${m.color}`}>{isRecalculating ? '...' : m.val}</span>
                    <m.icon size={14} className="text-slate-200" />
                </div>
            </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-slate-900 font-bold text-[10px] uppercase tracking-wider flex items-center gap-2"><Gem size={14} className="text-indigo-600" /> Growth Corridor Analysis</h3>
            {isRecalculating && <Loader2 size={16} className="animate-spin text-indigo-600" />}
          </div>
          <div className="h-[300px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -25, right: 0, top: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="step" hide /><YAxis tickFormatter={formatINR} stroke="#94a3b8" tick={{fontSize: 8, fontWeight: 700}} axisLine={false} tickLine={false} width={70} domain={['auto', 'auto']} />
                  <Tooltip labelFormatter={(step) => `T+${step} Days`} formatter={(v: any) => formatINR(v)} />
                  <Area dataKey="p90" stroke="transparent" fill="#10b981" fillOpacity={0.06} isAnimationActive={false} />
                  <Area dataKey="p10" stroke="transparent" fill="#ffffff" fillOpacity={1} isAnimationActive={false} />
                  <Area type="monotone" dataKey="p50" stroke="#4f46e5" strokeWidth={2} fill="url(#colorProj)" animationDuration={600} />
                </AreaChart>
              </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};

export default PredictiveAnalysis;