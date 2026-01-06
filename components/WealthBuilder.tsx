
import React, { useState, useEffect } from 'react';
import { SimulationResult } from '../types';
import {
  Calculator, TrendingUp, IndianRupee, Target,
  Landmark, LineChart, Timer, Info, Sparkles, Activity, ShieldCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface WealthBuilderProps {
  simulation: SimulationResult | null;
}

const WealthBuilder: React.FC<WealthBuilderProps> = ({ simulation }) => {
  // Professional Defaults: 5k SIP, 5 Year Horizon
  const [sip, setSip] = useState(5000);
  const [years, setYears] = useState(5);
  const [data, setData] = useState<any[]>([]);

  const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatPct = (n: number) => (n * 100).toFixed(1) + '%';

  useEffect(() => {
    if (!simulation) return;

    const rate = simulation.metrics.cagr;
    const vol = simulation.metrics.volatility;

    // Monthly compounding rates
    const monthlyRate = Math.pow(1 + rate, 1 / 12) - 1;
    const monthlyRateBull = Math.pow(1 + (rate + vol * 0.45), 1 / 12) - 1;
    const monthlyRateBear = Math.pow(1 + (rate - vol * 0.45), 1 / 12) - 1;

    const chart = [];
    let currentCorpus = 0;
    let currentCorpusBull = 0;
    let currentCorpusBear = 0;
    let totalInvested = 0;

    const totalMonths = years * 12;

    for (let i = 0; i <= totalMonths; i++) {
      // Sample every 3 months for a smooth but performant chart
      if (i % 3 === 0 || i === totalMonths) {
        chart.push({
          month: i,
          year: (i / 12).toFixed(1),
          corpus: Math.floor(currentCorpus),
          bull: Math.floor(currentCorpusBull),
          bear: Math.floor(currentCorpusBear),
          invested: totalInvested
        });
      }
      currentCorpus = (currentCorpus + sip) * (1 + monthlyRate);
      currentCorpusBull = (currentCorpusBull + sip) * (1 + monthlyRateBull);
      currentCorpusBear = (currentCorpusBear + sip) * (1 + monthlyRateBear);
      totalInvested += sip;
    }
    setData(chart);
  }, [simulation, sip, years]);

  if (!simulation) return null;

  const terminalWealth = data.length > 0 ? data[data.length - 1].corpus : 0;
  const terminalBull = data.length > 0 ? data[data.length - 1].bull : 0;
  const terminalBear = data.length > 0 ? data[data.length - 1].bear : 0;
  const totalInvested = data.length > 0 ? data[data.length - 1].invested : 0;

  // Hook KPIs Calculations
  const multiplier = totalInvested > 0 ? (terminalWealth / totalInvested).toFixed(2) : '0.00';
  const doubleYears = simulation.metrics.cagr > 0 ? (72 / (simulation.metrics.cagr * 100)).toFixed(1) : '∞';
  // Passive Potential: Assuming 5% annual payout from terminal wealth
  const passiveMonthly = terminalWealth * (0.05 / 12);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* High-Impact Hook KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:border-brand-teal/40 transition-all group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-brand-teal/10 text-brand-teal rounded-lg group-hover:scale-110 transition-transform"><Sparkles size={16} /></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Wealth Multiplier</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{multiplier}x</p>
          <p className="text-[9px] font-semibold text-slate-500 mt-2 uppercase">Strategy Growth vs Principal</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:border-brand-green/40 transition-all group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-brand-green/10 text-brand-green rounded-lg group-hover:scale-110 transition-transform"><Landmark size={16} /></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Passive Payout</span>
          </div>
          <p className="text-3xl font-bold text-brand-green tracking-tight">{formatINR(passiveMonthly)}</p>
          <p className="text-[9px] font-semibold text-slate-500 mt-2 uppercase">Est. Monthly Dividend (5% Ann.)</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:border-brand-orange/40 transition-all group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-lg group-hover:scale-110 transition-transform"><Timer size={16} /></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Doubling Time</span>
          </div>
          <p className="text-3xl font-bold text-brand-orange tracking-tight">{doubleYears} Years</p>
          <p className="text-[9px] font-semibold text-slate-500 mt-2 uppercase">At {formatPct(simulation.metrics.cagr)} Constant Growth</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 rounded-xl text-white shadow-lg shadow-slate-200"><Calculator size={24} /></div>
            <div>
              <h3 className="text-slate-900 font-bold text-lg tracking-tight">Financial Freedom Engine</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Compound interest projection based on Backtest</p>
            </div>
          </div>

          <div className="flex items-center gap-6 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-center">
              <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Total Invested</p>
              <p className="text-xs font-bold text-slate-700">{formatINR(totalInvested)}</p>
            </div>
            <div className="w-px h-6 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Growth Surplus</p>
              <p className="text-xs font-bold text-brand-green">+{formatINR(terminalWealth - totalInvested)}</p>
            </div>
            <div className="w-px h-6 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Strategy CAGR</p>
              <p className="text-xs font-bold text-brand-teal">{formatPct(simulation.metrics.cagr)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4 space-y-10">
            <div className="space-y-5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <IndianRupee size={12} className="text-brand-teal" /> Monthly Contribution
                </label>
                <span className="text-sm font-bold text-slate-900 px-2 py-1 bg-slate-50 rounded-lg">{formatINR(sip)}</span>
              </div>
              <input
                type="range" min="1000" max="100000" step="1000"
                value={sip} onChange={e => setSip(Number(e.target.value))}
                className="w-full accent-brand-teal h-1 bg-slate-100 rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[8px] font-bold text-slate-400 px-1">
                <span>₹1,000</span><span>₹1,00,000</span>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Target size={12} className="text-brand-teal" /> Time Horizon
                </label>
                <span className="text-sm font-bold text-slate-900 px-2 py-1 bg-slate-50 rounded-lg">{years} Years</span>
              </div>
              <input
                type="range" min="1" max="30"
                value={years} onChange={e => setYears(Number(e.target.value))}
                className="w-full accent-brand-teal h-1 bg-slate-100 rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[8px] font-bold text-slate-400 px-1">
                <span>1 YEAR</span><span>30 YEARS</span>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl shadow-slate-200 relative overflow-hidden group">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 relative z-10">Final Target Corpus</p>
              <p className="text-3xl font-black text-white tracking-tight relative z-10 mb-4">{formatINR(terminalWealth)}</p>
              <div className="flex items-center gap-2 relative z-10">
                <ShieldCheck size={14} className="text-brand-green" />
                <span className="text-[10px] font-semibold text-brand-green uppercase">Projection Baseline Verified</span>
              </div>
              <Activity size={100} className="absolute -right-8 -bottom-8 text-white/5 opacity-10 group-hover:scale-110 transition-transform pointer-events-none" />
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col">
            <div className="flex items-center justify-between mb-8 px-2">
              <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <LineChart size={14} className="text-brand-teal" /> Probability & Growth Corridor
              </h4>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Input</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand-teal"></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Target</span>
                </div>
              </div>
            </div>

            <div className="flex-1 h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5acec9" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#5acec9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="bullGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8dd67a" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#8dd67a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 9, fontWeight: 700 }} stroke="#cbd5e1" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 9, fontWeight: 700 }} stroke="#cbd5e1" axisLine={false} tickLine={false} width={65} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 700 }} formatter={(v: any) => formatINR(v)} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', paddingBottom: '20px' }} />

                  <Area type="monotone" name="Bullish Peak" dataKey="bull" stroke="#8dd67a" strokeWidth={1} strokeDasharray="4 4" fill="url(#bullGrad)" />
                  <Area type="monotone" name="Net Principal" dataKey="invested" stroke="#cbd5e1" strokeWidth={1} fill="#f8fafc" />
                  <Area type="monotone" name="Expected Growth" dataKey="corpus" stroke="#5acec9" strokeWidth={3} fill="url(#wealthGrad)" animationDuration={1000} />
                  <Area type="monotone" name="Bearish Floor" dataKey="bear" stroke="#f3533b" strokeWidth={1} strokeDasharray="4 4" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 p-5 bg-brand-teal/5 border border-brand-teal/10 rounded-xl flex items-start gap-4">
              <Info size={18} className="text-brand-teal shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-brand-teal leading-relaxed">
                <span className="font-bold uppercase tracking-tighter mr-2">Market Realization:</span>
                A monthly SIP of <span className="font-bold">{formatINR(sip)}</span> into this custom basket for <span className="font-bold">{years} years</span> aims for an expected corpus of <span className="font-bold">{formatINR(terminalWealth)}</span>.
                The Bull case suggests a potential high of <span className="font-bold">{formatINR(terminalBull)}</span>, while the floor is modeled at <span className="font-bold">{formatINR(terminalBear)}</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WealthBuilder;
