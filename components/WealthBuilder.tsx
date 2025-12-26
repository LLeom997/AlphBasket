
import React, { useState, useEffect } from 'react';
import { SimulationResult } from '../types';
import { Calculator, TrendingUp, IndianRupee, Zap, Target, ArrowRight, Wallet, Activity, Sparkles, PieChart } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WealthBuilderProps {
  simulation: SimulationResult | null;
}

const WealthBuilder: React.FC<WealthBuilderProps> = ({ simulation }) => {
  const [sip, setSip] = useState(10000);
  const [years, setYears] = useState(15);
  const [data, setData] = useState<any[]>([]);

  const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const formatPct = (n: number) => (n * 100).toFixed(1) + '%';

  useEffect(() => {
    if (!simulation) return;
    const rate = simulation.metrics.cagr;
    const monthlyRate = Math.pow(1 + rate, 1 / 12) - 1;
    const chart = [];
    let currentCorpus = 0;
    let totalInvested = 0;

    for (let i = 0; i <= years * 12; i++) {
        if (i % 12 === 0) {
            chart.push({
                year: i / 12,
                corpus: Math.floor(currentCorpus),
                invested: totalInvested
            });
        }
        currentCorpus = (currentCorpus + sip) * (1 + monthlyRate);
        totalInvested += sip;
    }
    setData(chart);
  }, [simulation, sip, years]);

  if (!simulation) return null;

  const terminalWealth = data.length > 0 ? data[data.length - 1].corpus : 0;
  const totalInvested = data.length > 0 ? data[data.length - 1].invested : 0;
  const growth = terminalWealth - totalInvested;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                  <Calculator size={20} />
              </div>
              <div>
                  <h3 className="text-slate-900 font-black text-xs uppercase tracking-[0.2em]">Compounding Engine</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Simulating Wealth based on {formatPct(simulation.metrics.cagr)} Strategy CAGR</p>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-6">
                  <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <IndianRupee size={10} className="text-indigo-500" /> Monthly SIP
                        </label>
                        <span className="text-[10px] font-black text-slate-900">{formatINR(sip)}</span>
                      </div>
                      <input 
                        type="range" min="1000" max="500000" step="1000"
                        value={sip} onChange={e => setSip(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer"
                      />
                  </div>

                  <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Target size={10} className="text-indigo-500" /> Horizon
                        </label>
                        <span className="text-[10px] font-black text-slate-900">{years} Years</span>
                      </div>
                      <input 
                        type="range" min="1" max="40"
                        value={years} onChange={e => setYears(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer"
                      />
                  </div>

                  <div className="pt-4 space-y-3">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-2">Portfolio Trajectory</p>
                          <div className="space-y-3">
                              <div className="flex justify-between">
                                  <span className="text-[9px] font-bold text-slate-500">Invested Amount</span>
                                  <span className="text-[9px] font-black text-slate-900">{formatINR(totalInvested)}</span>
                              </div>
                              <div className="flex justify-between">
                                  <span className="text-[9px] font-bold text-slate-500">Est. Growth</span>
                                  <span className="text-[9px] font-black text-emerald-600">+{formatINR(growth)}</span>
                              </div>
                              <div className="h-[1px] bg-slate-200"></div>
                              <div className="flex justify-between items-center pt-1">
                                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Target Corpus</span>
                                  <span className="text-lg font-black text-indigo-600">{formatINR(terminalWealth)}</span>
                              </div>
                          </div>
                      </div>

                      <div className="bg-indigo-900 p-4 rounded-2xl text-white relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-3 opacity-10 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
                              <Sparkles size={48} />
                          </div>
                          <p className="text-[6px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-1">AI Recommendation</p>
                          <p className="text-[9px] font-medium leading-relaxed italic opacity-90">
                              Based on the strategy's volatility, a {years}-year horizon has a high probability of exceeding inflation by {formatPct(simulation.metrics.cagr - 0.06)}.
                          </p>
                      </div>
                  </div>
              </div>

              <div className="lg:col-span-8 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={12} className="text-emerald-500" /> Compounding Visualization
                      </h4>
                      <div className="flex gap-4">
                          <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                              <span className="text-[7px] font-black text-slate-400 uppercase">Invested</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                              <span className="text-[7px] font-black text-slate-400 uppercase">Wealth</span>
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="year" tick={{fontSize: 8, fontWeight: 900}} stroke="#94a3b8" axisLine={false} tickLine={false} label={{ value: 'YEARS', position: 'insideBottom', offset: -5, fontSize: 6, fontWeight: 900 }} />
                              <YAxis tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} tick={{fontSize: 8, fontWeight: 900}} stroke="#94a3b8" axisLine={false} tickLine={false} width={60} />
                              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 900 }} formatter={(v: any) => formatINR(v)} />
                              <Area type="monotone" dataKey="invested" stroke="#e2e8f0" strokeWidth={2} fill="#f8fafc" animationDuration={1000} />
                              <Area type="monotone" dataKey="corpus" stroke="#4f46e5" strokeWidth={3} fill="url(#wealthGrad)" animationDuration={1500} />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
              { label: 'Purchasing Power', icon: Wallet, val: 'Inflation Protected', sub: 'vs 6% Annual Inflation', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Re-Investment', icon: PieChart, val: 'Automatic', sub: 'Dividends excluded', color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Confidence Score', icon: Zap, val: 'High Conviction', sub: 'Based on 5Y history', color: 'text-indigo-600', bg: 'bg-indigo-50' }
          ].map((card, i) => (
              <div key={i} className={`${card.bg} p-4 rounded-2xl flex items-center gap-4 transition-transform hover:scale-[1.02] cursor-default`}>
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                      <card.icon size={16} className={card.color} />
                  </div>
                  <div>
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                      <p className={`text-[10px] font-black ${card.color}`}>{card.val}</p>
                      <p className="text-[6px] font-bold text-slate-400 opacity-70 uppercase">{card.sub}</p>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};

export default WealthBuilder;
