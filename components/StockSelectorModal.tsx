import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Stock } from '../types';
import { getNseMasterList, syncSingleStock } from '../services/marketData';
import { Search, X, Check, Filter, RefreshCcw, LayoutGrid, Zap, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface StockCardProps {
  item: any;
  isSelected: boolean;
  onToggle: (ticker: string) => void;
}

const StockCard: React.FC<StockCardProps> = ({ 
  item, 
  isSelected, 
  onToggle 
}) => {
  const [syncedData, setSyncedData] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !syncedData && !loading) {
        handleSync();
      }
    }, { threshold: 0.1 });

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [syncedData, loading]);

  const handleSync = async () => {
    setLoading(true);
    const data = await syncSingleStock(item.symbol);
    if (data) setSyncedData(data);
    setLoading(false);
  };

  const fmtPct = (n: number) => (n * 100).toFixed(1) + '%';

  const sparkData = useMemo(() => {
      if (!syncedData?.data) return [];
      const step = Math.max(1, Math.floor(syncedData.data.length / 20));
      return syncedData.data.filter((_, i) => i % step === 0).map(d => ({ value: d.close }));
  }, [syncedData]);

  return (
    <div 
      ref={cardRef}
      onClick={() => onToggle(item.symbol)}
      className={`
        cursor-pointer rounded-2xl border transition-all flex flex-col group relative overflow-hidden bg-white min-h-[100px]
        ${isSelected 
            ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-lg' 
            : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
        }
      `}
    >
      <div className="p-3 sm:p-4 flex justify-between items-start">
        <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`font-black text-xs sm:text-sm uppercase tracking-tight ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                    {item.symbol}
                </span>
                <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-black uppercase tracking-widest hidden xs:inline-block">
                    {item.industry?.slice(0, 10) || 'EQUITY'}
                </span>
            </div>
            <div className="text-[9px] text-slate-400 font-bold truncate leading-none">
                {item.companyName}
            </div>
        </div>
        
        <div className="text-right shrink-0">
            {loading ? (
                <RefreshCcw size={12} className="animate-spin text-indigo-300" />
            ) : syncedData ? (
                <div className="flex flex-col items-end">
                    <div className={`text-[10px] sm:text-xs font-black flex items-center gap-1 ${syncedData.returns.oneYear >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmtPct(syncedData.returns.oneYear)}
                    </div>
                </div>
            ) : null}
        </div>
      </div>

      <div className="h-6 sm:h-8 w-full mt-auto opacity-60">
        {syncedData && sparkData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                    <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={syncedData.returns.oneYear >= 0 ? '#10b981' : '#ef4444'} 
                        strokeWidth={2} 
                        dot={false} 
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        )}
      </div>
      
      {isSelected && (
        <div className="absolute top-2 right-2 z-10 animate-in zoom-in-50 duration-200">
            <div className="bg-indigo-600 rounded-full p-1 border border-white shadow-lg">
                <Check size={10} className="text-white" />
            </div>
        </div>
      )}
    </div>
  );
};

interface StockSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: Stock[]; 
  onAdd: (tickers: string[]) => void;
  alreadySelected: string[];
}

const StockSelectorModal: React.FC<StockSelectorModalProps> = ({ 
  isOpen, onClose, onAdd, alreadySelected 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [masterList, setMasterList] = useState<any[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set());
  const [sectorFilter, setSectorFilter] = useState('All');

  useEffect(() => {
    if (isOpen) {
      setLoadingMaster(true);
      getNseMasterList().then(list => {
        setMasterList(list);
        setLoadingMaster(false);
      });
    }
  }, [isOpen]);

  const sectors = useMemo(() => {
    const s = new Set<string>();
    masterList.forEach(item => { if (item.industry) s.add(item.industry); });
    return ['All', ...Array.from(s).sort()];
  }, [masterList]);

  const filteredItems = useMemo(() => {
    return masterList.filter(item => {
      const matchesSearch = item.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.symbol?.toLowerCase().includes(searchTerm.toLowerCase());
      const isNotAlreadyInBasket = !alreadySelected.includes(item.symbol);
      const matchesSector = sectorFilter === 'All' || item.industry === sectorFilter;
      return matchesSearch && isNotAlreadyInBasket && matchesSector;
    }).slice(0, 100); 
  }, [masterList, searchTerm, alreadySelected, sectorFilter]);

  const toggleSelection = (ticker: string) => {
    const newSet = new Set(selectedTickers);
    if (newSet.has(ticker)) newSet.delete(ticker);
    else newSet.add(ticker);
    setSelectedTickers(newSet);
  };

  const handleAdd = () => {
    onAdd(Array.from(selectedTickers));
    setSelectedTickers(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-md sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white border border-slate-200 rounded-t-[32px] sm:rounded-[32px] w-full max-w-7xl h-[95vh] sm:h-[90vh] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.15)] overflow-hidden">
        
        <div className="px-5 py-4 sm:px-8 sm:py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 flex items-center gap-3">
              Asset Explorer
              <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full font-black uppercase tracking-widest">
                {loadingMaster ? '...' : masterList.length} Symbols
              </span>
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-100 transition-colors">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="px-5 py-3 sm:px-8 sm:py-5 space-y-3 sm:space-y-4 bg-slate-50/50 border-b border-slate-200 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-3.5 sm:top-4 text-slate-400 w-4 h-4" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Ticker or Industry..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 sm:py-3.5 text-xs sm:text-sm text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex gap-2">
                  <div className="relative flex-1 sm:flex-none">
                      <LayoutGrid size={14} className="absolute left-4 top-3.5 text-indigo-500 pointer-events-none" />
                      <select 
                        value={sectorFilter}
                        onChange={e => setSectorFilter(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl pl-10 pr-8 py-3 text-[10px] sm:text-xs font-black text-slate-700 outline-none hover:border-indigo-400 cursor-pointer appearance-none shadow-sm transition-all min-w-[140px] w-full"
                      >
                        <option value="All">All Sectors</option>
                        {sectors.filter(s => s !== 'All').map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                  </div>
              </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar bg-white">
          {loadingMaster ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <RefreshCcw className="animate-spin mb-4 text-indigo-600" size={40} />
              <p className="font-black uppercase tracking-widest text-[10px]">Syncing Markets...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                <Filter size={48} className="mx-auto mb-4 opacity-5" />
                <p className="font-black uppercase tracking-widest text-xs text-slate-400">Empty Filterset</p>
                <button onClick={() => {setSearchTerm(''); setSectorFilter('All');}} className="mt-3 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline">Reset Filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 pb-8">
                {filteredItems.map(item => (
                  <StockCard 
                    key={item.symbol} 
                    item={item} 
                    isSelected={selectedTickers.has(item.symbol)} 
                    onToggle={toggleSelection}
                  />
                ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 sm:px-10 sm:py-8 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-between items-center shrink-0">
            <div className="hidden xs:flex items-center gap-4">
                <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center">
                    <span className="text-sm font-black text-indigo-600">{selectedTickers.size}</span>
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-3">Assets Ready</span>
                </div>
            </div>
            <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                <button 
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-[10px] font-black text-slate-400 hover:text-slate-800 transition-colors uppercase tracking-widest"
                >
                    Back
                </button>
                <button 
                    onClick={handleAdd}
                    disabled={selectedTickers.size === 0}
                    className="flex-1 sm:flex-none px-8 py-3 rounded-xl text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg transition-all uppercase tracking-widest active:scale-95"
                >
                    Commit Selection <Check size={16} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StockSelectorModal;
