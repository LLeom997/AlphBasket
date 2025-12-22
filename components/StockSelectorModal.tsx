
import React, { useState, useMemo } from 'react';
import { Stock } from '../types';
import { Search, X, Check, Filter, TrendingUp, ArrowDownUp, ShieldAlert, ArrowUp, ArrowDown } from 'lucide-react';
import StockTooltip from './StockTooltip';

interface StockSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: Stock[];
  onAdd: (tickers: string[]) => void;
  alreadySelected: string[];
}

const StockSelectorModal: React.FC<StockSelectorModalProps> = ({ 
  isOpen, onClose, stocks, onAdd, alreadySelected 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [selectedUniverse, setSelectedUniverse] = useState<string>('All');
  const [selectedPerformance, setSelectedPerformance] = useState<string>('All');
  const [selectedRisk, setSelectedRisk] = useState<string>('All');
  
  const [sortBy, setSortBy] = useState<string>('Market Cap');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc');
  
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set());

  // Extract unique filters
  const sectors = useMemo(() => ['All', ...new Set(stocks.map(s => s.sector))], [stocks]);
  const universes = useMemo(() => ['All', ...new Set(stocks.map(s => s.universe))], [stocks]);

  const filteredStocks = useMemo(() => {
    const TRADING_DAYS = 252;
    
    // 1. Filter
    const filtered = stocks.filter(stock => {
      const matchesSearch = stock.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            stock.ticker.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSector = selectedSector === 'All' || stock.sector === selectedSector;
      const matchesUniverse = selectedUniverse === 'All' || stock.universe === selectedUniverse;
      
      let matchesPerf = true;
      // Only filter by perf if we actually have data (non-zero)
      if (stock.returns.oneYear !== 0) {
          if (selectedPerformance === '1Y > 10%') matchesPerf = stock.returns.oneYear > 0.10;
          if (selectedPerformance === '1Y > 20%') matchesPerf = stock.returns.oneYear > 0.20;
          if (selectedPerformance === '2Y > 20%') matchesPerf = stock.returns.twoYear > 0.20;
          if (selectedPerformance === '5Y > 50%') matchesPerf = stock.returns.fiveYear > 0.50;
          if (selectedPerformance === 'Momentum (1Y > 30%)') matchesPerf = stock.returns.oneYear > 0.30;
          if (selectedPerformance === 'Value (1Y < -10%)') matchesPerf = stock.returns.oneYear < -0.10;
      }

      // Annualized Volatility approx
      const annualizedVol = stock.volatility * Math.sqrt(TRADING_DAYS);
      let matchesRisk = true;
      if (stock.volatility !== 0) {
          if (selectedRisk === 'Low (<20%)') matchesRisk = annualizedVol < 0.20;
          if (selectedRisk === 'Medium (20-30%)') matchesRisk = annualizedVol >= 0.20 && annualizedVol <= 0.30;
          if (selectedRisk === 'High (>30%)') matchesRisk = annualizedVol > 0.30;
      }

      return matchesSearch && matchesSector && matchesUniverse && matchesPerf && matchesRisk && !alreadySelected.includes(stock.ticker);
    });

    // 2. Sort
    return filtered.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (sortBy) {
        case 'Market Cap':
          valA = a.marketCap;
          valB = b.marketCap;
          break;
        case '1Y Return':
          valA = a.returns.oneYear;
          valB = b.returns.oneYear;
          break;
        case '5Y Return':
          valA = a.returns.fiveYear;
          valB = b.returns.fiveYear;
          break;
        case 'Volatility':
          valA = a.volatility;
          valB = b.volatility;
          break;
        case 'Name':
          return sortOrder === 'asc' ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
        default:
          valA = a.marketCap;
          valB = b.marketCap;
      }

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

  }, [stocks, searchTerm, selectedSector, selectedUniverse, selectedPerformance, selectedRisk, alreadySelected, sortBy, sortOrder]);

  const toggleSelection = (ticker: string) => {
    const newSet = new Set(selectedTickers);
    if (newSet.has(ticker)) {
      newSet.delete(ticker);
    } else {
      newSet.add(ticker);
    }
    setSelectedTickers(newSet);
  };

  const handleAdd = () => {
    onAdd(Array.from(selectedTickers));
    setSelectedTickers(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 sm:rounded-2xl w-full max-w-5xl h-[92vh] sm:h-[85vh] flex flex-col shadow-2xl rounded-t-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-3 lg:p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              Select Assets
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-normal">
                {filteredStocks.length}
              </span>
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-2 rounded-full hover:bg-slate-100 border border-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 space-y-3 bg-white border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search ticker..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-col lg:flex-row gap-2">
            {/* Filters Group */}
            <div className="flex flex-wrap gap-2 flex-1">
                <select 
                    value={selectedUniverse}
                    onChange={e => setSelectedUniverse(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400"
                >
                    {universes.map(u => <option key={u} value={u}>{u}</option>)}
                </select>

                <select 
                    value={selectedSector}
                    onChange={e => setSelectedSector(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 max-w-[120px] truncate"
                >
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select 
                    value={selectedPerformance}
                    onChange={e => setSelectedPerformance(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400"
                >
                    <option value="All">All Returns</option>
                    <option value="1Y > 10%">1Y {'>'} 10%</option>
                    <option value="Momentum (1Y > 30%)">Momentum</option>
                    <option value="Value (1Y < -10%)">Value</option>
                </select>
                
                 <select 
                    value={selectedRisk}
                    onChange={e => setSelectedRisk(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400"
                >
                    <option value="All">All Risk</option>
                    <option value="Low (<20%)">Low Vol</option>
                    <option value="High (>30%)">High Vol</option>
                </select>
            </div>

            {/* Sorting Group */}
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-200 lg:ml-auto w-fit">
                <ArrowDownUp size={12} className="text-slate-400" />
                <select 
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 outline-none cursor-pointer"
                >
                    <option value="Market Cap">Cap</option>
                    <option value="1Y Return">1Y %</option>
                    <option value="Volatility">Vol</option>
                    <option value="Name">Name</option>
                </select>
                <button 
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="text-slate-400 hover:text-slate-600"
                >
                    {sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                </button>
            </div>
          </div>
        </div>

        {/* Stock Grid */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-slate-50">
          {filteredStocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <Filter size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No stocks found</p>
                <button 
                    onClick={() => {
                        setSearchTerm('');
                        setSelectedSector('All');
                        setSelectedPerformance('All');
                        setSelectedRisk('All');
                    }}
                    className="mt-2 text-indigo-600 hover:underline text-xs font-bold"
                >
                    Clear all filters
                </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredStocks.map(stock => {
                    const isSelected = selectedTickers.has(stock.ticker);
                    
                    let displayMetricLabel = '1Y';
                    let displayMetricVal = stock.returns.oneYear;
                    
                    if (sortBy === '5Y Return' || selectedPerformance.includes('5Y')) {
                        displayMetricLabel = '5Y';
                        displayMetricVal = stock.returns.fiveYear;
                    }
                    
                    const annualizedVol = stock.volatility * Math.sqrt(252);
                    const showVol = sortBy === 'Volatility' || selectedRisk !== 'All';

                    // If no data loaded yet (vol 0), show placeholder
                    const hasHistory = stock.volatility !== 0;

                    return (
                        <StockTooltip key={stock.ticker} stock={stock}>
                            <div 
                                onClick={() => toggleSelection(stock.ticker)}
                                className={`
                                    cursor-pointer rounded-lg p-3 border transition-all flex justify-between items-center group relative
                                    ${isSelected 
                                        ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300 shadow-sm' 
                                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                                    }
                                `}
                            >
                                <div className="min-w-0 pr-2">
                                    <div className="flex items-baseline gap-2 mb-0.5">
                                        <span className={`font-bold text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                                            {stock.ticker}
                                        </span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                            {stock.universe === 'Nifty 50' ? 'N50' : 'Next'}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">{stock.name}</div>
                                </div>
                                
                                <div className="text-right flex-shrink-0">
                                    {showVol ? (
                                        <div>
                                            <div className={`text-xs font-bold ${annualizedVol > 0.3 ? 'text-amber-600' : 'text-slate-700'}`}>
                                                {hasHistory ? `${(annualizedVol * 100).toFixed(1)}%` : '--'}
                                            </div>
                                            <div className="text-[9px] text-slate-400 uppercase">Vol</div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className={`text-xs font-bold ${displayMetricVal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {hasHistory 
                                                  ? `${displayMetricVal > 0 ? '+' : ''}${(displayMetricVal * 100).toFixed(1)}%` 
                                                  : '--'
                                                }
                                            </div>
                                            <div className="text-[9px] text-slate-400 uppercase">{displayMetricLabel}</div>
                                        </div>
                                    )}
                                </div>
                                
                                {isSelected && (
                                    <div className="absolute top-[-6px] right-[-6px] animate-in zoom-in-50 duration-200">
                                        <div className="bg-indigo-600 rounded-full p-0.5 border-2 border-white shadow-sm">
                                            <Check size={10} className="text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </StockTooltip>
                    );
                })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 sm:rounded-b-2xl flex justify-between items-center">
            <span className="text-xs text-slate-500">{selectedTickers.size} selected</span>
            <div className="flex gap-2">
                <button 
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleAdd}
                    disabled={selectedTickers.size === 0}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-indigo-200"
                >
                    Add Selected
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StockSelectorModal;
