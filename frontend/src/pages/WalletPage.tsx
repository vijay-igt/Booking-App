import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, Clock, ArrowUpRight, ArrowDownLeft, CreditCard, XCircle } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContextDefinition';
import { useAuth } from '../context/useAuth';
import { cn } from '../lib/utils';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';

interface NotificationPayload {
    type: string;
    userId?: number;
    amount?: number;
    requestId?: string;
    newBalance?: number;
    message?: string;
}

interface Transaction {
    id: number;
    amount: string;
    type: 'CREDIT' | 'DEBIT';
    description: string;
    createdAt: string;
}

interface WalletRequest {
    id: number;
    amount: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
}

const WalletPage: React.FC = () => {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [requests, setRequests] = useState<WalletRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('UPI');

    const fetchWalletData = useCallback(async () => {
        try {
            const response = await api.get('/wallet/balance');
            setBalance(parseFloat(response.data.balance));
            setTransactions(response.data.transactions);
            setRequests(response.data.pendingRequests);
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const onWalletUpdate = useCallback((update: NotificationPayload) => {
        console.log('WalletPage received WebSocket update:', update);
        if (update.type === 'USER_TOPUP_APPROVED') {
            setBalance(update.newBalance ?? 0);
            setRequests(prev => prev.filter(req => req.id !== Number(update.requestId)));
            fetchWalletData();
        } else if (update.type === 'USER_TOPUP_REJECTED') {
            setRequests(prev => prev.filter(req => req.id !== Number(update.requestId)));
        } else if (update.type === 'TOPUP_REQUESTED' && user?.role === 'admin') {
            fetchWalletData();
        }
    }, [fetchWalletData, user?.role]);

    const { subscribe } = useWebSocket();

    useEffect(() => {
        const unsubscribe = subscribe('USER_TOPUP_APPROVED', onWalletUpdate);
        const unsubscribe2 = subscribe('USER_TOPUP_REJECTED', onWalletUpdate);
        const unsubscribe3 = subscribe('TOPUP_REQUESTED', onWalletUpdate);
        return () => {
            unsubscribe();
            unsubscribe2();
            unsubscribe3();
        };
    }, [subscribe, onWalletUpdate]);

    useEffect(() => {
        fetchWalletData();
    }, [user?.id, fetchWalletData]);

    const handleTopUp = async () => {
        if (!topUpAmount || isNaN(parseFloat(topUpAmount)) || parseFloat(topUpAmount) <= 0) return;

        try {
            await api.post('/wallet/topup', {
                amount: parseFloat(topUpAmount),
                paymentMethod
            });
            setIsTopUpOpen(false);
            setTopUpAmount('');
            // fetchWalletData(); // WebSocket will handle real-time update

        } catch (error) {
            console.error('Error requesting top-up:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 pt-32 pb-24">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent uppercase">
                            Digital Wallet
                        </h1>
                        <p className="text-sm text-neutral-500 font-medium mt-2 tracking-widest uppercase">
                            Your Secure Cinematic Treasury
                        </p>
                    </div>

                    {user?.role === 'user' && (
                        <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsTopUpOpen(true)}
                            className="px-8 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center gap-3 text-neutral-950 font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 transition-all border border-emerald-400/50"
                        >
                            <Plus className="w-5 h-5 stroke-[3]" />
                            Add Funds
                        </motion.button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Balance Card & Stats (Left Column) */}
                    <div className="lg:col-span-1 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="relative overflow-hidden rounded-[2.5rem] bg-white/5 backdrop-blur-3xl border border-white/10 p-10 group"
                        >
                            {/* Decorative Glow */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 blur-[80px] rounded-full group-hover:bg-emerald-500/30 transition-all duration-700" />
                            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full transition-all duration-700" />

                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <p className="text-[10px] text-neutral-500 uppercase font-black tracking-[0.2em] mb-4">
                                        {user?.role === 'user' && 'Current Balance'}
                                        {user?.role === 'admin' && 'Total Earnings'}
                                        {user?.role === 'super_admin' && 'System Revenue'}
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-emerald-500 italic">₹</span>
                                        <h2 className="text-6xl font-black text-white tracking-tighter italic leading-none">
                                            {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </h2>
                                    </div>
                                </div>

                                <div className="mt-12 flex items-center gap-4 py-4 px-6 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest leading-none mb-1">Status</p>
                                        <p className="text-xs font-bold text-white uppercase tracking-widest">Active Vessel</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Pending Requests Visualizer */}
                        {user?.role === 'user' && requests.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between px-4">
                                    <h3 className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Pending Approvals</h3>
                                    <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-bold">
                                        {requests.length}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {requests.map(req => (
                                        <div key={req.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex items-center justify-between group hover:border-amber-500/30 transition-all duration-500">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse border border-amber-500/20">
                                                    <Clock className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-widest text-white">Top-up Req</p>
                                                    <p className="text-[10px] text-neutral-500 font-bold">{new Date(req.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-amber-500 italic">+₹{parseFloat(req.amount).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Transactions (Right Column) */}
                    <div className="lg:col-span-2">
                        <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 overflow-hidden flex flex-col h-full min-h-[500px]">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-3">
                                    <CreditCard className="w-4 h-4 text-emerald-500" />
                                    Transaction Log
                                </h3>
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20" />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                {loading ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                                        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                                        <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Hydrating Ledger...</p>
                                    </div>
                                ) : transactions.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-24 h-24 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-6 shadow-2xl">
                                            <Wallet className="w-10 h-10 text-neutral-700" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">Vault is Empty</h3>
                                        <p className="text-neutral-500 text-sm max-w-xs uppercase tracking-widest text-[10px] font-bold">No transactions found in this era.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <AnimatePresence mode="popLayout">
                                            {transactions.map((txn, i) => (
                                                <motion.div
                                                    key={txn.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="group bg-white/5 border border-white/5 rounded-[1.5rem] p-5 flex items-center justify-between hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-300"
                                                >
                                                    <div className="flex items-center gap-5">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl shadow-transparent",
                                                            txn.type === 'CREDIT'
                                                                ? 'bg-emerald-500/10 text-emerald-500 group-hover:shadow-emerald-500/10'
                                                                : 'bg-red-500/10 text-red-500 group-hover:shadow-red-500/10'
                                                        )}>
                                                            {txn.type === 'CREDIT' ? <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" /> : <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">{txn.description}</p>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                                                                    {new Date(txn.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </span>
                                                                <div className="w-1 h-1 rounded-full bg-neutral-800" />
                                                                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                                                                    {new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={cn(
                                                            "text-lg font-black italic",
                                                            txn.type === 'CREDIT' ? 'text-emerald-500' : 'text-neutral-400'
                                                        )}>
                                                            {txn.type === 'CREDIT' ? '+' : '-'}₹{parseFloat(txn.amount).toFixed(2)}
                                                        </span>
                                                        <div className="flex justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                                            <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
                                                            <div className="w-3 h-1 rounded-full bg-emerald-500/50" />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top-up Modal */}
            <AnimatePresence>
                {isTopUpOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                            onClick={() => setIsTopUpOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-neutral-900 w-full max-w-md rounded-[3rem] p-10 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)]"
                        >
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Add Funds</h3>
                                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Refill your cinematic balance</p>
                                </div>
                                <button
                                    onClick={() => setIsTopUpOpen(false)}
                                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center group"
                                >
                                    <XCircle className="w-6 h-6 text-neutral-500 group-hover:text-red-500 transition-colors" />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-2 mb-3 block">Quantum Amount</label>
                                    <div className="relative group/input">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-2xl italic group-focus-within/input:scale-110 transition-transform duration-500 pr-2">₹</span>
                                        <input
                                            type="number"
                                            value={topUpAmount}
                                            onChange={(e) => setTopUpAmount(e.target.value)}
                                            className="w-full h-20 pl-14 pr-8 bg-white/5 rounded-3xl border border-white/10 focus:border-emerald-500/50 text-white font-black text-3xl italic outline-none transition-all placeholder:text-neutral-800 shadow-inner"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-2.5 mt-5">
                                        {[100, 500, 1000, 2000].map(amt => (
                                            <button
                                                key={amt}
                                                onClick={() => setTopUpAmount(amt.toString())}
                                                className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-emerald-400 transition-all duration-300"
                                            >
                                                +₹{amt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] ml-2 mb-3 block">Transmission Protocol</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { id: 'UPI', label: 'Fast UPI', icon: ArrowDownLeft },
                                            { id: 'CARD', label: 'Secure Card', icon: CreditCard }
                                        ].map(method => (
                                            <button
                                                key={method.id}
                                                onClick={() => setPaymentMethod(method.id)}
                                                className={cn(
                                                    "relative h-20 rounded-3xl border-2 flex flex-col items-center justify-center gap-1 transition-all duration-500 overflow-hidden group",
                                                    paymentMethod === method.id
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                                        : 'border-white/5 bg-white/5 text-neutral-500 hover:border-white/20'
                                                )}
                                            >
                                                <method.icon className={cn("w-6 h-6 mb-1 transition-transform duration-500 group-hover:scale-110", paymentMethod === method.id && "stroke-[2.5]")} />
                                                <span className="text-[9px] font-black uppercase tracking-[0.15em]">{method.label}</span>
                                                {paymentMethod === method.id && (
                                                    <motion.div layoutId="payment-active" className="absolute bottom-0 h-1 bg-emerald-500 left-4 right-4 rounded-full" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleTopUp}
                                        className="w-full h-18 bg-emerald-500 hover:bg-emerald-400 rounded-3xl text-neutral-950 font-black uppercase tracking-[0.2em] italic text-sm transition-all shadow-2xl shadow-emerald-500/30 border-t border-white/20"
                                    >
                                        Confirm Transmission
                                    </motion.button>
                                    <p className="text-[8px] text-center text-neutral-600 font-bold uppercase tracking-widest mt-6 opacity-40">
                                        Encrypted End-to-End • 256-Bit Protection
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <SiteFooter />
        </div>
    );
};

export default WalletPage;
