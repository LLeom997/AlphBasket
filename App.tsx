import React, { useState, useEffect } from "react";
import { getStocks, initDefaultStocks } from "./services/market/marketData";
import { saveProject, fetchProjectById } from "./services/database/projectService";
import { saveSnapshot } from "./services/database/snapshotService";
import { supabase } from "./services/database/supabase";
import { useAuth } from "./hooks/useAuth";
import { useBasket } from "./hooks/useBasket";
import { useSimulation } from "./hooks/useSimulation";
import { useView } from "./hooks/useView";
import Sidebar from "./components/layout/Sidebar";
import MainContent from "./components/layout/MainContent";
import Auth from "./components/Auth";
import StockSelectorModal from "./components/StockSelectorModal";
import { AppTab, Snapshot } from "./types";
import { Menu, RefreshCw } from "lucide-react";
import { STORAGE_KEYS } from "./utils/constants";

export default function App() {
    const { session, isLoading: authLoading, logout } = useAuth();
    const { view, setView } = useView();
    const { currentBasket, setCurrentBasket, loadBasket, saveBasket, createNewBasket, clearBasket } = useBasket(session);
    const { simulation, setSimulation, isSimulating, errorMsg, showSuccess, runSimulation } = useSimulation();

    const [activeTab, setActiveTab] = useState<AppTab>("history");
    const [stocks, setStocks] = useState<any[]>([]);
    const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isAssetExplorerOpen, setIsAssetExplorerOpen] = useState(false);
    const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

    useEffect(() => {
        const restoreSession = async () => {
            if (session) {
                const savedBasketId = localStorage.getItem(STORAGE_KEYS.ACTIVE_BASKET_ID);
                const savedView = localStorage.getItem(STORAGE_KEYS.VIEW_MODE) as any;

                if (savedBasketId) {
                    setIsLoading(true);
                    const basket = await loadBasket(savedBasketId);
                    if (basket) {
                        setView(savedView || "editor");

                    } else {
                        setView("dashboard");
                    }
                    setIsLoading(false);
                } else {
                    setView("dashboard");
                }
            } else {
                setView("auth");
            }
        };

        restoreSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (!newSession) {
                setView("auth");
                clearBasket();
                setSimulation(null);
            } else {
                setView(prev => prev === "auth" ? "dashboard" : prev);
            }
        });

        initData();
        return () => subscription.unsubscribe();
    }, [session]);

    const initData = async () => {
        try {
            await initDefaultStocks();
            setStocks(getStocks());
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogout = async () => {
        setIsLoading(true);
        await logout();
        setIsLoading(false);
    };

    const handleSimulate = async (basket: any) => {
        try {
            const updatedBasket = await runSimulation(basket);
            if (updatedBasket && session) {
                await saveBasket(updatedBasket);
                // Trigger dashboard refresh to show updated metrics
                setDashboardRefreshKey(prev => prev + 1);
            }
        } catch (error) {
            // Error is handled by useSimulation hook
        }
    };

    const handleSaveSnapshot = async () => {
        if (!simulation || !currentBasket || !session) return;
        const label = window.prompt("Label this Snapshot", `Projection ${new Date().toLocaleDateString()}`);
        if (!label) return;

        setIsSavingSnapshot(true);
        try {
            await saveSnapshot(currentBasket, simulation, label, session.user.id);
            setActiveTab("snapshots");
        } catch (e) {
            alert("Snapshot failed.");
        } finally {
            setIsSavingSnapshot(false);
        }
    };

    const handleRestoreSnapshot = async (snap: Snapshot) => {
        if (!currentBasket) return;
        const restoredBasket = {
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
        setActiveTab("history");

    };

    const openEditor = (basket: any) => {
        setCurrentBasket(basket);
        setView("editor");
        setSimulation(null);

    };

    const handleCreateNewProject = () => {
        const newBasket = createNewBasket();
        openEditor(newBasket);
    };

    const handleAddStocksFromExplorer = (tickers: string[]) => {
        if (!currentBasket) return;
        const currentTickers = new Set(currentBasket.items.map((i: any) => i.ticker));
        const uniqueNewTickers = tickers.filter(t => !currentTickers.has(t));
        if (uniqueNewTickers.length === 0) return;
        const combined = [...currentBasket.items, ...uniqueNewTickers.map(ticker => ({ ticker, weight: 0 }))];
        const eq = combined.length > 0 ? 100 / combined.length : 100;
        const updated = { ...currentBasket, items: combined.map((i: any) => ({ ...i, weight: eq })) };
        setCurrentBasket(updated);
    };

    if (view === "auth") return <Auth />;

    return (
        <div className="h-screen flex bg-slate-50 text-slate-900 font-sans overflow-hidden">


            <StockSelectorModal
                isOpen={isAssetExplorerOpen}
                onClose={() => setIsAssetExplorerOpen(false)}
                stocks={stocks}
                onAdd={handleAddStocksFromExplorer}
                alreadySelected={currentBasket?.items.map((i: any) => i.ticker) || []}
            />

            <Sidebar
                sidebarOpen={sidebarOpen}
                sidebarCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                onClose={() => setSidebarOpen(false)}
                currentBasket={currentBasket}
                onLogout={handleLogout}
                view={view}
                onViewChange={setView}
            />

            <main className="flex-1 flex flex-col min-w-0 h-full relative">
                <header className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between sticky top-0 z-20">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-50"><Menu size={20} /></button>
                    <span className="font-bold text-brand-teal text-sm tracking-tight">ALPHABASKET</span>
                    <div className="w-10"></div>
                </header>

                <div className="flex-1 overflow-hidden p-4 lg:p-6">
                    <MainContent
                        view={view}
                        currentBasket={currentBasket}
                        simulation={simulation}
                        isSimulating={isSimulating}
                        showSuccess={showSuccess}
                        errorMsg={errorMsg}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        onSaveSnapshot={handleSaveSnapshot}
                        isSavingSnapshot={isSavingSnapshot}
                        onRestoreSnapshot={handleRestoreSnapshot}
                        stocks={stocks}
                        session={session}
                        onCreateProject={handleCreateNewProject}
                        onSelectProject={openEditor}
                        onSaveBasket={async (b) => {
                            await saveBasket(b);
                        }}
                        onSimulate={handleSimulate}
                        onOpenExplorer={() => setIsAssetExplorerOpen(true)}
                        onDashboardRefresh={() => setDashboardRefreshKey(prev => prev + 1)}
                    />
                </div>
            </main>
        </div>
    );
}
