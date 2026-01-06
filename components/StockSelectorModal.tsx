
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Stock } from '../types';
import { getNseMasterList, syncSingleStock } from '../services/market/marketData';
import { Search, X, Check, Filter, RefreshCcw, ChevronDown, Loader2, ArrowUpNarrowWide, ArrowDownWideNarrow, Calendar } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface StockCardProps {
  item: any;
  isSelected: boolean;
  onToggle: (ticker: string) => void;
}

const StockCard: React.FC<StockCardProps> = ({ item, isSelected, onToggle }) => {
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

  const fmtPct = (n: number | undefined) => (n !== undefined && n !== 0) ? (n * 100).toFixed(1) + '%' : 'N/A';

  const sparkData = useMemo(() => {
    if (!syncedData?.data) return [];
    const step = Math.max(1, Math.floor(syncedData.data.length / 40));
    return syncedData.data.filter((_, i) => i % step === 0).map(d => ({ value: d.close }));
  }, [syncedData]);

  return (
    <div
      ref={cardRef}
      onClick={() => onToggle(item.symbol)}
      className={`cursor-pointer rounded-2xl border transition-all flex flex-col group relative overflow-hidden bg-white min-h-[120px] ${isSelected ? 'border-brand-teal ring-4 ring-brand-teal/5 bg-brand-teal/5' : 'border-slate-100 hover:border-brand-teal/20'}`}
    >
      <div className="p-3 flex flex-col h-full">
        <div className="flex justify-between items-start mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs uppercase tracking-tight text-slate-800">{item.symbol}</span>
              {isSelected && <Check size={10} className="text-brand-teal" strokeWidth={4} />}
            </div>
            <div className="text-[7px] text-slate-400 font-bold truncate">{item.companyName}</div>
          </div>
          {loading && <Loader2 size={8} className="animate-spin text-brand-teal" />}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col">
            <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">1Y Growth</span>
            <span className={`text-[9px] font-black ${syncedData?.returns.oneYear && syncedData.returns.oneYear > 0 ? 'text-brand-green' : 'text-slate-400'}`}>
              {loading ? '...' : fmtPct(syncedData?.returns.oneYear)}
            </span>
          </div>
          {syncedData && (
            <div className="px-1.5 py-0.5 rounded-md bg-slate-900/[0.03] border border-slate-100 flex items-center gap-1">
              <Calendar size={8} className="text-slate-400" />
              <span className="text-[7px] font-black text-slate-500 uppercase">
                {new Date(syncedData.data[0].date).getFullYear()} - {new Date(syncedData.data[syncedData.data.length - 1].date).getFullYear()}
              </span>
            </div>
          )}
          <div className="flex flex-col text-right">
            <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">5Y Growth</span>
            <span className={`text-[9px] font-black ${syncedData?.returns.fiveYear && syncedData.returns.fiveYear > 0 ? 'text-brand-green' : 'text-slate-400'}`}>
              {loading ? '...' : fmtPct(syncedData?.returns.fiveYear)}
            </span>
          </div>
        </div>

        <div className="h-4 w-full mt-2 -mx-3 w-[calc(100%+24px)] opacity-30">
          {syncedData && sparkData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}><Line type="monotone" dataKey="value" stroke="#5acec9" strokeWidth={1.5} dot={false} isAnimationActive={false} /></LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

type SortKey = 'symbol' | '1Y' | '2Y' | '3Y' | '5Y';

interface StockSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: Stock[];
  onAdd: (tickers: string[]) => void;
  alreadySelected: string[];
}

const StockSelectorModal: React.FC<StockSelectorModalProps> = ({ isOpen, onClose, onAdd, alreadySelected }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [masterList, setMasterList] = useState<any[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set());
  const [sectorFilter, setSectorFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  const sortedAndFilteredItems = useMemo(() => {
    let list = masterList.filter(item => {
      const matchesSearch = item.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) || item.symbol?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSector = sectorFilter === 'All' || item.industry === sectorFilter;
      return matchesSearch && !alreadySelected.includes(item.symbol) && matchesSector;
    });
    list.sort((a, b) => {
      const valA = sortKey === 'symbol' ? a.symbol : (a[`return_${sortKey.toLowerCase()}`] || 0);
      const valB = sortKey === 'symbol' ? b.symbol : (b[`return_${sortKey.toLowerCase()}`] || 0);
      const factor = sortOrder === 'asc' ? 1 : -1;
      return valA < valB ? -1 * factor : (valA > valB ? 1 * factor : 0);
    });
    return list.slice(0, 100);
  }, [masterList, searchTerm, alreadySelected, sectorFilter, sortKey, sortOrder]);

  const toggleSelection = (ticker: string) => {
    const newSet = new Set(selectedTickers);
    if (newSet.has(ticker)) newSet.delete(ticker); else newSet.add(ticker);
    setSelectedTickers(newSet);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">

        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">Asset Explorer <span className="text-[8px] px-2 py-0.5 bg-brand-teal/10 text-brand-teal rounded-full">{loadingMaster ? 'Syncing' : `${masterList.length} Symbols`}</span></h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-brand-red p-2 rounded-lg transition-all"><X size={20} /></button>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 shrink-0 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-3.5 h-3.5" />
            <input type="text" placeholder="Search Assets..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-[10px] font-black outline-none focus:ring-4 focus:ring-brand-teal/5 transition-all" />
          </div>
          <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[8px] font-black uppercase outline-none min-w-[150px]">
            <option value="All">All Sectors</option>
            {sectors.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex bg-white p-0.5 rounded-xl border border-slate-200">
            {['symbol', '1Y', '5Y'].map(k => (
              <button key={k} onClick={() => { if (sortKey === k) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); else { setSortKey(k as SortKey); setSortOrder('desc'); } }} className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest ${sortKey === k ? 'bg-brand-teal text-white' : 'text-slate-400'}`}>
                {k === 'symbol' ? 'Ticker' : k}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20 custom-scrollbar">
          {loadingMaster ? <div className="flex items-center justify-center h-full"><RefreshCcw className="animate-spin text-brand-teal" size={32} /></div> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {sortedAndFilteredItems.map(item => <StockCard key={item.symbol} item={item} isSelected={selectedTickers.has(item.symbol)} onToggle={toggleSelection} />)}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedTickers.size} Selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">Cancel</button>
            <button onClick={() => { onAdd(Array.from(selectedTickers)); setSelectedTickers(new Set()); onClose(); }} disabled={selectedTickers.size === 0} className="px-6 py-2 rounded-xl text-[9px] font-black bg-brand-teal text-white disabled:opacity-50 uppercase tracking-widest shadow-lg shadow-brand-teal/10">Assemble Basket</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockSelectorModal;
