import React, { useState, useEffect, useMemo } from 'react';
import { SimulationResult, MonteCarloPath, Trade } from '../types';
import { performMonteCarlo, ForecastStrategy } from '../services/analytics/monteCarlo';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTradingDaysForNextYear, getDateOneYearFromToday } from '../utils/dateUtils';
import {
  BrainCircuit, Target, ShieldAlert, Rocket, Info,
  Activity, Settings2, Zap,
  TrendingUp, BarChart3, Loader2,
  ShieldCheck, Gem, ArrowUpRight, ArrowDownRight, Calendar, DollarSign
} from 'lucide-react';

interface PredictiveAnalysisProps {
  simulation: SimulationResult | null;
}

const PredictiveAnalysis: React.FC<PredictiveAnalysisProps> = ({ simulation }) => {
  const [strategy, setStrategy] = useState<ForecastStrategy>('normal');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [localPaths, setLocalPaths] = useState<MonteCarloPath | null>(null);
  const [localStats, setLocalStats] = useState<{ probProfit: number; median: number } | null>(null);
  const [localTrades, setLocalTrades] = useState<Trade[]>([]);

  // Calculate trading days from today to same date next year
  const forecastHorizon = useMemo(() => getTradingDaysForNextYear(), []);
  const forecastEndDate = useMemo(() => getDateOneYearFromToday(), []);

  useEffect(() => {
    if (!simulation) return;
    setIsRecalculating(true);
    const timer = setTimeout(() => {
      const currentVal = simulation.history[simulation.history.length - 1].close;
      const result = performMonteCarlo(simulation.history, currentVal, forecastHorizon, 3000, { strategy, sl: -0.02, tp: 0.06 });
      setLocalPaths(result.paths);
      setLocalStats({ probProfit: result.probProfit, median: result.medianEndValue });
      setLocalTrades(result.trades || []);
      setIsRecalculating(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [simulation, strategy, forecastHorizon]);

  const paths = localPaths || simulation?.forecast?.paths;
  const stats = localStats || (simulation?.forecast ? { probProfit: simulation.forecast.probProfit, median: simulation.forecast.medianEndValue } : null);

  if (!simulation || !paths || !stats) return null;

  const startValue = paths.p50[0];
  const chartData = paths.p50.map((v, i) => ({ step: i, p10: paths.p10[i], p50: paths.p50[i], p90: paths.p90[i] }));
  const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatPct = (n: number) => (n * 100).toFixed(1) + '%';
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const trades = localTrades;

  const strategies = [
    { id: 'normal', label: 'Hold Strategy', icon: Activity, desc: 'Hold entirely till end of year.' },
    { id: 'target_sl', label: 'Rule Based', icon: ShieldCheck, desc: '2% SL / 6% TP with ATR.' },
    { id: 'momentum', label: 'Momentum', icon: Zap, desc: 'MACD/RSI crossover signals.' }
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 size={14} className="text-brand-teal" />
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-900">Forward Execution Models</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {strategies.map((s) => (
            <button key={s.id} onClick={() => setStrategy(s.id as ForecastStrategy)} className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${strategy === s.id ? 'bg-brand-teal border-brand-teal text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-brand-teal/30'}`}>
              <div className={`p-1.5 rounded-md ${strategy === s.id ? 'bg-white/10 text-white' : 'bg-white text-brand-teal border border-brand-teal/10 shadow-sm'}`}><s.icon size={14} /></div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${strategy === s.id ? 'text-white' : 'text-slate-900'}`}>{s.label}</p>
                <p className={`text-[8px] font-medium leading-tight mt-0.5 ${strategy === s.id ? 'text-brand-teal/20' : 'text-slate-400'}`}>{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Conviction', val: formatPct(stats.probProfit), color: 'text-brand-teal', bg: 'bg-white', icon: Target },
          { label: `Median ${forecastEndDate.split('-')[2]}/${forecastEndDate.split('-')[1]}/${forecastEndDate.split('-')[0]}`, val: formatINR(stats.median), color: 'text-brand-teal', bg: 'bg-white', icon: TrendingUp },
          { label: 'Tail Risk', val: formatINR(paths.p10[forecastHorizon]), color: 'text-brand-red', bg: 'bg-white', icon: ShieldAlert },
          { label: 'Peak Potential', val: formatINR(paths.p90[forecastHorizon]), color: 'text-brand-green', bg: 'bg-white', icon: Rocket }
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
          <h3 className="text-slate-900 font-bold text-[10px] uppercase tracking-wider flex items-center gap-2"><Gem size={14} className="text-brand-teal" /> Growth Corridor Analysis</h3>
          {isRecalculating && <Loader2 size={16} className="animate-spin text-brand-teal" />}
        </div>
        <div className="h-[300px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -25, right: 0, top: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5acec9" stopOpacity={0.15} /><stop offset="95%" stopColor="#5acec9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="step" hide /><YAxis tickFormatter={formatINR} stroke="#94a3b8" tick={{ fontSize: 8, fontWeight: 700 }} axisLine={false} tickLine={false} width={70} domain={['auto', 'auto']} />
              <Tooltip labelFormatter={(step) => {
                const today = new Date();
                const forecastDate = new Date(today);
                forecastDate.setDate(today.getDate() + Number(step));
                return forecastDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
              }} formatter={(v: any) => formatINR(v)} />
              <Area dataKey="p90" stroke="transparent" fill="#8dd67a" fillOpacity={0.06} isAnimationActive={false} />
              <Area dataKey="p10" stroke="transparent" fill="#ffffff" fillOpacity={1} isAnimationActive={false} />
              <Area type="monotone" dataKey="p50" stroke="#5acec9" strokeWidth={2} fill="url(#colorProj)" animationDuration={600} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trade Details */}
      {trades.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={14} className="text-brand-teal" />
            <h3 className="text-slate-900 font-bold text-[10px] uppercase tracking-wider">Trade Execution Details</h3>
            <span className="text-[8px] text-slate-400 font-bold uppercase bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
              {trades.length} {trades.length === 1 ? 'Trade' : 'Trades'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-[8px] font-bold text-slate-400 uppercase tracking-wider pb-3 pr-4">Entry Date</th>
                  <th className="text-[8px] font-bold text-slate-400 uppercase tracking-wider pb-3 pr-4">Exit Date</th>
                  <th className="text-[8px] font-bold text-slate-400 uppercase tracking-wider pb-3 pr-4">Entry Price</th>
                  <th className="text-[8px] font-bold text-slate-400 uppercase tracking-wider pb-3 pr-4">Exit Price</th>
                  <th className="text-[8px] font-bold text-slate-400 uppercase tracking-wider pb-3 pr-4">Return</th>
                  <th className="text-[8px] font-bold text-slate-400 uppercase tracking-wider pb-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="text-[9px] font-semibold text-slate-700 py-3 pr-4">{formatDate(trade.entryDate)}</td>
                    <td className="text-[9px] font-semibold text-slate-700 py-3 pr-4">
                      {trade.exitDate ? formatDate(trade.exitDate) : <span className="text-slate-400">Active</span>}
                    </td>
                    <td className="text-[9px] font-bold text-slate-900 py-3 pr-4">{formatINR(trade.entryPrice)}</td>
                    <td className="text-[9px] font-bold text-slate-900 py-3 pr-4">
                      {trade.exitPrice ? formatINR(trade.exitPrice) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="text-[9px] font-bold py-3 pr-4">
                      {trade.returnPct !== null ? (
                        <span className={`flex items-center gap-1 ${trade.returnPct >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                          {trade.returnPct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {formatPct(trade.returnPct)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="text-[8px] font-bold uppercase tracking-wider py-3">
                      <span className={`px-2 py-1 rounded-md ${trade.reason === 'target' ? 'bg-brand-green/10 text-brand-green' :
                        trade.reason === 'stop_loss' ? 'bg-brand-red/10 text-brand-red' :
                          trade.reason === 'crossover' ? 'bg-brand-teal/10 text-brand-teal' :
                            trade.reason === 'hold' ? 'bg-slate-50 text-slate-700' :
                              'bg-brand-orange/10 text-brand-orange'
                        }`}>
                        {trade.reason === 'target' ? 'Target' :
                          trade.reason === 'stop_loss' ? 'Stop Loss' :
                            trade.reason === 'crossover' ? 'Crossover' :
                              trade.reason === 'hold' ? 'Hold' :
                                'End Period'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictiveAnalysis;