import React, { useState, useEffect } from 'react';
import { getStocks, calculateBasketHistory, ensureStockHistory } from './services/marketData';
import { saveProject } from './services/projectService';
import { supabase, signOut } from './services/supabase';
import BasketBuilder from './components/BasketBuilder';
import PerformanceCharts from './components/PerformanceCharts';
import AnalyticsPanel from './components/AnalyticsPanel';
import AllocationDetails from './components/AllocationDetails';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { Basket, SimulationResult } from './types';
import { LogOut, Menu, X, Activity, RefreshCw, ChevronLeft, ChevronRight, ArrowLeft, AlertCircle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<'auth' | 'dashboard' | 'editor'>('auth');
  
  const [stocks, setStocks] = useState<any[]>([]);
  const [currentBasket, setCurrentBasket] = useState<Basket | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);

  // -----------------------------------------------
  // AUTH + INITIAL DATA LOAD
  // -----------------------------------------------

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setView('dashboard');
      } else {
        setView('auth');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session && view === 'auth') {
        setView('dashboard');
      } else if (!session) {
        setView('auth');
      }
    });

    if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }

    // Load minimal stock set so the UI has data available
    initData();

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initData = async () => {
    try {
      // Load a safe minimum set of stocks for UI dropdowns
      // We prioritize TATASTEEL as requested
      const defaultTickers = ["TATASTEEL", "RELIANCE", "HDFCBANK", "INFY", "ITC"];
      await ensureStockHistory(defaultTickers);

      setStocks(getStocks());
    } catch (e) {
      console.error("Failed to initialize market data", e);
    }
  };

  // -----------------------------------------------
  // SIMULATION ENGINE HOOK
  // -----------------------------------------------

  const handleSimulate = async (basket: Basket) => {
    setErrorMsg(null);

    const activeItems = basket.items.filter(i => !i.suppressed);
    if (activeItems.length === 0) {
      setSimulation(null);
      return;
    }

    setIsLoading(true);
    try {
      const tickers = basket.items.map(i => i.ticker);
      await ensureStockHistory(tickers);

      setStocks(getStocks());

      const result = calculateBasketHistory(basket);
      setSimulation(result);
      setCurrentBasket(basket);
    } catch (error: any) {
      console.error("Simulation failed", error);
      setErrorMsg(error.message || "Failed to generate simulation.");
      setSimulation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBasket = async (basket: Basket) => {
    if (!session) return;

    try {
      setIsLoading(true);
      await saveProject(basket, session.user.id);
      await handleSimulate(basket);
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save project");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleCreateNewProject = () => {
    // Initialize with TATASTEEL as the default stock
    const newBasket: Basket = {
        id: crypto.randomUUID(),
        name: 'New Analysis',
        description: 'TATASTEEL Breakdown',
        items: [{ ticker: 'TATASTEEL', weight: 100 }],
        rebalanceInterval: 'none',
        initialInvestment: 100000,
        createdAt: Date.now()
    };
    
    setCurrentBasket(newBasket);
    setSimulation(null);
    setErrorMsg(null);
    setView('editor');

    // Auto-trigger simulation so data is presented immediately
    setTimeout(() => handleSimulate(newBasket), 100);
  };

  // -----------------------------------------------
  // VIEWS
  // -----------------------------------------------

  if (view === 'auth') {
    return <Auth />;
  }

  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-slate-50 relative">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">AB</div>
            <span className="font-bold text-slate-800 text-lg">
              AlphaBasket
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full ml-1 uppercase">
                Demo Mode
              </span>
            </span>
          </div>

          <button 
            onClick={handleLogout}
            className="text-sm font-medium text-slate-500 hover:text-red-600 flex items-center gap-1"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </header>

        <Dashboard 
          onCreateProject={handleCreateNewProject}
          onSelectProject={async (b) => {
            setCurrentBasket(b);
            setSimulation(null);
            setErrorMsg(null);
            setView('editor');

            setTimeout(() => handleSimulate(b), 100);
          }}
        />
      </div>
    );
  }

  // -----------------------------------------------
  // PORTFOLIO EDITOR VIEW
  // -----------------------------------------------

  return (
    <div className="h-[100dvh] bg-slate-50 flex text-slate-900 font-sans overflow-hidden relative selection:bg-indigo-100 selection:text-indigo-900">

      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="animate-spin text-indigo-600 mb-4">
            <RefreshCw size={32} />
          </div>
          <p className="text-slate-600 font-bold animate-pulse">Running Simulation...</p>
        </div>
      )}

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 
        transform transition-all duration-300 shadow-2xl lg:shadow-none flex flex-col shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static
        ${sidebarCollapsed ? 'w-[70px]' : 'w-64'}
      `}>
        <div className={`p-4 border-b border-slate-100 flex items-center h-16 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
              <div className="bg-indigo-600 p-1 rounded text-white"><ArrowLeft size={14}/></div>
              <span className="font-bold text-slate-800">Dashboard</span>
            </div>
          )}

          {sidebarCollapsed && (
            <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-100 rounded">
              <ArrowLeft size={16} />
            </button>
          )}

          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:block text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          <div className="mb-4">
            {!sidebarCollapsed && (
              <>
                <p className="px-2 text-xs font-bold text-slate-400 uppercase mb-2">Current Project</p>
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                  <h3 className="font-bold text-indigo-900 truncate">{currentBasket?.name || "New Portfolio"}</h3>
                  <p className="text-xs text-indigo-600/70 truncate">
                    {currentBasket?.items.length || 0} Assets
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4">
            <button 
              onClick={handleCreateNewProject}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors`}
            >
              <RefreshCw size={18} />
              {!sidebarCollapsed && <span className="text-sm font-medium">Reset / New</span>}
            </button>
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-1">
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2 px-3'} py-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200`}
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <span className="text-xs font-bold">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN SECTION */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative z-0">

        <header className="lg:hidden h-14 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center px-4 justify-between sticky top-0 z-20">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold text-indigo-700">AlphaBasket</span>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 lg:p-6">
          <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-full">

            {/* LEFT PANEL */}
            <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 h-[450px] lg:h-full flex flex-col">
              <BasketBuilder 
                availableStocks={stocks}
                initialBasket={currentBasket}
                onSave={handleSaveBasket}
                onSimulate={handleSimulate}
              />
            </div>

            {/* RIGHT PANEL */}
            <div className="flex-1 min-w-0 space-y-6 pb-10 lg:pb-0 lg:overflow-y-auto lg:h-full pr-1">

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="text-red-600 shrink-0 w-5 h-5 mt-[2px]" />
                  <div>
                    <h3 className="font-bold text-red-800 text-sm">Simulation Error</h3>
                    <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
                  </div>
                </div>
              )}

              {simulation ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                  <div className="hidden lg:flex items-baseline justify-between sticky top-0 bg-slate-50/95 backdrop-blur z-10 py-2 border-b border-slate-200/50">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {currentBasket?.name || 'Unsaved Basket'}
                    </h2>

                    <span className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 font-mono">
                      {currentBasket?.rebalanceInterval === 'none'
                        ? 'Buy and Hold'
                        : `${currentBasket?.rebalanceInterval} Rebalancing`
                      }
                    </span>
                  </div>

                  <AllocationDetails simulation={simulation} />

                  <PerformanceCharts 
                    history={simulation.history}
                    buyAndHoldHistory={simulation.buyAndHoldHistory}
                    drawdownData={simulation.drawdownSeries} 
                    comparisonSeries={simulation.comparisonSeries}
                  />

                  <AnalyticsPanel simulation={simulation} />
                </div>
              ) : (
                !errorMsg && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl p-8 lg:p-12 bg-white/50">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 ring-4 ring-slate-50 shadow-lg shadow-slate-200">
                      <Activity size={48} className="text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Ready to Simulate</h3>
                    <p className="max-w-md text-center text-slate-500">
                      Select stocks from the left panel or use the 
                      <span className="text-indigo-600 font-bold"> AI Generator </span> 
                      to create a themed portfolio.
                    </p>
                  </div>
                )
              )}

            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
