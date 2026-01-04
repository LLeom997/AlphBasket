import React, { useEffect, useState, useCallback, useMemo } from "react"
import { Basket } from "../types"
import { fetchProjects, deleteProject } from "../services/projectService"
import { supabase } from "../services/supabase"
import { 
  Plus, Trash2, Calendar, Layout, Loader2, 
  Grid3X3, List, Layers, Search, ArrowUpDown, 
  TrendingUp, Wallet, MoreHorizontal, IndianRupee, PieChart, Image as ImageIcon, CheckCircle2,
  Zap, ShieldAlert, Sparkles, Activity, Award, BarChart4, ArrowUpRight, ArrowDownRight
} from "lucide-react"

interface DashboardProps {
  onSelectProject: (basket: Basket) => void
  onCreateProject: () => void
  activeProjectId?: string
}

type ViewMode = 'grid' | 'table';
type SortBy = 'cagr' | 'volatility' | 'date' | 'name' | 'growthScore' | 'todayReturn' | 'inceptionReturn';

const Dashboard: React.FC<DashboardProps> = ({
  onSelectProject,
  onCreateProject,
  activeProjectId
}) => {
  const [projects, setProjects] = useState<Basket[]>([])
  const [loading, setLoading] = useState(true)
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
      else if (sortBy === 'volatility') { valA = a.volatility || 0; valB = b.volatility || 0; }
      else if (sortBy === 'growthScore') { valA = a.growthScore || 0; valB = b.growthScore || 0; }
      else if (sortBy === 'todayReturn') { valA = a.todayReturn || 0; valB = b.todayReturn || 0; }
      else if (sortBy === 'inceptionReturn') { valA = a.inceptionReturn || 0; valB = b.inceptionReturn || 0; }
      else if (sortBy === 'date') { valA = a.createdAt; valB = b.createdAt; }
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

  const formatPct = (val: number | undefined) => (val !== undefined) ? (val * 100).toFixed(2) + '%' : '0.00%';

  const ReturnBadge = ({ val }: { val: number | undefined }) => {
      const isPositive = (val || 0) >= 0;
      return (
          <div className={`flex items-center gap-1 font-semibold text-[11px] ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {formatPct(val)}
          </div>
      );
  };

  if (loading) return (
    <div className="flex h-[60vh] flex-col items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600 w-8 h-8 mb-4" />
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Syncing Workbench...</p>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Workbench</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Institutional-grade synthetic asset backtesting</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {[
              { id: 'table', icon: List },
              { id: 'grid', icon: Grid3X3 }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as ViewMode)}
                className={`p-2 rounded-lg transition-all ${viewMode === mode.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-indigo-600'}`}
              >
                <mode.icon size={16} />
              </button>
            ))}
          </div>
          <button
            onClick={onCreateProject}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Plus size={16} /> New Strategy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-2">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Top CAGR</p>
            <p className="text-sm font-bold text-slate-900">
              {projects.length > 0 ? formatPct(Math.max(...projects.map(p => p.cagr || 0))) : '0.00%'}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
            <ShieldAlert size={18} />
          </div>
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Target Risk</p>
            <p className="text-sm font-bold text-slate-900">
              {projects.length > 0 ? formatPct(Math.min(...projects.map(p => p.volatility || 1))) : '0.00%'}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
            <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                <Sparkles size={18} />
            </div>
            <div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Growth Score</p>
                <p className="text-sm font-bold text-slate-900">
                    {projects.length > 0 ? Math.max(...projects.map(p => p.growthScore || 0)).toFixed(1) : '0'}
                </p>
            </div>
        </div>
        <div className="relative">
           <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
           <input 
             type="text"
             placeholder="SEARCH STRATEGIES..."
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider outline-none shadow-sm focus:border-indigo-400 transition-all"
           />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mx-2">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Strategy Objective</th>
                  <th className="px-6 py-4 text-right cursor-pointer hover:text-indigo-600" onClick={() => { setSortBy('todayReturn'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                    <div className="flex items-center justify-end gap-1.5">
                      Daily Chg
                      <ArrowUpDown size={10} className={sortBy === 'todayReturn' ? 'text-indigo-600' : 'opacity-30'} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right cursor-pointer hover:text-indigo-600" onClick={() => { setSortBy('inceptionReturn'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                    <div className="flex items-center justify-end gap-1.5">
                      Inception Ret.
                      <ArrowUpDown size={10} className={sortBy === 'inceptionReturn' ? 'text-indigo-600' : 'opacity-30'} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right">CAGR</th>
                  <th className="px-6 py-4 text-right">Growth Rank</th>
                  <th className="px-6 py-4 text-center w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedProjects.map(p => {
                  const isActive = p.id === activeProjectId;
                  const scoreValue = p.growthScore || 0;

                  return (
                    <tr key={p.id} onClick={() => onSelectProject(p)} className={`hover:bg-slate-50 cursor-pointer transition-colors group ${isActive ? 'bg-indigo-50/40' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0">
                            {p.iconUrl ? (
                                <img src={p.iconUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                                <Activity size={16} className="text-slate-300" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                  <span className={`font-semibold text-sm truncate ${isActive ? 'text-indigo-700' : 'text-slate-900'}`}>{p.name}</span>
                                  {isActive && <CheckCircle2 size={12} className="text-indigo-500" />}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] font-semibold text-indigo-500 uppercase px-1.5 bg-indigo-50 rounded">{p.category || 'General'}</span>
                                  <span className="text-[9px] font-medium text-slate-400 uppercase">Synced {new Date(p.createdAt).toLocaleDateString()}</span>
                              </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <ReturnBadge val={p.todayReturn} />
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className={`font-semibold text-xs ${(p.inceptionReturn || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {formatPct(p.inceptionReturn)}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-xs font-semibold text-slate-700">
                          {formatPct(p.cagr)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                              <span className="text-[10px] font-bold text-indigo-600">{scoreValue.toFixed(1)}</span>
                              <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-600" style={{ width: `${scoreValue}%` }}></div>
                              </div>
                          </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={e => handleDelete(e, p.id)} className="text-slate-300 hover:text-rose-500 p-1.5 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredAndSortedProjects.map(project => {
              const isActive = project.id === activeProjectId;
              const score = project.growthScore || 0;
              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className={`bg-white p-5 rounded-xl border transition-all cursor-pointer group ${isActive ? 'border-indigo-400 ring-2 ring-indigo-500/5 shadow-md' : 'border-slate-200 hover:border-indigo-300'}`}
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                          {project.iconUrl ? (
                              <img src={project.iconUrl} alt={project.name} className="w-full h-full object-cover" />
                          ) : (
                              <Activity size={18} className="text-slate-300" />
                          )}
                      </div>
                      <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-semibold text-indigo-600 uppercase tracking-wider mb-1">{project.category || 'General'}</span>
                          <h3 className={`font-bold text-base truncate ${isActive ? 'text-indigo-900' : 'text-slate-900'}`}>{project.name}</h3>
                      </div>
                    </div>
                    <button onClick={e => handleDelete(e, project.id)} className="text-slate-300 hover:text-rose-500 p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-5">
                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Today</p>
                        <ReturnBadge val={project.todayReturn} />
                     </div>
                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Inception</p>
                        <p className={`text-[11px] font-bold ${(project.inceptionReturn || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                           {formatPct(project.inceptionReturn)}
                        </p>
                     </div>
                  </div>

                  <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Alpha Score</span>
                      <span className="text-[10px] font-bold text-indigo-600">{score.toFixed(0)}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600" style={{ width: `${score}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filteredAndSortedProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-300 rounded-xl bg-white/50 text-center mx-2">
              <BarChart4 size={40} className="text-slate-200 mb-3" />
              <h3 className="font-semibold text-slate-400 uppercase tracking-wider text-xs">No strategies found</h3>
          </div>
      )}
    </div>
  )
}

export default Dashboard