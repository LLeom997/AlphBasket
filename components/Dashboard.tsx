
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
    if (!window.confirm("Delete this portfolio permanently?")) return;
    try {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (err) { alert("Delete failed") }
  }

  const formatPct = (val: number | undefined) => (val !== undefined) ? (val * 100).toFixed(2) + '%' : '0.00%';

  const ReturnBadge = ({ val }: { val: number | undefined }) => {
      const isPositive = (val || 0) >= 0;
      return (
          <div className={`flex items-center gap-1 font-black text-[10px] ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {formatPct(val)}
          </div>
      );
  };

  if (loading) return (
    <div className="flex h-[60vh] flex-col items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Workbench...</p>
    </div>
  )

  return (
    <div className="p-4 sm:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Strategy Leaderboard</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Real-time performance tracking and growth potential analysis</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            {[
              { id: 'grid', icon: Grid3X3 },
              { id: 'table', icon: List }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as ViewMode)}
                className={`p-2.5 rounded-xl transition-all ${viewMode === mode.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <mode.icon size={18} />
              </button>
            ))}
          </div>
          <button
            onClick={onCreateProject}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 transition-all active:scale-95"
          >
            <Plus size={16} /> New Alpha Design
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Global Top CAGR</p>
            <p className="text-sm font-black text-slate-900">
              {projects.length > 0 ? formatPct(Math.max(...projects.map(p => p.cagr || 0))) : '0.00%'}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lowest Volatility</p>
            <p className="text-sm font-black text-slate-900">
              {projects.length > 0 ? formatPct(Math.min(...projects.map(p => p.volatility || 1))) : '0.00%'}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <Sparkles size={20} />
            </div>
            <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Max Growth Score</p>
                <p className="text-sm font-black text-slate-900">
                    {projects.length > 0 ? Math.max(...projects.map(p => p.growthScore || 0)).toFixed(1) : '0'}
                </p>
            </div>
        </div>
        <div className="relative">
           <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
           <input 
             type="text"
             placeholder="Search Strategies..."
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-[10px] font-black uppercase tracking-widest outline-none shadow-sm focus:ring-4 focus:ring-indigo-500/5 transition-all"
           />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden">
        {viewMode === 'table' ? (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Instrument Strategy</th>
                <th className="px-6 py-4 text-right cursor-pointer group hover:text-indigo-600" onClick={() => { setSortBy('todayReturn'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                  <div className="flex items-center justify-end gap-1">
                    Today's Chg
                    <ArrowUpDown size={10} className={sortBy === 'todayReturn' ? 'text-indigo-600' : 'opacity-0 group-hover:opacity-100'} />
                  </div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer group hover:text-indigo-600" onClick={() => { setSortBy('inceptionReturn'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                  <div className="flex items-center justify-end gap-1">
                    Inception Growth
                    <ArrowUpDown size={10} className={sortBy === 'inceptionReturn' ? 'text-indigo-600' : 'opacity-0 group-hover:opacity-100'} />
                  </div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer group hover:text-indigo-600" onClick={() => { setSortBy('cagr'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                  <div className="flex items-center justify-end gap-1">
                    Hist. CAGR
                    <ArrowUpDown size={10} className={sortBy === 'cagr' ? 'text-indigo-600' : 'opacity-0 group-hover:opacity-100'} />
                  </div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer group hover:text-indigo-600" onClick={() => { setSortBy('growthScore'); setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); }}>
                  <div className="flex items-center justify-end gap-1">
                    Growth Score
                    <ArrowUpDown size={10} className={sortBy === 'growthScore' ? 'text-indigo-600' : 'opacity-0 group-hover:opacity-100'} />
                  </div>
                </th>
                <th className="px-6 py-4 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedProjects.map(p => {
                const isActive = p.id === activeProjectId;
                const scoreValue = p.growthScore || 0;

                return (
                  <tr key={p.id} onClick={() => onSelectProject(p)} className={`hover:bg-indigo-50/30 cursor-pointer transition-colors group ${isActive ? 'bg-indigo-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 shadow-inner">
                          {p.iconUrl ? (
                              <img src={p.iconUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                              <Sparkles size={16} className="text-indigo-300" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`font-black text-sm truncate max-w-[220px] ${isActive ? 'text-indigo-700' : 'text-slate-800'}`}>{p.name}</span>
                                {isActive && <CheckCircle2 size={12} className="text-indigo-500 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-indigo-500 uppercase px-1 bg-indigo-50 rounded">{p.category || 'Growth'}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">Saved {new Date(p.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <ReturnBadge val={p.todayReturn} />
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className={`font-black text-xs ${(p.inceptionReturn || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                           {(p.inceptionReturn || 0) > 0 ? '+' : ''}{formatPct(p.inceptionReturn)}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`text-xs font-black text-slate-900`}>
                        {formatPct(p.cagr)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-black text-indigo-600">{scoreValue.toFixed(1)}</span>
                                <Zap size={10} className={scoreValue > 70 ? 'text-amber-500 animate-pulse' : 'text-slate-200'} />
                            </div>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                <div className={`h-full transition-all duration-1000 ${scoreValue > 70 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${scoreValue}%` }}></div>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1">
                        <button onClick={e => handleDelete(e, p.id)} className="text-slate-200 hover:text-red-500 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredAndSortedProjects.map(project => {
              const isActive = project.id === activeProjectId;
              const score = project.growthScore || 0;
              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className={`bg-white p-6 rounded-[32px] border transition-all cursor-pointer group relative overflow-hidden ${isActive ? 'border-indigo-400 shadow-xl ring-2 ring-indigo-500/10' : 'border-slate-200 hover:border-indigo-400 hover:shadow-2xl'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 shadow-inner group-hover:bg-indigo-50 transition-colors">
                          {project.iconUrl ? (
                              <img src={project.iconUrl} alt={project.name} className="w-full h-full object-cover" />
                          ) : (
                              <ImageIcon size={20} className="text-slate-300" />
                          )}
                      </div>
                      <div className="flex flex-col min-w-0">
                          <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest mb-1">{project.category || 'General'}</span>
                          <h3 className={`font-black text-xl leading-tight truncate ${isActive ? 'text-indigo-900' : 'text-slate-900'}`}>{project.name}</h3>
                      </div>
                    </div>
                    <button onClick={e => handleDelete(e, project.id)} className="text-slate-200 hover:text-red-500 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 bg-slate-50">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                     <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50">
                        <p className="text-[7px] font-black text-emerald-700 uppercase tracking-widest mb-1">Today's Chg</p>
                        <ReturnBadge val={project.todayReturn} />
                     </div>
                     <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
                        <p className="text-[7px] font-black text-indigo-700 uppercase tracking-widest mb-1">Inception Ret.</p>
                        <p className={`text-[10px] font-black ${(project.inceptionReturn || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                           {(project.inceptionReturn || 0) > 0 ? '+' : ''}{formatPct(project.inceptionReturn)}
                        </p>
                     </div>
                  </div>

                  <div className="space-y-1">
                      <div className="flex justify-between items-center px-1">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Growth Vector Potential</span>
                          <span className="text-[8px] font-black text-slate-900">{score.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                          <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${score}%` }}></div>
                      </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filteredAndSortedProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-200 rounded-[40px] bg-white text-center">
              <BarChart4 size={48} className="text-slate-200 mb-4" />
              <h3 className="font-black text-slate-600 uppercase tracking-widest text-sm">No strategies found</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Refine your search or create a new design</p>
          </div>
      )}
    </div>
  )
}

export default Dashboard
