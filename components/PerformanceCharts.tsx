
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Line
} from 'recharts';
import { OHLC, Period, ComparisonData } from '../types';
import { Eye, EyeOff, Calendar, X, TrendingUp, Activity, Scale, AlertTriangle, Loader2 } from 'lucide-react';

interface PerformanceChartsProps {
  history: OHLC[];
  buyAndHoldHistory?: OHLC[];
  drawdownData: { date: string; value: number }[];
  comparisonSeries?: ComparisonData[];
}

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ history, buyAndHoldHistory, drawdownData, comparisonSeries }) => {
  const [period, setPeriod] = useState<Period>('ALL');
  const [activeComparisons, setActiveComparisons] = useState<string[]>([]);
  const [showRebalanceComparison, setShowRebalanceComparison] = useState(false);
  const [mergedData, setMergedData] = useState<any[]>([]);
  
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    if (history.length > 0) {
      if (!customStart) setCustomStart(history[0].date);
      if (!customEnd) setCustomEnd(history[history.length - 1].date);
    }
  }, [history]);

  useEffect(() => {
    if (!history || history.length === 0) return;

    const merged = history.map((h, idx) => {
      const point: any = {
        date: h.date,
        close: h.close,
        drawdown: drawdownData[idx]?.value || 0
      };

      if (buyAndHoldHistory && buyAndHoldHistory[idx]) {
          point.buyAndHold = buyAndHoldHistory[idx].close;
      }
      
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
  }, [history, buyAndHoldHistory, drawdownData, comparisonSeries]);

  const toggleComparison = (ticker: string) => {
    setActiveComparisons(prev => 
      prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]
    );
  };

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
        if (period === '3Y') startDateObj.setFullYear(endDateObj.getFullYear() - 3);
        if (period === '5Y') startDateObj.setFullYear(endDateObj.getFullYear() - 5);
        
        if (period !== 'ALL') {
            data = mergedData.filter(d => new Date(d.date) >= startDateObj);
        }
    }
    return data;
  }, [mergedData, period, showCustomRange, customStart, customEnd]);

  const windowMetrics = useMemo(() => {
      if (filteredData.length < 2) return null;
      const first = filteredData[0];
      const last = filteredData[filteredData.length - 1];

      const startVal = first.close;
      const endVal = last.close;
      const absReturn = (endVal - startVal) / startVal;
      
      const startDateMs = new Date(first.date).getTime();
      const endDateMs = new Date(last.date).getTime();
      const years = (endDateMs - startDateMs) / (1000 * 3600 * 24 * 365.25);
      
      const cagr = years > 0.1 ? Math.pow(endVal / startVal, 1 / years) - 1 : absReturn;

      return { cagr, absReturn, years };
  }, [filteredData]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  const formatPct = (val: number) => `${(val * 100).toFixed(1)}%`;
  const formatDate = (str: string) => {
    const d = new Date(str);
    return `${d.getDate()}/${d.getMonth()+1}`;
  };

  if (!history || history.length === 0) {
      return (
          <div className="bg-white p-12 rounded-[32px] border border-slate-200 text-center flex flex-col items-center justify-center space-y-4 shadow-sm h-[350px]">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <div className="space-y-1">
                <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em]">Computing Alpha</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Processing historical market matrices...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest px-1">Performance DNA</h3>
         
         <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
            {(['1Y', '3Y', '5Y', 'ALL'] as Period[]).map((p) => (
                <button
                    key={p}
                    onClick={() => {setPeriod(p); setShowCustomRange(false);}}
                    className={`flex-1 sm:px-4 py-1.5 text-[10px] rounded-lg font-black transition-all ${
                    period === p && !showCustomRange
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    {p}
                </button>
            ))}
            <button 
                onClick={() => setShowCustomRange(!showCustomRange)}
                className={`p-1.5 rounded-lg font-black ${showCustomRange ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
                <Calendar size={12} />
            </button>
         </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xl space-y-6">
        {windowMetrics && (
            <div className="flex gap-6 pb-4 border-b border-slate-50">
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Growth</span>
                    <span className={`text-lg font-black ${windowMetrics.absReturn >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {windowMetrics.absReturn >= 0 ? '+' : ''}{formatPct(windowMetrics.absReturn)}
                    </span>
                </div>
                <div className="w-px bg-slate-100"></div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Compounded</span>
                    <span className="text-lg font-black text-slate-900">{formatPct(windowMetrics.cagr)}</span>
                </div>
            </div>
        )}

        <div className="h-[250px] sm:h-[350px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate} 
                stroke="#cbd5e1" 
                tick={{fontSize: 9, fontWeight: 700}}
                minTickGap={30}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                stroke="#cbd5e1" 
                tickFormatter={formatCurrency} 
                tick={{fontSize: 9, fontWeight: 700}}
                domain={['auto', 'auto']}
                width={70}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 900 }}
                formatter={(value: number) => [formatCurrency(value), 'Value']}
              />
              <Area 
                type="monotone" 
                dataKey="close" 
                stroke="#4f46e5" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorMain)" 
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap gap-2">
            {comparisonSeries?.map(s => (
                <button
                    key={s.ticker}
                    onClick={() => toggleComparison(s.ticker)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                        activeComparisons.includes(s.ticker)
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                    }`}
                >
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-2" style={{backgroundColor: s.color}}></span>
                    {s.ticker}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceCharts;
