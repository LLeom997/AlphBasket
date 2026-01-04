import React, { useState, useEffect, useCallback } from 'react';
import { getStocks, calculateBasketHistory, ensureStockHistory } from './services/marketData';
import { saveProject, fetchProjectById } from './services/projectService';
import { saveSnapshot } from './services/snapshotService';
import { supabase, signOut } from './services/supabase';
import BasketBuilder from './components/BasketBuilder';
import PerformanceCharts from './components/PerformanceCharts';
import AnalyticsPanel from './components/AnalyticsPanel';
import AllocationDetails from './components/AllocationDetails';
import PredictiveAnalysis from './components/PredictiveAnalysis';
import WealthBuilder from './components/WealthBuilder';
import SnapshotHistory from './components/SnapshotHistory';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import StockSelectorModal from './components/StockSelectorModal';
import { Basket, SimulationResult, AppTab, Snapshot } from './types';
import { LogOut, Menu, X, Activity, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, LayoutDashboard, Edit3, LineChart, PieChart as PieIcon, Sparkles, Loader2, CheckCircle2, TrendingUp, History, Camera } from 'lucide-react';

const STORAGE_KEYS = {
    ACTIVE_BASKET_ID: 'alphabasket_active_id',
    VIEW_MODE: 'alphabasket_view_mode'
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<'auth' | 'dashboard' | 'editor'>('auth');
  const [activeTab, setActiveTab] = useState<AppTab>('history');
  
  const [stocks, setStocks] = useState<any[]>([]);
  const [currentBasket, setCurrentBasket] = useState<Basket | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssetExplorerOpen, setIsAssetExplorerOpen] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        const savedBasketId = localStorage.getItem(STORAGE_KEYS.ACTIVE_BASKET_ID);
        const savedView = localStorage.getItem(STORAGE_KEYS.VIEW_MODE) as any;
        
        if (savedBasketId) {
          setIsLoading(true);
          const basket = await fetchProjectById(savedBasketId);
          if (basket) {
            setCurrentBasket(basket);
            setView(savedView || 'editor');
            if (basket.items?.length > 0) {
              handleSimulate(basket);
            }
          } else {
            setView('dashboard');
          }
          setIsLoading(false);
        } else {
          setView('dashboard');
        }
      } else {
        setView('auth');
      }
    };

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (!newSession) {
          setView('auth');
          setCurrentBasket(null);
          setSimulation(null);
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_BASKET_ID);
          localStorage.removeItem(STORAGE_KEYS.VIEW_MODE);
      } else {
          setView(prev => prev === 'auth' ? 'dashboard' : prev);
      }
    });

    initData();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentBasket) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BASKET_ID, currentBasket.id);
    }
    if (view !== 'auth') {
      localStorage.setItem(STORAGE_KEYS.VIEW_MODE, view);
    }
  }, [currentBasket, view]);

  const initData = async () => {
    try {
      const defaultTickers = ["TATASTEEL", "RELIANCE", "HDFCBANK", "INFY", "ITC"];
      await ensureStockHistory(defaultTickers);
      setStocks(getStocks());
    } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await signOut();
    setIsLoading(false);
  };

  const handleSimulate = async (basket: Basket) => {
    setErrorMsg(null);
    const activeItems = basket.items.filter(i => !i.suppressed);
    if (activeItems.length === 0) {
      setSimulation(null);
      return;
    }
    
    setIsSimulating(true);
    setShowSuccess(false);
    
    try {
      const tickers = basket.items.map(i => i.ticker);
      await ensureStockHistory(tickers);
      setStocks(getStocks());
      const result = calculateBasketHistory(basket);
      
      await new Promise(r => setTimeout(r, 600));
      setSimulation(result);

      const growthScore = Math.min(100, Math.max(0, (result.metrics.cagr / 0.30) * 100));
      const history = result.history;
      const latestPoint = history[history.length - 1];
      const prevPoint = history.length > 1 ? history[history.length - 2] : latestPoint;
      
      const todayReturn = prevPoint.close > 0 ? (latestPoint.close - prevPoint.close) / prevPoint.close : 0;
      const inceptionValue = basket.inceptionValue || latestPoint.close;
      const inceptionReturn = inceptionValue > 0 ? (latestPoint.close - inceptionValue) / inceptionValue : 0;

      const updatedBasket: Basket = {
          ...basket,
          cagr: result.metrics.cagr,
          volatility: result.metrics.volatility,
          maxDrawdown: result.metrics.maxDrawdown,
          growthScore: growthScore,
          inceptionValue: inceptionValue,
          todayReturn: todayReturn,
          inceptionReturn: inceptionReturn
      };

      setCurrentBasket(updatedBasket);
      if (session) await saveProject(updatedBasket, session.user.id);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (error: any) {
      setErrorMsg(error.message || "Simulation failed.");
      setSimulation(null);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!simulation || !currentBasket || !session) return;
    const label = window.prompt("Label this Snapshot", `Projection ${new Date().toLocaleDateString()}`);
    if (!label) return;

    setIsSavingSnapshot(true);
    try {
      await saveSnapshot(currentBasket, simulation, label, session.user.id);
      setActiveTab('snapshots');
    } catch (e) {
      alert("Snapshot failed.");
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (snap: Snapshot) => {
      if (!currentBasket) return;
      const restoredBasket: Basket = {
          ...currentBasket,
          items: snap.basketState.items,
          allocationMode: snap.basketState.allocationMode as any,
          initialInvestment: snap.basketState.initialInvestment,
          cagr: snap.metrics.cagr,
          volatility: snap.metrics.volatility,
          maxDrawdown: snap.metrics.maxDrawdown,
          growthScore: Math.min(100, Math.max(0, (snap.metrics.cagr / 0.30) * 100))
      };
      setCurrentBasket(restoredBasket);
      setActiveTab('history');
      handleSimulate(restoredBasket);
  };

  const openEditor = (basket: Basket) => {
    setCurrentBasket(basket);
    setView('editor');
    setSimulation(null);
    if (basket.items?.length > 0) handleSimulate(basket);
  };

  const handleCreateNewProject = () => {
    const newBasket: Basket = {
        id: crypto.randomUUID(),
        name: 'New Strategy Design',
        description: 'Synthetic Alpha Component',
        category: 'Growth Strategy',
        items: [],
        allocationMode: 'weight',
        rebalanceInterval: 'none',
        initialInvestment: 100000,
        createdAt: Date.now()
    };
    openEditor(newBasket);
  };

  const handleAddStocksFromExplorer = (tickers: string[]) => {
    if (!currentBasket) return;
    const currentTickers = new Set(currentBasket.items.map(i => i.ticker));
    const uniqueNewTickers = tickers.filter(t => !currentTickers.has(t));
    if (uniqueNewTickers.length === 0) return;
    const combined = [...currentBasket.items, ...uniqueNewTickers.map(ticker => ({ ticker, weight: 0 }))];
    const eq = combined.length > 0 ? 100 / combined.length : 100;
    const updated = { ...currentBasket, items: combined.map(i => ({ ...i, weight: eq })) };
    setCurrentBasket(updated);
  };

  if (view === 'auth') return <Auth />;

  return (
    <div className="h-screen flex bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center">
          <RefreshCw size={24} className="animate-spin text-indigo-600 mb-2" />
          <p className="text-slate-600 font-semibold animate-pulse uppercase tracking-wider text-xs">Syncing Data...</p>
        </div>
      )}

      <StockSelectorModal 
        isOpen={isAssetExplorerOpen}
        onClose={() => setIsAssetExplorerOpen(false)}
        stocks={stocks}
        onAdd={handleAddStocksFromExplorer}
        alreadySelected={currentBasket?.items.map(i => i.ticker) || []}
      />

      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transform transition-all duration-200 flex flex-col shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
        <div className={`p-4 border-b border-slate-100 flex items-center h-14 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && <span className="font-bold text-indigo-600 text-base tracking-tight">AlphaBasket</span>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:block text-slate-400 hover:text-indigo-600 p-1 rounded-lg">
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400"><X size={18} /></button>
        </div>

        <div className="p-2 flex-1 overflow-y-auto space-y-1 mt-2">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
            <LayoutDashboard size={18} />
            {!sidebarCollapsed && <span className="text-xs font-semibold uppercase">Workbench</span>}
          </button>
          {currentBasket && (
            <button onClick={() => setView('editor')} className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg transition-all ${view === 'editor' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
              <Edit3 size={18} />
              {!sidebarCollapsed && <span className="text-xs font-semibold uppercase tracking-tight">Strategy Editor</span>}
            </button>
          )}
        </div>

        <div className="p-2 border-t border-slate-100 mb-2">
           <button onClick={handleLogout} className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all`}>
              <LogOut size={18} />
              {!sidebarCollapsed && <span className="text-xs font-semibold uppercase">Sign Out</span>}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-50"><Menu size={20} /></button>
          <span className="font-bold text-indigo-700 text-sm tracking-tight">ALPHABASKET</span>
          <div className="w-10"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
          {view === 'dashboard' ? (
            <Dashboard onCreateProject={handleCreateNewProject} onSelectProject={openEditor} activeProjectId={currentBasket?.id} />
          ) : (
            <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 h-full overflow-visible">
              <div className="lg:col-span-4 xl:col-span-3 shrink-0">
                <BasketBuilder 
                  availableStocks={stocks} 
                  initialBasket={currentBasket} 
                  onSave={b => saveProject(b, session.user.id).then(() => setCurrentBasket(b))} 
                  onSimulate={handleSimulate} 
                  isSimulating={isSimulating}
                  onOpenExplorer={() => setIsAssetExplorerOpen(true)} 
                />
              </div>

              <div className="lg:col-span-8 xl:col-span-9 flex flex-col space-y-4">
                {currentBasket ? (
                  <>
                    <div className="flex items-center justify-between shrink-0">
                        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                            {[
                                { id: 'history', label: 'History', icon: LineChart },
                                { id: 'predictive', label: 'Forecast', icon: Sparkles },
                                { id: 'wealth', label: 'Wealth', icon: TrendingUp },
                                { id: 'allocation', label: 'Plan', icon: PieIcon },
                                { id: 'snapshots', label: 'Registry', icon: History }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                                >
                                    <tab.icon size={13} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {simulation && activeTab !== 'snapshots' && (
                            <button onClick={handleSaveSnapshot} disabled={isSavingSnapshot} className="flex items-center gap-2 bg-slate-900 px-4 py-1.5 rounded-xl text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black transition-all shadow-sm">
                                {isSavingSnapshot ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                                Capture Plan
                            </button>
                        )}
                    </div>

                    {errorMsg && (
                       <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-3 text-rose-600 text-[10px] font-bold uppercase">
                          <AlertCircle size={16} /> {errorMsg}
                       </div>
                    )}

                    {isSimulating ? (
                        <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200">
                            <RefreshCw size={32} className="text-indigo-600 animate-spin mb-3" />
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Backtesting Logic...</p>
                        </div>
                    ) : showSuccess ? (
                        <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center bg-emerald-50 rounded-xl border border-emerald-100 animate-in zoom-in duration-200">
                             <CheckCircle2 size={40} className="text-emerald-500 mb-3" />
                             <p className="text-[12px] font-bold text-emerald-800 uppercase tracking-wider">Analysis Complete</p>
                        </div>
                    ) : simulation ? (
                        <div className="flex-1 pb-10 animate-in fade-in duration-500">
                            {activeTab === 'history' && (
                                <div className="space-y-4">
                                    <AnalyticsPanel simulation={simulation} basket={currentBasket} />
                                    <PerformanceCharts history={simulation.history} comparisonSeries={simulation.comparisonSeries} drawdownData={simulation.drawdownSeries} />
                                </div>
                            )}
                            {activeTab === 'predictive' && <PredictiveAnalysis simulation={simulation} />}
                            {activeTab === 'wealth' && <WealthBuilder simulation={simulation} />}
                            {activeTab === 'allocation' && <AllocationDetails simulation={simulation} stocks={stocks} />}
                            {activeTab === 'snapshots' && <SnapshotHistory basketId={currentBasket.id} currentSimulation={simulation} onRestore={handleRestoreSnapshot} onExit={() => setActiveTab('history')} />}
                        </div>
                    ) : (
                        <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/50">
                            <Activity size={32} className="mb-3 opacity-20" />
                            <p className="font-semibold uppercase tracking-wider text-[10px]">Awaiting Instructions</p>
                        </div>
                    )}
                  </>
                ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/50">
                        <Activity size={32} className="mb-3 opacity-20" />
                        <p className="font-semibold uppercase tracking-wider text-[10px]">Strategy Not Initialized</p>
                    </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}