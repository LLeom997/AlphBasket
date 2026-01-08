
import React from 'react';
import { SimulationResult, Basket } from '../types';
import {
  TrendingUp, ArrowDownRight, Activity,
  Clock, ArrowRight, ShieldCheck, Zap, BarChart3, AlertTriangle
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
        <div className="px-4 lg:px-6 py-4 lg:py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/30">
          <div className="flex flex-col">
            <span className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">Synthetic Value Index</span>
            <div className="flex items-center gap-3">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                {formatMoney(latestClose)}
              </h2>
              <div className={`px-2 py-1 rounded-lg flex items-center gap-1.5 ${isPositive(basket?.todayReturn || 0) ? 'bg-brand-green/10 text-brand-green' : 'bg-brand-red/10 text-brand-red'}`}>
                {isPositive(basket?.todayReturn || 0) ? <TrendingUp size={12} className="lg:size-12" /> : <ArrowDownRight size={12} className="lg:size-12" />}
                <span className="text-[10px] lg:text-xs font-bold">{formatPct(basket?.todayReturn)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3 bg-white px-2.5 lg:px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5 lg:gap-2 text-slate-400">
              <Clock size={10} className="lg:size-10" />
              <span className="text-[9px] lg:text-[10px] font-semibold">{startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <ArrowRight size={10} className="text-slate-300" />
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[9px] lg:text-[10px] font-semibold">{endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Coherent Core Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
          <div className="p-4 lg:p-5 flex flex-col items-center justify-center group hover:bg-slate-50 transition-colors">
            <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 lg:mb-1.5">Hist CAGR</span>
            <span className="text-lg lg:text-xl font-bold text-brand-teal">{formatPct(metrics.cagr)}</span>
          </div>
          <div className="p-4 lg:p-5 flex flex-col items-center justify-center group hover:bg-slate-50 transition-colors border-t-0 md:border-t-0">
            <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 lg:mb-1.5">Volatility</span>
            <span className="text-lg lg:text-xl font-bold text-slate-900">{formatPct(metrics.volatility)}</span>
          </div>
          <div className="p-4 lg:p-5 flex flex-col items-center justify-center group hover:bg-slate-50 transition-colors">
            <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 lg:mb-1.5">Sharpe</span>
            <span className="text-lg lg:text-xl font-bold text-slate-900">{metrics.sharpeRatio.toFixed(2)}</span>
          </div>
          <div className="p-4 lg:p-5 flex flex-col items-center justify-center group hover:bg-slate-50 transition-colors">
            <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 lg:mb-1.5">Max DD</span>
            <span className="text-lg lg:text-xl font-bold text-brand-red">{formatPct(metrics.maxDrawdown)}</span>
          </div>
        </div>

        {/* Distinct 1Y, 3Y, 5Y Performance Tabular View */}
        <div className="bg-slate-50/50 border-t border-slate-100">
          <div className="px-6 py-3 border-b border-slate-100">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <BarChart3 size={12} className="text-brand-teal" /> Rolling Window Performance
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {[
              { label: '1-Year Window', stats: stats1Y, showCagr: false },
              { label: '3-Year Window', stats: stats3Y, showCagr: true },
              { label: '5-Year Window', stats: stats5Y, showCagr: true }
            ].map((item, idx) => (
              <div key={idx} className="p-4 lg:p-5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] lg:text-[10px] font-bold text-slate-600 uppercase tracking-wider">{item.label}</span>
                  {!item.stats && <span className="text-[7px] lg:text-[8px] font-bold text-slate-300 uppercase">Insufficient History</span>}
                </div>

                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-[7px] lg:text-[8px] font-semibold text-slate-400 uppercase tracking-tighter">Absolute</span>
                    <span className={`text-base lg:text-lg font-bold ${!item.stats ? 'text-slate-100' : isPositive(item.stats.absReturn) ? 'text-brand-green' : 'text-brand-red'}`}>
                      {item.stats ? formatPct(item.stats.absReturn) : '--'}
                    </span>
                  </div>

                  {item.showCagr && (
                    <div className="flex flex-col text-right border-l border-slate-200 pl-4">
                      <span className="text-[7px] lg:text-[8px] font-semibold text-slate-400 uppercase tracking-tighter">CAGR</span>
                      <span className={`text-sm lg:text-base font-bold ${!item.stats ? 'text-slate-100' : 'text-brand-teal'}`}>
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

      {/* Simulation Warnings */}
      {simulation.warnings && simulation.warnings.length > 0 && (
        <div className="bg-brand-orange/5 border border-brand-orange/10 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle size={18} className="text-brand-orange shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest">Data Integrity Notice</p>
            <ul className="list-disc list-inside">
              {simulation.warnings.map((w, i) => (
                <li key={i} className="text-[11px] font-medium text-brand-orange leading-relaxed">{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPanel;
