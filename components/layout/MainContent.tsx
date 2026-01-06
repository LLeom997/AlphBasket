import React from "react";
import { Activity, RefreshCw, AlertCircle, LineChart, PieChart as PieIcon, Sparkles, Loader2, CheckCircle2, TrendingUp, History, Camera } from "lucide-react";
import BasketBuilder from "../BasketBuilder";
import Dashboard from "../Dashboard";
import AnalysisContent from "../analysis/AnalysisContent";
import { AppTab, Basket, SimulationResult, Snapshot } from "../../types";

interface MainContentProps {
    view: "dashboard" | "editor";
    currentBasket: Basket | null;
    simulation: SimulationResult | null;
    isSimulating: boolean;
    showSuccess: boolean;
    errorMsg: string | null;
    activeTab: AppTab;
    onTabChange: (tab: AppTab) => void;
    onSaveSnapshot: () => void;
    isSavingSnapshot: boolean;
    onRestoreSnapshot: (snap: Snapshot) => void;
    stocks: any[];
    session: any;
    onCreateProject: () => void;
    onSelectProject: (basket: Basket) => void;
    onSaveBasket: (b: Basket) => Promise<void>;
    onSimulate: (b: Basket) => Promise<void>;
    onOpenExplorer: () => void;
    onDashboardRefresh?: () => void;
}

/**
 * Main content area component
 */
export default function MainContent({
    view,
    currentBasket,
    simulation,
    isSimulating,
    showSuccess,
    errorMsg,
    activeTab,
    onTabChange,
    onSaveSnapshot,
    isSavingSnapshot,
    onRestoreSnapshot,
    stocks,
    session,
    onCreateProject,
    onSelectProject,
    onSaveBasket,
    onSimulate,
    onOpenExplorer,
    onDashboardRefresh
}: MainContentProps) {
    if (view === "dashboard") {
        return (
            <div className="h-full overflow-y-auto custom-scrollbar">
                <Dashboard
                    key="dashboard"
                    onCreateProject={onCreateProject}
                    onSelectProject={onSelectProject}
                    activeProjectId={currentBasket?.id}
                    onBasketUpdated={onDashboardRefresh}
                />
            </div>
        );
    }

    return (
        <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">
            <div className="lg:col-span-4 xl:col-span-3 shrink-0 overflow-y-auto custom-scrollbar">
                <BasketBuilder
                    availableStocks={stocks}
                    initialBasket={currentBasket}
                    onSave={onSaveBasket}
                    onSimulate={onSimulate}
                    isSimulating={isSimulating}
                    onOpenExplorer={onOpenExplorer}
                />
            </div>

            <div className="lg:col-span-8 xl:col-span-9 flex flex-col space-y-3 overflow-hidden">
                {currentBasket ? (
                    <>
                        <div className="flex items-center justify-between shrink-0">
                            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                                {[
                                    { id: "history", label: "History", icon: LineChart },
                                    { id: "predictive", label: "Forecast", icon: Sparkles },
                                    { id: "wealth", label: "Wealth", icon: TrendingUp },
                                    { id: "allocation", label: "Plan", icon: PieIcon },
                                    { id: "snapshots", label: "Registry", icon: History }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => onTabChange(tab.id as AppTab)}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-brand-teal text-white shadow-sm" : "text-slate-500 hover:text-brand-teal"}`}
                                    >
                                        <tab.icon size={13} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {simulation && activeTab !== "snapshots" && (
                                <button onClick={onSaveSnapshot} disabled={isSavingSnapshot} className="flex items-center gap-2 bg-slate-900 px-4 py-1.5 rounded-xl text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black transition-all shadow-sm">
                                    {isSavingSnapshot ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                                    Capture Plan
                                </button>
                            )}
                        </div>

                        {errorMsg && (
                            <div className="bg-brand-red/10 border border-brand-red/10 p-3 rounded-xl flex items-center gap-3 text-brand-red text-[10px] font-bold uppercase">
                                <AlertCircle size={16} /> {errorMsg}
                            </div>
                        )}

                        {isSimulating ? (
                            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200">
                                <RefreshCw size={32} className="text-brand-teal animate-spin mb-3" />
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Backtesting Logic...</p>
                            </div>
                        ) : showSuccess ? (
                            <div className="flex-1 flex flex-col items-center justify-center bg-brand-green/5 rounded-xl border border-brand-green/10 animate-in zoom-in duration-200">
                                <CheckCircle2 size={40} className="text-brand-green mb-3" />
                                <p className="text-[12px] font-bold text-brand-green uppercase tracking-wider">Analysis Complete</p>
                            </div>
                        ) : simulation ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar" key={`analysis-${simulation.basketId}`}>
                                <AnalysisContent
                                    activeTab={activeTab}
                                    simulation={simulation}
                                    currentBasket={currentBasket}
                                    stocks={stocks}
                                    onRestoreSnapshot={onRestoreSnapshot}
                                    onTabChange={onTabChange}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/50">
                                <Activity size={32} className="mb-3 opacity-20" />
                                <p className="font-semibold uppercase tracking-wider text-[10px]">Awaiting Instructions</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/50">
                        <Activity size={32} className="mb-3 opacity-20" />
                        <p className="font-semibold uppercase tracking-wider text-[10px]">Strategy Not Initialized</p>
                    </div>
                )}
            </div>
        </div>
    );
}

