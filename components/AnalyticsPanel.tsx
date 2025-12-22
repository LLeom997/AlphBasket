
import React, { useState, useEffect } from 'react';
import { SimulationResult } from '../types';
import { TrendingUp, Activity, ArrowDownRight, ShieldAlert, Calculator } from 'lucide-react';

interface AnalyticsPanelProps {
  simulation: SimulationResult | null;
}

type SipFrequency = 'Weekly' | '15 Days' | 'Monthly';

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ simulation }) => {
  const [sipAmount, setSipAmount] = useState(5000);
  const [sipDuration, setSipDuration] = useState(5);
  const [sipFrequency, setSipFrequency] = useState<SipFrequency>('Monthly');
  const [sipResult, setSipResult] = useState<number | null>(null);

  useEffect(() => {
    if (simulation && simulation.metrics) {
        // CAGR r is annual
        const r = simulation.metrics.cagr;
        
        let periodsPerYear = 12;
        if (sipFrequency === 'Weekly') periodsPerYear = 52;
        if (sipFrequency === '15 Days') periodsPerYear = 24;

        const n = sipDuration * periodsPerYear; 
        
        // Effective periodic rate
        const periodicRate = Math.pow(1 + r, 1 / periodsPerYear) - 1;
        
        // FV = P * [ (1+i)^n - 1 ] / i * (1+i)  (Assuming investment at beginning of period)
        const fv = sipAmount * ((Math.pow(1 + periodicRate, n) - 1) / periodicRate) * (1 + periodicRate);
        setSipResult(fv);
    }
  }, [simulation, sipAmount, sipDuration, sipFrequency]);

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  if (!simulation) {
      return <div className="text-slate-500 text-center p-10">Generate a basket to see analytics</div>;
  }

  const { metrics } = simulation;

  const MetricCard = ({ label, value, icon, colorClass, bgClass, borderClass }: any) => (
    <div className={`p-4 rounded-xl flex items-start justify-between border ${bgClass} ${borderClass} shadow-sm`}>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">{label}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      </div>
      <div className={`p-2 rounded-lg bg-white shadow-sm border border-slate-100`}>
        {icon}
      </div>
    </div>
  );

  const getPeriodsPerYear = () => {
    if (sipFrequency === 'Weekly') return 52;
    if (sipFrequency === '15 Days') return 24;
    return 12;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
            label="CAGR" 
            value={`${(metrics.cagr * 100).toFixed(2)}%`} 
            colorClass="text-emerald-600"
            bgClass="bg-emerald-50"
            borderClass="border-emerald-100"
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard 
            label="Max Drawdown" 
            value={`${(metrics.maxDrawdown * 100).toFixed(2)}%`} 
            colorClass="text-red-600"
            bgClass="bg-red-50"
            borderClass="border-red-100"
            icon={<ArrowDownRight className="w-5 h-5 text-red-600" />}
        />
        <MetricCard 
            label="Sharpe Ratio" 
            value={metrics.sharpeRatio.toFixed(2)} 
            colorClass="text-cyan-600"
            bgClass="bg-cyan-50"
            borderClass="border-cyan-100"
            icon={<Activity className="w-5 h-5 text-cyan-600" />}
        />
        <MetricCard 
            label="Volatility" 
            value={`${(metrics.volatility * 100).toFixed(2)}%`} 
            colorClass="text-amber-600"
            bgClass="bg-amber-50"
            borderClass="border-amber-100"
            icon={<ShieldAlert className="w-5 h-5 text-amber-600" />}
        />
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xl">
        <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-500"/>
            SIP Projector
        </h3>
        <div className="flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 space-y-2 w-full">
                <div className="flex justify-between">
                    <label className="text-xs text-slate-500">Amount (₹)</label>
                    <select 
                        value={sipFrequency}
                        onChange={(e) => setSipFrequency(e.target.value as SipFrequency)}
                        className="bg-transparent text-xs text-indigo-600 font-bold border-none outline-none cursor-pointer text-right p-0"
                    >
                        <option value="Weekly">Weekly</option>
                        <option value="15 Days">15 Days</option>
                        <option value="Monthly">Monthly</option>
                    </select>
                </div>
                <input 
                    type="number" 
                    value={sipAmount}
                    onChange={e => setSipAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
            </div>
            <div className="flex-1 space-y-2 w-full">
                <label className="text-xs text-slate-500">Duration (Years)</label>
                <input 
                    type="range" 
                    min="1" max="30" 
                    value={sipDuration}
                    onChange={e => setSipDuration(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-400">
                    <span>1Y</span>
                    <span className="text-indigo-600 font-bold">{sipDuration} Years</span>
                    <span>30Y</span>
                </div>
            </div>
            <div className="flex-1 bg-indigo-50 p-4 rounded-lg border border-indigo-100 w-full shadow-inner">
                <p className="text-xs text-indigo-500 mb-1">Projected Value</p>
                <p className="text-2xl font-bold text-indigo-700 truncate drop-shadow-sm">
                    {sipResult ? formatINR(sipResult) : '...'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                    Invested: {formatINR(sipAmount * sipDuration * getPeriodsPerYear())}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
