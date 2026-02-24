import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import api, { getBackendBaseUrl } from '../api';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { AxiosError } from 'axios';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const backendUrl = getBackendBaseUrl();
    const [isLoading, setIsLoading] = useState(false);
    const auth = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const response = await api.post('/auth/login', { email, password });
            auth.login(response.data.token, response.data.user);

            const from = location.state?.from || (response.data.user.role === 'admin' ? '/admin' : '/');
            navigate(from, { replace: true });
        } catch (err: unknown) {
            if (err instanceof AxiosError && err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Login failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-emerald-500/30">
            {/* Cinematic Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse " style={{ animationDelay: '2s' }} />
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
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Cinematic Gateway</span>
                    </motion.div>

                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <span className="text-xl font-black text-neutral-950">C</span>
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                            CineVerse
                        </h1>
                    </div>
                    <p className="text-sm text-neutral-500 font-medium tracking-wide uppercase">
                        Experience the extraordinary
                    </p>
                </div>

                {/* Glassmorphic Card */}
                <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
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

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-5">
                            <div className="group">
                                <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-2 mb-2 transition-colors group-focus-within:text-emerald-500">
                                    Transmission ID (Email)
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 transition-colors group-focus-within:text-emerald-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@cineworld.com"
                                        autoComplete="email"
                                        required
                                        className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 pl-14 pr-5 text-white placeholder:text-neutral-700 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all font-medium text-sm"
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <div className="flex items-center justify-between ml-2 mb-2">
                                    <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] transition-colors group-focus-within:text-emerald-500">
                                        Access Key (Password)
                                    </label>
                                    <Link
                                        to="/forgot-password"
                                        className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors"
                                    >
                                        Forgot?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 transition-colors group-focus-within:text-emerald-500" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        required
                                        className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 pl-14 pr-5 text-white placeholder:text-neutral-700 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all font-medium text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 rounded-2xl flex items-center justify-center gap-3 text-neutral-950 font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all border border-emerald-400/50 disabled:opacity-50 disabled:cursor-not-allowed mt-8 overflow-hidden group/btn relative"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <div className="flex items-center gap-3 relative z-10 transition-transform duration-500 group-hover/btn:translate-x-1">
                                    <span>Initialize Access</span>
                                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] skew-x-[-20deg] group-hover/btn:translate-x-[150%] transition-transform duration-700 ease-in-out" />
                        </motion.button>

                        <div className="relative flex items-center justify-center py-2">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/5" />
                            </div>
                            <span className="relative bg-[#0d0d0d] px-4 text-[9px] font-black text-neutral-600 uppercase tracking-[0.3em]">
                                Global Auth
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
                    </form>
                </div>

                {/* Footer Link */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mt-10"
                >
                    New to CineVerse?{' '}
                    <Link to="/register" className="text-emerald-500 hover:text-emerald-400 transition-colors">
                        Secure Account
                    </Link>
                </motion.p>
            </motion.div>
        </div>
    );
};

export default Login;
