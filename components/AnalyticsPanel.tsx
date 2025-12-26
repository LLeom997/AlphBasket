
import React from 'react';
import { SimulationResult } from '../types';
import { TrendingUp, ArrowDownRight, Gauge, Landmark, Activity, Info } from 'lucide-react';

interface AnalyticsPanelProps {
  simulation: SimulationResult | null;
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ simulation }) => {
  if (!simulation) return null;

  const { metrics, history } = simulation;
  const startDate = new Date(history[0].date);
  const endDate = new Date(history[history.length - 1].date);
  const yearsTotal = (endDate.getTime() - startDate.getTime()) / (365.25 * 86400000);

  const formatPct = (val: number | undefined) => val !== undefined ? (val * 100).toFixed(2) + '%' : 'N/A';
  const formatNum = (val: number) => val.toFixed(2);

  const kpis = [
      { label: 'BACKTEST CAGR', val: formatPct(metrics.cagr), icon: TrendingUp, bg: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-700', sub: `History: ${yearsTotal.toFixed(1)} Yrs` },
      { label: 'MAX DRAWDOWN', val: formatPct(metrics.maxDrawdown), icon: ArrowDownRight, bg: 'bg-rose-50 border-rose-100', text: 'text-rose-700', sub: 'Risk Threshold' },
      { label: 'SHARPE RATIO', val: formatNum(metrics.sharpeRatio), icon: Gauge, bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', sub: 'Risk-Adj Return' },
      { label: 'ABSOLUTE YIELD', val: formatPct(metrics.totalReturn), icon: Landmark, bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', sub: 'Net Appreciation' }
  ];

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {kpis.map((k, i) => (
              <div key={i} className={`${k.bg} border p-3 rounded-[20px] flex flex-col justify-between shadow-sm transition-transform hover:scale-[1.02]`}>
                  <div className="flex justify-between items-center mb-1">
                      <span className="text-[6px] font-black uppercase tracking-[0.2em] text-slate-400">{k.label}</span>
                      <k.icon size={12} className={k.text} />
                  </div>
                  <div>
                    <p className={`text-base font-black leading-tight ${k.text}`}>{k.val}</p>
                    <p className="text-[6px] font-bold uppercase tracking-tight text-slate-400 opacity-60">{k.sub}</p>
                  </div>
              </div>
          ))}
      </div>
      
      <div className="bg-slate-900 p-2.5 px-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
              <Activity size={12} className="text-indigo-400" />
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Backtest Timeline</span>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-[8px] font-bold text-slate-300">{startDate.toLocaleDateString()}</span>
              <div className="w-8 h-[1px] bg-slate-700"></div>
              <span className="text-[8px] font-bold text-slate-300">{endDate.toLocaleDateString()}</span>
          </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
