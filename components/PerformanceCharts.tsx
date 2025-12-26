
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { OHLC, Period, ComparisonData } from '../types';
import { Calendar, Loader2, Filter, TrendingUp, Award, Zap, History, BarChart3, LineChart as LineIcon, Activity, Target } from 'lucide-react';

interface PerformanceChartsProps {
  history: OHLC[];
  buyAndHoldHistory?: OHLC[];
  drawdownData: { date: string; value: number }[];
  comparisonSeries?: ComparisonData[];
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316'];

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ 
  history, 
  drawdownData, 
  comparisonSeries
}) => {
  const [period, setPeriod] = useState<Period>('1Y');
  const [activeComparisons, setActiveComparisons] = useState<string[]>([]);
  const [mergedData, setMergedData] = useState<any[]>([]);
  
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    if (history.length > 0) {
      if (!customStart) setCustomStart(history[0].date);
      if (!customEnd) setCustomEnd(history[history.length - 1].date);
      // Auto-select all comparisons for the second chart
      if (comparisonSeries && activeComparisons.length === 0) {
        setActiveComparisons(comparisonSeries.map(s => s.ticker));
      }
    }
  }, [history, comparisonSeries]);

  useEffect(() => {
    if (!history || history.length === 0) return;

    const merged = history.map((h, idx) => {
      const point: any = {
        date: h.date,
        close: h.close,
      };

      if (comparisonSeries) {
        comparisonSeries.forEach(s => {
           if (s.data[idx]) {
             point[s.ticker] = s.data[idx].value;
           }
        });
      }
      return point;
    });

    setMergedData(merged);
  }, [history, comparisonSeries]);

  const toggleComparison = (ticker: string) => {
    setActiveComparisons(prev => 
      prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]
    );
  };

  const calculateCAGRForWindow = (data: any[]) => {
    if (data.length < 2) return 0;
    const first = data[0];
    const last = data[data.length - 1];
    const startVal = first.close;
    const endVal = last.close;
    const years = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 3600 * 24 * 365.25);
    return years > 0.1 && startVal > 0 
      ? Math.pow(endVal / startVal, 1 / years) - 1 
      : (endVal - startVal) / (startVal || 1);
  };

  const basketMetrics = useMemo(() => {
    if (mergedData.length < 2) return null;
    const getWindow = (years: number) => {
      const end = new Date(mergedData[mergedData.length - 1].date);
      const start = new Date(end);
      start.setFullYear(end.getFullYear() - years);
      return mergedData.filter(d => new Date(d.date) >= start);
    };
    return {
      oneYear: calculateCAGRForWindow(getWindow(1)),
      threeYear: calculateCAGRForWindow(getWindow(3)),
      fiveYear: calculateCAGRForWindow(getWindow(5)),
      allTime: calculateCAGRForWindow(mergedData)
    };
  }, [mergedData]);

  const filteredData = useMemo(() => {
    if (mergedData.length === 0) return [];
    let data = mergedData;

    if (showCustomRange && customStart && customEnd) {
      const start = new Date(customStart).getTime();
      const end = new Date(customEnd).getTime();
      data = mergedData.filter(d => {
        const t = new Date(d.date).getTime();
        return t >= start && t <= end;
      });
    } else {
      const endDateObj = new Date(mergedData[mergedData.length - 1].date);
      const startDateObj = new Date(endDateObj);
      if (period === '1Y') startDateObj.setFullYear(endDateObj.getFullYear() - 1);
      else if (period === '3Y') startDateObj.setFullYear(endDateObj.getFullYear() - 3);
      else if (period === '5Y') startDateObj.setFullYear(endDateObj.getFullYear() - 5);
      if (period !== 'ALL') {
        data = mergedData.filter(d => new Date(d.date) >= startDateObj);
      }
    }
    return data;
  }, [mergedData, period, showCustomRange, customStart, customEnd]);

  // Normalize data for the Benchmarking Chart (relative growth)
  const normalizedData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const basePoint = filteredData[0];
    
    return filteredData.map(point => {
      const result: any = { date: point.date };
      // Normalize basket
      result.Basket = basePoint.close > 0 ? (point.close / basePoint.close) * 100 : 100;
      
      // Normalize components
      activeComparisons.forEach(ticker => {
        if (point[ticker] !== undefined && basePoint[ticker] !== undefined && basePoint[ticker] > 0) {
          result[ticker] = (point[ticker] / basePoint[ticker]) * 100;
        } else {
          result[ticker] = 100;
        }
      });
      return result;
    });
  }, [filteredData, activeComparisons]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  const formatPct = (val: number) => `${(val * 100).toFixed(1)}%`;
  const formatDate = (str: string) => {
    const d = new Date(str);
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear().toString().slice(2)}`;
  };

  if (!history || history.length === 0) {
    return (
      <div className="bg-white p-12 rounded-[24px] border border-slate-200 text-center flex flex-col items-center justify-center space-y-4 h-[350px]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em]">Computing Performance DNA</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. KEY KPI OVERVIEW */}
      {basketMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { label: '1Y CAGR', val: basketMetrics.oneYear, icon: Zap, bg: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-700' },
            { label: '3Y CAGR', val: basketMetrics.threeYear, icon: TrendingUp, bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700' },
            { label: '5Y CAGR', val: basketMetrics.fiveYear, icon: Award, bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
            { label: 'ALL-TIME', val: basketMetrics.allTime, icon: History, bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700' }
          ].map((card, i) => (
            <div key={i} className={`${card.bg} border p-3 rounded-[16px] shadow-sm transition-transform hover:scale-[1.02]`}>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">{card.label}</span>
                <card.icon size={10} className={card.text} />
              </div>
              <p className={`text-base font-black leading-tight ${card.text}`}>{formatPct(card.val)}</p>
            </div>
          ))}
        </div>
      )}

      {/* 2. MASTER VALUATION CHART */}
      <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                <Activity size={12} />
            </div>
            <h3 className="text-slate-900 font-black text-[10px] uppercase tracking-widest">Instrument Master Valuation</h3>
          </div>
          
          <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
            {(['1Y', '3Y', '5Y', 'ALL'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => {setPeriod(p); setShowCustomRange(false);}}
                className={`px-2 py-0.5 text-[7px] rounded-md font-black transition-all ${
                  period === p && !showCustomRange ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                {p}
              </button>
            ))}
            <button 
              onClick={() => setShowCustomRange(!showCustomRange)}
              className={`p-1 px-1.5 rounded-md font-black flex items-center gap-1 ${showCustomRange ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              <Calendar size={10} />
              <span className="text-[7px] uppercase font-black">Custom</span>
            </button>
          </div>
        </div>

        <div className="h-[250px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#cbd5e1" tick={{fontSize: 7, fontWeight: 700}} minTickGap={40} axisLine={false} tickLine={false} />
              <YAxis stroke="#cbd5e1" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} tick={{fontSize: 7, fontWeight: 700}} domain={['auto', 'auto']} width={50} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '9px', fontWeight: 900 }} 
                formatter={(value: number) => [formatCurrency(value), 'Bucket Value']} 
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} 
              />
              <Area type="monotone" dataKey="close" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorMain)" animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. RELATIVE BENCHMARKING CHART */}
      <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
                <Target size={12} />
            </div>
            <h3 className="text-slate-900 font-black text-[10px] uppercase tracking-widest">Relative Component Benchmarking</h3>
          </div>
          <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Base = 100</span>
        </div>

        <div className="h-[300px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={normalizedData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#cbd5e1" tick={{fontSize: 7, fontWeight: 700}} minTickGap={40} axisLine={false} tickLine={false} />
              <YAxis stroke="#cbd5e1" tickFormatter={(v) => `${v.toFixed(0)}`} tick={{fontSize: 7, fontWeight: 700}} domain={['auto', 'auto']} width={50} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '9px', fontWeight: 900 }} 
                formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]} 
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} 
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '8px', fontWeight: 900, textTransform: 'uppercase'}} />
              
              {/* Individual Stocks */}
              {activeComparisons.map((ticker, idx) => (
                <Line 
                  key={ticker} 
                  type="monotone" 
                  dataKey={ticker} 
                  stroke={COLORS[idx % COLORS.length]} 
                  strokeWidth={1.5} 
                  dot={false} 
                  animationDuration={500} 
                  strokeOpacity={0.6}
                />
              ))}
              
              {/* Bold Basket Line - Should be the "average" / central line */}
              <Line 
                type="monotone" 
                dataKey="Basket" 
                stroke="#4f46e5" 
                strokeWidth={4} 
                dot={false} 
                animationDuration={1000} 
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="pt-3 border-t border-slate-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Filter size={10}/>
              Benchmark Visibility
            </span>
            <button onClick={() => { if (activeComparisons.length === (comparisonSeries?.length || 0)) setActiveComparisons([]); else setActiveComparisons(comparisonSeries?.map(s => s.ticker) || []); }} className="text-[7px] font-black text-indigo-600 uppercase hover:underline">
              {activeComparisons.length === (comparisonSeries?.length || 0) ? 'Hide All' : 'Show All'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {comparisonSeries?.map((s, idx) => (
              <button
                key={s.ticker}
                onClick={() => toggleComparison(s.ticker)}
                className={`px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-widest border transition-all flex items-center gap-1 ${
                  activeComparisons.includes(s.ticker) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="w-1 h-1 rounded-full" style={{backgroundColor: activeComparisons.includes(s.ticker) ? COLORS[idx % COLORS.length] : '#cbd5e1'}}></div>
                {s.ticker}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceCharts;
