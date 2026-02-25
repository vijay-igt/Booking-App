import React, { useState } from 'react';
import api, { getBackendBaseUrl } from '../api';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, AlertCircle, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

const Register: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const location = useLocation();
    const backendUrl = getBackendBaseUrl();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await api.post('/auth/register', { name, email, password });
            setIsSubmitted(true);
        } catch (err: unknown) {
            if (isAxiosError(err) && err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Registration failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    function isAxiosError(error: unknown): error is { response: { data: { message: string } } } {
        if (typeof error !== 'object' || error === null) {
            return false;
        }
        if (!('response' in error) || typeof (error as { response: unknown }).response !== 'object' || (error as { response: unknown }).response === null) {
            return false;
        }
        const response = (error as { response: { data: unknown } }).response;
        if (!('data' in response) || typeof response.data !== 'object' || response.data === null) {
            return false;
        }
        const data = (response as { data: { message: unknown } }).data;
        return 'message' in data && typeof (data as { message: unknown }).message === 'string';
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-emerald-500/30">
            {/* Cinematic Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150 pointer-events-none" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md relative z-10"
            >
                {/* Branding / Header */}
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6"
                    >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Join the Collective</span>
                    </motion.div>

                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <span className="text-xl font-black text-white">C</span>
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                            CineVerse
                        </h1>
                    </div>
                    <p className="text-sm text-neutral-500 font-medium tracking-wide uppercase">
                        {isSubmitted ? 'Verification Required' : 'Create your cinematic identity'}
                    </p>
                </div>

                {/* Glassmorphic Card */}
                <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <AnimatePresence mode="wait">
                        {!isSubmitted ? (
                            <motion.div
                                key="register-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.4 }}
                            >
                                {/* Error Alert */}
                                <AnimatePresence mode="wait">
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, height: 0 }}
                                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                                            exit={{ opacity: 0, y: -10, height: 0 }}
                                            className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 overflow-hidden"
                                        >
                                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                            <p className="text-xs text-red-400 font-bold uppercase tracking-widest leading-relaxed">
                                                {error}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="group">
                                        <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-2 mb-2 transition-colors group-focus-within:text-amber-500">
                                            Signature (Full Name)
                                        </label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 transition-colors group-focus-within:text-amber-500" />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="John Doe"
                                                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 pl-14 pr-5 text-white placeholder:text-neutral-700 focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.08] transition-all font-medium text-sm"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-2 mb-2 transition-colors group-focus-within:text-amber-500">
                                            Transmission ID (Email)
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 transition-colors group-focus-within:text-amber-500" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@cineworld.com"
                                                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 pl-14 pr-5 text-white placeholder:text-neutral-700 focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.08] transition-all font-medium text-sm"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-2 mb-2 transition-colors group-focus-within:text-amber-500">
                                            Access Key (Password)
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 transition-colors group-focus-within:text-amber-500" />
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 pl-14 pr-5 text-white placeholder:text-neutral-700 focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.08] transition-all font-medium text-sm"
                                                required
                                            />
                                        </div>

                                        {password.length > 0 && (
                                            <div className="mt-3 flex gap-1.5 px-2">
                                                <div className={cn("h-1 flex-1 rounded-full transition-all duration-500", password.length >= 6 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-white/10')}></div>
                                                <div className={cn("h-1 flex-1 rounded-full transition-all duration-500", password.length >= 8 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-white/10')}></div>
                                                <div className={cn("h-1 flex-1 rounded-full transition-all duration-500", password.length >= 10 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10')}></div>
                                            </div>
                                        )}
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-14 bg-amber-500 hover:bg-amber-400 rounded-2xl flex items-center justify-center gap-3 text-neutral-950 font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-amber-500/20 transition-all border border-amber-400/50 disabled:opacity-50 disabled:cursor-not-allowed mt-8 overflow-hidden group/btn relative"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <div className="flex items-center gap-3 relative z-10 transition-transform duration-500 group-hover/btn:translate-x-1">
                                                <span>Initialize Identity</span>
                                                <ArrowRight className="w-4 h-4 stroke-[3]" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] skew-x-[-20deg] group-hover/btn:translate-x-[150%] transition-transform duration-700 ease-in-out" />
                                    </motion.button>
                                </form>

                                <div className="relative flex items-center justify-center py-4 my-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/5" />
                                    </div>
                                    <span className="relative bg-[#0d0d0d] px-4 text-[9px] font-black text-neutral-600 uppercase tracking-[0.3em]">
                                        Universal Access
                                    </span>
                                </div>

                                <motion.a
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    href={`${backendUrl}/auth/google`}
                                    className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-black flex items-center justify-center gap-3 hover:bg-white/10 transition-all uppercase text-[10px] tracking-widest"
                                >
                                    <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" className="w-5 h-5" />
                                    Continue with Google
                                </motion.a>

                                <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mt-8">
                                    Already a member?{' '}
                                    <Link
                                        to="/login"
                                        state={{ from: (location.state as any)?.from }}
                                        className="text-amber-500 hover:text-amber-400 transition-colors"
                                    >
                                        Access Vault
                                    </Link>
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success-state"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-4"
                            >
                                <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/10">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                </div>
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Transmission Sent</h2>
                                <p className="text-sm text-neutral-500 mb-10 leading-relaxed font-medium">
                                    A verification protocol has been dispatched to <br />
                                    <span className="text-amber-400 font-black tracking-wider block mt-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">{email}</span>
                                </p>
                                <div className="space-y-4">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => window.location.href = '/login'}
                                        className="w-full h-16 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-white font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 group"
                                    >
                                        Proceed to Access
                                        <ArrowRight className="w-4 h-4 stroke-[3] transition-transform group-hover:translate-x-1" />
                                    </motion.button>
                                    <button
                                        onClick={() => setIsSubmitted(false)}
                                        className="text-[9px] font-black text-neutral-600 hover:text-white uppercase tracking-[0.2em] transition-colors"
                                    >
                                        Correction Needed? Edit Identification
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
