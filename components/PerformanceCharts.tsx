
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, ComposedChart, Bar, Cell
} from 'recharts';
import { OHLC, Period, ComparisonData } from '../types';
import { 
  Activity, Target, BarChart3, CandlestickChart, Layout
} from 'lucide-react';

interface PerformanceChartsProps {
  history: OHLC[];
  buyAndHoldHistory?: OHLC[];
  drawdownData: { date: string; value: number }[];
  comparisonSeries?: ComparisonData[];
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316'];

/**
 * Custom Candlestick shape.
 * Recharts Bar passes (x, y, width, height) where y and height correspond to the value in dataKey.
 * To render a proper candle, we need the actual data values from the payload.
 */
const Candlestick = (props: any) => {
  const { x, y, width, height, payload, low, high, open, close } = props;
  if (!payload) return null;
  
  const isUp = payload.close >= payload.open;
  const color = isUp ? '#10b981' : '#ef4444';

  // We need to calculate pixel positions for high and low.
  // The 'y' and 'height' provided by Recharts for the bar are based on the 'close' value (since dataKey="close").
  // This is not ideal for candles. We need the Y-scale. 
  // Fortunately, Recharts passes the scale function in the props (sometimes) or we can derive it.
  // A more robust way in ComposedChart is to treat 'y' as the 'close' position and calculate based on height/value ratio.
  
  const bodyUpper = Math.max(payload.open, payload.close);
  const bodyLower = Math.min(payload.open, payload.close);
  
  // Ratio of pixels per value unit
  // props.y is the pixel coordinate of props.value (which is close)
  // We can't easily get the absolute scale here, but we can use the 'y' from the bar
  // if we set the Bar's dataKey to something sensible.
  
  // Re-calculating based on the coordinate system provided to the Bar
  // In Recharts, Bar's y is the top of the bar. 
  // We'll use a simpler approach: the Bar itself will be the body, 
  // but we need to know where the top and bottom of the body are in pixels.
  
  // If we assume 'y' is the pixel position of the 'close' price:
  // This is only true if we have one Bar.
  // Let's use the provided 'y' and 'height' from the Bar component which Recharts calculates.
  
  // For a proper candle, we'll use the Bar to represent the body [open, close].
  // props.y is the top of the bar, props.height is the height.
  const bodyTop = y;
  const bodyBottom = y + height;
  const centerX = x + width / 2;

  // Estimate wick positions based on the body height/value ratio
  const valueRange = Math.abs(payload.open - payload.close) || 0.1;
  const pixelRange = height || 1;
  const ratio = pixelRange / valueRange;

  const wickTop = bodyTop - (payload.high - bodyUpper) * ratio;
  const wickBottom = bodyBottom + (bodyLower - payload.low) * ratio;

  return (
    <g>
      <line
        x1={centerX}
        y1={wickTop}
        x2={centerX}
        y2={bodyTop}
        stroke={color}
        strokeWidth={1.5}
      />
      <line
        x1={centerX}
        y1={bodyBottom}
        x2={centerX}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1.5}
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(1, height)}
        fill={color}
        stroke={color}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isBasket = payload[0].name === 'close';
    
