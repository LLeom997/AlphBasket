
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend
} from 'recharts';
import { OHLC, Period, ComparisonData } from '../types';
import { Eye, EyeOff, Calendar, X, TrendingUp, Scale, CheckSquare, Square, AlertTriangle } from 'lucide-react';

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
  
  // Custom Range State
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Initialize dates when history loads
  useEffect(() => {
    if (history.length > 0) {
      // Set valid default dates based on data boundaries
      if (!customStart) setCustomStart(history[0].date);
      if (!customEnd) setCustomEnd(history[history.length - 1].date);
    }
  }, [history]);

  // Merge history and active comparisons into a single data structure for Recharts
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

  const toggleAllComparisons = () => {
      if (!comparisonSeries) return;
      if (activeComparisons.length === comparisonSeries.length) {
          setActiveComparisons([]);
      } else {
          setActiveComparisons(comparisonSeries.map(s => s.ticker));
      }
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
        
        // For 'ALL', we don't filter
        if (period !== 'ALL') {
            data = mergedData.filter(d => new Date(d.date) >= startDateObj);
        }
    }
    return data;
  }, [mergedData, period, showCustomRange, customStart, customEnd]);

  // Dynamic Metrics Calculation for the specific window
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
      
      // Prevent division by zero or extremely short periods
      const cagr = years > 0.1 ? Math.pow(endVal / startVal, 1 / years) - 1 : absReturn;

      return { cagr, absReturn, years };
  }, [filteredData]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  const formatPct = (val: number) => `${(val * 100).toFixed(2)}%`;
  const formatDate = (str: string) => {
    const d = new Date(str);
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear().toString().substr(2)}`;
  };

  if (!history || history.length === 0) {
      return (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center flex flex-col items-center">
              <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
              <h3 className="font-bold text-slate-800">No Historical Data</h3>
              <p className="text-slate-500 text-sm mt-1">Unable to generate simulation history. Please ensure Fyers is connected and valid stocks are selected.</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <h3 className="text-slate-500 text-sm font-semibold">Comparative Performance</h3>
         
         <div className="flex flex-wrap items-center gap-2">
            {/* Rebalance Toggle */}
            {buyAndHoldHistory && (
                 <button
                    onClick={() => setShowRebalanceComparison(!showRebalanceComparison)}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-medium transition-all border ${
                        showRebalanceComparison 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'text-slate-500 border-slate-200 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Compare current rebalancing strategy vs Buy & Hold"
                 >
                    <Scale size={12} />
                    Vs Buy & Hold
                 </button>
            )}

            <div className="w-px h-4 bg-slate-300 mx-1 hidden sm:block"></div>

            {/* Time Period Controls */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                {showCustomRange ? (
                    <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-right-5 duration-300">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">From</span>
                            <input 
                                type="date" 
                                value={customStart}
                                max={customEnd}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="bg-slate-50 text-slate-800 text-xs rounded px-2 py-1 border border-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">To</span>
                            <input 
                                type="date" 
                                value={customEnd}
                                min={customStart}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="bg-slate-50 text-slate-800 text-xs rounded px-2 py-1 border border-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <button 
                            onClick={() => setShowCustomRange(false)}
                            className="ml-2 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <>
                        {(['1Y', '3Y', '5Y', 'ALL'] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                            period === p 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                        >
                            {p}
                        </button>
                        ))}
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                        <button 
                            onClick={() => setShowCustomRange(true)}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                        >
                            <Calendar size={12} />
                            Custom
                        </button>
                    </>
                )}
            </div>
         </div>
      </div>

      {/* Dynamic Window Metrics */}
      {windowMetrics && (
          <div className="flex gap-4 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
               <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-indigo-50 rounded text-indigo-600">
                       <TrendingUp size={16} />
                   </div>
                   <div>
                       <div className="text-[10px] text-slate-500 uppercase font-bold">Window Return</div>
                       <div className={`text-sm font-bold ${windowMetrics.absReturn >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                           {windowMetrics.absReturn >= 0 ? '+' : ''}{formatPct(windowMetrics.absReturn)}
                       </div>
                   </div>
               </div>
               <div className="w-px bg-slate-200"></div>
               <div>
                   <div className="text-[10px] text-slate-500 uppercase font-bold">Window CAGR</div>
                   <div className="text-sm font-bold text-slate-800">
                       {formatPct(windowMetrics.cagr)}
                   </div>
               </div>
               <div className="w-px bg-slate-200"></div>
               <div>
                   <div className="text-[10px] text-slate-500 uppercase font-bold">Duration</div>
                   <div className="text-sm font-mono text-slate-600">
                       {windowMetrics.years.toFixed(1)} Years
                   </div>
               </div>
          </div>
      )}

      {/* Main Value Chart with Comparisons */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xl">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate} 
                stroke="#64748b" 
                tick={{fontSize: 12, fill: '#64748b'}}
                minTickGap={50}
              />
              <YAxis 
                stroke="#64748b" 
                tickFormatter={formatCurrency} 
                tick={{fontSize: 12, fill: '#64748b'}}
                domain={['auto', 'auto']}
                width={80}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                itemStyle={{ color: '#0f172a' }}
                formatter={(value: number, name: string) => {
                    if (name === 'close') return [formatCurrency(value), 'My Basket'];
                    if (name === 'buyAndHold') return [formatCurrency(value), 'Buy & Hold'];
                    return [formatCurrency(value), name];
                }}
                labelStyle={{ color: '#64748b' }}
              />
              <Legend wrapperStyle={{ color: '#334155' }} />
              
              {/* The Basket Itself */}
              <Area 
                type="monotone" 
                dataKey="close" 
                name="My Basket"
                stroke="#4f46e5" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                animationDuration={500}
              />

              {/* Buy & Hold Comparison Line */}
              {showRebalanceComparison && buyAndHoldHistory && (
                  <Line 
                    type="monotone"
                    dataKey="buyAndHold"
                    name="Buy & Hold"
                    stroke="#d97706"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    animationDuration={500}
                  />
              )}

              {/* Individual Stock Comparisons */}
              {activeComparisons.map(ticker => {
                 const comp = comparisonSeries?.find(c => c.ticker === ticker);
                 if (!comp) return null;
                 return (
                    <Line 
                        key={ticker}
                        type="monotone"
                        dataKey={ticker}
                        stroke={comp.color}
                        strokeWidth={2}
                        dot={false}
                        animationDuration={500}
                    />
                 )
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison Toggles */}
        {comparisonSeries && comparisonSeries.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500">Compare: "What if I invested 100% in..."</p>
                    <button 
                        onClick={toggleAllComparisons}
                        className="text-[10px] text-indigo-600 hover:text-indigo-500 font-bold flex items-center gap-1"
                    >
                        {activeComparisons.length === comparisonSeries.length ? (
                            <><CheckSquare size={12} /> Deselect All</>
                        ) : (
                            <><Square size={12} /> Select All</>
                        )}
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {comparisonSeries.map(s => (
                        <button
                            key={s.ticker}
                            onClick={() => toggleComparison(s.ticker)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-all border ${
                                activeComparisons.includes(s.ticker)
                                ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                                : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-400'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full shadow-sm" style={{backgroundColor: s.color}}></span>
                            {s.ticker}
                            {activeComparisons.includes(s.ticker) ? <Eye size={12} /> : <EyeOff size={12} className="opacity-50"/>}
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Drawdown Chart */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xl">
        <h3 className="text-slate-500 text-sm font-semibold mb-4">Historical Drawdown</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="colorDd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#64748b" tick={{fontSize: 12, fill: '#64748b'}} minTickGap={50} />
              <YAxis stroke="#64748b" tickFormatter={formatPct} tick={{fontSize: 12, fill: '#64748b'}} width={40} />
              <Tooltip 
                 contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                 itemStyle={{ color: '#0f172a' }}
                 formatter={(value: number) => [formatPct(value), 'Drawdown']}
              />
              <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="url(#colorDd)" animationDuration={500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PerformanceCharts;
