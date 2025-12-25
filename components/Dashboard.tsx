
import React, { useEffect, useState, useCallback, useMemo } from "react"
import { Basket } from "../types"
import { fetchProjects, deleteProject } from "../services/projectService"
import { supabase } from "../services/supabase"
import { 
  Plus, Trash2, Calendar, Layout, Loader2, 
  Grid3X3, List, Layers, Search, ArrowUpDown, 
  TrendingUp, Wallet, MoreHorizontal, IndianRupee, PieChart
} from "lucide-react"

interface DashboardProps {
  onSelectProject: (basket: Basket) => void
  onCreateProject: () => void
}

type ViewMode = 'grid' | 'table' | 'grouped';

const Dashboard: React.FC<DashboardProps> = ({
  onSelectProject,
  onCreateProject
}) => {
  const [projects, setProjects] = useState<Basket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return;
      const data = await fetchProjects(session.user.id)
      setProjects(data)
    } catch (err) {
      setError("Failed to load portfolios.")
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
      const factor = sortOrder === 'desc' ? -1 : 1;
      return factor * (a.createdAt - b.createdAt);
    });
  }, [projects, searchTerm, sortOrder]);

  const groupedProjects = useMemo(() => {
    const groups: Record<string, Basket[]> = {};
    filteredAndSortedProjects.forEach(p => {
      const cat = p.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredAndSortedProjects]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!window.confirm("Delete this portfolio permanently?")) return;
    try {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (err) { alert("Delete failed") }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  if (loading) return (
    <div className="flex h-[60vh] flex-col items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Portfolio Engine...</p>
    </div>
  )

  return (
    <div className="p-4 sm:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Strategy Workbench</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Manage and compare your synthetic instrument designs</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            {[
              { id: 'grid', icon: Grid3X3 },
              { id: 'table', icon: List },
              { id: 'grouped', icon: Layers }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as ViewMode)}
                className={`p-2.5 rounded-xl transition-all ${viewMode === mode.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                title={`${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)} View`}
              >
                <mode.icon size={18} />
              </button>
            ))}
          </div>
          <button
            onClick={onCreateProject}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 transition-all active:scale-95"
          >
            <Plus size={16} /> New Basket
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:max-w-md">
           <Search size={16} className="absolute left-4 top-3.5 text-slate-400" />
           <input 
             type="text"
             placeholder="Search by name or category..."
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500/10 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none"
           />
        </div>
        <button 
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 px-4 py-3 rounded-2xl hover:bg-slate-50 transition-all"
        >
          <ArrowUpDown size={14} /> 
          Sort: {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
        </button>
      </div>

      {/* Grid View Mode */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedProjects.map(project => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project)}
              className="bg-white p-6 rounded-[32px] border border-slate-200 hover:border-indigo-400 hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{project.category || 'General'}</span>
                  <h3 className="font-black text-xl text-slate-900 leading-tight truncate max-w-[200px]">{project.name}</h3>
                </div>
                <button onClick={e => handleDelete(e, project.id)} className="text-slate-200 hover:text-red-500 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 bg-slate-50">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-slate-50 p-3 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assets</p>
                    <p className="text-sm font-black text-slate-800">{project.items.length} Equities</p>
                 </div>
                 <div className="bg-slate-50 p-3 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cap</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(project.initialInvestment)}</p>
                 </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex -space-x-2">
                   {project.items.slice(0, 3).map((it, idx) => (
                      <div key={idx} className="w-7 h-7 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-indigo-600">
                         {it.ticker.slice(0, 2)}
                      </div>
                   ))}
                   {project.items.length > 3 && (
                     <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400">
                        +{project.items.length - 3}
                     </div>
                   )}
                </div>
                <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
                  <Calendar size={12} />
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
          <button onClick={onCreateProject} className="border-2 border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all gap-3 min-h-[200px]">
            <div className="p-4 bg-slate-100 rounded-full group-hover:bg-indigo-100 transition-colors">
              <Plus size={32} />
            </div>
            <span className="font-black text-xs uppercase tracking-widest">Create Strategic Basket</span>
          </button>
        </div>
      )}

      {/* Table View Mode */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Portfolio Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Constituents</th>
                <th className="px-6 py-4 text-right">Investment Cap</th>
                <th className="px-6 py-4 text-right">Created Date</th>
                <th className="px-6 py-4 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedProjects.map(p => (
                <tr key={p.id} onClick={() => onSelectProject(p)} className="hover:bg-indigo-50/30 cursor-pointer transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-white shadow-sm transition-all">
                        <PieChart size={16} />
                      </div>
                      <span className="font-black text-slate-800 text-sm">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className="px-3 py-1 bg-slate-100 text-[9px] font-black text-slate-500 uppercase rounded-full border border-slate-200">{p.category || 'General'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Layers size={14} className="text-slate-300" />
                      <span className="text-xs font-bold text-slate-600">{p.items.length} Assets</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-xs text-slate-900">
                    {formatCurrency(p.initialInvestment)}
                  </td>
                  <td className="px-6 py-4 text-right text-[10px] font-bold text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <button onClick={e => handleDelete(e, p.id)} className="text-slate-200 hover:text-red-500 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAndSortedProjects.length === 0 && (
             <div className="p-12 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">No Matching Portfolios Found</div>
          )}
        </div>
      )}

      {/* Grouped View Mode */}
      {viewMode === 'grouped' && (
        <div className="space-y-10">
          {Object.entries(groupedProjects).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-4 px-2">
                <h2 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">{category}</h2>
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-full">{items.length} Designs</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {items.map(p => (
                    <div key={p.id} onClick={() => onSelectProject(p)} className="bg-white p-5 rounded-[24px] border border-slate-200 hover:border-indigo-400 transition-all cursor-pointer shadow-sm hover:shadow-xl group">
                       <div className="flex justify-between items-center mb-3">
                          <h3 className="font-black text-sm text-slate-800">{p.name}</h3>
                          <button onClick={e => handleDelete(e, p.id)} className="text-slate-200 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all">
                             <Trash2 size={14} />
                          </button>
                       </div>
                       <div className="flex justify-between items-end">
                          <div className="space-y-1">
                             <p className="text-[10px] text-slate-400 font-bold">{p.items.length} Stocks</p>
                             <p className="text-xs font-black text-indigo-600">{formatCurrency(p.initialInvestment)}</p>
                          </div>
                          <div className="text-[9px] font-black text-slate-300 uppercase">
                             {new Date(p.createdAt).getMonth() + 1}/{new Date(p.createdAt).getFullYear()}
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard
