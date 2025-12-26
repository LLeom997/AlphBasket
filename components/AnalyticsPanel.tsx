
import React, { useState, useEffect } from 'react';
import { SimulationResult } from '../types';
import { 
  TrendingUp, ArrowDownRight, Calculator, Zap, 
  Gauge, Landmark, Activity
} from 'lucide-react';

interface AnalyticsPanelProps {
  simulation: SimulationResult | null;
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ simulation }) => {
  const [sipAmount, setSipAmount] = useState(10000);
  const [sipDuration, setSipDuration] = useState(10);
  const [sipFrequency, setSipFrequency] = useState('Monthly');
  const [sipResult, setSipResult] = useState<number | null>(null);

  useEffect(() => {
    if (simulation && simulation.metrics) {
        const r = simulation.metrics.cagr;
        if (r <= -1) {
            setSipResult(null);
            return;
        }
        let periodsPerYear = 12;
        if (sipFrequency === 'Weekly') periodsPerYear = 52;
        const n = sipDuration * periodsPerYear; 
        const periodicRate = Math.pow(1 + r, 1 / periodsPerYear) - 1;
        const fv = sipAmount * ((Math.pow(1 + periodicRate, n) - 1) / periodicRate) * (1 + periodicRate);
        setSipResult(fv);
    }
  }, [simulation, sipAmount, sipDuration, sipFrequency]);

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  const formatPct = (val: number | undefined) => val !== undefined ? (val * 100).toFixed(2) + '%' : 'N/A';
  const formatNum = (val: number) => val.toFixed(2);

  if (!simulation) return null;

  const { metrics, history } = simulation;
  const startDate = new Date(history[0].date);
  const endDate = new Date(history[history.length - 1].date);
  const yearsTotal = (endDate.getTime() - startDate.getTime()) / (365.25 * 86400000);

  const kpis = [
      { label: 'ALL-TIME CAGR', val: formatPct(metrics.cagr), icon: TrendingUp, bg: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-700', sub: `${yearsTotal.toFixed(1)} Yrs` },
      { label: 'MAX DRAWDOWN', val: formatPct(metrics.maxDrawdown), icon: ArrowDownRight, bg: 'bg-rose-50 border-rose-100', text: 'text-rose-700', sub: 'Peak-to-Trough' },
      { label: 'SHARPE RATIO', val: formatNum(metrics.sharpeRatio), icon: Gauge, bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', sub: 'Risk Adjusted' },
      { label: 'ABS RETURN', val: formatPct(metrics.totalReturn), icon: Landmark, bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', sub: 'Net Total' }
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 animate-in fade-in duration-500">
      <div className="xl:col-span-6 grid grid-cols-2 gap-2">
          {kpis.map((k, i) => (
              <div key={i} className={`${k.bg} border p-3 rounded-[16px] flex flex-col justify-between shadow-sm`}>
                  <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[6px] font-black uppercase tracking-[0.2em] text-slate-400">{k.label}</span>
                      <k.icon size={12} className={k.text} />
                  </div>
                  <div>
                    <p className={`text-base font-black leading-tight ${k.text}`}>{k.val}</p>
                    <p className="text-[6px] font-bold uppercase tracking-tight text-slate-400">{k.sub}</p>
                  </div>
              </div>
          ))}
      </div>

      <div className="xl:col-span-6 bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm flex flex-col justify-center">
        <h3 className="text-slate-800 font-black mb-3 flex items-center gap-1.5 uppercase text-[8px] tracking-widest shrink-0">
            <Calculator size={12} className="text-indigo-600"/>
            Wealth Projection
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center flex-1">
            <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-[6px] text-slate-400 uppercase font-black tracking-widest ml-1">Monthly SIP (₹)</label>
                    <input 
                        type="number" 
                        value={sipAmount}
                        onChange={e => setSipAmount(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-black focus:ring-2 focus:ring-indigo-500/5 outline-none transition-all"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[6px] text-slate-400 uppercase font-black tracking-widest ml-1">Time: {sipDuration} Yrs</label>
                    <input 
                        type="range" min="1" max="30" value={sipDuration} 
                        onChange={e => setSipDuration(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-[20px] text-white shadow-sm relative group overflow-hidden">
                <p className="text-[6px] opacity-50 font-black uppercase mb-0.5 tracking-widest">Ending Corpus</p>
                <p className="text-xl font-black">
                    {sipResult ? formatINR(sipResult) : '...'}
                </p>
                <p className="mt-1 text-[6px] font-black uppercase tracking-tight text-indigo-300 flex items-center gap-1">
                    <Activity size={8} /> On {formatPct(metrics.cagr)} CAGR
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
