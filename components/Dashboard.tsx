import React, { useEffect, useState, useCallback } from "react"
import { Basket } from "../types"
import { fetchProjects, deleteProject } from "../services/projectService"
import { supabase } from "../services/supabase"
import { Plus, Trash2, Calendar, Layout, Loader2 } from "lucide-react"

interface DashboardProps {
  onSelectProject: (basket: Basket) => void
  onCreateProject: () => void
}

const Dashboard: React.FC<DashboardProps> = ({
  onSelectProject,
  onCreateProject
}) => {
  const [projects, setProjects] = useState<Basket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      if (!session) {
        setProjects([])
        return
      }

      const data = await fetchProjects(session.user.id)
      setProjects(data)
    } catch (err: any) {
      console.error("Failed to load portfolios", err)
      setError("Failed to load portfolios. Please refresh.")
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleDelete = async (
    e: React.MouseEvent,
    id: string
  ) => {
    e.stopPropagation()

    const confirmed = window.confirm(
      "Are you sure you want to delete this portfolio?"
    )

    if (!confirmed) return

    try {
      await deleteProject(id)
      await loadProjects()
    } catch (err) {
      console.error("Delete failed", err)
      alert("Failed to delete portfolio")
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-600 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            My Portfolios
          </h1>
          <p className="text-slate-500 text-sm">
            Manage your synthetic assets and backtests
          </p>
        </div>

        <button
          onClick={onCreateProject}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all"
        >
          <Plus size={18} />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div
            key={project.id}
            onClick={() => onSelectProject(project)}
            className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer group relative"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Layout size={20} />
              </div>

              <button
                onClick={e => handleDelete(e, project.id)}
                className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <h3 className="font-bold text-lg text-slate-800 mb-1 truncate">
              {project.name}
            </h3>

            <p className="text-xs text-slate-500 mb-4 line-clamp-2 h-8">
              {project.description || "No description provided."}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
              <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {project.items.length} Assets
              </span>

              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Calendar size={10} />
                {new Date(project.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={onCreateProject}
          className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all gap-2 min-h-[180px]"
        >
          <Plus size={32} />
          <span className="font-bold text-sm">
            Create New Portfolio
          </span>
        </button>
      </div>
    </div>
  )
}

export default Dashboard
