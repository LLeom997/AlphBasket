
import React, { useState, useEffect, useMemo } from 'react';
import { Stock, BasketItem, Basket } from '../types';
import { suggestBasket } from '../services/gemini';
import StockTooltip from './StockTooltip';
import { Trash2, Wand2, PieChart, RefreshCcw, Wallet, Scale, Plus, Settings, ChevronDown, Eye, EyeOff, AlertTriangle, ShieldCheck, Layers } from 'lucide-react';

interface BasketBuilderProps {
  availableStocks: Stock[];
  initialBasket?: Basket | null;
  onSave: (basket: Basket) => void;
  onSimulate: (basket: Basket) => void;
  onOpenExplorer: () => void;
}

const BasketBuilder: React.FC<BasketBuilderProps> = ({ availableStocks, initialBasket, onSave, onSimulate, onOpenExplorer }) => {
  const [name, setName] = useState('New Analysis');
  const [items, setItems] = useState<BasketItem[]>([]);
  const [mode, setMode] = useState<'weight' | 'quantity'>('weight');
  const [rebalance, setRebalance] = useState<Basket['rebalanceInterval']>('monthly');
  const [investment, setInvestment] = useState<number>(100000);
  const [themeInput, setThemeInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);

  useEffect(() => {
    if (initialBasket) {
      setName(initialBasket.name);
      setItems(initialBasket.items);
      setMode(initialBasket.allocationMode || 'weight');
      setRebalance(initialBasket.rebalanceInterval);
      setInvestment(initialBasket.initialInvestment || 100000);
    }
  }, [initialBasket]);

  useEffect(() => {
     if (items.length > 0) {
        const timer = setTimeout(() => {
          handleSimulate();
        }, 500);
        return () => clearTimeout(timer);
     }
  }, [items, rebalance, investment, mode]);

  const handleWeightChange = (ticker: string, rawVal: number) => {
    let newVal = Math.max(0, Math.min(100, rawVal));
    const otherItems = items.filter(i => i.ticker !== ticker);
    const totalCurrentOtherWeight = otherItems.reduce((sum, i) => sum + i.weight, 0);
    const targetRemaining = 100 - newVal;

    const newItems = items.map(i => {
      if (i.ticker === ticker) return { ...i, weight: newVal };
      let newWeight = totalCurrentOtherWeight === 0 ? targetRemaining / otherItems.length : targetRemaining * (i.weight / totalCurrentOtherWeight);
      return { ...i, weight: newWeight };
    });
    setItems(newItems);
  };

  const handleQuantityChange = (ticker: string, qty: number) => {
    setItems(items.map(i => i.ticker === ticker ? { ...i, shares: Math.max(0, qty) } : i));
  };

  const handleSimulate = () => {
    onSimulate({
        id: initialBasket?.id || 'temp',
        name,
        description: themeInput,
        items,
        allocationMode: mode,
        rebalanceInterval: rebalance,
        initialInvestment: investment,
        createdAt: Date.now()
    });
  };

  const handleBalance = (type: 'equal' | 'cap' | 'risk') => {
    if (items.length === 0) return;
    let newItems = [...items];
    const getStock = (ticker: string) => availableStocks.find(s => s.ticker === ticker);
    const activeItems = newItems.filter(i => !i.suppressed);

    if (type === 'equal') {
        const w = 100 / activeItems.length;
        newItems = newItems.map(i => i.suppressed ? i : ({ ...i, weight: w }));
    } else if (type === 'cap') {
        const withData = activeItems.map(i => ({ ...i, val: getStock(i.ticker)?.marketCap || 0 }));
        const total = withData.reduce((sum, x) => sum + x.val, 0);
        if (total > 0) {
            newItems = newItems.map(i => {
                if (i.suppressed) return i;
                const dataItem = withData.find(d => d.ticker === i.ticker);
                return { ...i, weight: (dataItem!.val / total) * 100 };
            });
        }
    }
    setItems(newItems);
    setShowBalanceMenu(false);
  };

  return (
    <div className="bg-white flex flex-col h-full border border-slate-200 shadow-2xl rounded-[32px] overflow-hidden">
      <div className="bg-slate-50 p-6 border-b border-slate-200 space-y-4">
          <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent text-xl font-black text-slate-900 border-none focus:ring-0 p-0"
              placeholder="Basket Name"
          />

          <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
              <button 
                  onClick={() => setMode('weight')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'weight' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                  <Scale size={14} /> Weight Mode
              </button>
              <button 
                  onClick={() => setMode('quantity')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'quantity' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                  <Layers size={14} /> Quantity Mode
              </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <label className="text-[9px] text-slate-400 uppercase font-black">Investment Cap</label>
                  <div className="flex items-center text-slate-800 font-black">
                      <span className="text-[10px] mr-1">₹</span>
                      <input 
                          type="number" 
                          value={investment} 
                          disabled={mode === 'quantity'}
                          onChange={e => setInvestment(Number(e.target.value))}
                          className="bg-transparent w-full focus:outline-none text-sm disabled:opacity-30" 
                      />
                  </div>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <label className="text-[9px] text-slate-400 uppercase font-black">Rebalance</label>
                  <select 
                      value={rebalance}
                      onChange={e => setRebalance(e.target.value as any)}
                      className="w-full bg-transparent font-black text-xs text-slate-800 focus:outline-none appearance-none cursor-pointer"
                  >
                      <option value="none">None</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                  </select>
              </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/10">
          {items.map(item => {
              const stock = availableStocks.find(s => s.ticker === item.ticker);
              return (
                  <div key={item.ticker} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                          <StockTooltip stock={stock}>
                              <div className="w-10 h-10 bg-indigo-50 text-indigo-700 flex items-center justify-center rounded-lg font-black text-[10px]">
                                  {item.ticker.slice(0, 4)}
                              </div>
                          </StockTooltip>
                          <div>
                              <p className="text-xs font-black text-slate-900">{item.ticker}</p>
                              <p className="text-[9px] text-slate-400 font-bold">{stock?.name || 'Loading...'}</p>
                          </div>
                      </div>

                      <div className="flex items-center gap-3">
                          {mode === 'weight' ? (
                              <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 flex items-center">
                                  <input 
                                      type="number"
                                      value={item.weight.toFixed(1)}
                                      onChange={e => handleWeightChange(item.ticker, parseFloat(e.target.value))}
                                      className="w-10 bg-transparent text-right text-xs font-black text-slate-800 outline-none"
                                  />
                                  <span className="text-[9px] font-black text-slate-400 ml-1">%</span>
                              </div>
                          ) : (
                              <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 flex items-center">
                                  <input 
                                      type="number"
                                      value={item.shares || 0}
                                      onChange={e => handleQuantityChange(item.ticker, parseInt(e.target.value))}
                                      className="w-10 bg-transparent text-right text-xs font-black text-slate-800 outline-none"
                                  />
                                  <span className="text-[9px] font-black text-slate-400 ml-1">SH</span>
                              </div>
                          )}
                          <button onClick={() => setItems(items.filter(i => i.ticker !== item.ticker))} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                          </button>
                      </div>
                  </div>
              );
          })}
          
          <button onClick={onOpenExplorer} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all">
              + Add Assets from Library
          </button>
      </div>

      <div className="p-6 bg-white border-t border-slate-100">
           <button 
              onClick={handleSimulate}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
           >
              <RefreshCcw size={18} /> Update Simulation
          </button>
      </div>
    </div>
  );
};

export default BasketBuilder;
