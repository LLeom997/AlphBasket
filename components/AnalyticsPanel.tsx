
import React, { useState, useEffect } from 'react';
import { SimulationResult } from '../types';
import { 
  TrendingUp, Activity, ArrowDownRight, ShieldAlert, 
  Calculator, Zap, Percent, BarChart3, AlertCircle,
  Scale, ShieldCheck, Gauge, Landmark
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
        
        // Formula: P * [((1 + i)^n - 1) / i] * (1 + i)
        const fv = sipAmount * ((Math.pow(1 + periodicRate, n) - 1) / periodicRate) * (1 + periodicRate);
        setSipResult(fv);
    }
  }, [simulation, sipAmount, sipDuration, sipFrequency]);

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  const formatPct = (val: number) => (val * 100).toFixed(2) + '%';
  const formatNum = (val: number) => val.toFixed(2);

  if (!simulation) return null;

  const { metrics, warnings } = simulation;

  const kpiCards = [
    {
      label: 'CAGR (Growth)',
      value: formatPct(metrics.cagr),
      icon: TrendingUp,
      color: metrics.cagr > 0.15 ? 'emerald' : (metrics.cagr > 0 ? 'indigo' : 'red'),
      desc: 'Annualized Growth Rate'
    },
    {
      label: 'Max Drawdown',
      value: formatPct(metrics.maxDrawdown),
      icon: ArrowDownRight,
      color: Math.abs(metrics.maxDrawdown) > 0.3 ? 'red' : (Math.abs(metrics.maxDrawdown) > 0.15 ? 'amber' : 'emerald'),
      desc: 'Peak to Trough Decline'
    },
    {
      label: 'Volatility',
      value: formatPct(metrics.volatility),
      icon: Activity,
      color: metrics.volatility > 0.25 ? 'amber' : 'indigo',
      desc: 'Annualized Risk (Stdev)'
    },
    {
      label: 'Sharpe Ratio',
      value: formatNum(metrics.sharpeRatio),
      icon: Scale,
      color: metrics.sharpeRatio > 1.5 ? 'emerald' : (metrics.sharpeRatio > 0.8 ? 'indigo' : 'red'),
      desc: 'Risk-Adjusted Return'
    },
    {
      label: 'Sortino Ratio',
      value: formatNum(metrics.sortinoRatio),
      icon: ShieldCheck,
      color: metrics.sortinoRatio > 2 ? 'emerald' : 'indigo',
      desc: 'Downside Risk Efficiency'
    },
    {
      label: 'Calmar Ratio',
      value: formatNum(metrics.calmarRatio),
      icon: Gauge,
      color: metrics.calmarRatio > 3 ? 'emerald' : 'indigo',
      desc: 'Return vs Drawdown'
    },
    {
      label: 'Total Return',
      value: formatPct(metrics.totalReturn),
      icon: Landmark,
      color: metrics.totalReturn > 0 ? 'indigo' : 'red',
      desc: 'Absolute Portfolio Change'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Warning Diagnostics Section */}
      {warnings && warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-tight">
                <AlertCircle size={16} /> Data Integrity Warnings
            </div>
            <ul className="space-y-1">
                {warnings.map((w, idx) => (
                    <li key={idx} className="text-[10px] text-amber-600 font-bold">• {w}</li>
                ))}
            </ul>
        </div>
      )}

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border bg-white shadow-sm border-slate-100 hover:border-${kpi.color}-200 transition-all group`}>
            <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">{kpi.label}</p>
                <div className={`p-1.5 rounded-lg bg-${kpi.color}-50 text-${kpi.color}-600`}>
                    <kpi.icon size={14} />
                </div>
            </div>
            <p className={`text-xl font-black text-${kpi.color}-600`}>{kpi.value}</p>
            <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{kpi.desc}</p>
          </div>
        ))}
      </div>

      {/* SIP PROJECTION */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Calculator size={120} className="text-indigo-600" />
        </div>
        <div className="relative z-10">
            <h3 className="text-slate-800 font-black mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
                <Calculator className="w-5 h-5 text-indigo-500"/>
                Future Value Projections (SIP)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] text-slate-400 uppercase font-black">Monthly Contribution</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3 text-slate-400 font-bold">₹</span>
                            <input 
                                type="number" 
                                value={sipAmount}
                                onChange={e => setSipAmount(Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-black focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] text-slate-400 uppercase font-black">Duration: {sipDuration} Years</label>
                        </div>
                        <input 
                            type="range" min="1" max="30" value={sipDuration} 
                            onChange={e => setSipDuration(Number(e.target.value))}
                            className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-3xl text-white shadow-2xl">
                    <p className="text-[10px] opacity-70 font-black uppercase mb-1 tracking-widest">Estimated Portfolio Value</p>
                    <p className="text-4xl font-black">
                        {sipResult ? formatINR(sipResult) : 'Calculating...'}
                    </p>
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        <p className="text-[9px] font-bold opacity-80 uppercase tracking-tighter">
                            Based on backtested {formatPct(metrics.cagr)} CAGR
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