    return (
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl text-white min-w-[180px]">
        <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {new Date(label).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <Activity size={10} className="text-indigo-400" />
        </div>
        
        <div className="space-y-1.5">
            <div className="flex justify-between gap-4">
                <span className="text-[8px] font-bold text-slate-500 uppercase">Open</span>
                <span className="text-[10px] font-black">₹{data.open?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between gap-4">
                <span className="text-[8px] font-bold text-slate-500 uppercase">High</span>
                <span className="text-[10px] font-black text-emerald-400">₹{data.high?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between gap-4">
                <span className="text-[8px] font-bold text-slate-500 uppercase">Low</span>
                <span className="text-[10px] font-black text-rose-400">₹{data.low?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between gap-4">
                <span className="text-[8px] font-bold text-slate-500 uppercase">Close</span>
                <span className="text-[10px] font-black">₹{data.close?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
        </div>
      </div>
    );
  }
  return null;
};

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ 
  history, 
  comparisonSeries
}) => {
  const [period, setPeriod] = useState<Period>('1Y');
  const [chartType, setChartType] = useState<'area' | 'candlestick'>('area');
  const [activeComparisons, setActiveComparisons] = useState<string[]>([]);
  const [mergedData, setMergedData] = useState<any[]>([]);

  useEffect(() => {
    if (!history || history.length === 0) return;

    // Build comparison series lookup
    const tickerDataMap = new Map<string, Map<string, number>>();
    if (comparisonSeries) {
      comparisonSeries.forEach(series => {
        const dateMap = new Map<string, number>();
        series.data.forEach(d => dateMap.set(d.date, d.value));
        tickerDataMap.set(series.ticker, dateMap);
      });
    }

    const merged = history.map((h) => {
      const point: any = {
        date: h.date,
        open: h.open,
        high: h.high,
        low: h.low,
        close: h.close,
        // For Recharts Bar range [open, close]
        range: [h.open, h.close]
      };

      if (comparisonSeries) {
        comparisonSeries.forEach(s => {
           const val = tickerDataMap.get(s.ticker)?.get(h.date);
           if (val !== undefined) {
             point[s.ticker] = val;
           }
        });
      }
      return point;
    });

    setMergedData(merged);
    
    // Default active comparisons
    if (comparisonSeries && activeComparisons.length === 0) {
      setActiveComparisons(comparisonSeries.map(s => s.ticker));
    }
  }, [history, comparisonSeries]);

  const toggleComparison = (ticker: string) => {
    setActiveComparisons(prev => 
      prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]
    );
  };

  const filteredData = useMemo(() => {
    if (mergedData.length === 0) return [];
    
    const endDateObj = new Date(mergedData[mergedData.length - 1].date);
    const startDateObj = new Date(endDateObj);
    
    if (period === '1Y') startDateObj.setFullYear(endDateObj.getFullYear() - 1);
    else if (period === '3Y') startDateObj.setFullYear(endDateObj.getFullYear() - 3);
    else if (period === '5Y') startDateObj.setFullYear(endDateObj.getFullYear() - 5);
    
    if (period === 'ALL') return mergedData;
    
    return mergedData.filter(d => new Date(d.date) >= startDateObj);
  }, [mergedData, period]);

  // Normalized Benchmarking logic: Base 100 at the START of the visible period
  const normalizedData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const basePoint = filteredData[0];
    
    return filteredData.map(point => {
      const result: any = { date: point.date };
      
      // Basket Normalization
      result.Basket = basePoint.close > 0 ? (point.close / basePoint.close) * 100 : 100;
      
      // Comparison Assets Normalization
      activeComparisons.forEach(ticker => {
        const baseVal = basePoint[ticker];
        const currentVal = point[ticker];
        if (baseVal !== undefined && currentVal !== undefined && baseVal > 0) {
          result[ticker] = (currentVal / baseVal) * 100;
        } else {
          result[ticker] = 100;
        }
      });
      return result;
    });
  }, [filteredData, activeComparisons]);

  const formatDate = (str: string) => {
    const d = new Date(str);
    return `${d.getDate()}/${d.getMonth()+1}`;
  };

  if (!history || history.length === 0) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Valuation Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-slate-900 font-bold text-[10px] uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-600"/>
                Strategy Valuation
            </h3>
            
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setChartType('area')}
                  className={`p-1.5 rounded-md transition-all ${chartType === 'area' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >
                  <Layout size={14} />
                </button>
                <button 
                  onClick={() => setChartType('candlestick')}
                  className={`p-1.5 rounded-md transition-all ${chartType === 'candlestick' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >
                  <CandlestickChart size={14} />
                </button>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {(['1Y', '3Y', '5Y', 'ALL'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-[9px] rounded-md font-bold transition-all ${
                  period === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={filteredData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#94a3b8" tick={{fontSize: 9, fontWeight: 700}} minTickGap={50} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} tick={{fontSize: 9, fontWeight: 700}} domain={['auto', 'auto']} width={65} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="close" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMain)" animationDuration={1000} />
              </AreaChart>
            ) : (
              <ComposedChart data={filteredData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#94a3b8" tick={{fontSize: 9, fontWeight: 700}} minTickGap={50} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} tick={{fontSize: 9, fontWeight: 700}} domain={['auto', 'auto']} width={65} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="range" shape={<Candlestick />} animationDuration={500} />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Normalized Benchmarking Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-slate-900 font-bold text-[10px] uppercase tracking-wider flex items-center gap-2">
                <Target size={16} className="text-emerald-600"/>
                Normalized Benchmarking
            </h3>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Performance (Base 100)</span>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={normalizedData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDate} stroke="#94a3b8" tick={{fontSize: 9, fontWeight: 700}} minTickGap={50} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tickFormatter={(v) => `${v.toFixed(0)}`} tick={{fontSize: 9, fontWeight: 700}} domain={['auto', 'auto']} width={65} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 800 }} 
                labelFormatter={(label) => new Date(label).toLocaleDateString()} 
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '9px', fontWeight: 700, textTransform: 'uppercase'}} />
              
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
              
              <Line 
                type="monotone" 
                dataKey="Basket" 
                stroke="#4f46e5" 
                strokeWidth={3} 
                dot={false} 
                animationDuration={1000} 
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="pt-4 mt-2 border-t border-slate-50">
          <div className="flex flex-wrap gap-2">
            {comparisonSeries?.map((s, idx) => (
              <button
                key={s.ticker}
                onClick={() => toggleComparison(s.ticker)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all flex items-center gap-2 ${
                  activeComparisons.includes(s.ticker) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: activeComparisons.includes(s.ticker) ? COLORS[idx % COLORS.length] : '#cbd5e1'}}></div>
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
