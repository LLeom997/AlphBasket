import React from 'react';
import { X, LayoutDashboard, Briefcase, LogOut, ChevronLeft, ChevronRight, Moon, Sun, Settings } from 'lucide-react';

interface SidebarProps {
    sidebarOpen: boolean;
    sidebarCollapsed: boolean;
    onToggleCollapse: () => void;
    onClose: () => void;
    currentBasket: any;
    onLogout: () => void;
    view: string;
    onViewChange: (view: string) => void;
    theme: string;
    onThemeChange: (theme: "default" | "beach") => void;
}

export default function Sidebar({
    sidebarOpen,
    sidebarCollapsed,
    onToggleCollapse,
    onClose,
    currentBasket,
    onLogout,
    view,
    onViewChange,
    theme,
    onThemeChange
}: SidebarProps) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'editor', label: 'Editor', icon: Settings },
    ];

    return (
        <aside
            className={`fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 flex flex-col
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
            w-64
            `}
        >
            <div className={`h-16 flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-6 justify-between'} border-b border-slate-100`}>
                {!sidebarCollapsed && (
                    <span className="font-bold text-xl text-brand-teal tracking-tight">
                        AlphaBasket
                    </span>
                )}
                {sidebarCollapsed && (
                    <span className="font-bold text-xl text-brand-teal">AB</span>
                )}

                <button
                    onClick={onClose}
                    className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg"
                >
                    <X size={20} />
                </button>

                <button
                    onClick={onToggleCollapse}
                    className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                    {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = view === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                onViewChange(item.id);
                                if (window.innerWidth < 1024) onClose();
                            }}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                                ${isActive
                                    ? 'bg-brand-teal/10 text-brand-teal font-medium shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                ${sidebarCollapsed ? 'justify-center' : ''}
                            `}
                            title={sidebarCollapsed ? item.label : undefined}
                        >
                            <Icon size={18} className={`${isActive ? 'text-brand-teal' : 'text-slate-500 group-hover:text-slate-700'}`} />
                            {!sidebarCollapsed && <span>{item.label}</span>}
                        </button>
                    );
                })}
            </div>

            <div className="p-3 border-t border-slate-100 flex flex-col gap-2">

                <button
                    onClick={() => onThemeChange(theme === 'default' ? 'beach' : 'default')}
                    className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-slate-600 hover:bg-slate-50
                        ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                    title="Toggle Theme"
                >
                    {theme === 'beach' ? <Sun size={20} className="text-brand-orange" /> : <Moon size={20} />}
                    {!sidebarCollapsed && <span>{theme === 'default' ? 'Dark Mode' : 'Light Mode'}</span>}
                </button>

                <button
                    onClick={onLogout}
                    className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-rose-600 hover:bg-rose-50
                        ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                    title="Logout"
                >
                    <LogOut size={20} />
                    {!sidebarCollapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
}
