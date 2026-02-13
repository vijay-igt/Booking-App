import React, { useEffect, useState } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AxiosError } from 'axios';

const VerifyEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Invalid verification link.');
                return;
            }

            try {
                const response = await api.get(`/auth/verify-email?token=${token}`);
                setStatus('success');
                setMessage(response.data.message);
                // Redirect to login after 5 seconds
                setTimeout(() => navigate('/login'), 5000);
            } catch (err: unknown) {
                setStatus('error');
                if (err instanceof AxiosError && err.response?.data?.message) {
                    setMessage(err.response.data.message);
                } else {
                    setMessage('Failed to verify email. The link may be expired or invalid.');
                }
            }
        };

        verify();
    }, [token, navigate]);

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-5 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -mr-64 -mt-64"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -ml-64 -mb-64"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-neutral-900/50 border border-neutral-800 p-10 rounded-3xl backdrop-blur-xl relative z-10 text-center"
            >
                <AnimatePresence mode="wait">
                    {status === 'loading' && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center"
                        >
                            <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-6" />
                            <h1 className="text-2xl font-bold mb-2">Verifying Email...</h1>
                            <p className="text-neutral-500">Please wait while we confirm your account.</p>
                        </motion.div>
                    )}

                    {status === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            </div>
                            <h1 className="text-3xl font-bold mb-3 text-emerald-400">Verified!</h1>
                            <p className="text-neutral-400 mb-8 leading-relaxed">
                                {message}
                            </p>
                            <Link to="/login" className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20">
                                Go to Login
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <p className="text-xs text-neutral-600 mt-6 italic">
                                Redirecting you automatically in a few seconds...
                            </p>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                                <AlertCircle className="w-12 h-12 text-red-500" />
                            </div>
                            <h1 className="text-2xl font-bold mb-3 text-red-500">Verification Failed</h1>
                            <p className="text-neutral-400 mb-8 leading-relaxed">
                                {message}
                            </p>
                            <div className="flex flex-col w-full gap-3">
                                <Link to="/register" className="w-full h-14 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
                                    Try Registering Again
                                </Link>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="text-sm text-neutral-500 hover:text-white font-medium py-2 transition-colors"
                                >
                                    Back to Login
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default VerifyEmail;
