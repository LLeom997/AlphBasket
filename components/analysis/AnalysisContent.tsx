import React, { memo } from "react";
import AnalyticsPanel from "../AnalyticsPanel";
import PerformanceCharts from "../PerformanceCharts";
import PredictiveAnalysis from "../PredictiveAnalysis";
import WealthBuilder from "../WealthBuilder";
import AllocationDetails from "../AllocationDetails";
import SnapshotHistory from "../SnapshotHistory";
import { AppTab, Basket, SimulationResult, Snapshot } from "../../types";

interface AnalysisContentProps {
    activeTab: AppTab;
    simulation: SimulationResult;
    currentBasket: Basket;
    stocks: any[];
    onRestoreSnapshot: (snap: Snapshot) => void;
    onTabChange: (tab: AppTab) => void;
}

/**
 * Memoized analysis content component to prevent unnecessary re-renders
 * Only updates when simulation data or active tab changes
 */
const AnalysisContent = memo(({ activeTab, simulation, currentBasket, stocks, onRestoreSnapshot, onTabChange }: AnalysisContentProps) => {
    return (
        <div className="h-full">
            <div className={activeTab === "history" ? "space-y-3" : "hidden"}>
                <AnalyticsPanel simulation={simulation} basket={currentBasket} />
                <PerformanceCharts history={simulation.history} comparisonSeries={simulation.comparisonSeries} drawdownData={simulation.drawdownSeries} />
            </div>

            <div className={activeTab === "predictive" ? "" : "hidden"}>
                <PredictiveAnalysis simulation={simulation} />
            </div>

            <div className={activeTab === "wealth" ? "" : "hidden"}>
                <WealthBuilder simulation={simulation} />
            </div>

            <div className={activeTab === "allocation" ? "" : "hidden"}>
                <AllocationDetails simulation={simulation} stocks={stocks} />
            </div>

            <div className={activeTab === "snapshots" ? "" : "hidden"}>
                <SnapshotHistory basketId={currentBasket.id} currentSimulation={simulation} onRestore={onRestoreSnapshot} onExit={() => onTabChange("history")} />
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Only re-render if simulation data or active tab changes
    return (
        prevProps.activeTab === nextProps.activeTab &&
        prevProps.simulation.basketId === nextProps.simulation.basketId &&
        prevProps.simulation.history.length === nextProps.simulation.history.length &&
        prevProps.currentBasket.id === nextProps.currentBasket.id
    );
});

AnalysisContent.displayName = "AnalysisContent";

export default AnalysisContent;

