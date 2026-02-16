import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, Clock, ArrowUpRight, ArrowDownLeft, CreditCard, XCircle, AlertCircle } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useWebSocket } from '../context/WebSocketContextDefinition';
import { useAuth } from '../context/useAuth';

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
        <div className="min-h-screen bg-[#0a0a0b] pb-24">
            {/* Header */}
            <div className="bg-gradient-to-b from-neutral-900/80 to-[#0a0a0b] backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 px-6 py-6">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">My Wallet</h1>
                        <p className="text-xs text-neutral-500 font-medium">Manage your balance & transactions</p>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-6 py-8 space-y-8">
                {/* Balance Card */}
                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 shadow-2xl shadow-emerald-900/50">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Wallet className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-emerald-100 font-medium mb-1 opacity-80">
                            {user?.role === 'user' && 'Available Balance'}
                            {user?.role === 'admin' && 'Total Earnings'}
                            {user?.role === 'super_admin' && 'Platform Revenue'}
                        </p>
                        <h2 className="text-4xl font-black text-white tracking-tight">₹{balance.toFixed(2)}</h2>

                        {user?.role === 'user' && (
                            <div className="mt-8 flex gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsTopUpOpen(true)}
                                    className="flex-1 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center gap-2 text-white font-bold text-sm border border-white/10 hover:bg-white/30 transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Money
                                </motion.button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Requests */}
                {user?.role === 'user' && requests.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            Pending Requests
                        </h3>
                        <div className="space-y-3">
                            {requests.map(req => (
                                <div key={req.id} className="bg-neutral-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                                            <AlertCircle className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="font-bold">Top-up Request</p>
                                            <p className="text-xs text-neutral-500">{new Date(req.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-amber-500">+₹{req.amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Transactions */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold">Recent Transactions</h3>
                    {loading ? (
                        <div className="text-center py-10 text-neutral-500">Loading...</div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12 bg-neutral-900/30 rounded-3xl border border-dashed border-white/5">
                            <div className="w-12 h-12 rounded-full bg-neutral-800 mx-auto flex items-center justify-center mb-3">
                                <Wallet className="w-6 h-6 text-neutral-600" />
                            </div>
                            <p className="text-neutral-500 font-medium">No transactions yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map(txn => (
                                <motion.div
                                    key={txn.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-neutral-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-neutral-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txn.type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                            }`}>
                                            {txn.type === 'CREDIT' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-neutral-200">{txn.description}</p>
                                            <p className="text-xs text-neutral-500">{new Date(txn.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`font-bold ${txn.type === 'CREDIT' ? 'text-emerald-500' : 'text-neutral-200'}`}>
                                        {txn.type === 'CREDIT' ? '+' : '-'}₹{txn.amount}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <BottomNav />

            {/* Top-up Modal */}
            <AnimatePresence>
                {isTopUpOpen && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsTopUpOpen(false)}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="relative bg-neutral-900 w-full max-w-md rounded-[2rem] p-6 border border-white/10 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold">Add Money</h3>
                                <button onClick={() => setIsTopUpOpen(false)} className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
                                    <XCircle className="w-5 h-5 text-neutral-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1 mb-2 block">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-lg">₹</span>
                                        <input
                                            type="number"
                                            value={topUpAmount}
                                            onChange={(e) => setTopUpAmount(e.target.value)}
                                            className="w-full h-14 pl-10 pr-4 bg-neutral-800 rounded-2xl border border-transparent focus:border-emerald-500/50 text-white font-bold text-lg outline-none transition-all"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        {[100, 500, 1000].map(amt => (
                                            <button
                                                key={amt}
                                                onClick={() => setTopUpAmount(amt.toString())}
                                                className="flex-1 h-9 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-400 transition-colors"
                                            >
                                                +₹{amt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1 mb-2 block">Payment Method</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setPaymentMethod('UPI')}
                                            className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === 'UPI' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-neutral-800 bg-neutral-800/50 text-neutral-500'
                                                }`}
                                        >
                                            <CreditCard className="w-5 h-5" />
                                            <span className="text-xs font-bold">UPI</span>
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('CARD')}
                                            className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === 'CARD' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-neutral-800 bg-neutral-800/50 text-neutral-500'
                                                }`}
                                        >
                                            <CreditCard className="w-5 h-5" />
                                            <span className="text-xs font-bold">Card</span>
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={handleTopUp}
                                    className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 rounded-2xl text-white font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                                >
                                    Proceed to Pay
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WalletPage;
