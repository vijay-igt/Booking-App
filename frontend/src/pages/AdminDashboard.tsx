import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Film,
    Calendar,
    Plus,
    MapPin,
    Clock,
    LogOut,
    Ticket as TicketIcon,
    ChevronLeft,
    Edit2,
    Trash2,
    Monitor,
    X,
    Star,
    Users,
    Bell,
    Wallet
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContextDefinition';
import { onMessageListener } from '../config/firebase';
import type { Movie, Theater, Showtime, Booking, User, WalletRequest, Seat, SeatTierConfig, DashboardStats } from '../types';
import { AxiosError } from 'axios';

// Types are imported from '../types'

const AdminDashboard: React.FC = () => {
    const [currentTab, setCurrentTab] = useState<'theaters' | 'movies' | 'showtimes' | 'bookings' | 'users' | 'wallet'>('theaters');
    const [walletRequests, setWalletRequests] = useState<WalletRequest[]>([]);
    const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
    const [theaters, setTheaters] = useState<Theater[]>([]);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [showtimes, setShowtimes] = useState<Showtime[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [userPage, setUserPage] = useState(1);
    const [userTotalPages, setUserTotalPages] = useState(1);
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [usersWithWallets, setUsersWithWallets] = useState<User[]>([]);
    const auth = useAuth();
    const navigate = useNavigate();
    const { subscribe } = useWebSocket();

    const [newTheater, setNewTheater] = useState({ name: '', location: '' });
    const [newMovie, setNewMovie] = useState<Partial<Movie>>({
        title: '', description: '', genre: '', duration: 120, rating: '', posterUrl: '', bannerUrl: '', releaseDate: '', language: '', audio: '', format: 'IMAX 2D'
    });
    const [newShowtime, setNewShowtime] = useState({ movieId: 0, screenId: 0, startTime: '', endTime: '', tierPrices: {} as Record<string, number> });
    const [newShowtimeDate, setNewShowtimeDate] = useState('');
    const [newShowtimeTime, setNewShowtimeTime] = useState('');
    const [selectedScreenTiers, setSelectedScreenTiers] = useState<string[]>([]);
    const [newScreenName, setNewScreenName] = useState('');
    const [selectedTheaterId, setSelectedTheaterId] = useState<number | null>(null);
    const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
    const [editingScreen, setEditingScreen] = useState<{ id: number, name: string } | null>(null);
    const [genScreenId, setGenScreenId] = useState<number | null>(null);
    const [seatTiers, setSeatTiers] = useState<{ name: string; rows: number; price: number }[]>([
        { name: 'Classic', rows: 5, price: 150 }
    ]);
    const [seatCols, setSeatCols] = useState(10);

    const [notifUserId, setNotifUserId] = useState<number | null>(null);
    const [notifForm, setNotifForm] = useState({ title: '', message: '', type: 'info', audience: 'users' });
    const [isSendingNotif, setIsSendingNotif] = useState(false);

    // Request Movie State
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestMovieName, setRequestMovieName] = useState('');
    const [requestNotes, setRequestNotes] = useState('');

    // Commission Management State
    const [editingCommissionUser, setEditingCommissionUser] = useState<User | null>(null);
    const [newCommissionRate, setNewCommissionRate] = useState<number>(0);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

    const fetchDashboardStats = useCallback(async () => {
        try {
            const response = await api.get('/admin/stats');
            setDashboardStats(response.data);
        } catch (error: unknown) { console.error(error) }
    }, []);

    useEffect(() => {
        const unsubscribe = onMessageListener((payload) => {
            console.log('[AdminDashboard] Foreground notification received:', payload);
        });
        return () => unsubscribe();
    }, []);

    const fetchBookings = useCallback(async () => {
        try {
            const response = await api.get('/admin/bookings');
            setBookings(response.data);
        } catch (error: unknown) { console.error(error); }
    }, []);

    const fetchTheaters = useCallback(async () => {
        try {
            const response = await api.get('/admin/theaters');
            setTheaters(response.data);
        } catch (error: unknown) { console.error(error); }
    }, []);

    const fetchMovies = useCallback(async () => {
        try {
            // Fetch all movies so admins can schedule showtimes for any movie
            const response = await api.get(`/movies`);
            setMovies(response.data);
        } catch (error: unknown) { console.error(error); }
    }, []);

    const fetchShowtimes = useCallback(async () => {
        try {
            const response = await api.get('/admin/showtimes');
            setShowtimes(response.data);
        } catch (error: unknown) { console.error(error); }
    }, []);

    const fetchWalletRequests = useCallback(async () => {
        try {
            const response = await api.get('/wallet/admin/requests');
            setWalletRequests(response.data);
            setPendingRequestsCount(response.data.length);
        } catch (error: unknown) { console.error(error); }
    }, []);

    const handleApproveRequest = async (requestId: number) => {
        try {
            await api.post(`/wallet/admin/approve/${requestId}`);
            fetchWalletRequests();
            fetchUsersWithWallets(); // Refresh users with wallets after approval
        } catch (error: unknown) { console.error(error) }
    };

    const handleRejectRequest = async (requestId: number) => {
        try {
            await api.post(`/wallet/admin/reject/${requestId}`);
            fetchWalletRequests();
        } catch (error: unknown) { console.error(error) }
    };

    const fetchUsers = useCallback(async () => {
        setIsUsersLoading(true);
        try {
            const response = await api.get('/admin/users', {
                params: {
                    page: userPage,
                    limit: 10,
                    search: userSearch,
                    role: userRoleFilter
                }
            });
            // Handle both old array format (fallback) and new paginated format
            if (Array.isArray(response.data)) {
                setUsers(response.data);
            } else {
                setUsers(response.data.users);
                setUserTotalPages(response.data.totalPages);
            }
        } catch (error: unknown) { console.error(error) }
        finally { setIsUsersLoading(false); }
    }, [userPage, userSearch, userRoleFilter]);

    const fetchUsersWithWallets = useCallback(async () => {
        try {
            const response = await api.get('/wallet/admin/users');
            setUsersWithWallets(response.data);
        } catch (error: unknown) { console.error(error) }
    }, []);

    useEffect(() => {
        fetchTheaters();
        fetchMovies();
        fetchShowtimes();
        fetchBookings();
        fetchDashboardStats();

        if (auth.user?.role === 'super_admin') {
            fetchUsers();
            fetchWalletRequests();
            fetchUsersWithWallets(); // Fetch users with wallets on initial load
        }

        if (auth.user?.role === 'super_admin') {
            // Rely on WebSockets for real-time updates instead of polling
            const unsubscribe = subscribe('ADMIN_TOPUP_REQUEST', () => {
                console.log('[AdminDashboard] New top-up request received via WebSocket, refreshing...');
                fetchWalletRequests();
            });

            return () => unsubscribe();
        }
    }, [fetchTheaters, fetchMovies, fetchShowtimes, fetchBookings, fetchUsers, fetchWalletRequests, fetchUsersWithWallets, fetchDashboardStats, auth.user?.role, subscribe]);

    useEffect(() => {
        if (currentTab === 'wallet') {
            fetchUsersWithWallets();
        }
    }, [currentTab, fetchUsersWithWallets]);

    useEffect(() => {
        if (!genScreenId) return; // Don't fetch if modal is closed

        // Reset to defaults first
        setSeatTiers([{ name: 'Classic', rows: 5, price: 150 }]);
        setSeatCols(10);

        const fetchLayout = async () => {
            try {
                const response = await api.get(`/admin/seats/${genScreenId}`);
                const seats: Seat[] = response.data;

                if (seats && seats.length > 0) {
                    const maxCol = Math.max(...seats.map((s: Seat) => s.number));
                    setSeatCols(maxCol);

                    const uniqueRows = [...new Set(seats.map((s: Seat) => s.row))].sort();
                    const rowConfig = new Map<string, { type: string; price: number }>();
                    seats.forEach((s: Seat) => {
                        if (!rowConfig.has(s.row)) {
                            rowConfig.set(s.row, { type: s.type, price: s.price });
                        }
                    });

                    const reconstructedTiers: SeatTierConfig[] = [];
                    let currentType = '';
                    let currentPrice = 0;
                    let currentRowCount = 0;

                    const getRowIdx = (r: string) => r.charCodeAt(0) - 65;
                    uniqueRows.sort((a: string, b: string) => getRowIdx(a) - getRowIdx(b));

                    uniqueRows.forEach((row: string) => {
                        const config = rowConfig.get(row);
                        if (config && (config.type !== currentType || config.price !== currentPrice)) {
                            if (currentType) {
                                reconstructedTiers.push({
                                    name: currentType,
                                    rows: currentRowCount,
                                    price: currentPrice
                                });
                            }
                            currentType = config.type;
                            currentPrice = config.price;
                            currentRowCount = 1;
                        } else if (config) {
                            currentRowCount++;
                        }
                    });

                    if (currentType) {
                        reconstructedTiers.push({
                            name: currentType,
                            rows: currentRowCount,
                            price: currentPrice
                        });
                    }

                    if (reconstructedTiers.length > 0) {
                        setSeatTiers(reconstructedTiers);
                    }
                }
            } catch (error: unknown) {
                console.error("Failed to fetch layout", error);
            }
        };

        fetchLayout();
    }, [genScreenId]);

    const handleCreateTheater = async () => {
        if (!newTheater.name || !newTheater.location) return;
        try {
            await api.post('/admin/theaters', newTheater);
            setNewTheater({ name: '', location: '' });
            fetchTheaters();
            alert('Theater created successfully! Please remember to add screens and configure seat layouts for this new location.');
        } catch (error: unknown) { console.error(error) }
    };

    const handleDeleteTheater = async (id: number) => {
        if (!window.confirm('Delete this theater?')) return;
        try {
            await api.delete(`/admin/theaters/${id}`);
            fetchTheaters();
        } catch (error: unknown) { console.error(error) }
    };

    const handleAddScreen = async (theaterId: number) => {
        if (!newScreenName) return;
        try {
            await api.post(`/admin/screens`, { theaterId, name: newScreenName });
            setNewScreenName('');
            setSelectedTheaterId(null);
            fetchTheaters();
        } catch (error: unknown) { console.error(error) }
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

    const handleCreateMovie = async () => {
        try {
            await api.post('/admin/movies', newMovie);
            setNewMovie({ title: '', description: '', genre: '', duration: 120, rating: '', posterUrl: '', bannerUrl: '', releaseDate: '', language: '', audio: '', format: 'IMAX 2D' });
            fetchMovies();
        } catch (error: unknown) { console.error(error) }
    };

    const handleUpdateMovie = async () => {
        if (!editingMovie) return;
        try {
            await api.put(`/admin/movies/${editingMovie.id}`, editingMovie);
            setEditingMovie(null);
            fetchMovies();
        } catch (error: unknown) { console.error(error) }
    };

    const handleDeleteMovie = async (id: number) => {
        if (!window.confirm('Delete this movie?')) return;
        try {
            await api.delete(`/admin/movies/${id}`);
            fetchMovies();
        } catch (error: unknown) { console.error(error) }
    };

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

            setNewShowtime({ movieId: 0, screenId: 0, startTime: '', endTime: '', tierPrices: {} });
            setNewShowtimeDate('');
            setNewShowtimeTime('');
            setSelectedScreenTiers([]);
            fetchShowtimes();
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
            setSelectedScreenTiers(response.data);
            setNewShowtime({ ...newShowtime, screenId, tierPrices: {} });
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
        auth.logout();
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

    const tabs = [
        { id: 'theaters' as const, label: 'Theaters', icon: LayoutDashboard },
        { id: 'movies' as const, label: 'Movies', icon: Film },
        ...(auth.user?.role !== 'super_admin' ? [{ id: 'showtimes' as const, label: 'Showtimes', icon: Calendar }] : []),
        { id: 'bookings' as const, label: 'Bookings', icon: TicketIcon },
        ...(auth.user?.role === 'super_admin' ? [{ id: 'users' as const, label: 'Users', icon: Users }] : []),
        ...(auth.user?.role === 'super_admin' ? [{ id: 'wallet' as const, label: 'Wallet', icon: Wallet }] : [])
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-white pb-8">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-5 py-5">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05, x: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/')}
                                className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/10 transition-colors"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </motion.button>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">System Management</p>
                                </div>
                            </div>
                        </div>

                        {auth.user?.role === 'super_admin' && dashboardStats && 'totalRevenue' in dashboardStats ? (
                            <>
                                <div className="text-right">
                                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Total Revenue</p>
                                    <p className="text-xl font-bold text-emerald-500">₹{Number(dashboardStats.totalRevenue).toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Total Owners</p>
                                    <p className="text-xl font-bold text-white">{dashboardStats.totalOwners}</p>
                                </div>
                            </>
                        ) : (auth.user?.role !== 'super_admin' && dashboardStats && 'totalBookings' in dashboardStats) ? (
                            <>
                                <div className="text-right">
                                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Total Bookings</p>
                                    <p className="text-xl font-bold text-white">{dashboardStats.totalBookings}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Total Earnings</p>
                                    <p className="text-xl font-bold text-emerald-500">₹{Number(dashboardStats.totalEarnings).toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Commission Paid</p>
                                    <p className="text-xl font-bold text-amber-500">₹{Number(dashboardStats.commissionPaid).toFixed(2)}</p>
                                </div>
                            </>
                        ) : null}

                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex flex-col items-end mr-2">
                                <p className="text-sm font-semibold">{auth.user?.name}</p>
                                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Administrator</p>
                            </div>
                            <button
                                onClick={() => setCurrentTab('wallet')}
                                className="relative p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
                            >
                                <Bell className="w-5 h-5" />
                                {pendingRequestsCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                        {pendingRequestsCount}
                                    </span>
                                )}
                            </button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleLogout}
                                className="w-12 h-12 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = currentTab === tab.id;
                            return (
                                <motion.button
                                    key={tab.id}
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setCurrentTab(tab.id)}
                                    className={`relative flex items-center gap-2.5 px-6 py-3 rounded-2xl whitespace-nowrap transition-all duration-300 ${isActive
                                        ? 'text-white'
                                        : 'text-neutral-500 hover:text-neutral-300'
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20"
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <Icon className={`relative z-10 w-4.5 h-4.5 ${isActive ? 'text-white' : ''}`} />
                                    <span className="relative z-10 text-sm font-bold">{tab.label}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-5 py-8">
                <AnimatePresence mode="wait">
                    {/* THEATERS TAB */}
                    {currentTab === 'theaters' && (
                        <motion.div
                            key="theaters"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid lg:grid-cols-[400px_1fr] gap-8"
                        >
                            {/* Create Theater Form - Only for Theater Owners */}
                            {auth.user?.role !== 'super_admin' && (
                                <div className="space-y-6">
                                    <div className="rounded-3xl bg-neutral-900 border border-white/5 p-6 space-y-6 sticky top-44">
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                                    <Plus className="w-4 h-4 text-emerald-500" />
                                                </div>
                                                Add Theater
                                            </h3>
                                            <p className="text-sm text-neutral-500">Register a new cinema location</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Theater Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Cineplex Downtown"
                                                    value={newTheater.name}
                                                    onChange={(e) => setNewTheater({ ...newTheater, name: e.target.value })}
                                                    className="w-full h-14 px-5 rounded-2xl bg-neutral-800 border border-transparent text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:bg-neutral-950 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Location</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600" />
                                                    <input
                                                        type="text"
                                                        placeholder="City, Area"
                                                        value={newTheater.location}
                                                        onChange={(e) => setNewTheater({ ...newTheater, location: e.target.value })}
                                                        className="w-full h-14 pl-12 pr-5 rounded-2xl bg-neutral-800 border border-transparent text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:bg-neutral-950 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleCreateTheater}
                                                className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors mt-2"
                                            >
                                                Create Theater
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Theater List */}
                            <div className="space-y-6">
                                {theaters.length === 0 ? (
                                    <div className="h-64 rounded-3xl border border-dashed border-white/5 flex flex-col items-center justify-center text-neutral-500 bg-neutral-900/50">
                                        <LayoutDashboard className="w-12 h-12 mb-3 opacity-20" />
                                        <p className="font-medium">No theaters registered yet</p>
                                    </div>
                                ) : (
                                    theaters.map((theater) => (
                                        <motion.div
                                            key={theater.id}
                                            layout
                                            className="rounded-3xl bg-neutral-900 border border-white/5 overflow-hidden group hover:border-emerald-500/20 transition-colors"
                                        >
                                            <div className="p-6">
                                                <div className="flex items-start justify-between mb-6">
                                                    <div className="space-y-1">
                                                        <h4 className="text-xl font-bold group-hover:text-emerald-400 transition-colors">{theater.name}</h4>
                                                        <div className="text-sm text-neutral-500 flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-md bg-neutral-800 flex items-center justify-center">
                                                                <MapPin className="w-3 h-3" />
                                                            </div>
                                                            {theater.location}
                                                        </div>
                                                        {auth.user?.role === 'super_admin' && theater.owner && (
                                                            <div className="text-sm text-neutral-500 flex items-center gap-2 pt-1">
                                                                <div className="w-5 h-5 rounded-md bg-neutral-800 flex items-center justify-center">
                                                                    <Users className="w-3 h-3" />
                                                                </div>
                                                                <span className="text-neutral-400">Owner:</span>
                                                                <span className="text-emerald-500 font-medium">{theater.owner.name}</span>
                                                                <span className="text-neutral-600 text-xs">({theater.owner.email})</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {auth.user?.role !== 'super_admin' && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleDeleteTheater(theater.id)}
                                                                className="w-10 h-10 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors"
                                                            >
                                                                <Trash2 className="w-4.5 h-4.5" />
                                                            </motion.button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Screens */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between px-1">
                                                        <h5 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Available Screens ({theater.screens?.length || 0})</h5>
                                                    </div>

                                                    <div className="grid sm:grid-cols-2 gap-3">
                                                        {theater.screens?.map((screen) => (
                                                            <motion.div
                                                                key={screen.id}
                                                                layout
                                                                className="group/screen flex items-center justify-between p-4 rounded-2xl bg-neutral-800 border border-transparent hover:border-emerald-500/30 hover:bg-neutral-800/80 transition-all"
                                                            >
                                                                {editingScreen?.id === screen.id ? (
                                                                    <div className="flex flex-1 gap-2">
                                                                        <input
                                                                            type="text"
                                                                            autoFocus
                                                                            value={editingScreen.name}
                                                                            onChange={(e) => setEditingScreen({ ...editingScreen, name: e.target.value })}
                                                                            className="flex-1 h-9 px-3 rounded-xl bg-neutral-900 border border-white/10 text-xs focus:outline-none focus:border-emerald-500/50"
                                                                        />
                                                                        <div className="flex gap-1">
                                                                            <button onClick={handleUpdateScreen} className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                                                                                <Plus className="w-3.5 h-3.5 rotate-45" style={{ transform: 'rotate(0deg)' }} />
                                                                                {/* Just using Plus as Placeholder for checkmark in lucide? No, I'll use text */}
                                                                                <span className="text-[10px] font-bold">OK</span>
                                                                            </button>
                                                                            <button onClick={() => setEditingScreen(null)} className="w-8 h-8 rounded-lg bg-neutral-700 text-white flex items-center justify-center">
                                                                                <X className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center group-hover/screen:border-emerald-500/20 transition-colors">
                                                                                <Monitor className="w-4 h-4 text-emerald-500/60" />
                                                                            </div>
                                                                            <span className="text-sm font-bold">{screen.name}</span>
                                                                        </div>
                                                                        {auth.user?.role !== 'super_admin' && (
                                                                            <div className="flex gap-1.5 opacity-0 group-hover/screen:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={() => setGenScreenId(screen.id)}
                                                                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold tracking-tight hover:bg-emerald-500/20 transition-colors"
                                                                                >
                                                                                    Layout
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => setEditingScreen({ id: screen.id, name: screen.name })}
                                                                                    className="w-8 h-8 rounded-lg bg-neutral-700 hover:bg-neutral-600 flex items-center justify-center transition-colors"
                                                                                >
                                                                                    <Edit2 className="w-3.5 h-3.5 text-neutral-300" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteScreen(screen.id)}
                                                                                    className="w-8 h-8 rounded-lg bg-red-400/5 hover:bg-red-400/10 flex items-center justify-center transition-colors"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </motion.div>
                                                        ))}

                                                        {/* Add Screen Inline */}
                                                        {auth.user?.role !== 'super_admin' && (
                                                            selectedTheaterId === theater.id ? (
                                                                <div className="flex items-center gap-2 p-3 rounded-2xl bg-neutral-800/40 border border-dashed border-white/10">
                                                                    <input
                                                                        type="text"
                                                                        autoFocus
                                                                        placeholder="Screen name..."
                                                                        value={newScreenName}
                                                                        onChange={(e) => setNewScreenName(e.target.value)}
                                                                        className="flex-1 h-10 px-3 rounded-xl bg-neutral-900 border border-transparent text-sm focus:outline-none focus:border-emerald-500/30"
                                                                    />
                                                                    <button onClick={() => handleAddScreen(theater.id)} className="px-4 h-10 rounded-xl bg-emerald-500 text-white text-xs font-bold">Add</button>
                                                                    <button onClick={() => { setSelectedTheaterId(null); setNewScreenName(''); }} className="w-10 h-10 rounded-xl bg-neutral-700 text-white flex items-center justify-center">
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <motion.button
                                                                    whileHover={{ scale: 1.01 }}
                                                                    whileTap={{ scale: 0.99 }}
                                                                    onClick={() => setSelectedTheaterId(theater.id)}
                                                                    className="flex items-center justify-center gap-2 p-4 rounded-2xl border border-dashed border-white/10 text-emerald-500/80 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-xs font-bold"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                    Add New Screen
                                                                </motion.button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* MOVIES TAB */}
                    {currentTab === 'movies' && (
                        <motion.div
                            key="movies"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`flex flex-col gap-6`}
                        >
                            {/* Request Movie Button for Regular Admins */}
                            {auth.user?.role !== 'super_admin' && (
                                <div className="flex justify-end">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setShowRequestModal(true)}
                                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-emerald-500/20"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Request Missing Movie
                                    </motion.button>
                                </div>
                            )}

                            <div className={`grid gap-8 ${auth.user?.role === 'super_admin' ? 'lg:grid-cols-[400px_1fr]' : 'grid-cols-1'}`}>
                                {/* Create Movie Form */}
                                {auth.user?.role === 'super_admin' && (
                                    <div className="space-y-6">
                                        <div className="rounded-3xl bg-neutral-900 border border-white/5 p-6 space-y-6 sticky top-44 max-h-[75vh] overflow-y-auto no-scrollbar">
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-bold flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                                        <Plus className="w-4 h-4 text-emerald-500" />
                                                    </div>
                                                    Add Movie
                                                </h3>
                                                <p className="text-sm text-neutral-500">Register a new film in the system</p>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Title</label>
                                                    <input type="text" placeholder="Movie Title" value={newMovie.title || ''} onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-neutral-800 border border-transparent text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:bg-neutral-950 transition-all" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Description</label>
                                                    <textarea placeholder="Plot summary..." value={newMovie.description || ''} onChange={(e) => setNewMovie({ ...newMovie, description: e.target.value })} className="w-full h-32 px-5 py-4 rounded-2xl bg-neutral-800 border border-transparent text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:bg-neutral-950 transition-all resize-none" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Genre</label>
                                                        <input type="text" placeholder="Action..." value={newMovie.genre || ''} onChange={(e) => setNewMovie({ ...newMovie, genre: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-transparent focus:border-emerald-500/50" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Mins</label>
                                                        <input type="number" placeholder="120" value={newMovie.duration || ''} onChange={(e) => setNewMovie({ ...newMovie, duration: parseInt(e.target.value) })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-transparent focus:border-emerald-500/50 text-center" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Rating</label>
                                                        <input type="text" placeholder="8.5" value={newMovie.rating || ''} onChange={(e) => setNewMovie({ ...newMovie, rating: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-transparent focus:border-emerald-500/50 text-center" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Date</label>
                                                        <input type="date" value={newMovie.releaseDate || ''} onChange={(e) => setNewMovie({ ...newMovie, releaseDate: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-transparent focus:border-emerald-500/50 text-xs" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Language</label>
                                                        <input type="text" placeholder="English" value={newMovie.language || ''} onChange={(e) => setNewMovie({ ...newMovie, language: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-transparent focus:border-emerald-500/50" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Audio</label>
                                                        <input type="text" placeholder="Dolby Atmos" value={newMovie.audio || ''} onChange={(e) => setNewMovie({ ...newMovie, audio: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-transparent focus:border-emerald-500/50" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Format</label>
                                                        <input type="text" placeholder="IMAX 2D" value={newMovie.format || ''} onChange={(e) => setNewMovie({ ...newMovie, format: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-transparent focus:border-emerald-500/50" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Poster URL</label>
                                                        <label className="text-xs text-emerald-500 cursor-pointer hover:text-emerald-400 font-bold">
                                                            Upload
                                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'posterUrl', false)} />
                                                        </label>
                                                    </div>
                                                    <input type="text" placeholder="https://..." value={newMovie.posterUrl || ''} onChange={(e) => setNewMovie({ ...newMovie, posterUrl: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-transparent focus:border-emerald-500/50" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Banner URL</label>
                                                        <label className="text-xs text-emerald-500 cursor-pointer hover:text-emerald-400 font-bold">
                                                            Upload
                                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bannerUrl', false)} />
                                                        </label>
                                                    </div>
                                                    <input type="text" placeholder="https://..." value={newMovie.bannerUrl || ''} onChange={(e) => setNewMovie({ ...newMovie, bannerUrl: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-transparent focus:border-emerald-500/50" />
                                                </div>
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleCreateMovie}
                                                    className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors mt-2"
                                                >
                                                    Create Movie
                                                </motion.button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Movie List */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    {movies.length === 0 ? (
                                        <div className="col-span-full h-64 rounded-3xl border border-dashed border-white/5 flex flex-col items-center justify-center text-neutral-500 bg-neutral-900/50">
                                            <Film className="w-12 h-12 mb-3 opacity-20" />
                                            <p className="font-medium">No movies added yet</p>
                                        </div>
                                    ) : (
                                        movies.map((movie) => (
                                            <motion.div
                                                key={movie.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="group relative rounded-3xl bg-neutral-900 border border-white/5 overflow-hidden hover:border-emerald-500/30 transition-all"
                                            >
                                                <div className="flex aspect-[1.8/1]">
                                                    <div className="w-1/3 relative overflow-hidden">
                                                        <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900"></div>
                                                    </div>
                                                    <div className="flex-1 p-5 space-y-3 flex flex-col justify-center">
                                                        <div className="space-y-1">
                                                            <h4 className="text-lg font-bold line-clamp-1 group-hover:text-emerald-400 transition-colors">{movie.title}</h4>
                                                            <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">{movie.description}</p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{movie.genre}</span>
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                                                                <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                                                <span className="text-[10px] font-bold text-amber-500">{movie.rating}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                                                                <Clock className="w-2.5 h-2.5 text-blue-400" />
                                                                <span className="text-[10px] font-bold text-blue-400">{movie.duration}m</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons Overlay */}
                                                {auth.user?.role === 'super_admin' && (
                                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => setEditingMovie(movie)}
                                                            className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-emerald-500 hover:border-emerald-500 transition-all"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => handleDeleteMovie(movie.id)}
                                                            className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-red-500 hover:border-red-500 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </motion.button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* SHOWTIMES TAB */}
                    {currentTab === 'showtimes' && (
                        <motion.div
                            key="showtimes"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid lg:grid-cols-[400px_1fr] gap-8"
                        >
                            {/* Create Showtime Form */}
                            <div className="space-y-6">
                                <div className="rounded-3xl bg-neutral-900 border border-white/5 p-6 space-y-6 sticky top-44 max-h-[75vh] overflow-y-auto no-scrollbar">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                                <Calendar className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            Add Showtime
                                        </h3>
                                        <p className="text-sm text-neutral-500">Schedule a movie screening</p>
                                    </div>

                                    <div className="space-y-4 text-sm">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Select Movie</label>
                                            <select value={newShowtime.movieId} onChange={(e) => setNewShowtime({ ...newShowtime, movieId: parseInt(e.target.value) })} className="w-full h-14 px-5 rounded-2xl bg-neutral-800 border border-transparent text-white focus:outline-none focus:border-emerald-500/50 focus:bg-neutral-950 appearance-none transition-all">
                                                <option value={0}>Choose a movie...</option>
                                                {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Select Screen</label>
                                            <select value={newShowtime.screenId} onChange={(e) => handleScreenSelect(parseInt(e.target.value))} className="w-full h-14 px-5 rounded-2xl bg-neutral-800 border border-transparent text-white focus:outline-none focus:border-emerald-500/50 focus:bg-neutral-950 appearance-none transition-all">
                                                <option value={0}>Choose a screen...</option>
                                                {theaters.flatMap(t => t.screens?.map(s => <option key={s.id} value={s.id}>{t.name} - {s.name}</option>))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Date</label>
                                                <input type="date" value={newShowtimeDate} onChange={(e) => setNewShowtimeDate(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-transparent focus:border-emerald-500/50 text-xs" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Time</label>
                                                <input type="time" value={newShowtimeTime} onChange={(e) => setNewShowtimeTime(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-transparent focus:border-emerald-500/50" />
                                            </div>
                                        </div>

                                        {selectedScreenTiers.length > 0 && (
                                            <div className="space-y-3 pt-2">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Tier Pricing</label>
                                                <div className="space-y-2">
                                                    {selectedScreenTiers.map(tier => (
                                                        <div key={tier} className="flex items-center justify-between p-4 rounded-2xl bg-neutral-800/50 border border-white/5">
                                                            <span className="font-bold text-neutral-300">{tier}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-neutral-500 font-bold">₹</span>
                                                                <input type="number" min="1" placeholder="0" value={newShowtime.tierPrices[tier] || ''} onChange={(e) => setNewShowtime({ ...newShowtime, tierPrices: { ...newShowtime.tierPrices, [tier]: parseFloat(e.target.value) } })} className="w-20 h-9 px-2 rounded-lg bg-neutral-900 border border-transparent focus:border-emerald-500/50 text-center font-bold text-emerald-400" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleCreateShowtime}
                                            className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors mt-2"
                                        >
                                            Create Showtime
                                        </motion.button>
                                    </div>
                                </div>
                            </div>

                            {/* Showtime List */}
                            <div className="space-y-4">
                                {showtimes.length === 0 ? (
                                    <div className="h-64 rounded-3xl border border-dashed border-white/5 flex flex-col items-center justify-center text-neutral-500 bg-neutral-900/50">
                                        <Clock className="w-12 h-12 mb-3 opacity-20" />
                                        <p className="font-medium">No showtimes scheduled</p>
                                    </div>
                                ) : (
                                    showtimes.map((showtime) => (
                                        <motion.div
                                            key={showtime.id}
                                            layout
                                            className="group relative rounded-3xl bg-neutral-900 border border-white/5 p-6 hover:border-emerald-500/30 hover:bg-neutral-900/80 transition-all"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex gap-5">
                                                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center shrink-0">
                                                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{new Date(showtime.startTime).toLocaleDateString([], { month: 'short' })}</span>
                                                        <span className="text-lg font-black text-emerald-400">{new Date(showtime.startTime).getDate()}</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h4 className="text-lg font-bold group-hover:text-emerald-400 transition-colors">{showtime.movie?.title}</h4>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                            <p className="text-sm text-neutral-500 flex items-center gap-2">
                                                                <MapPin className="w-3.5 h-3.5 text-emerald-500/60" />
                                                                {showtime.screen?.theater?.name} • {showtime.screen?.name}
                                                            </p>
                                                            <p className="text-sm text-neutral-400 flex items-center gap-2 font-semibold">
                                                                <Clock className="w-3.5 h-3.5 text-blue-400" />
                                                                {new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <motion.button
                                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleDeleteShowtime(showtime.id)}
                                                    className="w-10 h-10 rounded-xl bg-red-400/5 border border-red-400/10 flex items-center justify-center text-red-500 hover:bg-red-400/10 transition-colors"
                                                >
                                                    <Trash2 className="w-4.5 h-4.5" />
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* BOOKINGS TAB */}
                    {currentTab === 'bookings' && (
                        <motion.div
                            key="bookings"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-3"
                        >
                            {bookings.map((booking) => (
                                <div key={booking.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-bold mb-1">{booking.showtime?.movie?.title}</h4>
                                            <p className="text-xs text-neutral-500 mb-2">{booking.user?.name} ({booking.user?.email})</p>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <span className="px-2 py-1 rounded-lg bg-neutral-800">{booking.showtime?.screen?.theater?.name}</span>
                                                <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400">₹{booking.totalAmount}</span>
                                                <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400">{booking.status}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteBooking(booking.id)} className="w-9 h-9 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {currentTab === 'users' && (
                        <motion.div
                            key="users"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* Toolbar */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-neutral-900/50 p-4 rounded-3xl border border-white/5">
                                <div className="relative w-full sm:w-96">
                                    <input
                                        type="text"
                                        placeholder="Search users by name or email..."
                                        value={userSearch}
                                        onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                                        className="w-full h-12 pl-12 pr-4 rounded-2xl bg-neutral-800 border border-transparent focus:border-emerald-500/50 focus:bg-neutral-900 transition-all text-white placeholder:text-neutral-500"
                                    />
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <select
                                        value={userRoleFilter}
                                        onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1); }}
                                        className="h-12 px-4 rounded-2xl bg-neutral-800 border border-transparent focus:border-emerald-500/50 text-white cursor-pointer"
                                    >
                                        <option value="all">All Roles</option>
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>

                                    <button
                                        onClick={() => {
                                            setNotifUserId(-1); // -1 for Broadcast
                                            setNotifForm({ title: 'System Announcement', message: '', type: 'info', audience: 'users' });
                                        }}
                                        className="h-12 px-6 rounded-2xl bg-amber-500 text-white font-bold hover:bg-amber-400 transition-colors flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <Bell className="w-5 h-5" />
                                        Notify All
                                    </button>
                                </div>
                            </div>

                            {/* Users Table */}
                            <div className="bg-neutral-900 rounded-3xl border border-white/5 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-white/5">
                                                <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">User</th>
                                                <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Role</th>
                                                <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {isUsersLoading ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                                                        <div className="flex justify-center items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0s' }}></div>
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : users.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">No users found.</td>
                                                </tr>
                                            ) : (
                                                users.map((user) => (
                                                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 border border-white/5">
                                                                    <Users className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-white">{user.name}</p>
                                                                    <p className="text-xs text-neutral-500">{user.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${user.role === 'super_admin'
                                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                                : user.role === 'admin'
                                                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                    : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                                }`}>
                                                                {user.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {user.adminRequestStatus === 'PENDING' && (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleApproveOwnerRequest(user.id, 'APPROVE')}
                                                                        className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-400"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleApproveOwnerRequest(user.id, 'REJECT')}
                                                                        className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold rounded-lg hover:bg-red-500/20"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {user.role === 'admin' && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-neutral-400">Commission:</span>
                                                                    <button
                                                                        onClick={() => { setEditingCommissionUser(user); setNewCommissionRate(Number(user.commissionRate) || 10); }}
                                                                        className="px-2 py-1 rounded bg-neutral-800 border border-white/10 hover:border-emerald-500/50 text-xs font-mono text-emerald-500 transition-colors"
                                                                    >
                                                                        {user.commissionRate}%
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {user.adminRequestStatus === 'REJECTED' && (
                                                                <span className="text-[10px] text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded">Request Rejected</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => { setNotifUserId(user.id); setNotifForm({ ...notifForm, title: 'Message from Admin' }); }}
                                                                className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-700 transition-all border border-white/5"
                                                            >
                                                                Message
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {/* Pagination Footer */}
                                        <tfoot>
                                            <tr>
                                                <td colSpan={4} className="px-6 py-4 border-t border-white/5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-neutral-500">
                                                            Page <span className="text-white font-bold">{userPage}</span> of {userTotalPages}
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setUserPage(p => Math.max(1, p - 1))}
                                                                disabled={userPage === 1}
                                                                className="px-4 py-2 rounded-xl bg-neutral-800 disabled:opacity-50 text-xs font-bold hover:bg-neutral-700 transition-colors"
                                                            >
                                                                Previous
                                                            </button>
                                                            <button
                                                                onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))}
                                                                disabled={userPage === userTotalPages}
                                                                className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 disabled:opacity-50 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                                                            >
                                                                Next
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Commission Edit Modal */}
                    <AnimatePresence>
                        {editingCommissionUser && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl"
                                >
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold">Update Commission</h3>
                                        <button onClick={() => setEditingCommissionUser(null)} className="p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-4 rounded-2xl bg-neutral-800/50 border border-white/5">
                                            <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Theater Owner</p>
                                            <p className="font-bold text-lg">{editingCommissionUser.name}</p>
                                            <p className="text-sm text-neutral-400">{editingCommissionUser.email}</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Commission Rate (%)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={newCommissionRate}
                                                    onChange={(e) => setNewCommissionRate(parseFloat(e.target.value))}
                                                    className="w-full h-14 px-5 rounded-2xl bg-neutral-800 border border-transparent text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:bg-neutral-950 transition-all font-bold text-lg"
                                                />
                                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">%</span>
                                            </div>
                                            <p className="text-xs text-neutral-500 px-1">
                                                The percentage of revenue deducted from each booking as platform fee.
                                            </p>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={() => setEditingCommissionUser(null)}
                                                className="flex-1 h-12 rounded-xl bg-neutral-800 font-bold text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleUpdateCommission}
                                                className="flex-1 h-12 rounded-xl bg-emerald-500 font-bold text-white hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                                            >
                                                Update Rate
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* WALLET TAB */}
                    {currentTab === 'wallet' && (
                        <motion.div
                            key="wallet"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* All Users Wallets */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold">All Users Wallets</h3>
                                {usersWithWallets.length === 0 ? (
                                    <div className="p-8 rounded-3xl bg-neutral-900 border border-white/5 text-center text-neutral-500">
                                        No users with wallets found.
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {usersWithWallets.map(user => (
                                            <div key={user.id} className="p-4 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-white">{user.name}</p>
                                                    <p className="text-sm text-neutral-400">{user.email}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-bold text-emerald-500">₹{user.walletBalance || 0}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Pending Requests */}
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold">Pending Top-up Requests</h3>
                                {walletRequests.length === 0 ? (
                                    <div className="p-8 rounded-3xl bg-neutral-900 border border-white/5 text-center text-neutral-500">
                                        No pending requests
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {walletRequests.map(req => (
                                            <div key={req.id} className="p-4 rounded-2xl bg-neutral-900 border border-white/5 flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-white"><span className="text-emerald-500">₹{req.amount}</span> via {req.paymentMethod}</p>
                                                    <p className="text-sm text-neutral-400">{req.user?.name} ({req.user?.email})</p>
                                                    <p className="text-xs text-neutral-600 font-mono mt-1">{req.transactionRef}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApproveRequest(req.id)}
                                                        className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold hover:bg-emerald-500/20 transition-colors"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectRequest(req.id)}
                                                        className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-colors"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Seat Generation Modal */}
            <AnimatePresence>
                {genScreenId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-50"
                        onClick={() => setGenScreenId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-900 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-neutral-800"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold">Generate Seats</h3>
                                <button onClick={() => setGenScreenId(null)} className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">Columns</label>
                                    <input type="number" value={seatCols} onChange={(e) => setSeatCols(parseInt(e.target.value))} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700" />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-sm font-medium text-neutral-400">Tiers</label>
                                        <button onClick={() => setSeatTiers([...seatTiers, { name: 'New Tier', rows: 1, price: 150 }])} className="text-sm text-emerald-400 font-semibold">+ Add Tier</button>
                                    </div>
                                    <div className="space-y-2">
                                        {seatTiers.map((tier, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input type="text" value={tier.name} onChange={e => { const t = [...seatTiers]; t[idx].name = e.target.value; setSeatTiers(t); }} className="flex-1 h-10 px-3 rounded-xl bg-neutral-800 border border-neutral-700 text-sm" placeholder="Name" />
                                                <input type="number" value={tier.rows} onChange={e => { const t = [...seatTiers]; t[idx].rows = parseInt(e.target.value); setSeatTiers(t); }} className="w-20 h-10 px-3 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-center" placeholder="Rows" />
                                                <input type="number" value={tier.price} onChange={e => { const t = [...seatTiers]; t[idx].price = parseFloat(e.target.value); setSeatTiers(t); }} className="w-20 h-10 px-3 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-center" placeholder="Price" />
                                                <button onClick={() => setSeatTiers(seatTiers.filter((_, i) => i !== idx))} className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button onClick={() => handleGenerateSeats(genScreenId)} className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold">
                                    Generate Seats
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Movie Modal */}
            <AnimatePresence>
                {editingMovie && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-50"
                        onClick={() => setEditingMovie(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-900 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-neutral-800"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold">Edit Movie</h3>
                                <button onClick={() => setEditingMovie(null)} className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <input type="text" value={editingMovie.title} onChange={(e) => setEditingMovie({ ...editingMovie, title: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700" />
                                <textarea value={editingMovie.description} onChange={(e) => setEditingMovie({ ...editingMovie, description: e.target.value })} className="w-full h-24 px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 resize-none" />
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" value={editingMovie.genre} onChange={(e) => setEditingMovie({ ...editingMovie, genre: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700" placeholder="Genre" />
                                    <input type="number" value={editingMovie.duration} onChange={(e) => setEditingMovie({ ...editingMovie, duration: parseInt(e.target.value) })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700" placeholder="Duration (min)" />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <input type="text" value={editingMovie.language || ''} onChange={(e) => setEditingMovie({ ...editingMovie, language: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700" placeholder="Language" />
                                    <input type="text" value={editingMovie.audio || ''} onChange={(e) => setEditingMovie({ ...editingMovie, audio: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700" placeholder="Audio" />
                                    <input type="text" value={editingMovie.format || ''} onChange={(e) => setEditingMovie({ ...editingMovie, format: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700" placeholder="Format" />
                                </div>
                                <input type="text" value={editingMovie.rating || ''} onChange={(e) => setEditingMovie({ ...editingMovie, rating: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700" placeholder="Rating (e.g., 8.5)" />
                                <input type="date" value={editingMovie.releaseDate || ''} onChange={(e) => setEditingMovie({ ...editingMovie, releaseDate: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-400" />

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Poster URL</label>
                                        <label className="text-xs text-emerald-500 cursor-pointer hover:text-emerald-400 font-bold">
                                            Upload
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'posterUrl', true)} />
                                        </label>
                                    </div>
                                    <input type="text" value={editingMovie.posterUrl} onChange={(e) => setEditingMovie({ ...editingMovie, posterUrl: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Banner URL</label>
                                        <label className="text-xs text-emerald-500 cursor-pointer hover:text-emerald-400 font-bold">
                                            Upload
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'bannerUrl', true)} />
                                        </label>
                                    </div>
                                    <input type="text" value={editingMovie.bannerUrl || ''} onChange={(e) => setEditingMovie({ ...editingMovie, bannerUrl: e.target.value })} className="w-full h-12 px-4 rounded-xl bg-neutral-800 border border-neutral-700" />
                                </div>
                                <button onClick={handleUpdateMovie} className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold">Update Movie</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Request Movie Modal */}
            <AnimatePresence>
                {showRequestModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-50"
                        onClick={() => setShowRequestModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-900 rounded-[2.5rem] p-8 max-w-md w-full border border-white/5 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black tracking-tighter uppercase italic">
                                        Request Movie
                                    </h3>
                                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                                        Submit to Super Admin
                                    </p>
                                </div>
                                <button onClick={() => setShowRequestModal(false)} className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors">
                                    <X className="w-5 h-5 text-neutral-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Movie Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Inception"
                                        value={requestMovieName}
                                        onChange={(e) => setRequestMovieName(e.target.value)}
                                        className="w-full h-14 px-5 rounded-2xl bg-neutral-800 border border-transparent text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 transition-all font-bold"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Notes (Optional)</label>
                                    <textarea
                                        placeholder="Any specific details..."
                                        value={requestNotes}
                                        onChange={(e) => setRequestNotes(e.target.value)}
                                        className="w-full h-32 px-5 py-4 rounded-2xl bg-neutral-800 border border-transparent text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none font-medium leading-relaxed"
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleRequestMovie}
                                    className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all flex items-center justify-center gap-3"
                                >
                                    <Plus className="w-5 h-5" />
                                    Send Request
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Admin Notification Modal */}
            <AnimatePresence>
                {notifUserId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-50"
                        onClick={() => setNotifUserId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-900 rounded-[2.5rem] p-8 max-w-md w-full border border-white/5 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black tracking-tighter uppercase italic">
                                        {notifUserId === -1 ? 'Broadcast Message' : 'Send Notification'}
                                    </h3>
                                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                                        {notifUserId === -1
                                            ? notifForm.audience === 'admins'
                                                ? 'Alerting all admins'
                                                : notifForm.audience === 'both'
                                                    ? 'Alerting users and admins'
                                                    : 'Alerting all users'
                                            : 'Targeted User Alert'}
                                    </p>
                                </div>
                                <button onClick={() => setNotifUserId(null)} className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors">
                                    <X className="w-5 h-5 text-neutral-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Alert Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['info', 'success', 'warning'].map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setNotifForm({ ...notifForm, type })}
                                                className={`h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${notifForm.type === type
                                                    ? type === 'info' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                        : type === 'success' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                            : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                                    : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {notifUserId === -1 && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Target Audience</label>
                                        <select
                                            value={notifForm.audience}
                                            onChange={(e) => setNotifForm({ ...notifForm, audience: e.target.value })}
                                            className="w-full h-12 px-4 rounded-2xl bg-neutral-800 border border-transparent focus:border-emerald-500/50 text-white cursor-pointer"
                                        >
                                            <option value="users">All Users</option>
                                            <option value="admins">All Admins</option>
                                            <option value="both">Users and Admins</option>
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Title</label>
                                    <input
                                        type="text"
                                        placeholder="Headline..."
                                        value={notifForm.title}
                                        onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                                        className="w-full h-14 px-5 rounded-2xl bg-neutral-800 border border-transparent text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 transition-all font-bold"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Message</label>
                                    <textarea
                                        placeholder="Detailed content..."
                                        value={notifForm.message}
                                        onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
                                        className="w-full h-32 px-5 py-4 rounded-2xl bg-neutral-800 border border-transparent text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none font-medium leading-relaxed"
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSendNotification}
                                    disabled={isSendingNotif}
                                    className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSendingNotif ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Bell className="w-5 h-5" />
                                            {notifUserId === -1 ? 'Broadcast Now' : 'Send Now'}
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
