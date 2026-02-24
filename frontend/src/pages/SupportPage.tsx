import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Headset, Plus, MessageSquare, Clock,
    ChevronRight, Send, X, Filter
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/useAuth';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';
import { useWebSocket } from '../context/WebSocketContextDefinition';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface Reply {
    id: number;
    message: string;
    senderId: number;
    createdAt: string;
    sender: {
        id: number;
        name: string;
        role: string;
    };
}

interface Ticket {
    id: number;
    subject: string;
    message: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    category: string;
    createdAt: string;
    updatedAt: string;
    replies: Reply[];
}

const SupportPage: React.FC = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { subscribe } = useWebSocket();

    // Form state
    const [formData, setFormData] = useState({
        subject: '',
        message: '',
        priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
        category: 'General'
    });

    useEffect(() => {
        fetchTickets();
    }, []);

    // WebSocket Subscriptions
    useEffect(() => {
        const unsubscribeReply = subscribe('SUPPORT_TICKET_REPLY', (payload: any) => {
            if (selectedTicket && payload.ticketId === selectedTicket.id) {
                // If the update is for the currently viewed ticket, refresh it
                api.get(`/support/tickets/${selectedTicket.id}`).then(res => {
                    setSelectedTicket(res.data);
                });
            }
            fetchTickets(); // Always refresh list for timestamps/new messages
        });

        const unsubscribeStatus = subscribe('SUPPORT_TICKET_STATUS_UPDATE', (payload: any) => {
            if (selectedTicket && payload.ticketId === selectedTicket.id) {
                setSelectedTicket(prev => prev ? { ...prev, status: payload.status } : null);
            }
            fetchTickets();
        });

        return () => {
            unsubscribeReply();
            unsubscribeStatus();
        };
    }, [selectedTicket, subscribe]);

    const fetchTickets = async () => {
        try {
            const res = await api.get('/support/tickets');
            setTickets(res.data);
        } catch (err) {
            console.error('Error fetching tickets:', err);
            toast.error('Failed to load support tickets');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/support/tickets', formData);
            toast.success('Ticket created successfully');
            setIsCreateModalOpen(false);
            setFormData({ subject: '', message: '', priority: 'MEDIUM', category: 'General' });
            fetchTickets();
        } catch (err) {
            console.error('Error creating ticket:', err);
            toast.error('Failed to create ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() || !selectedTicket) return;
        setIsSubmitting(true);
        try {
            await api.post(`/support/tickets/${selectedTicket.id}/replies`, { message: replyMessage });
            setReplyMessage('');
            // Refresh ticket details
            const res = await api.get(`/support/tickets/${selectedTicket.id}`);
            setSelectedTicket(res.data);
            fetchTickets(); // Refresh list to update "updatedAt"
        } catch (err) {
            console.error('Error adding reply:', err);
            toast.error('Failed to send reply');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'IN_PROGRESS': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'RESOLVED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'CLOSED': return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
            default: return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 py-24">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 mb-2"
                        >
                            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Headset className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl font-black italic tracking-tighter uppercase">Support Center</h1>
                        </motion.div>
                        <p className="text-neutral-500 font-medium">Have a question? We're here to help you 24/7.</p>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 h-12 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-600/20"
                    >
                        <Plus className="w-5 h-5" />
                        New Ticket
                    </motion.button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Ticket List */}
                    <div className={cn("lg:col-span-4 space-y-4", selectedTicket && "hidden lg:block")}>
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-black text-neutral-500 uppercase tracking-widest">Your Tickets</h2>
                            <Filter className="w-4 h-4 text-neutral-500" />
                        </div>

                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
                            ))
                        ) : tickets.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-white/5">
                                <MessageSquare className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                                <p className="text-neutral-500 font-medium">No tickets found.</p>
                            </div>
                        ) : (
                            tickets.map((ticket) => (
                                <motion.div
                                    key={ticket.id}
                                    layoutId={`ticket-${ticket.id}`}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={cn(
                                        "p-5 rounded-2xl border transition-all cursor-pointer group",
                                        selectedTicket?.id === ticket.id
                                            ? "bg-purple-500/10 border-purple-500/30 ring-1 ring-purple-500"
                                            : "bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-white/20"
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                            getStatusStyle(ticket.status)
                                        )}>
                                            {ticket.status}
                                        </span>
                                        <span className="text-[10px] text-neutral-600 font-bold uppercase">
                                            #{ticket.id}
                                        </span>
                                    </div>
                                    <h3 className="font-bold mb-1 truncate group-hover:text-purple-400 transition-colors">
                                        {ticket.subject}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(ticket.updatedAt), 'MMM dd')}
                                        </span>
                                        <span className="text-neutral-700">•</span>
                                        <span className="font-bold text-neutral-400 uppercase tracking-tighter">
                                            {ticket.category}
                                        </span>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Ticket Details / Conversation */}
                    <div className="lg:col-span-8">
                        <AnimatePresence mode="wait">
                            {selectedTicket ? (
                                <motion.div
                                    key="ticket-details"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="h-full flex flex-col bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden"
                                >
                                    {/* Conversation Header */}
                                    <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setSelectedTicket(null)}
                                                className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400"
                                            >
                                                <ChevronRight className="w-5 h-5 rotate-180" />
                                            </button>
                                            <div>
                                                <h2 className="text-xl font-black italic uppercase tracking-tight text-white mb-1">
                                                    {selectedTicket.subject}
                                                </h2>
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                        getStatusStyle(selectedTicket.status)
                                                    )}>
                                                        {selectedTicket.status}
                                                    </span>
                                                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Created {format(new Date(selectedTicket.createdAt), 'MMM dd, yyyy')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Messages Area */}
                                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 h-[500px] custom-scrollbar">
                                        {/* Original Message */}
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex-shrink-0 flex items-center justify-center text-sm font-bold text-neutral-400 border border-white/10 uppercase">
                                                {user?.name?.[0] || 'U'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-sm">{user?.name}</span>
                                                    <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest bg-white/5 px-2 rounded">User</span>
                                                </div>
                                                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-4 text-neutral-300 text-sm leading-relaxed">
                                                    {selectedTicket.message}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Replies */}
                                        {selectedTicket.replies.map((reply) => (
                                            <div key={reply.id} className={cn("flex gap-4", reply.sender.role === 'admin' && "flex-row-reverse")}>
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold border border-white/10 uppercase",
                                                    reply.sender.role === 'admin' ? "bg-purple-600 text-white" : "bg-neutral-800 text-neutral-400"
                                                )}>
                                                    {reply.sender.name[0]}
                                                </div>
                                                <div className={cn("flex-1 max-w-[80%]", reply.sender.role === 'admin' && "text-right")}>
                                                    <div className={cn("flex items-center gap-2 mb-1", reply.sender.role === 'admin' && "justify-end lg:flex-row-reverse")}>
                                                        <span className="font-bold text-sm tracking-tight">{reply.sender.name}</span>
                                                        <span className={cn(
                                                            "text-[9px] uppercase font-black tracking-[0.1em] px-2 py-0.5 rounded shadow-sm",
                                                            reply.sender.role === 'admin' ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-neutral-500"
                                                        )}>
                                                            {reply.sender.role === 'admin' ? 'Support Hero' : 'User'}
                                                        </span>
                                                    </div>
                                                    <div className={cn(
                                                        "p-4 text-sm leading-relaxed border shadow-2xl",
                                                        reply.sender.role === 'admin'
                                                            ? "bg-purple-600 border-purple-500 text-white rounded-2xl rounded-tr-none"
                                                            : "bg-white/5 border-white/10 text-neutral-300 rounded-2xl rounded-tl-none"
                                                    )}>
                                                        {reply.message}
                                                    </div>
                                                    <p className="text-[10px] text-neutral-600 font-bold mt-2 uppercase tracking-widest">
                                                        {format(new Date(reply.createdAt), 'hh:mm a')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Input Area */}
                                    {selectedTicket.status !== 'CLOSED' && (
                                        <div className="p-6 md:p-8 border-t border-white/10 bg-white/[0.02]">
                                            <form onSubmit={handleAddReply} className="relative">
                                                <textarea
                                                    value={replyMessage}
                                                    onChange={(e) => setReplyMessage(e.target.value)}
                                                    placeholder="Type your message here..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] p-5 pr-16 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-neutral-700 resize-none h-24"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting || !replyMessage.trim()}
                                                    className="absolute bottom-4 right-4 w-10 h-10 bg-purple-600 hover:bg-purple-500 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-50 shadow-xl shadow-purple-600/20"
                                                >
                                                    <Send className="w-5 h-5 translate-x-0.5 -translate-y-0.5" />
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty-state"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="hidden lg:flex h-full flex-col items-center justify-center bg-white/5 rounded-[2.5rem] border border-white/10 p-20 text-center"
                                >
                                    <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                        <MessageSquare className="w-10 h-10 text-neutral-700" />
                                    </div>
                                    <h2 className="text-2xl font-black italic uppercase tracking-tight text-neutral-500 mb-2">
                                        Select a ticket
                                    </h2>
                                    <p className="text-neutral-600 max-w-xs mx-auto">
                                        Choose a conversation from the list to view the full support thread or create a new ticket.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            {/* Create Ticket Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 border-b border-white/10 flex items-center justify-between">
                                <h2 className="text-2xl font-black italic uppercase tracking-tight">Create New Ticket</h2>
                                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                    <X className="w-6 h-6 text-neutral-500" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full h-14 bg-neutral-950 border border-white/10 rounded-2xl px-5 text-sm focus:outline-none focus:border-purple-500 transition-all appearance-none text-white"
                                        >
                                            <option value="General">General Inquiry</option>
                                            <option value="Booking">Booking Issues</option>
                                            <option value="Payment">Payment & Refund</option>
                                            <option value="Account">Account Security</option>
                                            <option value="Technical">Technical Support</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Priority</label>
                                        <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl h-14">
                                            {['LOW', 'MEDIUM', 'HIGH'].map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, priority: p as any })}
                                                    className={cn(
                                                        "flex-1 rounded-xl text-[10px] font-black transition-all",
                                                        formData.priority === p
                                                            ? "bg-purple-600 text-white shadow-lg"
                                                            : "text-neutral-500 hover:text-neutral-300"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Subject</label>
                                    <input
                                        required
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        placeholder="What can we help you with?"
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm focus:outline-none focus:border-purple-500 transition-all text-white placeholder:text-neutral-700"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Message</label>
                                    <textarea
                                        required
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        placeholder="Please provide as much detail as possible..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-purple-500 transition-all text-white placeholder:text-neutral-700 resize-none h-40"
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-16 rounded-[1.5rem] bg-purple-600 hover:bg-purple-500 text-white font-black italic uppercase tracking-widest transition-all shadow-xl shadow-purple-600/30 disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <SiteFooter />
        </div>
    );
};

export default SupportPage;
