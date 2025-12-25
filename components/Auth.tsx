
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('demo@alphabasket.com');
  const [password, setPassword] = useState('demo123');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simple mock login
    setTimeout(async () => {
        await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-indigo-700 mb-2">AlphaBasket</h1>
            <p className="text-slate-500 text-sm">Synthetic Asset Workbench <span className="text-indigo-600 font-bold text-xs bg-indigo-50 px-2 py-0.5 rounded">DEMO MODE</span></p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Demo Email</label>
            <div className="relative">
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed outline-none"
                />
                <Mail className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Demo Password</label>
            <div className="relative">
                <input
                  type="password"
                  value={password}
                  readOnly
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed outline-none"
                />
                <Lock className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : (
                <>
                    Enter Demo App
                    <ArrowRight className="w-4 h-4" />
                </>
            )}
          </button>
        </form>
        
        <p className="text-center text-xs text-slate-400 mt-6">
            No API keys or backend configuration required.
        </p>
      </div>
    </div>
  );
};

export default Auth;
