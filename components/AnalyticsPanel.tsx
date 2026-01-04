
import React from 'react';
import { SimulationResult, Basket } from '../types';
import { 
  TrendingUp, ArrowDownRight, Activity, 
  Clock, ArrowRight, ShieldCheck, Zap, BarChart3
} from 'lucide-react';

interface AnalyticsPanelProps {
  simulation: SimulationResult | null;
  basket?: Basket | null;
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ simulation, basket }) => {
  if (!simulation) return null;

  const { metrics, history } = simulation;
  const latestClose = history[history.length - 1].close;
  const startDate = new Date(history[0].date);
  const endDate = new Date(history[history.length - 1].date);
  
  const formatPct = (val: number | undefined) => 
    val !== undefined ? (val * 100).toFixed(2) + '%' : '0.00%';
  
  const formatMoney = (n: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const isPositive = (val: number) => val >= 0;

  // Calculate returns for historical windows (Absolute and Annualized)
  const getWindowStats = (days: number, years: number) => {
    if (history.length <= days) return null;
    const startPrice = history[history.length - days].close;
    if (startPrice <= 0) return null;
    
    const absReturn = (latestClose - startPrice) / startPrice;
    const cagr = Math.pow(latestClose / startPrice, 1 / years) - 1;
    
    return { absReturn, cagr };
  };

  const stats1Y = getWindowStats(252, 1);
  const stats3Y = getWindowStats(756, 3);
  const stats5Y = getWindowStats(1260, 5);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Primary Scorecard */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Main Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/30">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">Synthetic Value Index</span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {formatMoney(latestClose)}
              </h2>
              <div className={`px-2 py-1 rounded-lg flex items-center gap-1.5 ${isPositive(basket?.todayReturn || 0) ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {isPositive(basket?.todayReturn || 0) ? <TrendingUp size={14} /> : <ArrowDownRight size={14} />}
                <span className="text-xs font-bold">{formatPct(basket?.todayReturn)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock size={12} />
              <span className="text-[10px] font-semibold">{startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <ArrowRight size={10} className="text-slate-300" />
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[10px] font-semibold">{endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Coherent Core Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
          <div className="p-5 flex flex-col items-center justify-center group hover:bg-slate-50 transition-colors">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Historical CAGR</span>
            <span className="text-xl font-bold text-indigo-600">{formatPct(metrics.cagr)}</span>
          </div>
          <div className="p-5 flex flex-col items-center justify-center group hover:bg-slate-50 transition-colors">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Volatility (Std)</span>
            <span className="text-xl font-bold text-slate-900">{formatPct(metrics.volatility)}</span>
          </div>
          <div className="p-5 flex flex-col items-center justify-center group hover:bg-slate-50 transition-colors">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Sharpe Ratio</span>
            <span className="text-xl font-bold text-slate-900">{metrics.sharpeRatio.toFixed(2)}</span>
          </div>
          <div className="p-5 flex flex-col items-center justify-center group hover:bg-slate-50 transition-colors">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Max Drawdown</span>
            <span className="text-xl font-bold text-rose-600">{formatPct(metrics.maxDrawdown)}</span>
          </div>
        </div>

        {/* Distinct 1Y, 3Y, 5Y Performance Tabular View */}
        <div className="bg-slate-50/50 border-t border-slate-100">
          <div className="px-6 py-3 border-b border-slate-100">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <BarChart3 size={12} className="text-indigo-500" /> Rolling Window Performance
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-100">
            {[
              { label: '1-Year Window', stats: stats1Y, showCagr: false },
              { label: '3-Year Window', stats: stats3Y, showCagr: true },
              { label: '5-Year Window', stats: stats5Y, showCagr: true }
            ].map((item, idx) => (
              <div key={idx} className="p-5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{item.label}</span>
                  {!item.stats && <span className="text-[8px] font-bold text-slate-300 uppercase">Insufficient History</span>}
                </div>
                
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-tighter">Absolute</span>
                    <span className={`text-lg font-bold ${!item.stats ? 'text-slate-100' : isPositive(item.stats.absReturn) ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {item.stats ? formatPct(item.stats.absReturn) : '--'}
                    </span>
                  </div>
                  
                  {item.showCagr && (
                    <div className="flex flex-col text-right border-l border-slate-200 pl-4">
                      <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-tighter">CAGR</span>
                      <span className={`text-base font-bold ${!item.stats ? 'text-slate-100' : 'text-indigo-600'}`}>
                        {item.stats ? formatPct(item.stats.cagr) : '--'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
