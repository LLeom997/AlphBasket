
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Mail, Lock, Loader2, ArrowRight, UserPlus, LogIn, AlertCircle, Info } from 'lucide-react';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
        if (isRegister) {
            const { data, error: signUpError } = await supabase.auth.signUp({ 
                email, 
                password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });
            if (signUpError) throw signUpError;
            
            if (data?.session) {
                setMessage("Registration successful!");
            } else {
                setMessage("Registration successful! Please check your email to confirm your account before logging in.");
                setIsRegister(false);
            }
        } else {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if (signInError) throw signInError;
        }
    } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
    } finally {
        setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('demo@alphabasket.com');
    setPassword('demo123');
    setIsRegister(false);
    setError(null);
    setMessage("Demo credentials loaded. Click 'Sign In' to enter.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-indigo-50 rounded-2xl text-indigo-600 mb-4">
                <LogIn size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">AlphaBasket</h1>
            <p className="text-slate-500 text-sm font-medium">
                {isRegister ? 'Start building your synthetic empire' : 'Welcome back, strategist'}
            </p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-in slide-in-from-top-2">
                <AlertCircle size={16} className="shrink-0" />
                {error}
            </div>
        )}

        {message && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-xs font-bold animate-in slide-in-from-top-2">
                <Info size={16} className="shrink-0" />
                {message}
            </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 font-bold"
                />
                <Mail className="absolute left-4 top-3.5 text-slate-400 w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 font-bold"
                />
                <Lock className="absolute left-4 top-3.5 text-slate-400 w-4 h-4" />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : (
                <>
                    {isRegister ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="w-4 h-4" />
                </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
            <button 
                onClick={() => { setIsRegister(!isRegister); setError(null); setMessage(null); }}
                className="w-full text-center text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
            >
                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>

            {!isRegister && (
                <button 
                    onClick={fillDemo}
                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                    Try Demo Credentials
                </button>
            )}
        </div>
        
        <p className="text-center text-[9px] text-slate-300 mt-8 font-bold uppercase tracking-tighter">
            Secure Infrastructure Powered by Supabase
        </p>
      </div>
    </div>
  );
};

export default Auth;
