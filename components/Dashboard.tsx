import React, { useEffect, useState, useCallback, useMemo } from "react"
import { Basket } from "../types"
import { fetchProjects, deleteProject } from "../services/database/projectService"
import { supabase } from "../services/database/supabase"
import { simulateAllBaskets } from "../services/analytics/basketMetrics"
import {
  Plus, Trash2, Calendar, Layout, Loader2,
  Grid3X3, List, Layers, Search, ArrowUpDown,
  TrendingUp, Wallet, MoreHorizontal, IndianRupee, PieChart, Image as ImageIcon, CheckCircle2,
  Zap, ShieldAlert, Sparkles, Activity, Award, BarChart4, ArrowUpRight, ArrowDownRight, RefreshCw, Clock
} from "lucide-react"

interface DashboardProps {
  onSelectProject: (basket: Basket) => void
  onCreateProject: () => void
  activeProjectId?: string
}

type ViewMode = 'grid' | 'table' | 'heatmap';
type SortBy = 'cagr' | 'cagr1y' | 'cagr3y' | 'cagr5y' | 'volatility' | 'date' | 'name' | 'sharpeRatio' | 'maxDrawdown' | 'todayReturn' | 'inceptionReturn' | 'irr' | 'updatedAt';

const Dashboard: React.FC<DashboardProps> = ({
  onSelectProject,
  onCreateProject,
  activeProjectId,
  onBasketUpdated
}) => {
  const [projects, setProjects] = useState<Basket[]>([])
  const [loading, setLoading] = useState(true)
  const [isSimulatingAll, setIsSimulatingAll] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('cagr')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return;
      const data = await fetchProjects(session.user.id)
      setProjects(data)
    } catch (err) {
      console.error("Failed to load portfolios.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const filteredAndSortedProjects = useMemo(() => {
    let list = projects.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortBy === 'cagr') { valA = a.cagr || 0; valB = b.cagr || 0; }
      else if (sortBy === 'irr') { valA = a.irr || 0; valB = b.irr || 0; }
      else if (sortBy === 'cagr1y') { valA = a.cagr1y || 0; valB = b.cagr1y || 0; }
      else if (sortBy === 'cagr3y') { valA = a.cagr3y || 0; valB = b.cagr3y || 0; }
      else if (sortBy === 'cagr5y') { valA = a.cagr5y || 0; valB = b.cagr5y || 0; }
      else if (sortBy === 'volatility') { valA = a.volatility || 0; valB = b.volatility || 0; }
      else if (sortBy === 'sharpeRatio') { valA = a.sharpeRatio || 0; valB = b.sharpeRatio || 0; }
      else if (sortBy === 'maxDrawdown') { valA = a.maxDrawdown || 0; valB = b.maxDrawdown || 0; }
      else if (sortBy === 'todayReturn') { valA = a.todayReturn || 0; valB = b.todayReturn || 0; }
      else if (sortBy === 'inceptionReturn') { valA = a.inceptionReturn || 0; valB = b.inceptionReturn || 0; }
      else if (sortBy === 'date') { valA = a.createdAt; valB = b.createdAt; }
      else if (sortBy === 'updatedAt') { valA = a.updatedAt || 0; valB = b.updatedAt || 0; }
      else { valA = a.name; valB = b.name; }

      const factor = sortOrder === 'desc' ? -1 : 1;
      if (valA < valB) return -1 * factor;
      if (valA > valB) return 1 * factor;
      return 0;
    });
  }, [projects, searchTerm, sortBy, sortOrder]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!window.confirm("Delete strategy permanently?")) return;
    try {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (err) { console.error(err) }
  }

  const handleSimulateAll = useCallback(async () => {
    try {
      setIsSimulatingAll(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return;

      // Filter baskets that have items to simulate
      const basketsToSimulate = projects.filter(p => p.items && p.items.length > 0)

      if (basketsToSimulate.length === 0) {
        alert("No baskets with stocks to simulate.")
        return
      }

      // Simulate all baskets in parallel
      const updatedBaskets = await simulateAllBaskets(basketsToSimulate, session.user.id)

      // Merge updated baskets back into projects list
      const updatedMap = new Map(updatedBaskets.map(b => [b.id, b]))
      const mergedProjects = projects.map(p => updatedMap.get(p.id) || p)

      setProjects(mergedProjects)
    } catch (err) {
      console.error("Failed to simulate all baskets:", err)
      alert("Failed to simulate all baskets. Please try again.")
    } finally {
      setIsSimulatingAll(false)
    }
  }, [projects])

  const formatPct = (val: number | undefined) => (val !== undefined) ? (val * 100).toFixed(2) + '%' : '0.00%';

  const getHeatMapStyle = (val: number | undefined) => {
    if (val === undefined) return {};
    const v = val * 100;
    // Positive tiers using Teal and Green
    if (v >= 10) return { backgroundColor: '#5acec9', color: '#042f2e' }; // Brand Teal (Primary)
    if (v >= 5) return { backgroundColor: '#8dd67a', color: '#064e3b' };  // Brand Green (Success)
    if (v > 0) return { backgroundColor: '#dcfce7', color: '#166534' };   // Light Green
    // Negative tiers using Red and Orange
    if (v <= -10) return { backgroundColor: '#f3533b', color: '#fff' };   // Brand Red (Danger)
    if (v <= -5) return { backgroundColor: '#fa9f42', color: '#fff' };    // Brand Orange (Warning)
    if (v < 0) return { backgroundColor: '#fee2e2', color: '#991b1b' };   // Light Red
    return { backgroundColor: '#f1f5f9', color: '#64748b' }; // Neutral
  };

  const ReturnBadge = ({ val, heatmap = false }: { val: number | undefined, heatmap?: boolean }) => {
    const isPositive = (val || 0) >= 0;
    const style = heatmap ? getHeatMapStyle(val) : {};
    return (
      <div
        style={style}
        className={`flex items-center gap-1 font-semibold text-[11px] px-2 py-1 rounded-md transition-all ${!heatmap ? (isPositive ? 'text-brand-green' : 'text-brand-red') : ''}`}
      >
        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {formatPct(val)}
      </div>
    );
  };

  const getTagColor = (ticker: string) => {
    const colors = [
      'bg-blue-50 text-blue-600 border-blue-200',
      'bg-indigo-50 text-indigo-600 border-indigo-200',
      'bg-violet-50 text-violet-600 border-violet-200',
      'bg-purple-50 text-purple-600 border-purple-200',
      'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
      'bg-pink-50 text-pink-600 border-pink-200',
      'bg-rose-50 text-rose-600 border-rose-200',
      'bg-orange-50 text-orange-600 border-orange-200',
      'bg-amber-50 text-amber-600 border-amber-200',
      'bg-emerald-50 text-emerald-600 border-emerald-200',
      'bg-teal-50 text-teal-600 border-teal-200',
      'bg-cyan-50 text-cyan-600 border-cyan-200',
      'bg-sky-50 text-sky-600 border-sky-200',
    ];
    let hash = 0;
    for (let i = 0; i < ticker.length; i++) hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };



  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1 lg:px-2">
        <div className="flex flex-col">
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">Executive Workbench</h1>
          <p className="text-slate-500 text-xs lg:text-sm font-medium mt-0.5 lg:mt-1">Institutional-grade synthetic asset backtesting</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:gap-4">
          <div className="hidden sm:flex px-3 lg:px-4 py-2 bg-white border border-slate-200 rounded-xl lg:rounded-2xl shadow-sm items-center gap-2 lg:gap-3">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-brand-teal/10 rounded-lg lg:rounded-xl flex items-center justify-center text-brand-teal">
              <Layers size={14} className="lg:size-14" />
            </div>
            <div>
              <p className="text-[7px] lg:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Active Pool</p>
              <p className="text-xs font-black text-slate-900">{projects.length} Strategies</p>
            </div>
          </div>

          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0">
            {[
              { id: 'table', icon: List },
              { id: 'grid', icon: Grid3X3 },
              { id: 'heatmap', icon: Layout }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as ViewMode)}
                className={`p-1.5 lg:p-2 rounded-lg transition-all ${viewMode === mode.id ? 'bg-brand-teal text-white' : 'text-slate-400 hover:text-brand-teal'}`}
              >
                <mode.icon size={14} />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleSimulateAll}
              disabled={isSimulatingAll || projects.length === 0}
              className="flex-1 sm:flex-none bg-slate-900 hover:bg-black disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl font-bold text-[10px] lg:text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            >
              {isSimulatingAll ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              <span className="whitespace-nowrap">{isSimulatingAll ? "Simulating..." : "Refresh All"}</span>
            </button>
            <button
              onClick={onCreateProject}
              className="flex-1 sm:flex-none bg-brand-teal hover:opacity-90 text-white px-3 lg:px-5 py-2 lg:py-2.5 rounded-xl font-bold text-[10px] lg:text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Plus size={14} />
              <span className="whitespace-nowrap">New Strategy</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-2">
        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="SEARCH STRATEGIES..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider outline-none shadow-sm focus:border-brand-teal/30 transition-all"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mx-2">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Strategy</th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-brand-teal" onClick={() => { setSortBy('todayReturn'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                    <div className="flex items-center justify-end gap-1.5">
                      Daily Chg
                      <ArrowUpDown size={9} className={sortBy === 'todayReturn' ? 'text-brand-teal' : 'opacity-30'} />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-brand-teal" onClick={() => { setSortBy('inceptionReturn'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                    <div className="flex items-center justify-end gap-1.5">
                      Post-Mod Gain
                      <ArrowUpDown size={9} className={sortBy === 'inceptionReturn' ? 'text-brand-teal' : 'opacity-30'} />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-brand-teal" onClick={() => { setSortBy('irr'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                    <div className="flex items-center justify-end gap-1.5">
                      IRR (LTD)
                      <ArrowUpDown size={9} className={sortBy === 'irr' ? 'text-brand-teal' : 'opacity-30'} />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-brand-teal hidden md:table-cell" onClick={() => { setSortBy('cagr1y'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                    <div className="flex items-center justify-end gap-1.5">
                      1Y CAGR
                      <ArrowUpDown size={9} className={sortBy === 'cagr1y' ? 'text-brand-teal' : 'opacity-30'} />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-brand-teal hidden lg:table-cell" onClick={() => { setSortBy('cagr3y'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                    <div className="flex items-center justify-end gap-1.5">
                      3Y CAGR
                      <ArrowUpDown size={9} className={sortBy === 'cagr3y' ? 'text-brand-teal' : 'opacity-30'} />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-brand-teal hidden lg:table-cell" onClick={() => { setSortBy('cagr5y'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                    <div className="flex items-center justify-end gap-1.5">
                      5Y CAGR
                      <ArrowUpDown size={9} className={sortBy === 'cagr5y' ? 'text-brand-teal' : 'opacity-30'} />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-brand-teal sm:table-cell" onClick={() => { setSortBy('sharpeRatio'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                    <div className="flex items-center justify-end gap-1.5">
                      Sharpe
                      <ArrowUpDown size={9} className={sortBy === 'sharpeRatio' ? 'text-brand-teal' : 'opacity-30'} />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-brand-teal" onClick={() => { setSortBy('maxDrawdown'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                    <div className="flex items-center justify-end gap-1.5">
                      Max DD
                      <ArrowUpDown size={9} className={sortBy === 'maxDrawdown' ? 'text-brand-teal' : 'opacity-30'} />
                    </div>
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-indigo-600 hidden md:table-cell" onClick={() => { setSortBy('updatedAt'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                    <div className="flex items-center justify-end gap-1.5">
                      Saved
                      <ArrowUpDown size={9} className={sortBy === 'updatedAt' ? 'text-brand-teal' : 'opacity-30'} />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedProjects.map(p => {
                  const isActive = p.id === activeProjectId;
                  const scoreValue = p.growthScore || 0;

                  return (
                    <tr key={p.id} onClick={() => onSelectProject(p)} className={`hover:bg-slate-50 cursor-pointer transition-colors group ${isActive ? 'bg-brand-teal/5' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0">
                            {p.iconUrl ? (
                              <img src={p.iconUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Activity size={14} className="text-slate-300" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm truncate ${isActive ? 'text-brand-teal/80' : 'text-slate-900'}`}>{p.name}</span>
                              {isActive && <CheckCircle2 size={12} className="text-brand-teal" />}
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {p.items?.slice(0, 4).map(item => (
                                <span key={item.ticker} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTagColor(item.ticker)}`}>
                                  {item.ticker}
                                </span>
                              ))}
                              {(p.items?.length || 0) > 4 && (
                                <span className="text-[9px] font-bold text-slate-400 pl-1">
                                  +{p.items!.length - 4}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1 text-[9px] font-bold text-brand-teal uppercase tracking-wider">
                                <CheckCircle2 size={10} />
                                <span>Synced {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <ReturnBadge val={p.todayReturn} />
                      </td>
                      <td className="px-3 py-4 text-right">
                        <div className={`font-semibold text-[10px] ${(p.inceptionReturn || 0) >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                          {formatPct(p.inceptionReturn)}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <div className="text-[10px] font-bold text-brand-teal">
                          {formatPct(p.irr)}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right hidden md:table-cell">
                        <div className="text-[10px] font-semibold text-slate-700">
                          {formatPct(p.cagr1y)}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right hidden lg:table-cell">
                        <div className="text-[10px] font-semibold text-slate-700">
                          {formatPct(p.cagr3y)}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right hidden lg:table-cell">
                        <div className="text-[10px] font-semibold text-slate-700">
                          {formatPct(p.cagr5y)}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <div className="text-[10px] font-semibold text-brand-teal">
                          {(p.sharpeRatio || 0).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <div className="text-[10px] font-semibold text-brand-red">
                          {formatPct(p.maxDrawdown)}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[10px] font-bold text-slate-700">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'N/A'}</span>
                          <span className="text-[8px] text-slate-400 font-medium">{p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={e => handleDelete(e, p.id)} className="text-slate-300 hover:text-brand-red p-1.5 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredAndSortedProjects.map(project => {
              const isActive = project.id === activeProjectId;
              const score = project.growthScore || 0;
              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className={`bg-white p-5 rounded-xl border transition-all cursor-pointer group ${isActive ? 'border-brand-teal/40 ring-2 ring-brand-teal/5 shadow-md' : 'border-slate-200 hover:border-brand-teal/30'}`}
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                        {project.iconUrl ? (
                          <img src={project.iconUrl} alt={project.name} className="w-full h-full object-cover" />
                        ) : (
                          <Activity size={16} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          {project.items?.slice(0, 3).map(item => (
                            <span key={item.ticker} className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${getTagColor(item.ticker)}`}>
                              {item.ticker}
                            </span>
                          ))}
                          {(project.items?.length || 0) > 3 && (
                            <span className="text-[8px] font-bold text-slate-400">+{project.items!.length - 3}</span>
                          )}
                        </div>
                        <h3 className={`font-bold text-base truncate ${isActive ? 'text-brand-teal' : 'text-slate-900'}`}>{project.name}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 size={10} className="text-brand-teal" />
                          <span className="text-[8px] font-bold text-brand-teal uppercase tracking-wider">Synced {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                      <button onClick={e => handleDelete(e, project.id)} className="text-slate-300 hover:text-brand-red p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Daily Chg</p>
                        <ReturnBadge val={project.todayReturn} />
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Post-Mod</p>
                        <p className={`text-[10px] font-bold ${(project.inceptionReturn || 0) >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                          {formatPct(project.inceptionReturn)}
                        </p>
                      </div>
                      <div className="bg-brand-teal/5 p-2.5 rounded-lg border border-brand-teal/10">
                        <p className="text-[8px] font-bold text-brand-teal uppercase tracking-wider mb-1">LTD IRR</p>
                        <p className="text-[10px] font-black text-brand-teal/80">
                          {formatPct(project.irr)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <p className="text-[7px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">1Y CAGR</p>
                        <p className="text-[9px] font-bold text-slate-700">{formatPct(project.cagr1y)}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <p className="text-[7px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">3Y CAGR</p>
                        <p className="text-[9px] font-bold text-slate-700">{formatPct(project.cagr3y)}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <p className="text-[7px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">5Y CAGR</p>
                        <p className="text-[9px] font-bold text-slate-700">{formatPct(project.cagr5y)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <p className="text-[7px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Sharpe</p>
                        <p className="text-[9px] font-bold text-brand-teal">{(project.sharpeRatio || 0).toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <p className="text-[7px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Max DD</p>
                        <p className="text-[9px] font-bold text-brand-red">{formatPct(project.maxDrawdown)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredAndSortedProjects.map(p => (
                <div
                  key={p.id}
                  onClick={() => onSelectProject(p)}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col"
                >
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
                        {p.iconUrl ? <img src={p.iconUrl} className="w-full h-full object-cover" /> : <Activity size={14} className="text-slate-300" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{p.name}</span>
                    </div>
                    <div className="text-[9px] font-black text-brand-teal uppercase bg-brand-teal/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 size={10} /> Synced
                    </div>
                  </div>

                  <div className="px-4 pb-2 flex flex-wrap gap-1">
                    {p.items?.slice(0, 4).map(item => (
                      <span key={item.ticker} className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${getTagColor(item.ticker)}`}>
                        {item.ticker}
                      </span>
                    ))}
                    {(p.items?.length || 0) > 4 && (
                      <span className="text-[8px] font-bold text-slate-400">+{p.items!.length - 4}</span>
                    )}
                  </div>

                  <div className="p-4 grid grid-cols-2 gap-3 flex-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Daily Change</span>
                      <div style={getHeatMapStyle(p.todayReturn)} className="px-2 py-1.5 rounded-lg flex items-center justify-center font-bold text-xs">
                        {formatPct(p.todayReturn)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Post-Mod</span>
                      <div style={getHeatMapStyle(p.inceptionReturn)} className="px-2 py-1.5 rounded-lg flex items-center justify-center font-bold text-xs">
                        {formatPct(p.inceptionReturn)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">LTD IRR</span>
                      <div className="px-2 py-1.5 rounded-lg bg-brand-teal/5 text-brand-teal flex items-center justify-center font-black text-xs">
                        {formatPct(p.irr)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Last Saved</span>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-700">{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'N/A'}</span>
                        <span className="text-[8px] text-slate-400 font-medium">{p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredAndSortedProjects.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Search size={40} className="text-slate-300 mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No matching strategies found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {
        filteredAndSortedProjects.length === 0 && viewMode !== 'heatmap' && (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-300 rounded-xl bg-white/50 text-center mx-2">
            <BarChart4 size={40} className="text-slate-200 mb-3" />
            <h3 className="font-semibold text-slate-400 uppercase tracking-wider text-xs">No strategies found</h3>
          </div>
        )
      }
    </div >
  )
}

export default Dashboard