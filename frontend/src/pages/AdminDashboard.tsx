import React, { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Film, Calendar, Plus, MapPin,
    Trash2, Monitor, X, Star, Users, Bell,
    Wallet, Menu, Search, Edit2, MessageSquare,
    LogOut, Ticket, Headset, Send
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import { onMessageListener } from '../config/firebase';
import type {
    Movie, Theater, Showtime, Booking, User, WalletRequest,
    DashboardStats
} from '../types';
import PricingRuleManager from '../components/PricingRuleManager';
import CouponManager from '../components/CouponManager';
import { cn } from '../lib/utils';
import { useWebSocket } from '../context/WebSocketContextDefinition';

type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface AdminTicketReply {
    id: number;
    message: string;
    sender: {
        id: number;
        name: string;
        role: string;
    };
    createdAt: string;
}

interface AdminTicket {
    id: number;
    subject: string;
    message: string;
    status: SupportTicketStatus;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    category: string;
    createdAt: string;
    updatedAt: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    replies?: AdminTicketReply[];
}

interface EditingScreen {
    id: number;
    name: string;
}

interface ScreenTierSummary {
    name: string;
    price: number;
}

const AdminDashboard: React.FC = () => {
    // ─── State ────────────────────────────────────────────────────────────────
    const [currentTab, setCurrentTab] = useState<'theaters' | 'movies' | 'showtimes' | 'bookings' | 'users' | 'wallet' | 'pricing' | 'coupons' | 'support' | 'food'>('theaters');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Data Lists
    const [theaters, setTheaters] = useState<Theater[]>([]);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [showtimes, setShowtimes] = useState<Showtime[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [walletRequests, setWalletRequests] = useState<WalletRequest[]>([]);
    const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
    const [adminTickets, setAdminTickets] = useState<AdminTicket[]>([]);
    const [selectedAdminTicket, setSelectedAdminTicket] = useState<AdminTicket | null>(null);
    const [adminReplyMessage, setAdminReplyMessage] = useState('');
    const [foodItems, setFoodItems] = useState<any[]>([]);
    const { subscribe } = useWebSocket();

    // Modals
    const [showTheaterModal, setShowTheaterModal] = useState(false);
    const [showScreenModal, setShowScreenModal] = useState(false);
    const [showMovieModal, setShowMovieModal] = useState(false);
    const [showShowtimeModal, setShowShowtimeModal] = useState(false);
    const [showFoodModal, setShowFoodModal] = useState(false);

    // Forms & Inputs
    const [newTheater, setNewTheater] = useState({ name: '', location: '' });
    const [selectedTheaterId, setSelectedTheaterId] = useState<number | null>(null);
    const [newScreenName, setNewScreenName] = useState('');

    // Seat Tiers (State)
    const [seatTiers, setSeatTiers] = useState([
        { name: 'Classic', rows: 5, price: 150 },
        { name: 'Recliner', rows: 2, price: 250 },
        { name: 'Premium', rows: 3, price: 400 }
    ]);

    const [newMovie, setNewMovie] = useState<Partial<Movie>>({
        title: '', description: '', genre: '', duration: 120, rating: '',
        posterUrl: '', bannerUrl: '', trailerUrl: '', releaseDate: '', language: '', audio: '', format: 'IMAX 2D'
    });
    const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

    const [newShowtime, setNewShowtime] = useState({
        movieId: 0, screenId: 0, startTime: '', endTime: '',
        tierPrices: {} as Record<string, number>, occupancyThreshold: 70
    });
    const [newShowtimeDate, setNewShowtimeDate] = useState('');
    const [newShowtimeTime, setNewShowtimeTime] = useState('');

    const [newFoodItem, setNewFoodItem] = useState({
        name: '', description: '', price: 0, category: 'Snacks',
        imageUrl: '', isVeg: true, calories: 0, allergens: ''
    });
    const [editingFoodId, setEditingFoodId] = useState<number | null>(null);

    // User Management
    const [userSearch, setUserSearch] = useState('');
    const [editingCommissionUser, setEditingCommissionUser] = useState<User | null>(null);
    const [newCommissionRate, setNewCommissionRate] = useState<number>(0);

    // Notification State
    const [notifUserId, setNotifUserId] = useState<number | null>(null);
    const [notifForm, setNotifForm] = useState({ title: '', message: '', type: 'info' as 'info' | 'warning' | 'success' | 'error', audience: 'users' });
    const [isSendingNotif, setIsSendingNotif] = useState(false);

    // Screen Editing & Generation
    const [editingScreen, setEditingScreen] = useState<EditingScreen | null>(null);
    const [genScreenId, setGenScreenId] = useState<number | null>(null);
    const [seatCols, setSeatCols] = useState(10);

    // Request Movie
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestMovieName, setRequestMovieName] = useState('');
    const [requestNotes, setRequestNotes] = useState('');

    const [selectedScreenTiers, setSelectedScreenTiers] = useState<ScreenTierSummary[]>([]);

    // ─── Effects ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (currentTab === 'theaters') fetchTheaters();
        if (currentTab === 'movies') fetchMovies();
        if (currentTab === 'showtimes') { fetchShowtimes(); fetchMovies(); fetchTheaters(); }
        if (currentTab === 'bookings') fetchBookings();
        if (currentTab === 'users') fetchUsers();
        if (currentTab === 'wallet') fetchWalletRequests();
        if (currentTab === 'support') fetchAdminTickets();
        if (currentTab === 'food') fetchFoodItems();
        fetchDashboardStats();
    }, [currentTab, userSearch]);

    // WebSocket Subscriptions
    useEffect(() => {
        const unsubscribe = subscribe('SUPPORT_TICKET_REPLY', (payload) => {
            fetchAdminTickets();

            if (selectedAdminTicket && (payload as { ticketId?: number }).ticketId === selectedAdminTicket.id) {
                api.get(`/support/tickets/${selectedAdminTicket.id}`).then(res => {
                    setSelectedAdminTicket(res.data);
                });
            }
        });

        return () => unsubscribe();
    }, [selectedAdminTicket, subscribe]);

    const handleWalletAction = async (id: number, action: 'approve' | 'reject') => {
        try {
            await api.post(`/wallet/admin/${action}/${id}`);
            fetchWalletRequests();
        } catch (error: unknown) {
            console.error(error);
            alert(`Failed to ${action} request`);
        }
    };

    useEffect(() => {
        const unsubscribe = onMessageListener((payload) => {
            console.log('Firebase Foreground Notification:', payload);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    // ─── Data Fetching ────────────────────────────────────────────────────────
    const fetchDashboardStats = async () => {
        try {
            const res = await api.get('/admin/stats');
            setDashboardStats(res.data);
            if ('pendingApprovals' in res.data) {
                setPendingRequestsCount(res.data.pendingApprovals);
            }
        } catch (error: unknown) {
            console.error('Stats error', error);
        }
    };

    const fetchTheaters = async () => {
        try {
            const res = await api.get('/admin/theaters');
            setTheaters(res.data);
        } catch (error: unknown) {
            console.error(error);
        }
    };

    const fetchMovies = async () => {
        try {
            const res = await api.get('/movies');
            setMovies(res.data);
        } catch (error: unknown) {
            console.error(error);
        }
    };

    const fetchShowtimes = async () => {
        try {
            const res = await api.get('/admin/showtimes');
            setShowtimes(res.data);
        } catch (error: unknown) {
            console.error(error);
        }
    };

    const fetchBookings = async () => {
        try {
            const res = await api.get('/admin/bookings');
            setBookings(res.data);
        } catch (error: unknown) {
            console.error(error);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get(`/admin/users?search=${userSearch}`);
            setUsers(res.data.users || res.data);
        } catch (error: unknown) {
            console.error(error);
        }
    };

    const fetchWalletRequests = async () => {
        try {
            const res = await api.get('/wallet/admin/requests');
            setWalletRequests(res.data);
            setPendingRequestsCount(res.data.filter((r: WalletRequest) => r.status === 'PENDING').length);
        } catch (error: unknown) {
            console.error(error);
        }
    };

    const fetchAdminTickets = async () => {
        try {
            const res = await api.get('/support/admin/tickets');
            setAdminTickets(res.data);
        } catch (error: unknown) {
            console.error(error);
        }
    };

    const fetchFoodItems = async () => {
        try {
            const res = await api.get('/food');
            setFoodItems(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateTicketStatus = async (ticketId: number, status: string) => {
        try {
            await api.patch(`/support/admin/tickets/${ticketId}/status`, { status });
            fetchAdminTickets();
            if (selectedAdminTicket?.id === ticketId) {
                const res = await api.get(`/support/tickets/${ticketId}`);
                setSelectedAdminTicket(res.data);
            }
        } catch (error: unknown) {
            console.error(error);
            alert('Failed to update ticket status');
        }
    };

    const handleAdminAddReply = async (ticketId: number) => {
        if (!adminReplyMessage.trim()) return;
        try {
            await api.post(`/support/tickets/${ticketId}/replies`, { message: adminReplyMessage });
            setAdminReplyMessage('');
            const res = await api.get(`/support/tickets/${ticketId}`);
            setSelectedAdminTicket(res.data);
            fetchAdminTickets();
        } catch (error: unknown) {
            console.error(error);
            alert('Failed to send reply');
        }
    };

    const handleDeleteTicket = async (ticketId: number) => {
        if (!window.confirm('Delete this ticket permanently?')) return;
        try {
            await api.delete(`/support/admin/tickets/${ticketId}`);
            setSelectedAdminTicket(null);
            fetchAdminTickets();
        } catch (error: unknown) {
            console.error(error);
            alert('Failed to delete ticket');
        }
    };

    // ─── Handlers ─────────────────────────────────────────────────────────────

    // Theater/Screen
    const handleCreateTheater = async () => {
        try {
            if (!newTheater.name || !newTheater.location) return;
            await api.post('/admin/theaters', newTheater);
            fetchTheaters();
            setShowTheaterModal(false);
            setNewTheater({ name: '', location: '' });
            alert('Theater created successfully! Please remember to add screens and configure seat layouts for this new location.');
        } catch (error: unknown) {
            console.error(error);
            alert('Failed to create theater');
        }
    };

    const handleDeleteTheater = async (id: number) => {
        if (!window.confirm('Delete this theater?')) return;
        try {
            await api.delete(`/admin/theaters/${id}`);
            fetchTheaters();
        } catch (error: unknown) { console.error(error) }
    };

    const handleAddScreen = async (theaterId: number) => {
        try {
            await api.post(`/admin/screens`, {
                theaterId,
                name: newScreenName,
                seatLayout: {
                    columns: seatCols,
                    tiers: seatTiers
                }
            });
            fetchTheaters();
            setShowScreenModal(false);
            setNewScreenName('');
            setSeatTiers([
                { name: 'Classic', rows: 5, price: 150 },
                { name: 'Recliner', rows: 3, price: 250 },
                { name: 'Premium', rows: 2, price: 400 }                
            ]);
            setSeatCols(10);
        } catch (error: unknown) {
            console.error(error);
            alert('Failed to add screen');
        }
    };

    const handleUpdateScreen = async () => {
        if (!editingScreen) return;
        try {
            await api.put(`/admin/screens/${editingScreen.id}`, { name: editingScreen.name });
            setEditingScreen(null);
            fetchTheaters();
        } catch (error: unknown) { console.error(error) }
    };

    const handleDeleteScreen = async (screenId: number) => {
        if (!window.confirm('Delete this screen?')) return;
        try {
            await api.delete(`/admin/screens/${screenId}`);
            fetchTheaters();
        } catch (error: unknown) { console.error(error) }
    };

    const handleGenerateSeats = async (screenId: number) => {
        try {
            await api.post(`/admin/screens/${screenId}/seats/generate`, { tiers: seatTiers, columns: seatCols });
            setGenScreenId(null);
            setSeatTiers([{ name: 'Classic', rows: 5, price: 150 }]);
            setSeatCols(10);
            alert('Seats generated successfully!');
        } catch (error: unknown) { console.error(error) }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'posterUrl' | 'bannerUrl', isEdit: boolean) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-type' }
            });
            const url = response.data.url;

            if (isEdit && editingMovie) {
                setEditingMovie({ ...editingMovie, [field]: url });
            } else {
                setNewMovie({ ...newMovie, [field]: url });
            }
        } catch (error: unknown) {
            console.error('File upload failed:', error);
            alert('File upload failed');
        }
    };

    const handleSaveMovie = async () => {
        try {
            if (editingMovie) {
                await api.put(`/admin/movies/${editingMovie.id}`, newMovie);
            } else {
                await api.post('/admin/movies', newMovie);
            }
            setNewMovie({ title: '', description: '', genre: '', duration: 120, rating: '', posterUrl: '', bannerUrl: '', trailerUrl: '', releaseDate: '', language: '', audio: '', format: 'IMAX 2D' });
            setEditingMovie(null);
            setShowMovieModal(false);
            fetchMovies();
        } catch (error: unknown) { console.error(error); alert('Failed to save movie'); }
    };

    const handleDeleteMovie = async (id: number) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await api.delete(`/movies/${id}`);
            fetchMovies();
        } catch (error: unknown) {
            console.error(error);
            alert('Failed to delete');
        }
    };

    // Showtime
    const handleCreateShowtime = async () => {
        if (!newShowtime.movieId || !newShowtime.screenId || !newShowtimeDate || !newShowtimeTime || !newShowtime.tierPrices) {
            alert('Please fill all fields to schedule a showtime.');
            return;
        }
        try {
            const startTime = new Date(`${newShowtimeDate}T${newShowtimeTime}`).toISOString();
            const movie = movies.find(m => m.id === newShowtime.movieId);
            const durationMs = (movie?.duration || 120) * 60 * 1000;
            const endTime = new Date(new Date(startTime).getTime() + durationMs).toISOString();

            await api.post('/admin/showtimes', {
                ...newShowtime,
                startTime,
                endTime,
                tierPrices: newShowtime.tierPrices
            });

            setNewShowtime({ movieId: 0, screenId: 0, startTime: '', endTime: '', tierPrices: {}, occupancyThreshold: 70 });
            setNewShowtimeDate('');
            setNewShowtimeTime('');
            setSelectedScreenTiers([]);
            fetchShowtimes();
            setShowShowtimeModal(false);
        } catch (error: unknown) {
            console.error(error);
            if (error instanceof AxiosError && error.response && error.response.data && error.response.data.message) {
                alert(`Error: ${error.response.data.message}`);
            } else {
                alert('Failed to create showtime.');
            }
        }
    };

    const handleDeleteShowtime = async (id: number) => {
        if (!window.confirm('Delete this showtime?')) return;
        try {
            await api.delete(`/admin/showtimes/${id}`);
            fetchShowtimes();
        } catch (error: unknown) { console.error(error) }
    };

    const handleDeleteBooking = async (id: number) => {
        if (!window.confirm('Delete this booking?')) return;
        try {
            await api.delete(`/admin/bookings/${id}`);
            fetchBookings();
        } catch (error: unknown) { console.error(error) }
    };

    const handleSendNotification = async () => {
        if (!notifUserId || !notifForm.title || !notifForm.message) return;
        setIsSendingNotif(true);
        try {
            const endpoint = notifUserId === -1 ? '/admin/broadcast' : '/admin/notifications';
            const payload = notifUserId === -1
                ? { ...notifForm }
                : { userId: notifUserId, title: notifForm.title, message: notifForm.message, type: notifForm.type };

            await api.post(endpoint, payload);
            alert(notifUserId === -1 ? 'Broadcast sent successfully!' : 'Notification sent successfully!');
            setNotifUserId(null);
            setNotifForm({ title: '', message: '', type: 'info', audience: 'users' });
        } catch (error: unknown) {
            console.error(error);
            alert('Failed to send notification');
        } finally {
            setIsSendingNotif(false);
        }
    };

    const handleScreenSelect = async (screenId: number) => {
        try {
            const response = await api.get(`/admin/screens/${screenId}/tiers`);
            const tiers: ScreenTierSummary[] = response.data;
            setSelectedScreenTiers(tiers);

            // Pre-populate tierPrices with default prices
            const initialPrices: Record<string, number> = {};
            tiers.forEach((t) => {
                initialPrices[t.name] = t.price;
            });

            setNewShowtime({
                ...newShowtime,
                screenId,
                tierPrices: initialPrices,
                occupancyThreshold: 70
            });
        } catch (error: unknown) {
            console.error(error);
            setSelectedScreenTiers([]);
        }
    };

    const handleUpdateCommission = async () => {
        if (!editingCommissionUser) return;
        try {
            await api.put(`/admin/users/${editingCommissionUser.id}/commission`, { commissionRate: newCommissionRate });
            setEditingCommissionUser(null);
            fetchUsers();
            alert('Commission rate updated successfully!');
        } catch (error: unknown) {
            console.error(error);
            alert('Failed to update commission rate.');
        }
    };

    const handleApproveOwnerRequest = async (userId: number, action: 'APPROVE' | 'REJECT') => {
        if (!confirm(`Are you sure you want to ${action.toLowerCase()} this request?`)) return;
        try {
            await api.put(`/admin/users/${userId}/approve`, { action });
            fetchUsers();
            fetchDashboardStats();
            alert(`Request ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully!`);
        } catch (error: unknown) {
            console.error(error);
            alert(`Failed to ${action.toLowerCase()} request.`);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleRequestMovie = async () => {
        if (!requestMovieName) return;
        try {
            await api.post('/admin/movies/request', { movieName: requestMovieName, notes: requestNotes });
            alert('Request sent to Super Admin!');
            setShowRequestModal(false);
            setRequestMovieName('');
            setRequestNotes('');
        } catch (error) {
            console.error(error);
            alert('Failed to send request.');
        }
    };

    const handleSaveFoodItem = async () => {
        try {
            if (editingFoodId) {
                await api.put(`/food/${editingFoodId}`, newFoodItem);
            } else {
                await api.post('/food', newFoodItem);
            }
            setShowFoodModal(false);
            setNewFoodItem({ name: '', description: '', price: 0, category: 'Snacks', imageUrl: '', isVeg: true, calories: 0, allergens: '' });
            setEditingFoodId(null);
            fetchFoodItems();
        } catch (error) {
            console.error(error);
            alert('Failed to save food item');
        }
    };

    const handleDeleteFoodItem = async (id: number) => {
        if (!window.confirm('Delete this food item?')) return;
        try {
            await api.delete(`/food/${id}`);
            fetchFoodItems();
        } catch (error) {
            console.error(error);
            alert('Failed to delete food item');
        }
    };

    const handleRecalculatePopularity = async () => {
        if (!window.confirm('Recalculate popularity scores for all movies based on last 7 days of bookings?')) return;
        try {
            await api.post('/movies/popularity/recalculate');
            alert('Popularity scores updated!');
            const moviesRes = await api.get('/movies'); // Refresh list
            setMovies(moviesRes.data);
        } catch (error) {
            console.error(error);
            alert('Failed to recalculate popularity.');
        }
    };

    // ─── UI Helpers ───────────────────────────────────────────────────────────
    const tabs = [
        { id: 'theaters' as const, label: 'Theaters', icon: LayoutDashboard },
        { id: 'movies' as const, label: 'Movies', icon: Film },
        ...(user?.role !== 'super_admin' ? [{ id: 'showtimes' as const, label: 'Showtimes', icon: Calendar }] : []),
        { id: 'bookings' as const, label: 'Bookings', icon: Ticket },
        ...(user?.role === 'super_admin' ? [{ id: 'users' as const, label: 'Users', icon: Users }] : []),
        ...(user?.role === 'super_admin' ? [{ id: 'wallet' as const, label: 'Wallet', icon: Wallet }] : []),
        ...(user?.role === 'super_admin' ? [{ id: 'pricing' as const, label: 'Pricing Rules', icon: Star }] : []),
        { id: 'coupons' as const, label: 'Coupons', icon: Bell },
        { id: 'food' as const, label: 'Food & Snacks', icon: Menu },
        { id: 'support' as const, label: 'Support', icon: Headset },
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex font-sans selection:bg-emerald-500/30">
            {/* ─── Sidebar ──────────────────────────────────────────────────────── */}
            <motion.aside
                initial={{ x: -250 }}
                animate={{ x: isSidebarOpen ? 0 : -250 }}
                className={cn(
                    "fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-neutral-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col transition-transform duration-300",
                    !isSidebarOpen && "md:-ml-64"
                )}
            >
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Monitor className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Neo<span className="text-emerald-500">Admin</span></span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setCurrentTab(tab.id); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                                currentTab === tab.id
                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                    : "text-neutral-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <tab.icon className={cn("w-5 h-5", currentTab === tab.id ? "text-emerald-500" : "text-neutral-500 group-hover:text-white")} />
                            {tab.label}
                            {tab.id === 'wallet' && pendingRequestsCount > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {pendingRequestsCount}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-800/50 mb-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-neutral-950 font-bold uppercase">
                            {user?.name?.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider truncate">{user?.role.replace('_', ' ')}</p>
                        </div>
                    </div>
                </div>
            </motion.aside>

            {/* ─── Main Content ─────────────────────────────────────────────────── */}
            <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden relative">
                {/* Header */}
                <header className="h-16 border-b border-white/5 bg-neutral-900/30 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors">
                            <Menu className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold text-white capitalize">{currentTab.replace('-', ' ')}</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Conditional Bell Icon (only for super admin) */}
                        {user?.role === 'super_admin' && (
                            <button
                                onClick={() => setCurrentTab('wallet')}
                                className="relative p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
                            >
                                <Bell className="w-5 h-5" />
                                {pendingRequestsCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-neutral-900"></span>
                                )}
                            </button>
                        )}
                        <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
                    <div className="max-w-7xl mx-auto space-y-8 pb-20">
                        {/* Stats Cards */}
                        {dashboardStats && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {'totalBookings' in dashboardStats ? (
                                    // Owner Stats
                                    <>
                                        <div className="p-6 rounded-2xl bg-neutral-900 border border-white/5 relative overflow-hidden">
                                            <p className="text-neutral-500 font-medium mb-1">Total Bookings</p>
                                            <h3 className="text-3xl font-bold text-white">{dashboardStats.totalBookings || 0}</h3>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-neutral-900 border border-white/5 relative overflow-hidden">
                                            <p className="text-neutral-500 font-medium mb-1">Revenue</p>
                                            <h3 className="text-3xl font-bold text-emerald-500">₹{Number(dashboardStats.totalEarnings || 0).toFixed(0)}</h3>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-neutral-900 border border-white/5 relative overflow-hidden">
                                            <p className="text-neutral-500 font-medium mb-1">Commissions Paid</p>
                                            <h3 className="text-3xl font-bold text-amber-500">₹{Number(dashboardStats.commissionPaid || 0).toFixed(0)}</h3>
                                        </div>
                                    </>
                                ) : (
                                    // Super Admin Stats
                                    <>
                                        <div className="p-6 rounded-2xl bg-neutral-900 border border-white/5 relative overflow-hidden">
                                            <p className="text-neutral-500 font-medium mb-1">Total Revenue</p>
                                            <h3 className="text-3xl font-bold text-emerald-500">₹{Number(dashboardStats.totalRevenue || 0).toFixed(0)}</h3>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-neutral-900 border border-white/5 relative overflow-hidden">
                                            <p className="text-neutral-500 font-medium mb-1">Total Owners</p>
                                            <h3 className="text-3xl font-bold text-white">{dashboardStats.totalOwners || 0}</h3>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-neutral-900 border border-white/5 relative overflow-hidden">
                                            <p className="text-neutral-500 font-medium mb-1">Pending Requests</p>
                                            <h3 className="text-3xl font-bold text-amber-500">{dashboardStats.pendingApprovals || 0}</h3>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ─── Theaters Tab ─── */}
                        {currentTab === 'theaters' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold">Your Theaters</h3>
                                    {user?.role !== 'super_admin' && (
                                        <button
                                            onClick={() => setShowTheaterModal(true)}
                                            className="px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-bold flex items-center gap-2 hover:bg-emerald-400 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Add Theater
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {theaters.map(theater => (
                                        <div key={theater.id} className="bg-neutral-900 border border-white/5 rounded-2xl p-6 hover:border-emerald-500/30 transition-colors">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-bold text-lg text-white">{theater.name}</h4>
                                                    <div className="flex items-center gap-1 text-neutral-400 text-sm mt-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {theater.location}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleDeleteTheater(theater.id)}
                                                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                                        title="Delete Theater"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                                        <Monitor className="w-5 h-5 text-emerald-500" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="text-sm text-neutral-500 font-semibold uppercase tracking-wider">Screens</div>
                                                {theater.screens?.map(screen => (
                                                    <div key={screen.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-800/50 group">
                                                        <span className="text-sm font-medium text-white">{screen.name}</span>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => setEditingScreen(screen)}
                                                                className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-neutral-400 hover:text-emerald-500 transition-colors"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteScreen(screen.id)}
                                                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-neutral-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => { setSelectedTheaterId(theater.id); setShowScreenModal(true); }}
                                                    className="w-full py-2 rounded-xl border border-dashed border-neutral-700 text-neutral-500 hover:text-emerald-500 hover:border-emerald-500/50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                                >
                                                    <Plus className="w-4 h-4" /> Add Screen
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Edit Screen Modal */}
                        <AnimatePresence>
                            {editingScreen && (
                                <Modal onClose={() => setEditingScreen(null)} title="Edit Screen">
                                    <div className="space-y-4">
                                        <input
                                            className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white"
                                            placeholder="Screen Name"
                                            value={editingScreen.name}
                                            onChange={e => setEditingScreen({ ...editingScreen, name: e.target.value })}
                                        />
                                        <button onClick={handleUpdateScreen} className="w-full py-3 rounded-xl bg-emerald-500 text-neutral-950 font-bold">Update Screen</button>

                                        <div className="border-t border-white/10 pt-4 mt-4">
                                            <h4 className="font-bold text-white mb-2">Seat Layout</h4>
                                            <p className="text-sm text-neutral-500 mb-4">Regenerate seating layout if necessary.</p>
                                            <button
                                                onClick={() => setGenScreenId(editingScreen.id)}
                                                className="w-full py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-bold"
                                            >
                                                Configure Seats
                                            </button>
                                        </div>
                                    </div>
                                </Modal>
                            )}
                        </AnimatePresence>

                        {/* ─── Movies Tab ─── */}
                        {currentTab === 'movies' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold">Movie Library</h3>
                                    <div className="flex gap-2">
                                        {user?.role === 'super_admin' && (
                                            <button
                                                onClick={handleRecalculatePopularity}
                                                className="px-4 py-2 rounded-xl bg-purple-500/10 text-purple-500 font-bold flex items-center gap-2 hover:bg-purple-500/20 transition-colors"
                                            >
                                                <Star className="w-4 h-4" /> Recalc Popularity
                                            </button>
                                        )}
                                        {user?.role !== 'super_admin' && (
                                            <button
                                                onClick={() => setShowRequestModal(true)}
                                                className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-500 font-bold flex items-center gap-2 hover:bg-amber-500/20 transition-colors"
                                            >
                                                <MessageSquare className="w-4 h-4" /> Request Movie
                                            </button>
                                        )}
                                        {user?.role === 'super_admin' && (
                                            <button
                                                onClick={() => { setEditingMovie(null); setShowMovieModal(true); }}
                                                className="px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-bold flex items-center gap-2 hover:bg-emerald-400 transition-colors"
                                            >
                                                <Plus className="w-4 h-4" /> Add Movie
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {movies.map(movie => (
                                        <div key={movie.id} className="group relative rounded-xl overflow-hidden bg-neutral-800 aspect-[2/3] border border-white/5 hover:border-emerald-500/50 transition-colors">
                                            <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover group-hover:opacity-40 transition-all duration-300" />
                                            <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                                                {user?.role === 'super_admin' ? (
                                                    <>
                                                        <button
                                                            onClick={() => { setEditingMovie(movie); setNewMovie(movie); setShowMovieModal(true); }}
                                                            className="px-4 py-2 rounded-lg bg-neutral-800 text-white font-medium text-sm hover:bg-emerald-500 hover:text-neutral-950 transition-colors flex items-center gap-2"
                                                        >
                                                            <Edit2 className="w-4 h-4" /> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMovie(movie.id)}
                                                            className="px-4 py-2 rounded-lg bg-neutral-800 text-white font-medium text-sm hover:bg-red-500 transition-colors flex items-center gap-2"
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Delete
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-neutral-400 px-4 text-center">Contact Super Admin to Edit</span>
                                                )}
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-neutral-950 to-transparent">
                                                <h4 className="text-white font-bold text-sm truncate">{movie.title}</h4>
                                                <p className="text-xs text-neutral-400">{movie.genre}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ─── Showtimes Tab ─── */}
                        {currentTab === 'showtimes' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold">Upcoming Showtimes</h3>
                                    <button
                                        onClick={() => setShowShowtimeModal(true)}
                                        className="px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-bold flex items-center gap-2 hover:bg-emerald-400 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Create Showtime
                                    </button>
                                </div>
                                <div className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-neutral-800/50 text-xs uppercase text-neutral-500 font-bold">
                                            <tr>
                                                <th className="px-6 py-4">Movie</th>
                                                <th className="px-6 py-4">Theater & Screen</th>
                                                <th className="px-6 py-4">Time</th>
                                                <th className="px-6 py-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {showtimes.map(showtime => (
                                                <tr key={showtime.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-neutral-800 overflow-hidden">
                                                                <img src={showtime.movie?.posterUrl} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                            <span className="font-medium text-white">{showtime.movie?.title}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-neutral-400 text-sm">
                                                        {showtime.screen?.theater?.name} • {showtime.screen?.name}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-sm text-white">
                                                            <Calendar className="w-4 h-4 text-emerald-500" />
                                                            {new Date(showtime.startTime).toLocaleDateString()}
                                                            <span className="text-neutral-500">|</span>
                                                            {new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => handleDeleteShowtime(showtime.id)}
                                                            className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ─── Wallet Tab ─── */}
                        {currentTab === 'wallet' && (
                            <div>
                                <h3 className="text-lg font-bold mb-6">Wallet Requests</h3>
                                <div className="space-y-4">
                                    {walletRequests.length === 0 ? <p className="text-neutral-500">No requests.</p> : walletRequests.map(req => (
                                        <div key={req.id} className="flex items-center justify-between p-4 rounded-xl bg-neutral-900 border border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center",
                                                    req.status === 'PENDING' ? "bg-amber-500/10 text-amber-500" :
                                                        req.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                                )}>
                                                    <Wallet className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">₹{req.amount} Top-up • {req.user?.name || `UID: ${req.userId}`}</p>
                                                    <p className="text-xs text-neutral-500 uppercase tracking-tighter">
                                                        <span className="text-emerald-500 font-bold mr-1">{req.paymentMethod}</span>
                                                        • Ref: {req.transactionRef} • {new Date(req.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            {req.status === 'PENDING' ? (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleWalletAction(req.id, 'approve')} className="px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 font-bold text-sm">Approve</button>
                                                    <button onClick={() => handleWalletAction(req.id, 'reject')} className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 font-bold text-sm">Reject</button>
                                                </div>
                                            ) : (
                                                <span className={cn("text-sm font-bold", req.status === 'APPROVED' ? "text-emerald-500" : "text-red-500")}>
                                                    {req.status}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ─── Users Tab ─── */}
                        {currentTab === 'users' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold">User Management</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setNotifUserId(-1); setNotifForm({ title: 'Important Announcement', message: '', type: 'info', audience: 'everyone' }); }}
                                            className="px-4 py-2 rounded-xl bg-purple-500/10 text-purple-500 font-bold flex items-center gap-2 hover:bg-purple-500/20 transition-colors"
                                        >
                                            <Bell className="w-4 h-4" /> Broadcast
                                        </button>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                            <input
                                                type="text"
                                                placeholder="Search users..."
                                                value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                                className="h-10 pl-10 pr-4 rounded-xl bg-neutral-900 border border-white/5 text-sm text-white focus:border-emerald-500/50 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-neutral-800/50 text-xs uppercase text-neutral-500 font-bold">
                                            <tr>
                                                <th className="px-6 py-4">User</th>
                                                <th className="px-6 py-4">Role</th>
                                                <th className="px-6 py-4">Wallet</th>
                                                <th className="px-6 py-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {users.map(u => (
                                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <p className="font-bold text-white">{u.name}</p>
                                                            <p className="text-xs text-neutral-500">{u.email}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn("px-2 py-1 rounded-md text-xs font-bold uppercase",
                                                            u.role === 'admin' ? "bg-amber-500/10 text-amber-500" :
                                                                u.role === 'super_admin' ? "bg-purple-500/10 text-purple-500" : "bg-white/5 text-neutral-400"
                                                        )}>{u.role.replace('_', ' ')}</span>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-emerald-500">
                                                        ₹{Number(u.walletBalance || 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => { setNotifUserId(u.id); setNotifForm({ ...notifForm, title: 'Notification', message: '', type: 'info' }); }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                                                                title="Notify User"
                                                            >
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                                <span className="text-xs font-bold">Notify</span>
                                                            </button>
                                                            {u.role === 'admin' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => { setEditingCommissionUser(u); setNewCommissionRate(10); /* Default */ }}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
                                                                        title="Set Commission"
                                                                    >
                                                                        <Wallet className="w-3.5 h-3.5" />
                                                                        <span className="text-xs font-bold">Comm.</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                            {/* Pending Owner Approval */}
                                                            {/* We can check based on a 'status' field or specific role like 'pending_owner' if it exists. 
                                                            As fallback, let's show these buttons for all 'user' roles if admin wants to promote them, 
                                                            OR specifically check if they have a 'requestStatus' if we added that to User type.
                                                            For now, I'll add a 'Promote to Owner' button for testing integration. 
                                                        */}
                                                            {u.role === 'user' && (user?.role === 'super_admin' || user?.role === 'admin') && (
                                                                <button
                                                                    onClick={() => handleApproveOwnerRequest(u.id, 'APPROVE')}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
                                                                    title="Promote to Theater Owner"
                                                                >
                                                                    <Monitor className="w-3.5 h-3.5" />
                                                                    <span className="text-xs font-bold">Owner</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ─── Bookings Tab ─── */}
                        {currentTab === 'bookings' && (
                            <div>
                                <h3 className="text-lg font-bold mb-6">Recent Bookings</h3>
                                <div className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-neutral-800/50 text-xs uppercase text-neutral-500 font-bold">
                                            <tr>
                                                <th className="px-6 py-4">Movie</th>
                                                <th className="px-6 py-4">User</th>
                                                <th className="px-6 py-4">Showtime</th>
                                                <th className="px-6 py-4">Amount</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Refund</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {bookings.map(booking => (
                                                <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-10 rounded bg-neutral-800 overflow-hidden">
                                                                {booking.showtime?.movie?.posterUrl && (
                                                                    <img src={booking.showtime.movie.posterUrl} alt="" className="w-full h-full object-cover" />
                                                                )}
                                                            </div>
                                                            <span className="font-medium text-white">{booking.showtime?.movie?.title || 'Unknown Title'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-neutral-400 text-sm">
                                                        {booking.user?.name || 'Guest'}<br />
                                                        <span className="text-xs text-neutral-600">{booking.user?.email}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-neutral-400">
                                                        {booking.showtime?.startTime ? (
                                                            <>
                                                                {new Date(booking.showtime.startTime).toLocaleDateString()}<br />
                                                                {new Date(booking.showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </>
                                                        ) : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-emerald-500">
                                                        ₹{booking.totalAmount}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("px-2 py-1 rounded-md text-xs font-bold uppercase",
                                                                booking.status === 'confirmed' || booking.status === 'CONFIRMED'
                                                                    ? "bg-emerald-500/10 text-emerald-500"
                                                                    : booking.status === 'cancelled' || booking.status === 'CANCELLED'
                                                                        ? "bg-red-500/10 text-red-500"
                                                                        : "bg-white/5 text-neutral-400"
                                                            )}>{String(booking.status).toUpperCase()}</span>
                                                            <button
                                                                onClick={() => handleDeleteBooking(booking.id)}
                                                                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-red-500 transition-colors ml-2"
                                                                title="Delete Booking"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-neutral-400">
                                                        {booking.status === 'cancelled' || booking.status === 'CANCELLED' ? (
                                                            booking.refunded
                                                                ? <span className="text-emerald-400 font-bold">Refunded</span>
                                                                : <span className="text-neutral-500">No refund</span>
                                                        ) : (
                                                            <span className="text-neutral-500">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Pricing/Coupons Component Integration */}
                        {currentTab === 'pricing' && <PricingRuleManager />}
                        {currentTab === 'coupons' && <CouponManager />}

                        {/* ─── Food Tab ─── */}
                        {currentTab === 'food' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold">Food & Snacks Menu</h3>
                                    <button
                                        onClick={() => { setEditingFoodId(null); setNewFoodItem({ name: '', description: '', price: 0, category: 'Snacks', imageUrl: '', isVeg: true, calories: 0, allergens: '' }); setShowFoodModal(true); }}
                                        className="px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-bold flex items-center gap-2 hover:bg-emerald-400 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Add Item
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {foodItems.map(item => (
                                        <div key={item.id} className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden group hover:border-emerald-500/30 transition-colors">
                                            <div className="h-48 overflow-hidden relative">
                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                <div className="absolute top-4 left-4">
                                                    <span className={cn(
                                                        "px-2 py-1 text-[10px] font-bold rounded-md border",
                                                        item.isVeg ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                                    )}>
                                                        {item.isVeg ? 'VEG' : 'NON-VEG'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-lg text-white">{item.name}</h4>
                                                    <span className="text-emerald-500 font-bold">₹{item.price}</span>
                                                </div>
                                                <p className="text-sm text-neutral-500 mb-4 line-clamp-2">{item.description}</p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-neutral-400 bg-white/5 px-2 py-1 rounded-md uppercase font-bold tracking-wider">{item.category}</span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => { setEditingFoodId(item.id); setNewFoodItem(item); setShowFoodModal(true); }}
                                                            className="p-2 rounded-lg hover:bg-emerald-500/10 text-neutral-400 hover:text-emerald-500 transition-colors"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteFoodItem(item.id)}
                                                            className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ─── Support Tab ─── */}
                        {currentTab === 'support' && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-16rem)] overflow-hidden">
                                {/* Ticket List */}
                                <div className="lg:col-span-4 bg-neutral-900/50 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
                                    <div className="p-4 border-b border-white/5 bg-neutral-900/50">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-neutral-500">Tickets</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {adminTickets.length === 0 ? (
                                            <div className="p-10 text-center text-neutral-600">No tickets today.</div>
                                        ) : adminTickets.map(t => (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedAdminTicket(t)}
                                                className={cn(
                                                    "p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5",
                                                    selectedAdminTicket?.id === t.id ? "bg-purple-500/10 border-r-2 border-r-purple-500" : ""
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-tighter">#{t.id}</span>
                                                    <span className={cn(
                                                        "text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider",
                                                        t.status === 'OPEN' ? "border-blue-500/30 text-blue-400" :
                                                            t.status === 'RESOLVED' ? "border-emerald-500/30 text-emerald-400" : "border-neutral-700 text-neutral-500"
                                                    )}>{t.status}</span>
                                                </div>
                                                <h4 className="font-bold text-sm truncate text-white">{t.subject}</h4>
                                                <p className="text-[10px] text-neutral-500 truncate">{t.user?.name || 'Unknown'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Ticket Details */}
                                <div className="lg:col-span-8 bg-neutral-900/50 border border-white/5 rounded-3xl overflow-hidden flex flex-col relative">
                                    {selectedAdminTicket ? (
                                        <>
                                            <div className="p-6 border-b border-white/5 bg-neutral-900 flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-black italic uppercase text-lg text-white">{selectedAdminTicket.subject}</h3>
                                                    <p className="text-xs text-neutral-500">From: {selectedAdminTicket.user?.name} ({selectedAdminTicket.user?.email})</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <select
                                                        value={selectedAdminTicket.status}
                                                        onChange={(e) => handleUpdateTicketStatus(selectedAdminTicket.id, e.target.value)}
                                                        className="bg-neutral-800 border border-white/10 rounded-xl px-3 h-10 text-xs font-bold text-white outline-none focus:border-purple-500/50"
                                                    >
                                                        <option value="OPEN">Open</option>
                                                        <option value="IN_PROGRESS">In Progress</option>
                                                        <option value="RESOLVED">Resolved</option>
                                                        <option value="CLOSED">Closed</option>
                                                    </select>
                                                    {user?.role === 'super_admin' && (
                                                        <button
                                                            onClick={() => handleDeleteTicket(selectedAdminTicket.id)}
                                                            className="flex items-center gap-1 px-3 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold uppercase tracking-wider"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                                {/* Original Ticket */}
                                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-[10px] font-black uppercase text-purple-400">Original Request</span>
                                                        <span className="text-[10px] text-neutral-600">• {format(new Date(selectedAdminTicket.createdAt), 'MMM dd, hh:mm a')}</span>
                                                    </div>
                                                    <p className="text-sm text-neutral-300 leading-relaxed">{selectedAdminTicket.message}</p>
                                                </div>

                                            {selectedAdminTicket.replies?.map((r: AdminTicketReply) => {
                                                    const isAdminSender = r.sender?.role === 'admin';
                                                    const senderName = r.sender?.name ?? 'Support';

                                                    return (
                                                        <div
                                                            key={r.id}
                                                            className={cn(
                                                                "flex flex-col gap-1",
                                                                isAdminSender ? "items-end" : "items-start"
                                                            )}
                                                        >
                                                            <div
                                                                className={cn(
                                                                    "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                                                                    isAdminSender
                                                                        ? "bg-purple-600 text-white rounded-tr-none"
                                                                        : "bg-white/5 border border-white/5 text-neutral-300 rounded-tl-none"
                                                                )}
                                                            >
                                                                {r.message}
                                                            </div>
                                                            <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest px-1">
                                                                {senderName} • {format(new Date(r.createdAt), 'hh:mm a')}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {selectedAdminTicket.status !== 'CLOSED' && (
                                                <div className="p-6 border-t border-white/5 bg-neutral-900">
                                                    <div className="relative">
                                                        <textarea
                                                            value={adminReplyMessage}
                                                            onChange={(e) => setAdminReplyMessage(e.target.value)}
                                                            placeholder="Type your response..."
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pr-14 text-sm text-white focus:border-purple-500/50 outline-none resize-none h-20"
                                                        />
                                                        <button
                                                            onClick={() => handleAdminAddReply(selectedAdminTicket.id)}
                                                            className="absolute bottom-3 right-3 w-10 h-10 bg-purple-600 hover:bg-purple-500 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-purple-600/20"
                                                        >
                                                            <Send className="w-5 h-5 text-white" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-neutral-700">
                                            <Headset className="w-16 h-16 mb-4 opacity-20" />
                                            <p className="font-black italic uppercase tracking-tighter">Select a ticket to respond</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Modals ─── */}
                <AnimatePresence>
                    {/* Theater Modal */}
                    {showTheaterModal && (
                        <Modal onClose={() => setShowTheaterModal(false)} title="Add New Theater">
                            <div className="space-y-4">
                                <input
                                    className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white"
                                    placeholder="Theater Name"
                                    value={newTheater.name} onChange={e => setNewTheater({ ...newTheater, name: e.target.value })}
                                />
                                <input
                                    className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white"
                                    placeholder="Location"
                                    value={newTheater.location} onChange={e => setNewTheater({ ...newTheater, location: e.target.value })}
                                />
                                <button onClick={handleCreateTheater} className="w-full py-3 rounded-xl bg-emerald-500 text-neutral-950 font-bold">Create Theater</button>
                            </div>
                        </Modal>
                    )}

                    {/* Screen Modal (Simplified) */}
                    {showScreenModal && (
                        <Modal onClose={() => setShowScreenModal(false)} title="Add Screen">
                            <div className="space-y-4 overflow-y-auto max-h-[80vh] pr-2 custom-scrollbar">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Name</label>
                                    <input
                                        className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white"
                                        placeholder="Screen Name (e.g. Screen 1)"
                                        value={newScreenName} onChange={e => setNewScreenName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-4 p-4 rounded-xl bg-neutral-950 border border-white/5">
                                    <p className="text-xs font-bold text-neutral-500 uppercase">Default Seat Layout</p>

                                    <div>
                                        <label className="block text-[10px] font-bold text-neutral-600 mb-1 uppercase">Columns</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 rounded-lg bg-neutral-900 border border-white/10 text-white text-sm"
                                            value={seatCols}
                                            onChange={e => setSeatCols(Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-neutral-600 mb-1 uppercase">Tiers</label>
                                        {seatTiers.map((tier, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-white/5 p-2 rounded-lg">
                                                <div className="col-span-5">
                                                    <input
                                                        className="w-full bg-transparent border-b border-white/10 text-xs text-white p-1"
                                                        value={tier.name}
                                                        onChange={e => {
                                                            const newTiers = [...seatTiers];
                                                            newTiers[idx].name = e.target.value;
                                                            setSeatTiers(newTiers);
                                                        }}
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-transparent border-b border-white/10 text-xs text-white p-1"
                                                        value={tier.rows}
                                                        onChange={e => {
                                                            const newTiers = [...seatTiers];
                                                            newTiers[idx].rows = Number(e.target.value);
                                                            setSeatTiers(newTiers);
                                                        }}
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <input
                                                        type="number"
                                                        className="w-full bg-transparent border-b border-white/10 text-xs text-white p-1"
                                                        value={tier.price}
                                                        onChange={e => {
                                                            const newTiers = [...seatTiers];
                                                            newTiers[idx].price = Number(e.target.value);
                                                            setSeatTiers(newTiers);
                                                        }}
                                                    />
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button
                                                        onClick={() => setSeatTiers(seatTiers.filter((_, i) => i !== idx))}
                                                        className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setSeatTiers([...seatTiers, { name: 'New Tier', rows: 1, price: 100 }])}
                                            className="w-full py-2 border border-dashed border-white/10 rounded-lg text-[10px] text-neutral-500 hover:text-white hover:border-white/20 transition-all"
                                        >
                                            + Add Tier
                                        </button>
                                    </div>
                                </div>

                                <button onClick={() => selectedTheaterId && handleAddScreen(selectedTheaterId)} className="w-full py-3 rounded-xl bg-emerald-500 text-neutral-950 font-bold">Add Screen</button>
                            </div>
                        </Modal>
                    )}

                    {/* Movie Modal */}
                    {showMovieModal && (
                        <Modal onClose={() => setShowMovieModal(false)} title={editingMovie ? "Edit Movie" : "Add Movie"}>
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                                <input className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" placeholder="Title" value={newMovie.title} onChange={e => setNewMovie({ ...newMovie, title: e.target.value })} />
                                <textarea className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" placeholder="Description" rows={3} value={newMovie.description} onChange={e => setNewMovie({ ...newMovie, description: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" placeholder="Genre" value={newMovie.genre} onChange={e => setNewMovie({ ...newMovie, genre: e.target.value })} />
                                    <input className="p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" type="number" placeholder="Duration (mins)" value={newMovie.duration} onChange={e => setNewMovie({ ...newMovie, duration: Number(e.target.value) })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Poster</label>
                                        <input className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white mb-2" placeholder="Poster URL" value={newMovie.posterUrl} onChange={e => setNewMovie({ ...newMovie, posterUrl: e.target.value })} />
                                        <input type="file" className="text-xs text-neutral-500" onChange={e => handleFileUpload(e, 'posterUrl', !!editingMovie)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Banner</label>
                                        <input className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white mb-2" placeholder="Banner URL" value={newMovie.bannerUrl} onChange={e => setNewMovie({ ...newMovie, bannerUrl: e.target.value })} />
                                        <input type="file" className="text-xs text-neutral-500" onChange={e => handleFileUpload(e, 'bannerUrl', !!editingMovie)} />
                                    </div>
                                </div>
                                <input className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" placeholder="Trailer URL (YouTube embed or share link)" value={newMovie.trailerUrl || ''} onChange={e => setNewMovie({ ...newMovie, trailerUrl: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" placeholder="Language" value={newMovie.language} onChange={e => setNewMovie({ ...newMovie, language: e.target.value })} />
                                    <input className="p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" placeholder="Rating (e.g. PG-13)" value={newMovie.rating} onChange={e => setNewMovie({ ...newMovie, rating: e.target.value })} />
                                </div>
                                <button onClick={handleSaveMovie} className="w-full py-3 rounded-xl bg-emerald-500 text-neutral-950 font-bold">Save Movie</button>
                            </div>
                        </Modal>
                    )}

                    {/* Showtime Modal */}
                    {showShowtimeModal && (
                        <Modal onClose={() => setShowShowtimeModal(false)} title="Schedule Showtime">
                            <div className="space-y-4">
                                <select
                                    className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white"
                                    onChange={e => setNewShowtime({ ...newShowtime, movieId: Number(e.target.value) })}
                                >
                                    <option value="">Select Movie</option>
                                    {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                                </select>
                                <select
                                    className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white"
                                    onChange={e => {
                                        const sId = Number(e.target.value);
                                        setNewShowtime({ ...newShowtime, screenId: sId });
                                        if (sId) handleScreenSelect(sId);
                                    }}
                                >
                                    <option value="">Select Screen</option>
                                    {theaters.flatMap(t => t.screens || []).map(s => <option key={s.id} value={s.id}>{s.name} ({theaters.find(t => t.id === s.theaterId)?.name})</option>)}
                                </select>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="date" className="p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" onChange={e => setNewShowtimeDate(e.target.value)} />
                                    <input type="time" className="p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" onChange={e => setNewShowtimeTime(e.target.value)} />
                                </div>
                                <div className="p-3 rounded-xl bg-neutral-950 border border-white/10">
                                    <p className="text-xs text-neutral-500 mb-2 uppercase font-bold">Base Prices (Overrides)</p>
                                    {selectedScreenTiers.length > 0 ? (
                                        selectedScreenTiers.map(tier => (
                                            <div key={tier.name} className="flex justify-between items-center mb-2 last:mb-0">
                                                <span className="text-sm text-white">{tier.name}</span>
                                                <input
                                                    type="number"
                                                    className="w-24 p-1 rounded bg-neutral-900 border border-white/10 text-white text-right"
                                                    placeholder={String(tier.price)}
                                                    value={newShowtime.tierPrices[tier.name] || ''}
                                                    onChange={e => setNewShowtime(prev => ({
                                                        ...prev,
                                                        tierPrices: { ...prev.tierPrices, [tier.name]: Number(e.target.value) }
                                                    }))}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-red-500 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                            Please select a screen to configure pricing.
                                        </p>
                                    )}
                                </div>
                                <button onClick={handleCreateShowtime} className="w-full py-3 rounded-xl bg-emerald-500 text-neutral-950 font-bold">Schedule</button>
                            </div>
                        </Modal>
                    )}
                </AnimatePresence>

                {/* Notification Modal */}
                <AnimatePresence>
                    {notifUserId !== null && (
                        <Modal onClose={() => setNotifUserId(null)} title={notifUserId === -1 ? "Broadcast Message" : "Send Notification"}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Title</label>
                                    <input
                                        className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white font-bold"
                                        placeholder="Notification Title"
                                        value={notifForm.title}
                                        onChange={e => setNotifForm({ ...notifForm, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Message</label>
                                    <textarea
                                        className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white resize-none h-32"
                                        placeholder="Type your message here..."
                                        value={notifForm.message}
                                        onChange={e => setNotifForm({ ...notifForm, message: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Type</label>
                                        <select
                                            className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white"
                                            value={notifForm.type}
                                            onChange={e => setNotifForm({ ...notifForm, type: e.target.value as 'info' | 'success' | 'warning' | 'error' })}
                                        >
                                            <option value="info">Info</option>
                                            <option value="success">Success</option>
                                            <option value="warning">Warning</option>
                                            <option value="error">Error</option>
                                        </select>
                                    </div>
                                    {notifUserId === -1 && (
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Audience</label>
                                            <select
                                                className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white"
                                                value={notifForm.audience}
                                                onChange={e => setNotifForm({ ...notifForm, audience: e.target.value })}
                                            >
                                                <option value="users">All Users</option>
                                                <option value="admins">All Admins</option>
                                                <option value="everyone">Everyone</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setNotifUserId(null)}
                                        className="flex-1 py-3 rounded-xl bg-neutral-800 text-white font-bold hover:bg-neutral-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSendNotification}
                                        disabled={isSendingNotif || !notifForm.title || !notifForm.message}
                                        className="flex-1 py-3 rounded-xl bg-emerald-500 text-neutral-950 font-bold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isSendingNotif ? 'Sending...' : 'Send'}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )}
                </AnimatePresence>

                {/* Commission Modal */}
                <AnimatePresence>
                    {editingCommissionUser && (
                        <Modal onClose={() => setEditingCommissionUser(null)} title="Update Commission Rate">
                            <div className="space-y-4">
                                <p className="text-sm text-neutral-400">Set platform commission percentage for <strong className="text-white">{editingCommissionUser.name}</strong>.</p>
                                <input
                                    type="number"
                                    className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white"
                                    placeholder="Rate %"
                                    value={newCommissionRate}
                                    onChange={e => setNewCommissionRate(Number(e.target.value))}
                                />
                                <button onClick={handleUpdateCommission} className="w-full py-3 rounded-xl bg-emerald-500 text-neutral-950 font-bold">Update Rate</button>
                            </div>
                        </Modal>
                    )}
                </AnimatePresence>

                {/* Request Movie Modal */}
                <AnimatePresence>
                    {showRequestModal && (
                        <Modal onClose={() => setShowRequestModal(false)} title="Request New Movie">
                            <div className="space-y-4">
                                <input
                                    className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white"
                                    placeholder="Movie Title"
                                    value={requestMovieName}
                                    onChange={e => setRequestMovieName(e.target.value)}
                                />
                                <textarea
                                    className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white resize-none"
                                    placeholder="Additional Notes (Optional)"
                                    rows={3}
                                    value={requestNotes}
                                    onChange={e => setRequestNotes(e.target.value)}
                                />
                                <button onClick={handleRequestMovie} className="w-full py-3 rounded-xl bg-emerald-500 text-neutral-950 font-bold">Submit Request</button>
                            </div>
                        </Modal>
                    )}

                    {/* Food Modal */}
                    {showFoodModal && (
                        <Modal onClose={() => setShowFoodModal(false)} title={editingFoodId ? "Edit Food Item" : "Add Food Item"}>
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Name</label>
                                    <input className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" placeholder="Item Name" value={newFoodItem.name} onChange={e => setNewFoodItem({ ...newFoodItem, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Description</label>
                                    <textarea className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" placeholder="Description" rows={3} value={newFoodItem.description} onChange={e => setNewFoodItem({ ...newFoodItem, description: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Price (₹)</label>
                                        <input className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" type="number" placeholder="Price" value={newFoodItem.price} onChange={e => setNewFoodItem({ ...newFoodItem, price: Number(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Category</label>
                                        <select className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" value={newFoodItem.category} onChange={e => setNewFoodItem({ ...newFoodItem, category: e.target.value })}>
                                            <option value="Snacks">Snacks</option>
                                            <option value="Beverages">Beverages</option>
                                            <option value="Desserts">Desserts</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Image URL</label>
                                    <input className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" placeholder="Image URL" value={newFoodItem.imageUrl} onChange={e => setNewFoodItem({ ...newFoodItem, imageUrl: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Type</label>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setNewFoodItem({ ...newFoodItem, isVeg: true })}
                                                className={cn("flex-1 py-2 rounded-lg text-xs font-bold border transition-colors", newFoodItem.isVeg ? "bg-green-500/20 border-green-500 text-green-500" : "bg-neutral-950 border-white/10 text-neutral-500")}
                                            >
                                                VEG
                                            </button>
                                            <button 
                                                onClick={() => setNewFoodItem({ ...newFoodItem, isVeg: false })}
                                                className={cn("flex-1 py-2 rounded-lg text-xs font-bold border transition-colors", !newFoodItem.isVeg ? "bg-red-500/20 border-red-500 text-red-500" : "bg-neutral-950 border-white/10 text-neutral-500")}
                                            >
                                                NON-VEG
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Calories</label>
                                        <input className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" type="number" placeholder="Kcal" value={newFoodItem.calories} onChange={e => setNewFoodItem({ ...newFoodItem, calories: Number(e.target.value) })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Allergens</label>
                                    <input className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white" placeholder="e.g. Milk, Gluten" value={newFoodItem.allergens} onChange={e => setNewFoodItem({ ...newFoodItem, allergens: e.target.value })} />
                                </div>
                                <button onClick={handleSaveFoodItem} className="w-full py-3 rounded-xl bg-emerald-500 text-neutral-950 font-bold mt-4">Save Item</button>
                            </div>
                        </Modal>
                    )}
                </AnimatePresence>

                {/* Seat Generation Modal */}
                <AnimatePresence>
                    {genScreenId && (
                        <Modal onClose={() => setGenScreenId(null)} title="Generate Seat Layout">
                            <div className="space-y-4">
                                <p className="text-sm text-neutral-400">Configure layout for this screen. <strong>This will overwrite existing seats!</strong></p>

                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Columns</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 rounded-xl bg-neutral-950 border border-white/10 text-white"
                                        value={seatCols}
                                        onChange={e => setSeatCols(Number(e.target.value))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-neutral-500 mb-1 uppercase">Tiers</label>
                                    {seatTiers.map((tier, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-white/5 p-2 rounded-lg">
                                            <div className="col-span-5">
                                                <input
                                                    className="w-full bg-transparent border-b border-white/10 text-xs text-white p-1"
                                                    value={tier.name}
                                                    onChange={e => {
                                                        const newTiers = [...seatTiers];
                                                        newTiers[idx].name = e.target.value;
                                                        setSeatTiers(newTiers);
                                                    }}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border-b border-white/10 text-xs text-white p-1"
                                                    value={tier.rows}
                                                    onChange={e => {
                                                        const newTiers = [...seatTiers];
                                                        newTiers[idx].rows = Number(e.target.value);
                                                        setSeatTiers(newTiers);
                                                    }}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="number"
                                                    className="w-full bg-transparent border-b border-white/10 text-xs text-white p-1"
                                                    value={tier.price}
                                                    onChange={e => {
                                                        const newTiers = [...seatTiers];
                                                        newTiers[idx].price = Number(e.target.value);
                                                        setSeatTiers(newTiers);
                                                    }}
                                                />
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <button
                                                    onClick={() => setSeatTiers(seatTiers.filter((_, i) => i !== idx))}
                                                    className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setSeatTiers([...seatTiers, { name: 'New Tier', rows: 1, price: 100 }])}
                                        className="w-full py-2 border border-dashed border-white/10 rounded-lg text-xs text-neutral-500 hover:text-white hover:border-white/20 transition-all"
                                    >
                                        + Add Tier
                                    </button>
                                </div>

                                <button
                                    onClick={() => handleGenerateSeats(genScreenId)}
                                    className="w-full py-3 rounded-xl bg-emerald-500 text-neutral-950 font-bold"
                                >
                                    Generate Layout
                                </button>
                            </div>
                        </Modal>
                    )}
                </AnimatePresence>

            </main>
        </div >
    );
};

// Simple Modal Component
const Modal = ({ children, onClose, title }: { children: React.ReactNode, onClose: () => void, title: string }) => (
    <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
        <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-bold text-white text-lg">{title}</h3>
                <button onClick={onClose}><X className="w-5 h-5 text-neutral-400 hover:text-white" /></button>
            </div>
            <div className="p-6">{children}</div>
        </motion.div>
    </motion.div>
);

export default AdminDashboard;
