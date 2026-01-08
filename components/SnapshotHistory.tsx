
import React, { useState, useEffect, useMemo } from 'react';
import { Snapshot, SimulationResult, Basket } from '../types';
import { fetchSnapshots, deleteSnapshot } from '../services/database/snapshotService';
import {
    History, Trash2, Calendar, TrendingUp, TrendingDown,
    ArrowRight, Info, Target, Activity, Zap, CheckCircle2,
    AlertTriangle, Sparkles, Clock, Layers, ChevronLeft, RefreshCw, FileEdit
} from 'lucide-react';
import {
    ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface SnapshotHistoryProps {
    basketId: string;
    currentSimulation: SimulationResult | null;
    onRestore: (snapshot: Snapshot) => void;
    onExit: () => void;
}

const SnapshotHistory: React.FC<SnapshotHistoryProps> = ({ basketId, currentSimulation, onRestore, onExit }) => {
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

    useEffect(() => {
        loadSnapshots();
    }, [basketId]);

    const loadSnapshots = async () => {
        setLoading(true);
        const data = await fetchSnapshots(basketId);
        setSnapshots(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this snapshot record?")) return;
        const success = await deleteSnapshot(id);
        if (success) {
            setSnapshots(prev => prev.filter(s => s.id !== id));
            if (selectedSnapshotId === id) setSelectedSnapshotId(null);
        }
    };

    const selectedSnapshot = useMemo(() =>
        snapshots.find(s => s.id === selectedSnapshotId),
        [snapshots, selectedSnapshotId]
    );

    const comparisonData = useMemo(() => {
        if (!selectedSnapshot || !currentSimulation) return [];

        const snapDate = new Date(selectedSnapshot.snapshotDate);
        // Align actual history starting from the day the snapshot was taken
        const actualHistory = currentSimulation.history.filter(h => new Date(h.date) >= snapDate);
        const forecastPaths = selectedSnapshot.forecast?.paths;

        if (!forecastPaths) return [];

        return forecastPaths.p50.map((p50, day) => {
            const actualPoint = actualHistory[day];
            return {
                day: day,
                p50: p50,
                p90: forecastPaths.p90[day],
                p10: forecastPaths.p10[day],
                actual: actualPoint ? actualPoint.close : null
            };
        }).filter(d => d.day < 60 || d.actual !== null);
    }, [selectedSnapshot, currentSimulation]);

    const driftStatus = useMemo(() => {
        if (!comparisonData.length) return null;

        let latestActualIdx = -1;
        for (let i = comparisonData.length - 1; i >= 0; i--) {
            if (comparisonData[i].actual !== null) {
                latestActualIdx = i;
                break;
            }
        }

        if (latestActualIdx < 0) return null;

        const latest = comparisonData[latestActualIdx];
        const deviation = (latest.actual! - latest.p50) / latest.p50;

        let status = 'On Track';
        let color = 'text-brand-teal';
        let bg = 'bg-brand-teal/10';
        let icon = CheckCircle2;

        if (latest.actual! > latest.p90) {
            status = 'Overperforming';
            color = 'text-brand-green';
            bg = 'bg-brand-green/10';
            icon = Sparkles;
        } else if (latest.actual! < latest.p10) {
            status = 'Drift Warning';
            color = 'text-brand-red';
            bg = 'bg-brand-red/10';
            icon = AlertTriangle;
        }

        return { status, color, bg, icon, deviation };
    }, [comparisonData]);

    const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
    const formatPct = (n: number) => (n * 100).toFixed(1) + '%';



    if (snapshots.length === 0) return (
        <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-[32px] border border-slate-200 border-dashed">
            <div className="p-4 bg-slate-50 rounded-full mb-4">
                <History size={32} className="text-slate-300" />
            </div>
            <h3 className="font-black text-slate-700 uppercase tracking-widest text-sm mb-2">Registry Empty</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase max-w-xs mx-auto leading-relaxed mb-6">
                You haven't captured any strategy snapshots yet. Capturing a plan allows you to track drift from your original "T0" prediction.
            </p>
            <button onClick={onExit} className="bg-brand-teal text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-brand-teal/20">
                <ArrowRight size={14} /> Back to Live Backtest
            </button>
        </div>
    );

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Context Header */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <History size={16} className="text-slate-400" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Strategy Archive</h2>
                </div>
                <button onClick={onExit} className="text-[9px] font-black text-brand-teal uppercase flex items-center gap-1.5 hover:underline">
                    <ChevronLeft size={12} /> Return to Active Strategy
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Snapshot Selection List */}
                <div className="lg:col-span-3 space-y-2 lg:h-[calc(100vh-250px)] lg:overflow-y-auto custom-scrollbar pr-1">
                    {snapshots.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedSnapshotId(s.id)}
                            className={`w-full p-4 rounded-2xl border transition-all text-left relative group ${selectedSnapshotId === s.id ? 'bg-brand-teal border-brand-teal text-white shadow-lg' : 'bg-white border-slate-200 hover:border-brand-teal/30 text-slate-700'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[8px] font-black uppercase tracking-tight ${selectedSnapshotId === s.id ? 'text-brand-teal/40' : 'text-slate-400'}`}>
                                    {new Date(s.snapshotDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                                    className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${selectedSnapshotId === s.id ? 'hover:bg-brand-teal/20 text-white' : 'hover:bg-brand-red/10 text-slate-300 hover:text-brand-red'}`}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                            <h5 className="font-black text-xs truncate mb-1">{s.label}</h5>
                            <div className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase inline-block ${selectedSnapshotId === s.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {formatPct(s.metrics.cagr)} CAGR
                            </div>
                        </button>
                    ))}
                </div>

                {/* Analysis & Visualization */}
                <div className="lg:col-span-9 space-y-4 min-h-[500px]">
                    {selectedSnapshot ? (
                        <>
                            {/* Summary Card */}
                            <div className="bg-white p-4 lg:p-6 rounded-2xl lg:rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 lg:gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 lg:w-14 lg:h-14 bg-brand-teal/10 rounded-xl lg:rounded-2xl flex items-center justify-center text-brand-teal shadow-inner">
                                        <Clock size={20} className="lg:size-10" />
                                    </div>
                                    <div>
                                        <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Snapshot Perspective</p>
                                        <h3 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">{selectedSnapshot.label}</h3>
                                        <div className="flex flex-wrap items-center gap-2 lg:gap-3 mt-1">
                                            <p className="text-[8px] lg:text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                                <Calendar size={10} /> {new Date(selectedSnapshot.snapshotDate).toLocaleDateString()}
                                            </p>
                                            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-200"></div>
                                            <p className="text-[8px] lg:text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                                <Layers size={10} /> {selectedSnapshot.basketState.items.length} Assets
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 w-full md:w-auto">
                                    <button
                                        onClick={() => onRestore(selectedSnapshot)}
                                        className="w-full md:w-auto bg-slate-900 text-white px-4 lg:px-5 py-2.5 lg:py-3 rounded-xl lg:rounded-2xl text-[8px] lg:text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-100"
                                    >
                                        <FileEdit size={12} className="lg:size-14" /> Restore Params
                                    </button>
                                </div>
                            </div>

                            {/* Comparison Chart Container */}
                            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-brand-green/10 text-brand-green rounded-lg">
                                            <Activity size={14} />
                                        </div>
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Drift vs. Probability Cone</h4>
                                    </div>

                                    {driftStatus && (
                                        <div className={`px-4 py-2 rounded-xl flex items-center gap-3 ${driftStatus.bg} border ${driftStatus.bg.replace('bg-', 'border-')}`}>
                                            <driftStatus.icon size={14} className={driftStatus.color} />
                                            <div className="text-left">
                                                <p className={`text-[10px] font-black uppercase tracking-widest ${driftStatus.color}`}>{driftStatus.status}</p>
                                                <p className="text-[7px] font-bold text-slate-500 uppercase">
                                                    {driftStatus.deviation > 0 ? '+' : ''}{formatPct(driftStatus.deviation)} vs T0 Median
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={comparisonData} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                            <XAxis dataKey="day" hide />
                                            <YAxis tickFormatter={formatINR} stroke="#cbd5e1" tick={{ fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false} width={70} domain={['auto', 'auto']} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 900 }}
                                                labelFormatter={(day) => `Day T+${day}`}
                                                formatter={(v: any) => formatINR(v)}
                                            />

                                            <Area dataKey="p90" stroke="transparent" fill="#5acec9" fillOpacity={0.04} name="Upper Bound (P90)" />
                                            <Area dataKey="p10" stroke="transparent" fill="#ffffff" fillOpacity={1} name="Lower Bound (P10)" />

                                            <Line type="monotone" dataKey="p50" stroke="#5acec9" strokeWidth={2} strokeDasharray="5 5" dot={false} name="T0 Projection" animationDuration={800} />
                                            <Line type="monotone" dataKey="actual" stroke="#8dd67a" strokeWidth={4} dot={false} name="Actual Realization" animationDuration={1200} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="flex justify-center gap-8 mt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-1 bg-brand-teal/20 rounded-full"></div>
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Confidence Area</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-0.5 bg-brand-teal border-t border-dashed border-brand-teal"></div>
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Planned Median</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-1 bg-brand-green rounded-full"></div>
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Market Reality</span>
                                    </div>
                                </div>
                            </div>

                            {/* Plan Detail Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100">
                                    <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Zap size={12} className="text-brand-teal" /> T0 Static Metrics
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[7px] font-black text-slate-400 uppercase">Archive CAGR</p>
                                            <p className="text-sm font-black text-slate-900">{formatPct(selectedSnapshot.metrics.cagr)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[7px] font-black text-slate-400 uppercase">Archive Risk</p>
                                            <p className="text-sm font-black text-slate-900">{formatPct(selectedSnapshot.metrics.volatility)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-brand-teal/5 p-5 rounded-[24px] border border-brand-teal/10 flex items-start gap-4">
                                    <Info size={18} className="text-brand-teal shrink-0 mt-1" />
                                    <div>
                                        <h4 className="text-[8px] font-black text-brand-teal uppercase tracking-widest mb-1">Archival Context</h4>
                                        <p className="text-[9px] font-medium text-brand-teal leading-relaxed">
                                            This plan was archived using <span className="font-bold">₹{selectedSnapshot.basketState.initialInvestment.toLocaleString()}</span> initial capital. The "Drift Assessment" tells you how much the real market has deviated from your original Monte Carlo median since that date.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[40px]">
                            <Layers size={48} className="opacity-10 mb-4" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select a projection to inspect</h3>
                            <p className="text-[8px] font-bold text-slate-300 uppercase mt-1">Overlaying archived plans on current reality</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SnapshotHistory;
