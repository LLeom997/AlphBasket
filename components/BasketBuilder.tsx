
import React, { useState, useEffect, useRef } from 'react';
import { Stock, BasketItem, Basket } from '../types';
import StockTooltip from './StockTooltip';
import { uploadBasketIcon } from '../services/projectService';
import { 
  Trash2, RefreshCcw, Plus, 
  BarChart4, Activity, Target, Tag, 
  IndianRupee, LayoutList, Loader2, Eye, EyeOff, Image as ImageIcon, Camera
} from 'lucide-react';

interface BasketBuilderProps {
  availableStocks: Stock[];
  initialBasket?: Basket | null;
  onSave: (basket: Basket) => void;
  onSimulate: (basket: Basket) => void;
  onOpenExplorer: () => void;
  isSimulating?: boolean;
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

const BasketBuilder: React.FC<BasketBuilderProps> = ({ availableStocks, initialBasket, onSave, onSimulate, onOpenExplorer, isSimulating }) => {
  const [name, setName] = useState('New Analysis');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [iconUrl, setIconUrl] = useState<string | undefined>();
  const [items, setItems] = useState<BasketItem[]>([]);
  const [mode, setMode] = useState<'weight' | 'quantity'>('weight');
  const [rebalance, setRebalance] = useState<Basket['rebalanceInterval']>('none');
  const [investment, setInvestment] = useState<number>(100000);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialBasket) {
      setName(initialBasket.name);
      setCategory(initialBasket.category || CATEGORIES[0]);
      setIconUrl(initialBasket.iconUrl);
      setItems(initialBasket.items || []);
      setMode(initialBasket.allocationMode || 'weight');
      setRebalance(initialBasket.rebalanceInterval || 'none');
      setInvestment(initialBasket.initialInvestment || 100000);
    }
  }, [initialBasket]);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initialBasket) return;

    setIsUploading(true);
    const url = await uploadBasketIcon(initialBasket.id, file);
    if (url) {
        setIconUrl(url);
        // Auto-save the icon update
        onSave({ 
            id: initialBasket.id, 
            name, 
            category, 
            description: '', 
            iconUrl: url, 
            items, 
            allocationMode: mode, 
            rebalanceInterval: rebalance, 
            initialInvestment: investment, 
            createdAt: initialBasket.createdAt 
        });
    }
    setIsUploading(false);
  };

  const distributeEqual = () => {
    const activeItems = items.filter(i => !i.suppressed);
    if (activeItems.length === 0) return;
    const eq = 100 / activeItems.length;
    setItems(items.map(i => ({ 
      ...i, 
      weight: i.suppressed ? 0 : eq 
    })));
  };

  const redistributeWeights = (currentItems: BasketItem[]) => {
    const activeItems = currentItems.filter(i => !i.suppressed);
    const totalActiveWeight = activeItems.reduce((sum, i) => sum + i.weight, 0);

    if (activeItems.length === 0) return currentItems;
    
    if (totalActiveWeight === 0) {
      const eq = 100 / activeItems.length;
      return currentItems.map(i => ({ ...i, weight: i.suppressed ? 0 : eq }));
    }

    return currentItems.map(i => ({
      ...i,
      weight: i.suppressed ? 0 : (i.weight / totalActiveWeight) * 100
    }));
  };

  const toggleSuppressed = (ticker: string) => {
    const updated = items.map(item => {
      if (item.ticker === ticker) {
        return { ...item, suppressed: !item.suppressed };
      }
      return item;
    });
    setItems(redistributeWeights(updated));
  };

  const distributeMarketCap = () => {
    const activeItems = items.filter(i => !i.suppressed);
    if (activeItems.length === 0) return;
    const totalMCap = activeItems.reduce((sum, item) => {
      const s = availableStocks.find(st => st.ticker === item.ticker);
      return sum + (s?.marketCap || 0);
    }, 0);
    
    if (totalMCap === 0) distributeEqual();
    else {
      setItems(items.map(item => {
        if (item.suppressed) return { ...item, weight: 0 };
        const s = availableStocks.find(st => st.ticker === item.ticker);
        return { ...item, weight: ((s?.marketCap || 0) / totalMCap) * 100 };
      }));
    }
  };

  const distributeVolatility = () => {
    const activeItems = items.filter(i => !i.suppressed);
    if (activeItems.length === 0) return;
    const invVols = activeItems.map(item => {
      const s = availableStocks.find(st => st.ticker === item.ticker);
      return 1 / (s?.volatility || 0.2);
    });
    const totalInvVol = invVols.reduce((a, b) => a + b, 0);
    setItems(items.map(item => {
      if (item.suppressed) return { ...item, weight: 0 };
      const s = availableStocks.find(st => st.ticker === item.ticker);
      const invVol = 1 / (s?.volatility || 0.2);
      return { ...item, weight: (invVol / totalInvVol) * 100 };
    }));
  };

  const handleWeightChange = (ticker: string, rawVal: number) => {
    const newVal = Math.max(0, Math.min(100, rawVal));
    const activeItems = items.filter(i => !i.suppressed);
    const otherActiveItems = activeItems.filter(i => i.ticker !== ticker);
    const currentOthersSum = otherActiveItems.reduce((sum, i) => sum + i.weight, 0);
    const targetOthersSum = 100 - newVal;

    setItems(items.map(i => {
      if (i.ticker === ticker) return { ...i, weight: i.suppressed ? 0 : newVal };
      if (i.suppressed) return { ...i, weight: 0 };
      const newW = currentOthersSum <= 0.01 ? targetOthersSum / otherActiveItems.length : (i.weight / currentOthersSum) * targetOthersSum;
      return { ...i, weight: newW };
    }));
  };

  const handleSimulate = () => {
    if (items.filter(i => !i.suppressed).length === 0 || isSimulating) return;
    onSimulate({
        id: initialBasket?.id || 'temp',
        name,
        category,
        iconUrl,
        description: '',
        items,
        allocationMode: mode,
        rebalanceInterval: rebalance,
        initialInvestment: investment,
        createdAt: initialBasket?.createdAt || Date.now()
    });
  };

  const currentTotalWeight = items.reduce((sum, i) => sum + (i.suppressed ? 0 : i.weight), 0);

  return (
    <div className="bg-white flex flex-col h-full border border-slate-200 shadow-sm rounded-[24px] overflow-hidden min-h-[500px] lg:min-h-0">
      <div className="p-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex justify-between items-start mb-3 gap-3">
              <div className="relative group shrink-0">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden cursor-pointer flex items-center justify-center hover:bg-slate-100 transition-all relative"
                >
                    {isUploading ? (
                        <Loader2 size={16} className="animate-spin text-indigo-600" />
                    ) : iconUrl ? (
                        <img src={iconUrl} alt="Icon" className="w-full h-full object-cover" />
                    ) : (
                        <ImageIcon size={20} className="text-slate-300" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera size={14} className="text-white" />
                    </div>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/png,image/jpeg"
                    onChange={handleIconUpload}
                />
              </div>

              <div className="flex-1 min-w-0">
                  <input 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-transparent text-lg font-black text-slate-900 border-none focus:ring-0 p-0 w-full placeholder:text-slate-200"
                      placeholder="Untitled Strategy"
                  />
                  <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 rounded-full border border-indigo-100">
                          <Tag size={8} className="text-indigo-600" />
                          <select 
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="bg-transparent text-[8px] font-black text-indigo-700 uppercase tracking-widest outline-none cursor-pointer appearance-none"
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                  </div>
              </div>
              <button 
                onClick={() => onSave({ id: initialBasket?.id || crypto.randomUUID(), name, category, iconUrl, description: '', items, allocationMode: mode, rebalanceInterval: rebalance, initialInvestment: investment, createdAt: initialBasket?.createdAt || Date.now() })}
                className="bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0"
              >
                Sync
              </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <label className="flex items-center gap-1 text-[7px] text-slate-400 uppercase font-black tracking-widest mb-0.5">
                      <IndianRupee size={10} className="text-indigo-500" /> Capital
                  </label>
                  <div className="flex items-center text-slate-900 font-black">
                      <input 
                        type="number" 
                        value={investment} 
                        onChange={e => setInvestment(Number(e.target.value))} 
                        className="bg-transparent w-full focus:outline-none text-xs" 
                      />
                  </div>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <label className="flex items-center gap-1 text-[7px] text-slate-400 uppercase font-black tracking-widest mb-0.5">
                      <RefreshCcw size={10} className="text-indigo-500" /> Rebalance
                  </label>
                  <select 
                    value={rebalance} 
                    onChange={e => setRebalance(e.target.value as any)} 
                    className="w-full bg-transparent font-black text-[10px] text-slate-900 outline-none appearance-none"
                  >
                      <option value="none">Buy & Hold</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                  </select>
              </div>
          </div>
      </div>

      <div className="flex-1 min-h-[250px] lg:min-h-0 overflow-y-auto custom-scrollbar bg-slate-50/10">
          <div className="p-3 flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-sm z-10">
              <div className="flex items-center gap-1.5">
                  <LayoutList size={12} className="text-indigo-600" />
                  <h4 className="text-[8px] font-black uppercase tracking-widest text-slate-900">Assets ({items.length})</h4>
              </div>
              <div className="flex gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200">
                  <button onClick={() => setMode('weight')} className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase transition-all ${mode === 'weight' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>
                      %
                  </button>
                  <button onClick={() => setMode('quantity')} className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase transition-all ${mode === 'quantity' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>
                      Qty
                  </button>
              </div>
          </div>

          <div className="px-3 pb-3">
              {items.length === 0 ? (
                  <div className="h-[100px] flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-slate-100 rounded-2xl bg-white/50">
                      <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Workbench Empty</p>
                      <button onClick={onOpenExplorer} className="mt-1 text-[7px] font-black text-indigo-600 uppercase hover:underline">Add Instruments</button>
                  </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-[7px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="px-3 py-1.5 w-8"></th>
                                <th className="px-3 py-1.5">Ticker</th>
                                <th className="px-3 py-1.5 text-right">{mode === 'weight' ? 'Weight %' : 'Shares'}</th>
                                <th className="px-3 py-1.5 text-center w-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map(item => (
                                <tr key={item.ticker} className={`group transition-colors ${item.suppressed ? 'bg-slate-50 opacity-60' : 'hover:bg-indigo-50/30'}`}>
                                    <td className="px-3 py-1.5 text-center">
                                      <button onClick={() => toggleSuppressed(item.ticker)} className={`${item.suppressed ? 'text-slate-400' : 'text-indigo-600'} hover:scale-110 transition-transform`}>
                                        {item.suppressed ? <EyeOff size={10} /> : <Eye size={10} />}
                                      </button>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <StockTooltip stock={availableStocks.find(s => s.ticker === item.ticker)}>
                                            <span className={`font-black text-[9px] ${item.suppressed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.ticker}</span>
                                        </StockTooltip>
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            disabled={item.suppressed}
                                            value={mode === 'weight' ? parseFloat(item.weight.toFixed(2)) : item.shares || 0}
                                            onChange={e => mode === 'weight' ? handleWeightChange(item.ticker, parseFloat(e.target.value)) : setItems(items.map(i => i.ticker === item.ticker ? { ...i, shares: parseInt(e.target.value) } : i))}
                                            className={`w-16 bg-white border border-slate-100 rounded-md px-1.5 py-0.5 text-right text-[9px] font-black outline-none ${item.suppressed ? 'text-slate-300 bg-transparent' : 'text-slate-800 focus:border-indigo-500'}`}
                                        />
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                        <button onClick={() => setItems(items.filter(i => i.ticker !== item.ticker))} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={10} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              )}
              
              <button onClick={onOpenExplorer} className="w-full mt-2 py-2.5 border border-dashed border-slate-200 rounded-xl text-[8px] font-black text-slate-400 uppercase tracking-widest hover:bg-white hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
                  <Plus size={10} /> Add Assets
              </button>
          </div>
      </div>

      <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          {mode === 'weight' && items.length > 0 && (
            <div className="flex gap-1 mb-3">
                <button onClick={distributeEqual} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[7px] font-black uppercase text-slate-600 hover:bg-slate-100">
                    <Target size={10} /> Eq
                </button>
                <button onClick={distributeMarketCap} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[7px] font-black uppercase text-slate-600 hover:bg-slate-100">
                    <BarChart4 size={10} /> Cap
                </button>
                <button onClick={distributeVolatility} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[7px] font-black uppercase text-slate-600 hover:bg-slate-100">
                    <Activity size={10} /> Risk
                </button>
            </div>
          )}

          <div className="space-y-2">
              {mode === 'weight' && (
                  <div className="flex justify-between items-center px-1">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Convergence</span>
                      <span className={`text-[9px] font-black ${Math.abs(currentTotalWeight - 100) < 0.1 ? 'text-emerald-600' : 'text-amber-500'}`}>
                          {currentTotalWeight.toFixed(2)}%
                      </span>
                  </div>
              )}
              
              <button 
                onClick={handleSimulate} 
                disabled={items.filter(i => !i.suppressed).length === 0 || isSimulating}
                className={`w-full py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-[8px] shadow-sm ${
                    isSimulating 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100'
                }`}
              >
                {isSimulating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                {isSimulating ? 'Processing...' : 'Run Backtest'}
              </button>
          </div>
      </div>
    </div>
  );
};

export default BasketBuilder;
