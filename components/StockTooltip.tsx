
import React, { useState, useRef } from 'react';
import { Stock } from '../types';
import { TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';

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
  const fmtCap = (n: number) => `₹${(n/1000).toFixed(1)}k Cr`;

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
                className="fixed z-[100] w-64 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
                style={{ 
                    top: Math.min(window.innerHeight - 280, Math.max(10, pos.top - 50)), // basic clamping
                    left: Math.min(window.innerWidth - 270, pos.left) 
                }}
            >
                <div className="flex justify-between items-start mb-2 border-b border-slate-100 pb-2">
                    <div>
                        <h4 className="font-bold text-slate-800 text-lg leading-tight">{stock.ticker}</h4>
                        <span className="text-xs text-slate-500">{stock.name}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        stock.universe === 'Nifty 50' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                        {stock.universe === 'Nifty 50' ? 'N50' : 'Next50'}
                    </span>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Sector</span>
                        <span className="text-slate-800 font-medium text-right">{stock.sector}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Market Cap</span>
                        <span className="text-slate-800 font-medium text-right">{fmtCap(stock.marketCap)}</span>
                    </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Annual Volatility</span>
                        <span className="text-amber-600 font-medium text-right">
                             {stock.volatility ? fmt(stock.volatility * Math.sqrt(252)) : 'N/A'}
                        </span>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Performance</p>
                        <div className="grid grid-cols-3 gap-1">
                             <div className="bg-slate-50 border border-slate-100 p-1.5 rounded text-center">
                                <div className="text-[10px] text-slate-400 mb-0.5">1Y</div>
                                <div className={`text-xs font-bold ${stock.returns.oneYear >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {stock.returns.oneYear > 0 ? '+' : ''}{fmt(stock.returns.oneYear)}
                                </div>
                             </div>
                             <div className="bg-slate-50 border border-slate-100 p-1.5 rounded text-center">
                                <div className="text-[10px] text-slate-400 mb-0.5">2Y</div>
                                <div className={`text-xs font-bold ${stock.returns.twoYear >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {stock.returns.twoYear > 0 ? '+' : ''}{fmt(stock.returns.twoYear)}
                                </div>
                             </div>
                             <div className="bg-slate-50 border border-slate-100 p-1.5 rounded text-center">
                                <div className="text-[10px] text-slate-400 mb-0.5">5Y</div>
                                <div className={`text-xs font-bold ${stock.returns.fiveYear >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {stock.returns.fiveYear > 0 ? '+' : ''}{fmt(stock.returns.fiveYear)}
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default StockTooltip;
