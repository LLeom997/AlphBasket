
import React, { useState, useEffect } from 'react';
import { getStocks, calculateBasketHistory, ensureStockHistory } from './services/marketData';
import { saveProject } from './services/projectService';
import { supabase, signOut } from './services/supabase';
import BasketBuilder from './components/BasketBuilder';
import PerformanceCharts from './components/PerformanceCharts';
import AnalyticsPanel from './components/AnalyticsPanel';
import AllocationDetails from './components/AllocationDetails';
import PredictiveAnalysis from './components/PredictiveAnalysis';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import StockSelectorModal from './components/StockSelectorModal';
import { Basket, SimulationResult } from './types';
import { LogOut, Menu, X, Activity, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft, AlertCircle, LayoutDashboard, Edit3, Plus, LineChart, PieChart as PieIcon, Sparkles, User, Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<'auth' | 'dashboard' | 'editor'>('auth');
  const [activeTab, setActiveTab] = useState<'history' | 'predictive' | 'allocation'>('history');
  
  const [stocks, setStocks] = useState<any[]>([]);
  const [currentBasket, setCurrentBasket] = useState<Basket | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssetExplorerOpen, setIsAssetExplorerOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setView('dashboard');
      else setView('auth');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session && view === 'auth') setView('dashboard');
      else if (!session) {
          setView('auth');
          setCurrentBasket(null);
          setSimulation(null);
      }
    });

    initData();
    return () => subscription.unsubscribe();
  }, []);

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
    
    try {
      const tickers = basket.items.map(i => i.ticker);
      await ensureStockHistory(tickers);
      setStocks(getStocks());
      const result = calculateBasketHistory(basket);
      setSimulation(result);
    } catch (error: any) {
      console.error("Simulation failed:", error);
      setErrorMsg(error.message || "Failed to generate simulation.");
      setSimulation(null);
    }
  };

  const openEditor = (basket: Basket) => {
    setCurrentBasket(basket);
    setSidebarCollapsed(true);
    setSidebarOpen(false);
    setView('editor');
    setSimulation(null); // Clear previous simulation on open
    
    // Only auto-simulate if there are already items in the basket (loading an existing one)
    if (basket.items && basket.items.length > 0) {
      handleSimulate(basket);
    }
  };

  const handleCreateNewProject = () => {
    const newBasket: Basket = {
        id: crypto.randomUUID(),
        name: 'New Alpha Strategy',
        description: 'Custom Synthetic Instrument',
        category: 'Growth Strategy',
        items: [], // Start with empty items as requested
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
    // Note: handleSimulate is NOT called here anymore to respect the manual "Run Backtest" requirement
  };

  const handleSaveProject = async (b: Basket) => {
    if (!session) return;
    setIsLoading(true);
    try {
      await saveProject(b, session.user.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (view === 'auth') return <Auth />;

  return (
    <div className="h-screen bg-slate-50 flex text-slate-900 font-sans overflow-hidden relative selection:bg-indigo-100 selection:text-indigo-900">
      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <RefreshCw size={32} className="animate-spin text-indigo-600 mb-4" />
          <p className="text-slate-600 font-black animate-pulse uppercase tracking-widest text-xs">Processing Engine...</p>
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

      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transform transition-all duration-300 flex flex-col shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static ${sidebarCollapsed ? 'w-[70px]' : 'w-64'}`}>
        <div className={`p-4 border-b border-slate-100 flex items-center h-16 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && <span className="font-bold text-slate-800 text-lg">AlphaBasket</span>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:block text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors hover:bg-slate-50">
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-3 flex-1 overflow-y-auto space-y-2 mt-2">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-3 rounded-2xl transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
            <LayoutDashboard size={18} />
            {!sidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>}
          </button>
          {currentBasket && (
            <button onClick={() => setView('editor')} className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-3 rounded-2xl transition-all ${view === 'editor' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Edit3 size={18} />
              {!sidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Editor</span>}
            </button>
          )}
        </div>

        <div className="p-3 border-t border-slate-100 space-y-2">
           <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-3 text-slate-400`}>
              <User size={18} />
              {!sidebarCollapsed && <span className="text-[10px] font-bold truncate max-w-[140px]">{session?.user?.email}</span>}
           </div>
           <button 
                onClick={handleLogout}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all`}
           >
              <LogOut size={18} />
              {!sidebarCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative z-0">
        <header className="lg:hidden h-14 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center px-4 justify-between sticky top-0 z-20 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-2"><Menu size={20} /></button>
          <span className="font-black text-indigo-700 text-sm">ALPHABASKET</span>
          <div className="w-8"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {view === 'dashboard' ? (
            <Dashboard onCreateProject={handleCreateNewProject} onSelectProject={openEditor} />
          ) : (
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
              <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-0 lg:h-[calc(100vh-80px)]">
                <BasketBuilder 
                  availableStocks={stocks} 
                  initialBasket={currentBasket} 
                  onSave={handleSaveProject} 
                  onSimulate={handleSimulate} 
                  onOpenExplorer={() => setIsAssetExplorerOpen(true)} 
                />
              </div>

              <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                {currentBasket ? (
                  <>
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit mb-2">
                        {[
                            { id: 'history', label: 'Backtest', icon: LineChart },
                            { id: 'predictive', label: 'Forecasting', icon: Sparkles },
                            { id: 'allocation', label: 'Intelligence', icon: PieIcon }
                        ].map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Icon size={14} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {errorMsg && (
                       <div className="bg-red-50 border border-red-100 p-4 rounded-3xl flex items-center gap-3 text-red-600 text-xs font-black uppercase tracking-widest">
                          <AlertCircle size={18} />
                          {errorMsg}
                       </div>
                    )}

                    {simulation ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {activeTab === 'history' && (
                                <div className="space-y-6">
                                    <PerformanceCharts 
                                      history={simulation?.history || []} 
                                      drawdownData={simulation?.drawdownSeries || []} 
                                      comparisonSeries={simulation?.comparisonSeries || []} 
                                    />
                                    <AnalyticsPanel simulation={simulation} />
                                </div>
                            )}
                            {activeTab === 'predictive' && <PredictiveAnalysis simulation={simulation} />}
                            {activeTab === 'allocation' && <AllocationDetails simulation={simulation} stocks={stocks} />}
                        </div>
                    ) : (
                        <div className="h-[500px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-[40px] bg-slate-50/50">
                            <Activity size={48} className="mb-4 opacity-10" />
                            <div className="text-center px-8">
                                <p className="font-black uppercase tracking-widest text-xs text-slate-600">Awaiting Strategy Analysis</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Configure your constituents and click "Run Backtest" to begin simulation</p>
                            </div>
                        </div>
                    )}
                  </>
                ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <Activity size={48} className="mb-4 opacity-10" />
                        <p className="font-black uppercase tracking-widest text-xs">Awaiting Strategy Initialization</p>
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
