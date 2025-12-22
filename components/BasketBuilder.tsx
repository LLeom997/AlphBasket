
import React, { useState, useEffect } from 'react';
import { Stock, BasketItem, Basket } from '../types';
import { suggestBasket } from '../services/gemini';
import StockSelectorModal from './StockSelectorModal';
import StockTooltip from './StockTooltip';
import { Trash2, Wand2, PieChart, RefreshCcw, Wallet, Scale, Plus, Settings, ChevronDown, Eye, EyeOff, IndianRupee } from 'lucide-react';

interface BasketBuilderProps {
  availableStocks: Stock[];
  initialBasket?: Basket | null;
  onSave: (basket: Basket) => void;
  onSimulate: (basket: Basket) => void;
}

const BasketBuilder: React.FC<BasketBuilderProps> = ({ availableStocks, initialBasket, onSave, onSimulate }) => {
  const [name, setName] = useState('My India Portfolio');
  const [items, setItems] = useState<BasketItem[]>([]);
  const [rebalance, setRebalance] = useState<Basket['rebalanceInterval']>('monthly');
  const [investment, setInvestment] = useState<number>(100000);
  const [themeInput, setThemeInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);

  useEffect(() => {
    if (initialBasket) {
      setName(initialBasket.name);
      setItems(initialBasket.items);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, rebalance, investment]);

  const handleAddStocks = (tickers: string[]) => {
    const newItems = tickers.map(ticker => ({ ticker, weight: 0 }));
    const combined = [...items, ...newItems];
    if (items.length === 0) {
        const eq = 100 / combined.length;
        setItems(combined.map(i => ({ ...i, weight: eq })));
    } else {
        setItems(combined);
    }
  };

  const handleRemoveItem = (ticker: string) => {
    const remaining = items.filter(i => i.ticker !== ticker);
    const removedItem = items.find(i => i.ticker === ticker);
    const removedWeight = removedItem?.weight || 0;
    
    // Only redistribute if the removed item was not suppressed
    const totalRemaining = remaining.reduce((sum, i) => sum + i.weight, 0);

    const newItems = remaining.map(i => {
        if (totalRemaining === 0) return { ...i, weight: 100 / remaining.length };
        if (i.suppressed) return i; // Don't add weight to suppressed items
        
        return {
            ...i,
            weight: i.weight + (removedWeight * (i.weight / totalRemaining))
        };
    });

    setItems(newItems);
  };

  const handleToggleSuppress = (ticker: string) => {
    const item = items.find(i => i.ticker === ticker);
    if (!item) return;

    if (!item.suppressed) {
        // Suppressing: Save original weight, then distribute weight to others
        const weightToDistribute = item.weight;
        const activeOthers = items.filter(i => i.ticker !== ticker && !i.suppressed);
        const totalActiveWeight = activeOthers.reduce((sum, i) => sum + i.weight, 0);

        const newItems = items.map(i => {
            if (i.ticker === ticker) {
                // Store original weight so we can restore it later
                return { ...i, weight: 0, suppressed: true, originalWeight: weightToDistribute };
            }
            if (i.suppressed) return i; // Don't give weight to other suppressed items

            // Distribute proportionally
            // If all others are 0 (edge case), distribute equally
            const share = totalActiveWeight > 0 ? (i.weight / totalActiveWeight) : (1 / activeOthers.length);
            return { ...i, weight: i.weight + (weightToDistribute * share) };
        });
        setItems(newItems);
    } else {
        // Unsuppressing: Restore original weight and adjust others to fit
        const targetWeight = item.originalWeight ?? 0;
        
        const activeOthers = items.filter(i => i.ticker !== ticker && !i.suppressed);
        const currentActiveSum = activeOthers.reduce((sum, i) => sum + i.weight, 0);
        
        // Calculate if we need to scale down others to make room
        // If (currentSum + target) > 100, we scale others down so the total is 100
        const totalProjected = currentActiveSum + targetWeight;
        const overflow = totalProjected - 100;

        const newItems = items.map(i => {
            if (i.ticker === ticker) {
                // Restore item
                return { ...i, weight: targetWeight, suppressed: false, originalWeight: undefined };
            }
            if (i.suppressed) return i;

            // Scale down active others if needed
            if (overflow > 0.01 && currentActiveSum > 0) {
                 // We want the others to sum to (100 - targetWeight)
                 const scaleFactor = (100 - targetWeight) / currentActiveSum;
                 return { ...i, weight: i.weight * scaleFactor };
            }
            return i;
        });
        setItems(newItems);
    }
  };

  const handleWeightChange = (ticker: string, rawVal: number) => {
    let newVal = Math.max(0, Math.min(100, rawVal));
    if (items.length === 1) {
        setItems([{ ...items[0], weight: 100 }]);
        return;
    }
    const otherItems = items.filter(i => i.ticker !== ticker);
    const totalCurrentOtherWeight = otherItems.reduce((sum, i) => sum + i.weight, 0);
    const targetRemaining = 100 - newVal;

    const newItems = items.map(i => {
      if (i.ticker === ticker) return { ...i, weight: newVal };
      let newWeight = 0;
      if (totalCurrentOtherWeight === 0) {
        newWeight = targetRemaining / otherItems.length;
      } else {
        newWeight = targetRemaining * (i.weight / totalCurrentOtherWeight);
      }
      return { ...i, weight: newWeight };
    });
    setItems(newItems);
  };

  const handleBalance = (type: 'equal' | 'cap' | 'risk') => {
    if (items.length === 0) return;
    
    let newItems = [...items];
    const getStock = (ticker: string) => availableStocks.find(s => s.ticker === ticker);

    // Only balance active items
    const activeItems = newItems.filter(i => !i.suppressed);
    
    if (activeItems.length === 0) return;

    if (type === 'equal') {
        const w = 100 / activeItems.length;
        newItems = newItems.map(i => i.suppressed ? i : ({ ...i, weight: w }));
    } 
    else if (type === 'cap') {
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
    else if (type === 'risk') {
        // Inverse volatility: Higher weight for lower vol
        const withData = activeItems.map(i => ({ ...i, val: 1 / (getStock(i.ticker)?.volatility || 0.01) }));
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

  const handleGeminiSuggest = async () => {
    if (!themeInput) return;
    setIsGenerating(true);
    const suggested = await suggestBasket(themeInput);
    if (suggested && suggested.length > 0) {
      setItems(suggested);
    }
    setIsGenerating(false);
  };

  const handleSimulate = () => {
    onSimulate({
        id: initialBasket?.id || 'temp',
        name,
        description: themeInput,
        items,
        rebalanceInterval: rebalance,
        initialInvestment: investment,
        createdAt: Date.now()
    });
  };

  const totalWeight = items.reduce((acc, i) => acc + i.weight, 0);
  const activeWeight = items.filter(i => !i.suppressed).reduce((acc, i) => acc + i.weight, 0);
  
  return (
    <>
      <StockSelectorModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        stocks={availableStocks}
        onAdd={handleAddStocks}
        alreadySelected={items.map(i => i.ticker)}
      />

      <div className="bg-white flex flex-col h-full border border-slate-200 shadow-xl overflow-hidden lg:rounded-2xl rounded-xl">
        
        {/* Header Section */}
        <div className="bg-slate-50/80 p-3 lg:p-4 border-b border-slate-200 space-y-3 shrink-0">
            <div className="relative">
                 <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent text-base lg:text-lg font-bold text-slate-900 placeholder-slate-400 border-none focus:ring-0 p-0 focus:border-b focus:border-indigo-500 transition-all"
                    placeholder="Portfolio Name"
                />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-white px-2 py-1.5 rounded-lg border border-slate-200 flex flex-col justify-center focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-sm">
                    <label className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1 mb-0.5">
                        <Wallet size={10} className="text-indigo-500" /> Capital (₹)
                    </label>
                    <input 
                        type="number"
                        value={investment}
                        onChange={(e) => setInvestment(Number(e.target.value))}
                        className="bg-transparent font-mono text-xs lg:text-sm font-bold w-full focus:outline-none text-slate-800"
                    />
                </div>
                <div className="bg-white px-2 py-1.5 rounded-lg border border-slate-200 flex flex-col justify-center focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-sm">
                    <label className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1 mb-0.5">
                        <Settings size={10} className="text-indigo-500" /> Rebalance
                    </label>
                    <select 
                        value={rebalance}
                        onChange={(e) => setRebalance(e.target.value as any)}
                        className="bg-transparent text-xs font-bold text-slate-800 w-full focus:outline-none cursor-pointer -ml-1"
                    >
                        <option value="none">Buy & Hold</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
            </div>

            {/* AI Bar */}
            <div className="relative group">
                <Wand2 className="absolute left-2.5 top-1.5 w-3.5 h-3.5 text-fuchsia-600 group-focus-within:text-fuchsia-500 transition-colors" />
                <input 
                    type="text" 
                    value={themeInput}
                    onChange={(e) => setThemeInput(e.target.value)}
                    placeholder="AI: 'High growth EV stocks'"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-8 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all placeholder-slate-400 h-8 shadow-sm"
                />
                <button 
                    onClick={handleGeminiSuggest}
                    disabled={isGenerating || !themeInput}
                    className="absolute right-1 top-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white p-1 rounded-md disabled:opacity-50 transition-colors h-6 w-6 flex items-center justify-center shadow-sm"
                >
                    {isGenerating ? <RefreshCcw size={12} className="animate-spin" /> : <Plus size={12} />}
                </button>
            </div>
        </div>

        {/* Stock List */}
        <div className="flex-1 overflow-y-auto p-2 lg:p-3 custom-scrollbar bg-slate-50">
            <div className="flex justify-between items-center mb-2 px-1 relative z-10">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Allocations ({items.length})
                </span>
                {items.length > 0 && (
                    <div className="relative">
                         <button 
                            onClick={() => setShowBalanceMenu(!showBalanceMenu)}
                            className="text-[10px] hover:bg-slate-200 text-indigo-600 px-2 py-0.5 rounded transition-colors flex items-center gap-1 font-medium bg-indigo-50 border border-indigo-100"
                        >
                            <Scale size={10} /> Auto-Balance <ChevronDown size={10} />
                        </button>
                        
                        {showBalanceMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowBalanceMenu(false)}></div>
                                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-xl z-20 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100 text-slate-800">
                                    <button onClick={() => handleBalance('equal')} className="text-left px-3 py-2 text-[11px] hover:bg-slate-100 transition-colors border-b border-slate-100">
                                        <span className="font-bold block text-slate-800">Equal Weight</span>
                                        <span className="text-slate-500 text-[9px]">Distribute evenly</span>
                                    </button>
                                    <button onClick={() => handleBalance('cap')} className="text-left px-3 py-2 text-[11px] hover:bg-slate-100 transition-colors border-b border-slate-100">
                                        <span className="font-bold block text-slate-800">Market Cap</span>
                                        <span className="text-slate-500 text-[9px]">Based on company size</span>
                                    </button>
                                    <button onClick={() => handleBalance('risk')} className="text-left px-3 py-2 text-[11px] hover:bg-slate-100 transition-colors">
                                        <span className="font-bold block text-slate-800">Low Volatility</span>
                                        <span className="text-slate-500 text-[9px]">Minimize risk</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 border border-dashed border-slate-300 rounded-xl bg-slate-100/50">
                        <PieChart size={24} className="mb-2 opacity-40" />
                        <p className="text-xs">Empty Portfolio</p>
                        <button onClick={() => setIsModalOpen(true)} className="mt-2 text-indigo-600 hover:text-indigo-500 text-xs font-bold">
                            Add Assets
                        </button>
                    </div>
                ) : (
                    items.map((item) => {
                        const stockInfo = availableStocks.find(s => s.ticker === item.ticker);
                        return (
                            <div key={item.ticker} className={`group bg-white rounded-lg p-3 border hover:border-slate-300 transition-all shadow-sm flex flex-col gap-2 ${item.suppressed ? 'border-slate-200 opacity-60 grayscale bg-slate-50' : 'border-slate-200'}`}>
                                
                                {/* Info Row */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <StockTooltip stock={stockInfo}>
                                            <div className={`h-8 px-2 min-w-[70px] shrink-0 rounded-md flex items-center justify-center text-[10px] font-bold cursor-help border truncate shadow-sm ${
                                                stockInfo?.universe === 'Nifty 50' 
                                                ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            }`}>
                                                {item.ticker}
                                            </div>
                                        </StockTooltip>
                                        
                                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                                            <div className="text-xs font-medium text-slate-700 truncate group-hover:text-slate-900 transition-colors" title={stockInfo?.name}>
                                                {stockInfo?.name || item.ticker}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                         <div className="flex items-baseline bg-slate-50 rounded border border-slate-200 px-2 py-1 focus-within:border-indigo-400 transition-colors">
                                            <input 
                                                type="number"
                                                value={item.weight.toFixed(1)}
                                                onChange={e => handleWeightChange(item.ticker, parseFloat(e.target.value))}
                                                className="w-12 sm:w-16 bg-transparent text-right text-xs font-mono font-bold text-slate-800 focus:outline-none focus:text-indigo-600 p-0"
                                                disabled={item.suppressed}
                                            />
                                            <span className="text-[10px] text-slate-500 ml-0.5">%</span>
                                         </div>
                                         
                                         <button
                                            onClick={() => handleToggleSuppress(item.ticker)}
                                            className={`p-1.5 rounded-md transition-colors ${item.suppressed ? 'text-slate-400 hover:text-slate-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                                            title={item.suppressed ? "Enable Asset" : "Suppress (Distribute Weight)"}
                                         >
                                             {item.suppressed ? <EyeOff size={14} /> : <Eye size={14} />}
                                         </button>

                                         <button 
                                            onClick={() => handleRemoveItem(item.ticker)} 
                                            className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* New Row for Price to make it very visible */}
                                {stockInfo?.currentPrice && (
                                    <div className="flex justify-between items-center pl-[82px]">
                                        <div className="flex items-baseline gap-1 bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100">
                                            <span className="text-[10px] text-emerald-600/70 font-bold uppercase tracking-wide">Live</span>
                                            <span className="text-sm font-bold text-emerald-700 font-mono">
                                                ₹{stockInfo.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Slider Row */}
                                <div className="px-1 pb-1 pt-1">
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        step="0.5"
                                        value={item.weight}
                                        onChange={(e) => handleWeightChange(item.ticker, Number(e.target.value))}
                                        className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer block ${item.suppressed ? 'accent-slate-400' : 'accent-indigo-600 hover:accent-indigo-500'}`}
                                        disabled={item.suppressed}
                                    />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full mt-3 py-2 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide group"
            >
                <div className="bg-slate-100 rounded-full p-0.5 group-hover:bg-indigo-100 transition-colors">
                    <Plus size={14} /> 
                </div>
                Add Assets
            </button>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-50/80 border-t border-slate-200 shrink-0">
             <div className="flex justify-between items-center mb-3 text-xs">
                <span className="text-slate-500 font-medium">Total Allocation</span>
                <div className="text-right">
                    <span className={`font-mono font-bold ${Math.abs(totalWeight - 100) < 0.1 ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {activeWeight.toFixed(1)}%
                    </span>
                    {activeWeight !== totalWeight && (
                        <span className="text-slate-400 ml-1">/ {totalWeight.toFixed(1)}%</span>
                    )}
                </div>
             </div>
             <button 
                onClick={() => onSave({
                    id: initialBasket?.id || crypto.randomUUID(),
                    name,
                    description: themeInput,
                    items,
                    rebalanceInterval: rebalance,
                    initialInvestment: investment,
                    createdAt: Date.now()
                })}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 text-sm"
             >
                <PieChart size={16} />
                Save Portfolio
            </button>
        </div>
      </div>
    </>
  );
};

export default BasketBuilder;
