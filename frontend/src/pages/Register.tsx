import api from '../api';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useState } from 'react';

const Register: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

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

        // Check for 'response' property and its type
        if (!('response' in error) || typeof (error as { response: unknown }).response !== 'object' || (error as { response: unknown }).response === null) {
            return false;
        }

        const response = (error as { response: { data: unknown } }).response;

        // Check for 'data' property in response and its type
        if (!('data' in response) || typeof response.data !== 'object' || response.data === null) {
            return false;
        }

        const data = (response as { data: { message: unknown } }).data;

        // Check for 'message' property in data and its type
        return 'message' in data && typeof (data as { message: unknown }).message === 'string';
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>

            <div className="flex-1 flex items-center justify-center px-5 py-12 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    {/* Logo */}
                    <div className="text-center mb-12">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20"
                        >
                            <span className="text-2xl font-black text-white">C</span>
                        </motion.div>
                        <h1 className="text-3xl font-bold mb-2">
                            {isSubmitted ? 'Check your email' : 'Create account'}
                        </h1>
                        <p className="text-neutral-500">
                            {isSubmitted
                                ? `We've sent a verification link to ${email}`
                                : 'Join us and start booking movies'
                            }
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {!isSubmitted ? (
                            <motion.div
                                key="register-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                {/* Error Alert */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 overflow-hidden"
                                    >
                                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-500 font-medium">{error}</p>
                                    </motion.div>
                                )}

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* ... Existing input fields ... */}
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-2">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="John Doe"
                                                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-2">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@example.com"
                                                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-neutral-400 mb-2">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Create a strong password"
                                                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                                                required
                                            />
                                        </div>

                                        {password.length > 0 && (
                                            <div className="mt-2 space-y-2">
                                                <div className="flex gap-1">
                                                    <div className={`h-1 flex-1 rounded-full ${password.length >= 6 ? 'bg-emerald-500' : 'bg-neutral-800'}`}></div>
                                                    <div className={`h-1 flex-1 rounded-full ${password.length >= 8 ? 'bg-emerald-500' : 'bg-neutral-800'}`}></div>
                                                    <div className={`h-1 flex-1 rounded-full ${password.length >= 10 ? 'bg-emerald-500' : 'bg-neutral-800'}`}></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                                    >
                                        {isLoading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                Create Account
                                                <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="relative flex items-center justify-center my-6">
                                    <span className="absolute bg-neutral-950 px-3 text-sm text-neutral-500">Or continue with</span>
                                    <div className="w-full border-t border-neutral-800"></div>
                                </div>

                                <a
                                    href={`${import.meta.env.VITE_BACKEND_URL}/auth/google`}
                                    className="w-full h-14 rounded-2xl bg-neutral-800 text-white font-bold flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors"
                                >
                                    <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" className="w-6 h-6" />
                                    Sign up with Google
                                </a>

                                <p className="text-center text-sm text-neutral-500 mt-8">
                                    Already have an account?{' '}
                                    <Link to="/login" className="text-emerald-400 font-semibold">
                                        Sign in
                                    </Link>
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success-state"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center p-8 rounded-3xl bg-neutral-900 border border-neutral-800"
                            >
                                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                                    <Mail className="w-10 h-10 text-emerald-500" />
                                </div>
                                <h2 className="text-2xl font-bold mb-4 text-white">Verify your email</h2>
                                <p className="text-neutral-400 mb-8 leading-relaxed">
                                    We've sent a verification link to <span className="text-emerald-400 font-medium">{email}</span>.
                                    Please click the link in the email to activate your account.
                                </p>
                                <div className="space-y-4">
                                    <Link
                                        to="/login"
                                        className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        Go to Login
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                    <button
                                        onClick={() => setIsSubmitted(false)}
                                        className="text-sm font-medium text-neutral-500 hover:text-white transition-colors"
                                    >
                                        Entered wrong email? Edit details
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

export default Register;