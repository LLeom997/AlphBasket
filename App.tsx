
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

  // Persistence logic: Restore session
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

  // Persistence logic: Save state
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
      
      await new Promise(r => setTimeout(r, 800));
      
      setSimulation(result);

      // Growth Score Calculation: Derived from CAGR/Vol and Forward Drift
      const growthScore = Math.min(100, Math.max(0, (result.metrics.cagr / 0.30) * 100));
      
      // Calculate Real-time Performance Metrics
      const history = result.history;
      const latestPoint = history[history.length - 1];
      const prevPoint = history.length > 1 ? history[history.length - 2] : latestPoint;
      
      const todayReturn = prevPoint.close > 0 ? (latestPoint.close - prevPoint.close) / prevPoint.close : 0;
      
      // If we don't have an inception value yet, use the current value as the baseline
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

      // PERSIST KPIs TO DATABASE IMMEDIATELY AFTER BACKTEST
      if (session) {
          await saveProject(updatedBasket, session.user.id);
          console.log("Persisted backtest metrics to Supabase:", updatedBasket.name);
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error: any) {
      console.error("Simulation failed:", error);
      setErrorMsg(error.message || "Failed to generate simulation.");
      setSimulation(null);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!simulation || !currentBasket || !session) return;
    const label = window.prompt("Label this Snapshot (e.g., 'Initial Strategy T0')", `Projection ${new Date().toLocaleDateString()}`);
    if (!label) return;

    setIsSavingSnapshot(true);
    try {
      await saveSnapshot(currentBasket, simulation, label, session.user.id);
      if (window.confirm("Snapshot captured! View your Archive now?")) {
          setActiveTab('snapshots');
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save snapshot.");
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (snap: Snapshot) => {
      if (!currentBasket) return;
      if (!window.confirm(`Restore parameters from "${snap.label}"? This will overwrite your current active weights.`)) return;
      
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
    setSidebarCollapsed(true);
    setSidebarOpen(false);
    setView('editor');
    setSimulation(null);
    if (basket.items && basket.items.length > 0) {
      handleSimulate(basket);
    }
  };

  const handleCreateNewProject = () => {
    const newId = crypto.randomUUID();
    const newBasket: Basket = {
        id: newId,
        name: 'New Alpha Strategy',
        description: 'Custom Synthetic Instrument',
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
    const eq = 100 / combined.length;
    const updated = { ...currentBasket, items: combined.map(i => ({ ...i, weight: eq })) };
    setCurrentBasket(updated);
  };

  const handleSaveProject = async (b: Basket) => {
    if (!session) return;
    setIsLoading(true);
    try {
      const basketToSave = {
          ...b,
          cagr: simulation ? simulation.metrics.cagr : b.cagr,
          volatility: simulation ? simulation.metrics.volatility : b.volatility,
          maxDrawdown: simulation ? simulation.metrics.maxDrawdown : b.maxDrawdown,
          growthScore: simulation ? Math.min(100, Math.max(0, (simulation.metrics.cagr / 0.30) * 100)) : b.growthScore
      };
      await saveProject(basketToSave, session.user.id);
      setCurrentBasket(basketToSave); 
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || "Failed to sync project.");
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToDashboard = () => {
      setView('dashboard');
  };

  if (view === 'auth') return <Auth />;

  return (
    <div className="h-screen bg-slate-50 flex text-slate-900 font-sans overflow-hidden relative selection:bg-indigo-100 selection:text-indigo-900">
      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <RefreshCw size={24} className="animate-spin text-indigo-600 mb-2" />
          <p className="text-slate-600 font-black animate-pulse uppercase tracking-widest text-[8px]">Processing...</p>
        </div>
      )}

      <StockSelectorModal 
        isOpen={isAssetExplorerOpen}
        onClose={() => setIsAssetExplorerOpen(false)}
        stocks={stocks}
        onAdd={handleAddStocksFromExplorer}
        alreadySelected={currentBasket?.items.map(i => i.ticker) || []}
      />

      {sidebarOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transform transition-all duration-300 flex flex-col shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static ${sidebarCollapsed ? 'w-[60px]' : 'w-60'}`}>
        <div className={`p-4 border-b border-slate-100 flex items-center h-14 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && <span className="font-bold text-slate-800 text-sm tracking-tight">AlphaBasket</span>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:block text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors hover:bg-slate-50">
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400"><X size={18} /></button>
        </div>

        <div className="p-2 flex-1 overflow-y-auto space-y-1 mt-2">
          <button onClick={navigateToDashboard} className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
            <LayoutDashboard size={16} />
            {!sidebarCollapsed && <span className="text-[9px] font-black uppercase tracking-widest">Workbench</span>}
          </button>
          {currentBasket && (
            <button onClick={() => setView('editor')} className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-xl transition-all ${view === 'editor' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Edit3 size={16} />
              {!sidebarCollapsed && <span className="text-[9px] font-black uppercase tracking-widest">Editor</span>}
            </button>
          )}
        </div>

        <div className="p-2 border-t border-slate-100 space-y-1">
           <button 
                onClick={handleLogout}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-xl text-red-500 hover:bg-red-50 transition-all`}
           >
              <LogOut size={16} />
              {!sidebarCollapsed && <span className="text-[9px] font-black uppercase tracking-widest">Sign Out</span>}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative z-0">
        <header className="lg:hidden h-12 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center px-4 justify-between sticky top-0 z-20 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5"><Menu size={18} /></button>
          <span className="font-black text-indigo-700 text-[10px] tracking-widest">ALPHABASKET</span>
          <div className="w-8"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-2 sm:p-3 h-full custom-scrollbar">
          {view === 'dashboard' ? (
            <Dashboard 
                onCreateProject={handleCreateNewProject} 
                onSelectProject={openEditor} 
                activeProjectId={currentBasket?.id}
            />
          ) : (
            <div className="max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3 lg:h-full lg:overflow-hidden pb-10 lg:pb-0">
              <div className="lg:col-span-4 xl:col-span-3 lg:h-[calc(100vh-24px)] shrink-0 h-auto">
                <BasketBuilder 
                  availableStocks={stocks} 
                  initialBasket={currentBasket} 
                  onSave={handleSaveProject} 
                  onSimulate={handleSimulate} 
                  isSimulating={isSimulating}
                  onOpenExplorer={() => setIsAssetExplorerOpen(true)} 
                />
              </div>

              <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full lg:h-[calc(100vh-24px)] lg:overflow-hidden">
                {currentBasket ? (
                  <>
                    <div className="flex items-center justify-between mb-3 shrink-0">
                        <div className="flex bg-white p-0.5 rounded-xl border border-slate-200 shadow-sm w-fit overflow-x-auto no-scrollbar">
                            {[
                                { id: 'history', label: 'History', icon: LineChart },
                                { id: 'predictive', label: 'Forecast', icon: Sparkles },
                                { id: 'wealth', label: 'Wealth Builder', icon: TrendingUp },
                                { id: 'allocation', label: 'Intelligence', icon: PieIcon },
                                { id: 'snapshots', label: 'Snapshot History', icon: History }
                            ].map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setActiveTab(tab.id as any);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <Icon size={12} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {simulation && activeTab !== 'snapshots' && (
                            <button 
                                onClick={handleSaveSnapshot}
                                disabled={isSavingSnapshot}
                                title="Capture current strategy plan for future tracking"
                                className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 text-[8px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all hover:text-indigo-600 shadow-sm group"
                            >
                                {isSavingSnapshot ? <RefreshCw size={12} className="animate-spin" /> : <Camera size={12} className="group-hover:scale-110 transition-transform" />}
                                Capture Plan
                            </button>
                        )}
                    </div>

                    {errorMsg && (
                       <div className="bg-red-50 border border-red-100 p-2 rounded-xl flex items-center gap-2 text-red-600 text-[8px] font-black uppercase tracking-widest mb-3 shrink-0">
                          <AlertCircle size={14} />
                          {errorMsg}
                       </div>
                    )}

                    {isSimulating ? (
                        <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center bg-white rounded-[32px] border border-slate-200 shadow-sm animate-pulse">
                            <RefreshCw size={40} className="text-indigo-600 animate-spin mb-4" />
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Synthesizing Alpha Stream...</p>
                        </div>
                    ) : showSuccess ? (
                        <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center bg-emerald-50 rounded-[32px] border border-emerald-100 shadow-sm animate-in zoom-in duration-300">
                             <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                             <p className="text-[12px] font-black text-emerald-800 uppercase tracking-widest">Backtest Synchronized</p>
                        </div>
                    ) : simulation ? (
                        <div className="flex-1 lg:overflow-y-auto custom-scrollbar pr-1 pb-4 animate-in fade-in duration-500">
                            {activeTab === 'history' && (
                                <div className="space-y-3">
                                    <AnalyticsPanel simulation={simulation} />
                                    <PerformanceCharts 
                                      history={simulation?.history || []} 
                                      drawdownData={simulation?.drawdownSeries || []} 
                                      comparisonSeries={simulation?.comparisonSeries || []} 
                                    />
                                </div>
                            )}
                            {activeTab === 'predictive' && <PredictiveAnalysis simulation={simulation} />}
                            {activeTab === 'wealth' && <WealthBuilder simulation={simulation} />}
                            {activeTab === 'allocation' && <AllocationDetails simulation={simulation} stocks={stocks} />}
                            {activeTab === 'snapshots' && (
                                <SnapshotHistory 
                                    basketId={currentBasket.id} 
                                    currentSimulation={simulation} 
                                    onRestore={handleRestoreSnapshot}
                                    onExit={() => setActiveTab('history')}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/50">
                            <Activity size={32} className="mb-2 opacity-10" />
                            <div className="text-center px-4">
                                <p className="font-black uppercase tracking-widest text-[10px] text-slate-600">Awaiting Backtest</p>
                                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Configure assets and click "Run Backtest"</p>
                            </div>
                        </div>
                    )}
                  </>
                ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/50">
                        <Activity size={32} className="mb-2 opacity-10" />
                        <p className="font-black uppercase tracking-widest text-[10px]">Initialize Strategy</p>
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
