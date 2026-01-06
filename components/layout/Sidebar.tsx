import React from "react";
import { LogOut, ChevronLeft, ChevronRight, LayoutDashboard, Edit3, X } from "lucide-react";

interface SidebarProps {
    sidebarOpen: boolean;
    sidebarCollapsed: boolean;
    onToggleCollapse: () => void;
    onClose: () => void;
    currentBasket: any;
    onLogout: () => void;
    view: "dashboard" | "editor";
    onViewChange: (view: "dashboard" | "editor") => void;
}

/**
 * Sidebar navigation component
 */
export default function Sidebar({ sidebarOpen, sidebarCollapsed, onToggleCollapse, onClose, currentBasket, onLogout, view, onViewChange }: SidebarProps) {

    return (
        <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transform transition-all duration-200 flex flex-col shrink-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static ${sidebarCollapsed ? "w-16" : "w-60"}`}>
            <div className={`p-4 border-b border-slate-100 flex items-center h-14 ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
                {!sidebarCollapsed && <span className="font-bold text-brand-teal text-base tracking-tight">AlphaBasket</span>}
                <button onClick={onToggleCollapse} className="hidden lg:block text-slate-400 hover:text-brand-teal p-1 rounded-lg">
                    {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
                <button onClick={onClose} className="lg:hidden text-slate-400"><X size={18} /></button>
            </div>

            <div className="p-2 flex-1 overflow-y-auto space-y-1 mt-2">
                <button onClick={() => onViewChange("dashboard")} className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3 px-3"} py-2.5 rounded-lg transition-all ${view === "dashboard" ? "bg-brand-teal text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
                    <LayoutDashboard size={18} />
                    {!sidebarCollapsed && <span className="text-xs font-semibold uppercase">Workbench</span>}
                </button>
                {currentBasket && (
                    <button onClick={() => onViewChange("editor")} className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3 px-3"} py-2.5 rounded-lg transition-all ${view === "editor" ? "bg-brand-teal text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
                        <Edit3 size={18} />
                        {!sidebarCollapsed && <span className="text-xs font-semibold uppercase tracking-tight">Strategy Editor</span>}
                    </button>
                )}
            </div>

            <div className="p-2 border-t border-slate-100 mb-2">
                <button onClick={onLogout} className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3 px-3"} py-2.5 rounded-lg text-slate-400 hover:text-brand-red hover:bg-red-50 transition-all`}>
                    <LogOut size={18} />
                    {!sidebarCollapsed && <span className="text-xs font-semibold uppercase">Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}

