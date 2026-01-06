
import React, { useState, useRef } from 'react';
import { Stock } from '../types';
import { TrendingUp, TrendingDown, IndianRupee, ShieldCheck, Activity } from 'lucide-react';

interface StockTooltipProps {
    stock: Stock | undefined;
    children: React.ReactNode;
}

const StockTooltip: React.FC<StockTooltipProps> = ({ stock, children }) => {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (!stock) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({
            top: rect.top,
            left: rect.right + 10 // Offset to the right
        });
        setShow(true);
    };

    const handleMouseLeave = () => {
        setShow(false);
    };

    const fmt = (n: number) => (n * 100).toFixed(1) + '%';
    const fmtCap = (n: number) => `₹${(n / 1000).toFixed(1)}k Cr`;

    return (
        <>
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="cursor-help inline-block w-full h-full"
            >
                {children}
            </div>

            {show && stock && (
                <div
                    className="fixed z-[100] w-72 bg-white border border-slate-200 rounded-[28px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] p-6 animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
                    style={{
                        top: Math.min(window.innerHeight - 380, Math.max(10, pos.top - 50)),
                        left: Math.min(window.innerWidth - 300, pos.left)
                    }}
                >
                    <div className="flex justify-between items-start mb-4 border-b border-slate-50 pb-4">
                        <div>
                            <h4 className="font-black text-slate-900 text-xl leading-tight">{stock.ticker}</h4>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{stock.name}</span>
                        </div>
                        <div className="p-2 bg-brand-teal/10 rounded-xl text-brand-teal">
                            <Activity size={18} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block mb-1">Sector</span>
                                <span className="text-xs text-slate-800 font-black">{stock.sector}</span>
                            </div>
                            <div>
                                <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block mb-1">Cap</span>
                                <span className="text-xs text-slate-800 font-black">{fmtCap(stock.marketCap)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block mb-1">Beta</span>
                                <span className="text-xs text-slate-800 font-black">{stock.beta?.toFixed(2) || '1.00'}</span>
                            </div>
                            <div>
                                <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block mb-1">Vol (Ann)</span>
                                <span className="text-xs text-brand-orange font-black">{stock.volatility ? fmt(stock.volatility) : 'N/A'}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-50">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-3">Historical CAGR</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { l: '1Y', v: stock.returns.oneYear },
                                    { l: '2Y', v: stock.returns.twoYear },
                                    { l: '3Y', v: stock.returns.threeYear },
                                    { l: '5Y', v: stock.returns.fiveYear }
                                ].map(r => (
                                    <div key={r.l} className="bg-slate-50 border border-slate-100 p-2 rounded-xl flex justify-between items-center">
                                        <span className="text-[8px] font-black text-slate-400">{r.l}</span>
                                        <span className={`text-[11px] font-black ${r.v >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                            {r.v > 0 ? '+' : ''}{fmt(r.v)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default StockTooltip;
