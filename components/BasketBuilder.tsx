
import React, { useState, useEffect, useMemo } from 'react';
import { Stock, BasketItem, Basket } from '../types';
import { suggestBasket } from '../services/gemini';
import StockTooltip from './StockTooltip';
import { 
  Trash2, Wand2, PieChart, RefreshCcw, Wallet, Scale, Plus, 
  Settings, ChevronDown, Eye, EyeOff, AlertTriangle, 
  ShieldCheck, Layers, Info, Zap, BarChart4, Activity, Target, Tag
} from 'lucide-react';

interface BasketBuilderProps {
  availableStocks: Stock[];
  initialBasket?: Basket | null;
  onSave: (basket: Basket) => void;
  onSimulate: (basket: Basket) => void;
  onOpenExplorer: () => void;
}

const CATEGORIES = [
  'Growth Strategy',
  'Value Investing',
  'Dividend Yield',
  'Thematic/Sectoral',
  'Defensive/Low Vol',
  'Momentum Alpha',
  'Experimental'
];

const BasketBuilder: React.FC<BasketBuilderProps> = ({ availableStocks, initialBasket, onSave, onSimulate, onOpenExplorer }) => {
  const [name, setName] = useState('New Analysis');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [items, setItems] = useState<BasketItem[]>([]);
  const [mode, setMode] = useState<'weight' | 'quantity'>('weight');
  const [rebalance, setRebalance] = useState<Basket['rebalanceInterval']>('none');
  const [investment, setInvestment] = useState<number>(100000);
  const [themeInput, setThemeInput] = useState('');

  useEffect(() => {
    if (initialBasket) {
      setName(initialBasket.name);
      setCategory(initialBasket.category || CATEGORIES[0]);
      setItems(initialBasket.items || []);
      setMode(initialBasket.allocationMode || 'weight');
      setRebalance(initialBasket.rebalanceInterval || 'none');
      setInvestment(initialBasket.initialInvestment || 100000);
    }
  }, [initialBasket]);

  // Removed auto-simulate useEffect to satisfy the manual "Run Backtest" requirement

  const distributeEqual = () => {
    if (items.length === 0) return;
    const eq = 100 / items.length;
    setItems(items.map(i => ({ ...i, weight: eq })));
  };

  const distributeMarketCap = () => {
    if (items.length === 0) return;
    const totalMCap = items.reduce((sum, item) => {
      const s = availableStocks.find(st => st.ticker === item.ticker);
      return sum + (s?.marketCap || 0);
    }, 0);
    if (totalMCap === 0) return distributeEqual();
    setItems(items.map(item => {
      const s = availableStocks.find(st => st.ticker === item.ticker);
      return { ...item, weight: ((s?.marketCap || 0) / totalMCap) * 100 };
    }));
  };

  const distributeVolatility = () => {
    if (items.length === 0) return;
    const invVols = items.map(item => {
      const s = availableStocks.find(st => st.ticker === item.ticker);
      return 1 / (s?.volatility || 0.2);
    });
    const totalInvVol = invVols.reduce((a, b) => a + b, 0);
    setItems(items.map((item, idx) => ({
      ...item,
      weight: (invVols[idx] / totalInvVol) * 100
    })));
  };

  const handleWeightChange = (ticker: string, rawVal: number) => {
    const newVal = Math.max(0, Math.min(100, rawVal));
    const activeItems = items.filter(i => !i.suppressed);
    const otherActiveItems = activeItems.filter(i => i.ticker !== ticker);
    const currentOthersSum = otherActiveItems.reduce((sum, i) => sum + i.weight, 0);
    const targetOthersSum = 100 - newVal;

    setItems(items.map(i => {
      if (i.ticker === ticker) return { ...i, weight: newVal };
      if (i.suppressed) return i;
      const newW = currentOthersSum <= 0.01 ? targetOthersSum / otherActiveItems.length : (i.weight / currentOthersSum) * targetOthersSum;
      return { ...i, weight: newW };
    }));
  };

  const handleSimulate = () => {
    if (items.length === 0) return;
    onSimulate({
        id: initialBasket?.id || 'temp',
        name,
        category,
        description: themeInput,
        items,
        allocationMode: mode,
        rebalanceInterval: rebalance,
        initialInvestment: investment,
        createdAt: initialBasket?.createdAt || Date.now()
    });
  };

  return (
    <div className="bg-white flex flex-col h-full border border-slate-200 shadow-2xl rounded-[32px] overflow-hidden">
      <div className="bg-slate-50 p-6 border-b border-slate-200 space-y-4">
          <div className="flex justify-between items-start">
              <div className="flex-1 mr-4">
                <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-transparent text-xl font-black text-slate-900 border-none focus:ring-0 p-0 w-full"
                    placeholder="Basket Name"
                />
                <div className="mt-1 flex items-center gap-2">
                    <Tag size={10} className="text-indigo-400" />
                    <select 
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="bg-transparent text-[10px] font-black text-indigo-600 uppercase tracking-widest outline-none cursor-pointer hover:underline"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
              </div>
              <button 
                onClick={() => onSave({ id: initialBasket?.id || crypto.randomUUID(), name, category, description: themeInput, items, allocationMode: mode, rebalanceInterval: rebalance, initialInvestment: investment, createdAt: initialBasket?.createdAt || Date.now() })}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
              >
                Save Portfolio
              </button>
          </div>

          <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
              <button onClick={() => setMode('weight')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'weight' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Scale size={14} /> Weight %
              </button>
              <button onClick={() => setMode('quantity')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'quantity' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Layers size={14} /> Quantity
              </button>
          </div>

          {mode === 'weight' && items.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
                <button onClick={distributeEqual} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-tight text-slate-600 hover:border-indigo-300 transition-all shadow-sm">
                    <Target size={12} className="text-indigo-500" /> Equal
                </button>
                <button onClick={distributeMarketCap} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-tight text-slate-600 hover:border-indigo-300 transition-all shadow-sm">
                    <BarChart4 size={12} className="text-indigo-500" /> Market Cap
                </button>
                <button onClick={distributeVolatility} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-tight text-slate-600 hover:border-indigo-300 transition-all shadow-sm col-span-2">
                    <Activity size={12} className="text-indigo-500" /> Inverse Volatility (Risk Parity)
                </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <label className="text-[9px] text-slate-400 uppercase font-black">Capital Target</label>
                  <div className="flex items-center text-slate-800 font-black">
                      <span className="text-[10px] mr-1 text-slate-400">₹</span>
                      <input type="number" value={investment} onChange={e => setInvestment(Number(e.target.value))} className="bg-transparent w-full focus:outline-none text-sm" />
                  </div>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <label className="text-[9px] text-slate-400 uppercase font-black">Rebalance</label>
                  <select value={rebalance} onChange={e => setRebalance(e.target.value as any)} className="w-full bg-transparent font-black text-xs text-slate-800 outline-none appearance-none">
                      <option value="none">None</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                  </select>
              </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/10 custom-scrollbar">
          {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                  <PieChart size={48} className="text-slate-200 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Basket is Empty</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">Use Asset Explorer to add stocks</p>
              </div>
          ) : items.map(item => {
              const stock = availableStocks.find(s => s.ticker === item.ticker);
              return (
                  <div key={item.ticker} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <StockTooltip stock={stock}>
                                  <div className="w-10 h-10 bg-indigo-50 text-indigo-700 flex items-center justify-center rounded-xl font-black text-[10px]">
                                      {item.ticker.slice(0, 4)}
                                  </div>
                              </StockTooltip>
                              <div>
                                  <p className="text-xs font-black text-slate-900">{item.ticker}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">{stock?.sector || 'Equity'}</p>
                              </div>
                          </div>
                          <button onClick={() => setItems(items.filter(i => i.ticker !== item.ticker))} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                              <Trash2 size={16} />
                          </button>
                      </div>
                      <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                              <span className="text-[9px] text-slate-400 font-black uppercase">Weighting</span>
                              <div className="flex items-center gap-1">
                                  {mode === 'weight' ? (
                                      <div className="flex items-center gap-1">
                                          <input type="number" value={parseFloat(item.weight.toFixed(2))} onChange={e => handleWeightChange(item.ticker, parseFloat(e.target.value))} className="w-14 bg-slate-50 border border-slate-100 rounded px-1 py-0.5 text-right text-[10px] font-black text-slate-800 outline-none" />
                                          <span className="text-[9px] font-black text-slate-400">%</span>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-1">
                                          <input type="number" value={item.shares || 0} onChange={e => setItems(items.map(i => i.ticker === item.ticker ? { ...i, shares: parseInt(e.target.value) } : i))} className="w-14 bg-slate-50 border border-slate-100 rounded px-1 py-0.5 text-right text-[10px] font-black text-slate-800 outline-none" />
                                          <span className="text-[9px] font-black text-slate-400">SH</span>
                                      </div>
                                  )}
                              </div>
                          </div>
                          {mode === 'weight' && (
                              <input type="range" min="0" max="100" step="0.01" value={item.weight} onChange={e => handleWeightChange(item.ticker, parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                          )}
                      </div>
                  </div>
              );
          })}
          <button onClick={onOpenExplorer} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
              <Plus size={14} /> Explorer Assets
          </button>
      </div>

      <div className="p-6 bg-white border-t border-slate-100">
           <button 
              onClick={handleSimulate} 
              disabled={items.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCcw size={18} /> Run Backtest
          </button>
      </div>
    </div>
  );
};

export default BasketBuilder;
