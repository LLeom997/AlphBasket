import React, { useState, useEffect, useRef } from 'react';
import { Stock, BasketItem, Basket } from '../types';
import StockTooltip from './StockTooltip';
import { uploadBasketIcon } from '../services/database/projectService';
import {
  Trash2, RefreshCcw, Plus,
  BarChart4, Activity, Target, Tag,
  IndianRupee, LayoutList, Loader2, Eye, EyeOff, Image as ImageIcon, Camera, Check
} from 'lucide-react';

interface BasketBuilderProps {
  availableStocks: Stock[];
  initialBasket?: Basket | null;
  onSave: (basket: Basket) => void;
  onSimulate: (basket: Basket) => void;
  onOpenExplorer: () => void;
  isSimulating?: boolean;
}

const CATEGORIES = ['Growth Strategy', 'Value Investing', 'Dividend Yield', 'Momentum Alpha', 'Experimental'];

const BasketBuilder: React.FC<BasketBuilderProps> = ({ availableStocks, initialBasket, onSave, onSimulate, onOpenExplorer, isSimulating }) => {
  const [name, setName] = useState('New Alpha Design');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [iconUrl, setIconUrl] = useState<string | undefined>();
  const [items, setItems] = useState<BasketItem[]>([]);
  const [mode, setMode] = useState<'weight' | 'quantity'>('weight');
  const [rebalance, setRebalance] = useState<Basket['rebalanceInterval']>('none');
  const [investment, setInvestment] = useState<number>(100000);
  const [isUploading, setIsUploading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

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
      onSave({ ...initialBasket, iconUrl: url });
    }
    setIsUploading(false);
  };

  const getModifiedBasket = () => {
    if (!initialBasket) return null;
    const itemsChanged = JSON.stringify(items) !== JSON.stringify(initialBasket.items);
    const investmentChanged = investment !== initialBasket.initialInvestment;
    const modeChanged = mode !== initialBasket.allocationMode;
    const structureModified = itemsChanged || investmentChanged || modeChanged;

    return {
      id: initialBasket.id,
      name,
      category,
      description: '',
      iconUrl,
      items,
      allocationMode: mode,
      rebalanceInterval: rebalance,
      initialInvestment: investment,
      createdAt: initialBasket.createdAt,
      updatedAt: structureModified ? Date.now() : (initialBasket.updatedAt || initialBasket.createdAt),
      inceptionValue: structureModified ? undefined : initialBasket.inceptionValue,
      inceptionReturn: structureModified ? 0 : initialBasket.inceptionReturn,
      growthScore: initialBasket.growthScore,
      sharpeRatio: initialBasket.sharpeRatio,
      maxDrawdown: initialBasket.maxDrawdown,
      cagr: initialBasket.cagr,
      irr: initialBasket.irr,
      cagr1y: initialBasket.cagr1y,
      cagr3y: initialBasket.cagr3y,
      cagr5y: initialBasket.cagr5y,
      todayReturn: initialBasket.todayReturn,
      volatility: initialBasket.volatility
    } as Basket;
  };

  const handleSaveInternal = () => {
    const basket = getModifiedBasket();
    if (basket) {
      onSave(basket);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  };

  const distributeEqual = () => {
    const activeItems = items.filter(i => !i.suppressed);
    if (activeItems.length === 0) return;
    const eq = 100 / activeItems.length;
    setItems(items.map(i => ({ ...i, weight: i.suppressed ? 0 : eq })));
  };

  const toggleSuppressed = (ticker: string) => {
    const updated = items.map(item => item.ticker === ticker ? { ...item, suppressed: !item.suppressed } : item);
    const activeItems = updated.filter(i => !i.suppressed);
    if (activeItems.length === 0) { setItems(updated); return; }
    const totalActive = activeItems.reduce((sum, i) => sum + i.weight, 0);
    if (totalActive === 0) {
      const eq = 100 / activeItems.length;
      setItems(updated.map(i => ({ ...i, weight: i.suppressed ? 0 : eq })));
    } else {
      setItems(updated.map(i => ({ ...i, weight: i.suppressed ? 0 : (i.weight / totalActive) * 100 })));
    }
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

  const currentTotalWeight = items.reduce((sum, i) => sum + (i.suppressed ? 0 : i.weight), 0);

  return (
    <div className="bg-white flex flex-col h-full border border-slate-200 shadow-sm rounded-xl overflow-hidden min-h-[600px] lg:min-h-0">
      <div className="p-4 border-b border-slate-100 bg-slate-50/30">
        <div className="flex justify-between items-start mb-4 gap-3">
          <div onClick={() => fileInputRef.current?.click()} className="w-10 h-10 bg-white border border-slate-200 rounded-lg overflow-hidden cursor-pointer flex items-center justify-center hover:bg-slate-50 transition-all relative shrink-0 shadow-sm group">
            {isUploading ? <Loader2 size={14} className="animate-spin text-brand-teal" /> : iconUrl ? <img src={iconUrl} alt="Icon" className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-slate-300" />}
            <div className="absolute inset-0 bg-brand-teal/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"><Camera size={12} /></div>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/png,image/jpeg" onChange={handleIconUpload} />
          <div className="flex-1 min-w-0">
            <input value={name} onChange={(e) => setName(e.target.value)} className="bg-transparent text-base font-bold text-slate-900 border-none focus:ring-0 p-0 w-full placeholder:text-slate-300" placeholder="Strategy Name" />
            <div className="mt-1 flex items-center gap-2">
              <select value={category} onChange={e => setCategory(e.target.value)} className="bg-white border border-slate-200 text-[9px] font-bold text-slate-500 uppercase tracking-wider px-2 py-0.5 rounded outline-none appearance-none cursor-pointer">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSaveInternal} className={`p-2 rounded-lg transition-all ${justSaved ? 'text-brand-green bg-brand-green/10' : 'text-slate-400 hover:text-brand-teal hover:bg-brand-teal/5'}`}>
            {justSaved ? <Check size={16} /> : <RefreshCcw size={16} />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-white rounded-lg border border-slate-200">
            <label className="text-[8px] text-slate-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><IndianRupee size={10} /> Capital</label>
            <input type="number" value={investment} onChange={e => setInvestment(Number(e.target.value))} className="bg-transparent w-full focus:outline-none text-xs font-semibold text-slate-900" />
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-slate-200">
            <label className="text-[8px] text-slate-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><RefreshCcw size={10} /> Frequency</label>
            <select value={rebalance} onChange={e => setRebalance(e.target.value as any)} className="w-full bg-transparent font-semibold text-[10px] text-slate-900 outline-none appearance-none">
              <option value="none">Hold</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-3.5 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <LayoutList size={14} className="text-brand-teal" />
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-900">Assets ({items.length})</h4>
          </div>
          <div className="flex bg-slate-50 p-0.5 rounded-lg border border-slate-200">
            <button onClick={() => setMode('weight')} className={`px-2 py-0.5 rounded text-[9px] font-bold ${mode === 'weight' ? 'bg-white text-brand-teal shadow-sm' : 'text-slate-400'}`}>%</button>
            <button onClick={() => setMode('quantity')} className={`px-2 py-0.5 rounded text-[9px] font-bold ${mode === 'quantity' ? 'bg-white text-brand-teal shadow-sm' : 'text-slate-400'}`}>Qty</button>
          </div>
        </div>

        <div className="p-3.5 space-y-2">
          {items.length === 0 ? (
            <div className="p-10 border border-dashed border-slate-200 rounded-lg text-center">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-300">Strategy Empty</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.ticker} className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${item.suppressed ? 'bg-slate-50 border-slate-100 opacity-50' : 'bg-white border-slate-200 hover:border-brand-teal/30'}`}>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleSuppressed(item.ticker)} className="text-slate-300 hover:text-brand-teal transition-colors">
                    {item.suppressed ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <StockTooltip stock={availableStocks.find(s => s.ticker === item.ticker)}>
                        <span className="font-bold text-[11px] text-slate-800">{item.ticker}</span>
                      </StockTooltip>
                      {availableStocks.find(s => s.ticker === item.ticker)?.data && (
                        <span className="text-[7px] font-black text-slate-400 uppercase bg-slate-50 px-1 py-0.5 rounded border border-slate-100">
                          {new Date(availableStocks.find(s => s.ticker === item.ticker)!.data[0].date).getFullYear()} - {new Date(availableStocks.find(s => s.ticker === item.ticker)!.data.slice(-1)[0].date).getFullYear()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" disabled={item.suppressed} value={mode === 'weight' ? parseFloat(item.weight.toFixed(2)) : item.shares || 0} onChange={e => mode === 'weight' ? handleWeightChange(item.ticker, parseFloat(e.target.value)) : setItems(items.map(i => i.ticker === item.ticker ? { ...i, shares: parseInt(e.target.value) } : i))} className="w-14 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-right text-[11px] font-semibold outline-none focus:border-brand-teal transition-colors" />
                  <button onClick={() => setItems(items.filter(i => i.ticker !== item.ticker))} className="text-slate-200 hover:text-brand-red transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            ))
          )}
          <button onClick={onOpenExplorer} className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:bg-brand-teal/5 hover:text-brand-teal hover:border-brand-teal/20 transition-all flex items-center justify-center gap-2"><Plus size={14} /> Add Asset</button>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
        {mode === 'weight' && items.length > 0 && (
          <div className="flex gap-1.5">
            {[
              { id: 'eq', icon: Target, fn: distributeEqual, label: 'Equal' },
              { id: 'risk', icon: Activity, fn: () => { }, label: 'Risk' }
            ].map(btn => (
              <button key={btn.id} onClick={btn.fn} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-bold uppercase text-slate-500 hover:bg-brand-teal/5 hover:text-brand-teal transition-all">
                <btn.icon size={12} /> {btn.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Weight Integrity</span>
          <span className={`text-[10px] font-bold ${Math.abs(currentTotalWeight - 100) < 0.1 ? 'text-brand-green' : 'text-brand-red'}`}>
            {currentTotalWeight.toFixed(1)}%
          </span>
        </div>
        <button onClick={() => {
          const basket = getModifiedBasket();
          if (basket) onSimulate(basket);
        }} disabled={items.filter(i => !i.suppressed).length === 0 || isSimulating} className={`w-full py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-[11px] ${isSimulating ? 'bg-slate-100 text-slate-300' : 'bg-brand-teal hover:opacity-90 text-white shadow-sm shadow-brand-teal/20'}`}>
          {isSimulating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          {isSimulating ? 'Simulating...' : 'Analyze Basket'}
        </button>
      </div>
    </div>
  );
};

export default BasketBuilder;