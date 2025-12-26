
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Stock } from '../types';
import { getNseMasterList, syncSingleStock } from '../services/marketData';
import { Search, X, Check, Filter, RefreshCcw, LayoutGrid, Zap, TrendingUp, TrendingDown, ChevronDown, Activity, Loader2 } from 'lucide-react';
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

  const fmtPct = (n: number | undefined) => {
      if (n === undefined || n === 0) return 'N/A';
      return (n * 100).toFixed(1) + '%';
  };

  const sparkData = useMemo(() => {
      if (!syncedData?.data) return [];
      const step = Math.max(1, Math.floor(syncedData.data.length / 40));
      return syncedData.data.filter((_, i) => i % step === 0).map(d => ({ value: d.close }));
  }, [syncedData]);

  return (
    <div 
      ref={cardRef}
      onClick={() => onToggle(item.symbol)}
      className={`
        cursor-pointer rounded-3xl border transition-all flex flex-col group relative overflow-hidden bg-white min-h-[160px]
        ${isSelected 
            ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-xl scale-[1.02]' 
            : 'border-slate-100 hover:border-indigo-200 hover:shadow-lg'
        }
      `}
    >
      <div className="p-4 flex flex-col h-full">
        {/* Header: Ticker and Basic Info */}
        <div className="flex justify-between items-start mb-3">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-black text-sm uppercase tracking-tight ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {item.symbol}
                    </span>
                    {isSelected && <Check size={12} className="text-indigo-600 font-bold" />}
                </div>
                <div className="text-[9px] text-slate-400 font-bold truncate max-w-[120px]">
                    {item.companyName}
                </div>
            </div>
            {loading && <Loader2 size={12} className="animate-spin text-indigo-400" />}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-y-3 gap-x-2 mt-2">
            {[
                { label: '2Y', val: syncedData?.returns.twoYear },
                { label: '3Y', val: syncedData?.returns.threeYear },
                { label: '5Y', val: syncedData?.returns.fiveYear },
                { label: '10Y', val: syncedData?.returns.tenYear },
                { label: '15Y', val: syncedData?.returns.fifteenYear },
                { label: '1Y', val: syncedData?.returns.oneYear }
            ].map(m => (
                <div key={m.label} className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">{m.label} CAGR</span>
                    <span className={`text-[10px] font-black leading-tight ${m.val && m.val > 0 ? 'text-emerald-600' : m.val && m.val < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {loading ? '...' : fmtPct(m.val)}
                    </span>
                </div>
            ))}
        </div>

        {/* Mini Sparkline at Bottom */}
        <div className="h-6 w-full mt-4 -mx-4 w-[calc(100%+32px)] opacity-30 group-hover:opacity-100 transition-opacity">
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
      </div>
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
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xl sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white border border-slate-200 rounded-t-[40px] sm:rounded-[40px] w-full max-w-7xl h-[95vh] sm:h-[90vh] flex flex-col shadow-[0_0_120px_rgba(0,0,0,0.3)] overflow-hidden">
        
        <div className="px-6 py-4 sm:px-10 sm:py-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 flex items-center gap-4">
              Alpha Explorer
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-black uppercase tracking-[0.2em] border border-indigo-100">
                {loadingMaster ? 'Syncing...' : `${masterList.length} Instruments`}
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Select assets to include in your synthetic instrument</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-indigo-600 bg-slate-50 p-2 sm:p-4 rounded-2xl border border-slate-100 transition-all hover:rotate-90">
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-4 sm:px-10 sm:py-6 space-y-4 bg-slate-50/50 border-b border-slate-200 shrink-0">
          <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Filter by Ticker, Industry or Company Name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-[24px] pl-14 pr-6 py-4 text-sm text-slate-900 font-black focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all shadow-sm placeholder:text-slate-300"
                />
              </div>

              <div className="flex gap-4">
                  <div className="relative min-w-[200px]">
                      <Activity size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
                      <select 
                        value={sectorFilter}
                        onChange={e => setSectorFilter(e.target.value)}
                        className="bg-white border border-slate-200 rounded-[20px] pl-12 pr-10 py-4 text-[11px] font-black text-slate-700 outline-none hover:border-indigo-400 cursor-pointer appearance-none shadow-sm transition-all w-full uppercase tracking-widest"
                      >
                        <option value="All">All Sectors</option>
                        {sectors.filter(s => s !== 'All').map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
              </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar bg-slate-50/20">
          {loadingMaster ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <RefreshCcw className="animate-spin mb-6 text-indigo-600" size={48} />
              <p className="font-black uppercase tracking-widest text-[11px]">Initializing Market Connectivity...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                <Filter size={64} className="mx-auto mb-6 text-slate-100" />
                <p className="font-black uppercase tracking-[0.2em] text-sm text-slate-400">Zero Results Found</p>
                <button onClick={() => {setSearchTerm(''); setSectorFilter('All');}} className="mt-4 text-indigo-600 text-[11px] font-black uppercase tracking-widest hover:underline px-6 py-2 bg-indigo-50 rounded-full">Clear Filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 pb-12">
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

        <div className="px-6 py-6 sm:px-12 sm:py-10 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-6 justify-between items-center shrink-0">
            <div className="flex items-center gap-6">
                <div className="bg-slate-50 px-6 py-4 rounded-[20px] border border-slate-200 flex items-center gap-4">
                    <span className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-100">
                        {selectedTickers.size}
                    </span>
                    <div>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block leading-none">Selected</span>
                        <span className="text-[11px] text-indigo-600 font-black uppercase mt-1">Ready for Strategy</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
                <button 
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-10 py-4 rounded-[20px] text-[11px] font-black text-slate-400 hover:text-slate-800 transition-all uppercase tracking-[0.2em]"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleAdd}
                    disabled={selectedTickers.size === 0}
                    className="flex-1 sm:flex-none px-12 py-4 rounded-[20px] text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-indigo-100 transition-all uppercase tracking-[0.2em] active:scale-95"
                >
                    Add to Basket <Check size={18} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StockSelectorModal;
