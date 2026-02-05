import React, { useState, useEffect, useContext, useCallback } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Film,
    Calendar,
    Plus,
    MapPin,
    Clock,
    IndianRupee,
    LogOut,
    Search,
    Upload,
    ExternalLink,
    Ticket as TicketIcon
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Theater {
    id: number;
    name: string;
    location: string;
    screens: Screen[];
}

interface Screen {
    id: number;
    name: string;
    theaterId: number;
}

interface Movie {
    id: number;
    title: string;
    description: string;
    genre: string;
    duration: number;
    rating: string;
    posterUrl: string;
    bannerUrl: string;
    releaseDate: string;
    language: string;
    audio: string;
    format: string;
}



interface Showtime {
    id: number;
    movieId: number;
    screenId: number;
    startTime: string;
    endTime: string;
    tierPrices?: Record<string, number>;
    movie: Movie;
    screen: Screen & { theater: Theater };
}

interface Booking {
    id: number;
    userId: number;
    showtimeId: number;
    totalAmount: number;
    status: string;
    createdAt: string;
    user: {
        name: string;
        email: string;
    };
    showtime: {
        startTime: string;
        movie: {
            title: string;
        };
        screen: {
            name: string;
            theater: {
                name: string;
            };
        };
    };
}

const AdminDashboard: React.FC = () => {
    const [currentTab, setCurrentTab] = useState<'theaters' | 'movies' | 'showtimes' | 'bookings'>('theaters');
    const [theaters, setTheaters] = useState<Theater[]>([]);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [showtimes, setShowtimes] = useState<Showtime[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    // Form States
    const [newTheater, setNewTheater] = useState({ name: '', location: '' });
    const [newMovie, setNewMovie] = useState<Partial<Movie>>({
        title: '', description: '', genre: '', duration: 120, rating: '', posterUrl: '', bannerUrl: '', releaseDate: '', language: '', audio: '', format: 'IMAX 2D'
    });
    const [newShowtime, setNewShowtime] = useState({ movieId: 0, screenId: 0, startTime: '', endTime: '', tierPrices: {} as Record<string, number> });
    const [newShowtimeDate, setNewShowtimeDate] = useState('');
    const [newShowtimeTime, setNewShowtimeTime] = useState('');
    const [selectedScreenTiers, setSelectedScreenTiers] = useState<string[]>([]);
    const [editingScreenTiers, setEditingScreenTiers] = useState<string[]>([]);
    const [newScreenName, setNewScreenName] = useState('');
    const [selectedTheaterId, setSelectedTheaterId] = useState<number | null>(null);

    // Editing States
    const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
    const [editingShowtime, setEditingShowtime] = useState<Showtime | null>(null);
    const [editingScreen, setEditingScreen] = useState<{ id: number, name: string } | null>(null);

    // Seat Gen
    const [genScreenId, setGenScreenId] = useState<number | null>(null);
    const [seatTiers, setSeatTiers] = useState<{ name: string; rows: number; price: number }[]>([
        { name: 'Classic', rows: 5, price: 150 }
    ]);
    const [seatCols, setSeatCols] = useState(10);
    const [hasExistingSeats, setHasExistingSeats] = useState(false);

    // Helper to format ISO UTC string to YYYY-MM-DDTHH:mm for datetime-local inputs
    const toLocalDateString = (isoString: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const offset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - offset);
        return localDate.toISOString().slice(0, 16);
    };

    const fetchBookings = useCallback(async () => {
        try {
            const response = await api.get('/admin/bookings');
            setBookings(response.data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    }, []);

    const fetchTheaters = useCallback(async () => {
        try {
            const response = await api.get('/admin/theaters');
            setTheaters(response.data);
        } catch (error) { console.error(error); }
    }, []);

    const fetchMovies = useCallback(async () => {
        try {
            const response = await api.get('/movies');
            setMovies(response.data);
        } catch (error) { console.error(error); }
    }, []);

    const fetchShowtimes = useCallback(async () => {
        try {
            const response = await api.get('/admin/showtimes');
            setShowtimes(response.data);
        } catch (error) { console.error(error); }
    }, []);

    // Shared tier fetching logic
    const fetchTiersForScreen = useCallback(async (screenId: number, setTiers: (tiers: string[]) => void, updateState: (tierPrices: Record<string, number>) => void) => {
        try {
            const response = await api.get(`/admin/seats/${screenId}`);
            const seats: any[] = response.data;
            const tiers = [...new Set(seats.map(s => s.type))].sort();
            setTiers(tiers);

            const initialPrices: Record<string, number> = {};
            tiers.forEach(t => {
                const existingSeat = seats.find(s => s.type === t);
                initialPrices[t] = existingSeat ? Number(existingSeat.price) : 150;
            });
            updateState(initialPrices);
        } catch (error) {
            console.error('Error fetching tiers:', error);
            setTiers([]);
        }
    }, []);

    useEffect(() => {
        if (genScreenId) {
            const fetchSeats = async () => {
                try {
                    const res = await api.get(`/admin/seats/${genScreenId}`);
                    if (res.data && res.data.length > 0) {
                        setHasExistingSeats(true);
                        // Calculate cols from existing data
                        const seats = res.data;
                        let maxCol = 0;
                        seats.forEach((s: any) => {
                            if (s.number > maxCol) maxCol = s.number;
                        });
                        setSeatCols(maxCol);
                    } else {
                        setHasExistingSeats(false);
                        setSeatCols(10);
                    }
                } catch (e) { console.error(e); }
            };
            fetchSeats();
        }
    }, [genScreenId]);

    useEffect(() => {
        fetchTheaters();
        fetchMovies();
        fetchShowtimes();
        fetchBookings();
    }, [fetchMovies, fetchTheaters, fetchShowtimes, fetchBookings]);

    // Fetch tiers when screen changes in showtime form
    useEffect(() => {
        if (newShowtime.screenId) {
            fetchTiersForScreen(
                newShowtime.screenId,
                setSelectedScreenTiers,
                (prices) => setNewShowtime(prev => ({ ...prev, tierPrices: prices }))
            );
        } else {
            setSelectedScreenTiers([]);
        }
    }, [newShowtime.screenId, fetchTiersForScreen]);

    // Fetch tiers when screen changes in EDIT modal
    useEffect(() => {
        if (editingShowtime?.screenId) {
            fetchTiersForScreen(
                editingShowtime.screenId,
                setEditingScreenTiers,
                (prices) => {
                    setEditingShowtime(prev => prev ? ({
                        ...prev,
                        tierPrices: { ...prices, ...(prev.tierPrices || {}) }
                    }) : null);
                }
            );
        } else {
            setEditingScreenTiers([]);
        }
    }, [editingShowtime?.screenId, fetchTiersForScreen]);

    const handleUpdateMovie = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMovie) return;
        if ((editingMovie.duration || 0) <= 0) {
            alert('Duration must be greater than 0 minutes.');
            return;
        }

        try {
            await api.put(`/movies/${editingMovie.id}`, editingMovie);
            setEditingMovie(null);
            fetchMovies();
            alert('Movie updated!');
        } catch (error) { console.error(error); }
    };

    const handleUpdateShowtime = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingShowtime) return;
        try {
            // Recalculate end time for update too
            const movie = movies.find(m => m.id === editingShowtime.movieId);
            const start = new Date(editingShowtime.startTime);
            const durationMs = (movie ? movie.duration : 120) * 60000;
            const end = new Date(start.getTime() + durationMs);

            const payload = {
                ...editingShowtime,
                startTime: start.toISOString(),
                endTime: end.toISOString()
            };

            await api.put(`/showtimes/${editingShowtime.id}`, payload);
            setEditingShowtime(null);
            fetchShowtimes();
            alert('Showtime updated!');
        } catch (error: any) {
            console.error(error);
            const data = error.response?.data;
            if (data?.conflict) {
                const { movieTitle, startTime, endTime } = data.conflict;
                const localStart = new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                const localEnd = new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                alert(`Conflict: "${movieTitle}" is already scheduled from ${localStart} to ${localEnd} on this screen.`);
            } else {
                alert(data?.message || 'Update failed');
            }
        }
    };

    const handleLogout = () => {
        auth?.logout();
        navigate('/login');
    };

    const handleAddTheater = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/admin/theaters', newTheater);
            setNewTheater({ name: '', location: '' });
            fetchTheaters();
            alert('Theater added successfully!');
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to add theater');
        }
    };

    const handleAddMovie = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((newMovie.duration || 0) <= 0) {
            alert('Duration must be greater than 0 minutes.');
            return;
        }

        try {
            // Filter out empty releaseDate so it sends undefined (or null) if not provided, letting backend handle it or error clearly
            const payload = { ...newMovie, releaseDate: newMovie.releaseDate || undefined };
            await api.post('/movies', payload);
            setNewMovie({
                title: '',
                description: '',
                genre: '',
                duration: 120,
                rating: 'PG-13',
                posterUrl: '',
                bannerUrl: '',
                releaseDate: '',
                language: 'English',
                audio: 'Dolby Atmos',
                format: 'IMAX 2D'
            });
            fetchMovies();
            alert('Movie added successfully!');
        } catch (error: any) {
            console.error(error);
            alert('Failed to add movie: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteMovie = async (id: number) => {
        if (!confirm('Are you sure you want to delete this movie? This will also delete all associated showtimes if there are no active bookings.')) {
            return;
        }
        try {
            await api.delete(`/movies/${id}`);
            fetchMovies();
            alert('Movie deleted successfully!');
        } catch (error: any) {
            console.error(error);
            alert('Failed to delete movie: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleAddShowtime = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!newShowtimeDate || !newShowtimeTime || !newShowtime.movieId || !newShowtime.screenId) {
                alert('Please fill in all fields (Movie, Screen, Date, Time)');
                return;
            }

            const movie = movies.find(m => m.id === newShowtime.movieId);
            const startStr = `${newShowtimeDate}T${newShowtimeTime}`;
            const start = new Date(startStr);
            const durationMs = (movie ? movie.duration : 120) * 60000;
            const end = new Date(start.getTime() + durationMs);

            const payload = {
                ...newShowtime,
                startTime: start.toISOString(),
                endTime: end.toISOString()
            };

            await api.post('/showtimes', payload);
            alert('Showtime initialized successfully!');
            // Reset to empty strings for strings, 0 for IDs to avoid validation issues
            setNewShowtime({ movieId: 0, screenId: 0, startTime: '', endTime: '', tierPrices: {} });
            setNewShowtimeDate('');
            setNewShowtimeTime('');
            fetchShowtimes(); // Refresh the showtimes list
        } catch (error: any) {
            console.error(error);
            const data = error.response?.data;
            if (data?.conflict) {
                const { movieTitle, startTime, endTime } = data.conflict;
                const localStart = new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                const localEnd = new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                alert(`Conflict: "${movieTitle}" is already scheduled from ${localStart} to ${localEnd} on this screen.`);
            } else {
                alert('Failed to add showtime: ' + (data?.message || error.message));
            }
        }
    };

    const handleAddScreen = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTheaterId) return;
        try {
            await api.post('/admin/screens', {
                theaterId: selectedTheaterId,
                name: newScreenName,
            });
            setNewScreenName('');
            fetchTheaters();
            alert('Screen added successfully! Please configure the seat layout for the new screen.');
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to add screen');
        }
    };

    const handleUpdateScreen = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingScreen) return;
        try {
            await api.put(`/admin/screens/${editingScreen.id}`, { name: editingScreen.name });
            setEditingScreen(null);
            fetchTheaters();
            alert('Screen renamed successfully!');
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to rename screen');
        }
    };

    const handleGenerateSeats = async (screenId: number) => {
        try {
            await api.post('/admin/seats/generate', {
                screenId, cols: seatCols, tiers: seatTiers,
            });
            alert('Seats generated!');
            setGenScreenId(null);
            fetchTheaters();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to generate seats');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setNewMovie({ ...newMovie, posterUrl: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setNewMovie({ ...newMovie, bannerUrl: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    const handleEditPosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            if (editingMovie) {
                setEditingMovie({ ...editingMovie, posterUrl: reader.result as string });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleEditBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            if (editingMovie) {
                setEditingMovie({ ...editingMovie, bannerUrl: reader.result as string });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteScreen = async (screenId: number) => {
        if (!confirm('Are you sure you want to delete this screen? This will also delete all associated seats and showtimes.')) {
            return;
        }
        try {
            await api.delete(`/admin/screens/${screenId}`);
            fetchTheaters();
            alert('Screen deleted successfully!');
        } catch (error: any) {
            console.error(error);
            alert('Failed to delete screen: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteShowtime = async (showtimeId: number) => {
        if (!confirm('Are you sure you want to delete this showtime? This will also cancel all associated bookings.')) {
            return;
        }
        try {
            await api.delete(`/showtimes/${showtimeId}`);
            fetchShowtimes();
            alert('Showtime deleted successfully!');
        } catch (error: any) {
            console.error(error);
            alert('Failed to delete showtime: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteBooking = async (bookingId: number) => {
        if (!confirm('Are you sure you want to delete this booking?')) return;
        try {
            await api.delete(`/admin/bookings/${bookingId}`);
            fetchBookings();
            alert('Booking deleted successfully!');
        } catch (error: any) {
            console.error(error);
            alert('Failed to delete booking: ' + (error.response?.data?.message || error.message));
        }
    };

    const menuItems = [
        { id: 'theaters', label: 'Theaters', icon: LayoutDashboard },
        { id: 'movies', label: 'Movies', icon: Film },
        { id: 'showtimes', label: 'Showtimes', icon: Calendar },
        { id: 'bookings', label: 'Bookings', icon: TicketIcon },
    ] as const;

    return (
        <div className="flex min-h-screen bg-[#0a0a0b] text-white">
            {/* Sidebar */}
            <aside className="w-72 bg-white/5 border-r border-white/5 flex flex-col pt-12">
                <div className="px-8 mb-12 flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black">A</div>
                    <span className="text-xl font-black tracking-tighter">ADMIN CORE</span>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {menuItems.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setCurrentTab(id)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${currentTab === id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <Icon className="w-5 h-5" />
                            {label}
                        </button>
                    ))}
                    <div className="pt-8 pb-4">
                        <div className="h-px bg-white/5 mx-4 mb-8" />
                        <button
                            onClick={() => navigate('/')}
                            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                        >
                            <ExternalLink className="w-5 h-5" />
                            View Website
                        </button>
                    </div>
                </nav>

                <div className="p-8 border-t border-white/5">
                    <button onClick={handleLogout} className="flex items-center gap-4 text-gray-500 hover:text-red-500 font-bold transition-colors">
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-12 overflow-y-auto">
                <header className="mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight capitalize mb-2">{currentTab}</h1>
                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Cinema Management Protocol</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input type="text" placeholder="Global Search..." className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all w-64" />
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                    >
                        {currentTab === 'theaters' && (
                            <div className="space-y-10">
                                <div className="glass-card p-10 rounded-[40px]">
                                    <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                                        <Plus className="text-blue-500 w-5 h-5" />
                                        Initialize New Venue
                                    </h2>
                                    <form onSubmit={handleAddTheater} className="grid grid-cols-3 gap-6">
                                        <input type="text" placeholder="Venue Name" value={newTheater.name} onChange={(e) => setNewTheater({ ...newTheater, name: e.target.value })} className="premium-input" />
                                        <input type="text" placeholder="Location City" value={newTheater.location} onChange={(e) => setNewTheater({ ...newTheater, location: e.target.value })} className="premium-input" />
                                        <button className="neon-button !py-0">Register Theater</button>
                                    </form>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    {theaters.map(theater => (
                                        <div key={theater.id} className="glass-card p-8 rounded-[40px] hover:border-white/20 transition-all group">
                                            <div className="flex justify-between items-start mb-8">
                                                <div>
                                                    <h3 className="text-2xl font-black tracking-tight leading-tight">{theater.name}</h3>
                                                    <div className="flex items-center gap-2 text-gray-500 mt-2">
                                                        <MapPin className="w-3 h-3 text-blue-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{theater.location}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => setSelectedTheaterId(theater.id)} className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                                                    <Plus className="w-6 h-6" />
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {theater.screens?.map(screen => (
                                                    <div key={screen.id} className="flex flex-wrap gap-4 justify-between items-center p-5 bg-white/5 rounded-3xl border border-transparent hover:border-white/10 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-8 h-8 rounded-xl bg-gray-900 border border-white/5 flex items-center justify-center text-[10px] font-black">{screen.name.split(' ')[1] || 'S'}</div>
                                                            <span className="font-bold text-sm whitespace-nowrap">{screen.name}</span>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button onClick={() => setEditingScreen({ id: screen.id, name: screen.name })} className="text-[10px] font-black uppercase tracking-widest px-3 py-2 sm:px-4 sm:py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all whitespace-nowrap">Edit Name</button>
                                                            <button onClick={() => setGenScreenId(screen.id)} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 sm:px-5 sm:py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all whitespace-nowrap">
                                                                <span className="hidden sm:inline">Layout</span> Config
                                                            </button>
                                                            <button onClick={() => handleDeleteScreen(screen.id)} className="text-[10px] font-black uppercase tracking-widest px-3 py-2 sm:px-4 sm:py-3 rounded-2xl bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-all whitespace-nowrap">Delete</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {selectedTheaterId === theater.id && (
                                                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleAddScreen} className="mt-8 pt-8 border-t border-white/5 flex gap-4">
                                                    <input type="text" placeholder="Screen Designation..." value={newScreenName} onChange={(e) => setNewScreenName(e.target.value)} className="premium-input flex-1" />
                                                    <button className="bg-green-600 px-8 rounded-2xl font-black text-sm">Save</button>
                                                    <button type="button" onClick={() => setSelectedTheaterId(null)} className="text-gray-500 font-bold p-2">✕</button>
                                                </motion.form>
                                            )}

                                            {/* Screen Rename Modal (Inline-ish) */}
                                            {editingScreen && theaters.find(t => t.screens?.some(s => s.id === editingScreen.id))?.id === theater.id && (
                                                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-10 pointer-events-none">
                                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0a0a0b] border border-white/10 w-full max-w-md rounded-[40px] shadow-2xl p-10 pointer-events-auto">
                                                        <h3 className="text-xl font-black mb-6">Rename Functional Node</h3>
                                                        <form onSubmit={handleUpdateScreen} className="space-y-6">
                                                            <input type="text" value={editingScreen.name} onChange={e => setEditingScreen({ ...editingScreen, name: e.target.value })} className="premium-input w-full" required />
                                                            <div className="flex gap-4">
                                                                <button className="neon-button flex-1">Update Name</button>
                                                                <button type="button" onClick={() => setEditingScreen(null)} className="flex-1 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Cancel</button>
                                                            </div>
                                                        </form>
                                                    </motion.div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentTab === 'movies' && (
                            <div className="space-y-10">
                                <div className="glass-card p-10 rounded-[40px]">
                                    <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                                        <Film className="text-blue-500 w-5 h-5" />
                                        Register Visual Asset
                                    </h2>
                                    <form onSubmit={handleAddMovie} className="grid grid-cols-4 gap-6">
                                        <input type="text" placeholder="Feature Title" value={newMovie.title} onChange={e => setNewMovie({ ...newMovie, title: e.target.value })} className="premium-input" />
                                        <input type="text" placeholder="Primary Genre" value={newMovie.genre} onChange={e => setNewMovie({ ...newMovie, genre: e.target.value })} className="premium-input" />
                                        <input type="number" placeholder="Duration (min)" value={newMovie.duration} onChange={e => setNewMovie({ ...newMovie, duration: parseInt(e.target.value) })} className="premium-input" />
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">📱 Poster (Card Thumbnail)</label>
                                            <div className="relative group">
                                                <input type="text" placeholder="Poster URL" value={newMovie.posterUrl} onChange={e => setNewMovie({ ...newMovie, posterUrl: e.target.value })} className="premium-input w-full pr-12" />
                                                <label className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-2 hover:bg-white/10 rounded-xl transition-colors">
                                                    <Upload className="w-4 h-4 text-gray-500 group-focus-within:text-blue-500" />
                                                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                                                </label>
                                            </div>
                                            {newMovie.posterUrl && (
                                                <img src={newMovie.posterUrl} alt="Poster preview" className="w-full h-32 object-cover rounded-2xl border border-white/10" />
                                            )}
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">🎬 Banner (Hero Image)</label>
                                            <div className="relative group">
                                                <input type="text" placeholder="Banner URL" value={newMovie.bannerUrl} onChange={e => setNewMovie({ ...newMovie, bannerUrl: e.target.value })} className="premium-input w-full pr-12" />
                                                <label className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-2 hover:bg-white/10 rounded-xl transition-colors">
                                                    <Upload className="w-4 h-4 text-gray-500 group-focus-within:text-blue-500" />
                                                    <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                                                </label>
                                            </div>
                                            {newMovie.bannerUrl && (
                                                <img src={newMovie.bannerUrl} alt="Banner preview" className="w-full h-32 object-cover rounded-2xl border border-white/10" />
                                            )}
                                        </div>
                                        <div className="flex gap-4 col-span-2">
                                            <input type="text" placeholder="Rating (e.g. PG-13)" value={newMovie.rating} onChange={e => setNewMovie({ ...newMovie, rating: e.target.value })} className="premium-input w-full" />
                                            <input type="date" placeholder="Release Date" value={newMovie.releaseDate} onChange={e => setNewMovie({ ...newMovie, releaseDate: e.target.value })} className="premium-input w-full" />
                                        </div>
                                        <div className="flex gap-4 col-span-2">
                                            <input type="text" placeholder="Language" value={newMovie.language} onChange={e => setNewMovie({ ...newMovie, language: e.target.value })} className="premium-input w-full" />
                                            <input type="text" placeholder="Audio" value={newMovie.audio} onChange={e => setNewMovie({ ...newMovie, audio: e.target.value })} className="premium-input w-full" />
                                        </div>
                                        <input type="text" placeholder="Format (e.g. IMAX 2D)" value={newMovie.format} onChange={e => setNewMovie({ ...newMovie, format: e.target.value })} className="premium-input col-span-4" />
                                        <textarea placeholder="Feature Synopsis..." value={newMovie.description} onChange={e => setNewMovie({ ...newMovie, description: e.target.value })} className="premium-input col-span-4 h-24" />
                                        <button className="neon-button !py-4 col-span-4">Save Movie</button>
                                    </form>
                                </div>

                                <div className="grid grid-cols-4 gap-8">
                                    {movies.map(movie => (
                                        <div key={movie.id} className="glass-card rounded-[40px] overflow-hidden group">
                                            <div className="relative h-64 overflow-hidden">
                                                <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0b] to-transparent opacity-80"></div>
                                                <div className="absolute bottom-6 left-6 right-6">
                                                    <span className="bg-blue-600 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">{movie.rating}</span>
                                                </div>
                                            </div>
                                            <div className="p-8">
                                                <div className="flex justify-between items-start mb-2 gap-4">
                                                    <h3 className="font-black text-lg truncate leading-tight flex-1">{movie.title}</h3>
                                                    <div className="flex gap-4">
                                                        <button
                                                            onClick={() => setEditingMovie(movie)}
                                                            className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-400 transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMovie(movie.id)}
                                                            className="text-[10px] font-black uppercase text-red-500 hover:text-red-400 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                    <span>{movie.genre}</span>
                                                    <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {movie.duration}m</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {editingMovie && (
                                    <div className="fixed inset-0 bg-[#0a0a0b]/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
                                        <div className="glass-card p-10 rounded-[40px] max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
                                            <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                                                <Film className="text-blue-500 w-5 h-5" />
                                                Edit Movie Details
                                            </h2>
                                            <form onSubmit={handleUpdateMovie} className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase">Title</label>
                                                    <input type="text" value={editingMovie.title} onChange={e => setEditingMovie({ ...editingMovie, title: e.target.value })} className="premium-input w-full" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase">Genre</label>
                                                    <input type="text" value={editingMovie.genre} onChange={e => setEditingMovie({ ...editingMovie, genre: e.target.value })} className="premium-input w-full" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase">Duration (min)</label>
                                                    <input type="number" value={editingMovie.duration} onChange={e => setEditingMovie({ ...editingMovie, duration: parseInt(e.target.value) })} className="premium-input w-full" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase">📱 Poster URL (Cards)</label>
                                                    <div className="relative group">
                                                        <input type="text" value={editingMovie.posterUrl} onChange={e => setEditingMovie({ ...editingMovie, posterUrl: e.target.value })} className="premium-input w-full pr-12" />
                                                        <label className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-2 hover:bg-white/10 rounded-xl transition-colors">
                                                            <Upload className="w-4 h-4 text-gray-500 group-focus-within:text-blue-500" />
                                                            <input type="file" accept="image/*" onChange={handleEditPosterUpload} className="hidden" />
                                                        </label>
                                                    </div>
                                                    {editingMovie.posterUrl && (
                                                        <img src={editingMovie.posterUrl} alt="Poster preview" className="w-full h-24 object-cover rounded-2xl border border-white/10" />
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase">🎬 Banner URL (Hero)</label>
                                                    <div className="relative group">
                                                        <input type="text" value={editingMovie.bannerUrl || ''} onChange={e => setEditingMovie({ ...editingMovie, bannerUrl: e.target.value })} className="premium-input w-full pr-12" />
                                                        <label className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-2 hover:bg-white/10 rounded-xl transition-colors">
                                                            <Upload className="w-4 h-4 text-gray-500 group-focus-within:text-blue-500" />
                                                            <input type="file" accept="image/*" onChange={handleEditBannerUpload} className="hidden" />
                                                        </label>
                                                    </div>
                                                    {editingMovie.bannerUrl && (
                                                        <img src={editingMovie.bannerUrl} alt="Banner preview" className="w-full h-24 object-cover rounded-2xl border border-white/10" />
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase">Rating</label>
                                                    <input type="text" value={editingMovie.rating} onChange={e => setEditingMovie({ ...editingMovie, rating: e.target.value })} className="premium-input w-full" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase">Language</label>
                                                    <input type="text" value={editingMovie.language} onChange={e => setEditingMovie({ ...editingMovie, language: e.target.value })} className="premium-input w-full" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase">Audio</label>
                                                    <input type="text" value={editingMovie.audio} onChange={e => setEditingMovie({ ...editingMovie, audio: e.target.value })} className="premium-input w-full" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase">Format</label>
                                                    <input type="text" value={editingMovie.format} onChange={e => setEditingMovie({ ...editingMovie, format: e.target.value })} className="premium-input w-full" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase">Release Date</label>
                                                    <input type="date" value={editingMovie.releaseDate || ''} onChange={e => setEditingMovie({ ...editingMovie, releaseDate: e.target.value })} className="premium-input w-full" />
                                                </div>
                                                <div className="col-span-2 space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase">Synopsis</label>
                                                    <textarea value={editingMovie.description} onChange={e => setEditingMovie({ ...editingMovie, description: e.target.value })} className="premium-input w-full h-24" />
                                                </div>
                                                <div className="col-span-2 flex gap-4 pt-4">
                                                    <button className="neon-button flex-1">Save Changes</button>
                                                    <button type="button" onClick={() => setEditingMovie(null)} className="flex-1 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Cancel</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentTab === 'showtimes' && (
                            <div className="space-y-10">
                                <div className="glass-card p-10 rounded-[40px]">
                                    <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                                        <Calendar className="text-blue-500 w-5 h-5" />
                                        Schedule Operational Session
                                    </h2>
                                    <form onSubmit={handleAddShowtime} className="space-y-8">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Assigned Feature</label>
                                                <select value={newShowtime.movieId || ''} onChange={e => setNewShowtime({ ...newShowtime, movieId: parseInt(e.target.value) })} className="premium-input w-full appearance-none">
                                                    <option value="">Select Movie</option>
                                                    {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Assigned Screen</label>
                                                <select value={newShowtime.screenId || ''} onChange={e => setNewShowtime({ ...newShowtime, screenId: parseInt(e.target.value) })} className="premium-input w-full appearance-none">
                                                    <option value="">Select Screen</option>
                                                    {theaters.map(t => t.screens?.map(s => <option key={s.id} value={s.id}>{t.name} - {s.name}</option>))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Date</label>
                                                <input type="date" value={newShowtimeDate} onChange={e => setNewShowtimeDate(e.target.value)} className="premium-input w-full" />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Start Time</label>
                                                <input type="time" value={newShowtimeTime} onChange={e => setNewShowtimeTime(e.target.value)} className="premium-input w-full" />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pricing Configuration</label>
                                                {selectedScreenTiers.length === 0 && (
                                                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded">No tiers detected</span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                {selectedScreenTiers.map(tier => (
                                                    <div key={tier} className="relative group">
                                                        <div className="absolute -top-2 left-3 bg-[#0a0a0b] px-2 text-[8px] font-black text-blue-500 uppercase tracking-widest z-10 transition-all group-focus-within:text-white">
                                                            Tier: {tier}
                                                        </div>
                                                        <div className="relative">
                                                            <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
                                                            <input
                                                                type="number"
                                                                value={newShowtime.tierPrices[tier] || ''}
                                                                onChange={e => setNewShowtime({
                                                                    ...newShowtime,
                                                                    tierPrices: { ...newShowtime.tierPrices, [tier]: parseFloat(e.target.value) || 0 }
                                                                })}
                                                                className="premium-input pl-10 w-full"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <button className="neon-button w-full py-6">Initialize Operational Session</button>
                                    </form>
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-xl font-black mb-6">Existing Showtimes</h2>
                                    <div className="grid gap-4">
                                        {showtimes.map(st => (
                                            <div key={st.id} className="glass-card p-6 rounded-3xl flex justify-between items-center group">
                                                <div className="flex items-center gap-8">
                                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center">
                                                        <span className="text-[8px] font-black uppercase opacity-50">{new Date(st.startTime).toLocaleDateString([], { month: 'short' })}</span>
                                                        <span className="text-xl font-black">{new Date(st.startTime).getDate()}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-lg leading-none mb-2">{st.movie?.title}</h4>
                                                        <div className="flex items-center gap-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                            <span>{st.screen?.theater?.name}</span>
                                                            <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                                            <span>{st.screen?.name}</span>
                                                            <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                                            <span className="text-blue-500">{new Date(st.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="font-black text-xs text-blue-500 uppercase tracking-widest">Tiered</p>
                                                        <p className="text-[8px] font-black uppercase opacity-50 tracking-widest">Pricing</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setEditingShowtime(st)}
                                                            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600 hover:border-blue-500 transition-all"
                                                        >
                                                            <Search className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteShowtime(st.id)}
                                                            className="w-12 h-12 rounded-2xl bg-red-900/20 border border-red-900/30 flex items-center justify-center hover:bg-red-600 hover:border-red-500 transition-all"
                                                        >
                                                            <span className="text-lg">×</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {editingShowtime && (
                                    <div className="fixed inset-0 bg-[#0a0a0b]/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
                                        <div className="glass-card p-10 rounded-[40px] max-w-lg w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
                                            <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                                                <Calendar className="text-blue-500 w-5 h-5" />
                                                Edit Showtime
                                            </h2>
                                            <form onSubmit={handleUpdateShowtime} className="space-y-6">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Assigned Feature</label>
                                                    <select
                                                        value={editingShowtime.movieId}
                                                        onChange={e => setEditingShowtime({ ...editingShowtime, movieId: parseInt(e.target.value) })}
                                                        className="premium-input w-full appearance-none"
                                                    >
                                                        {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Assigned Screen</label>
                                                    <select
                                                        value={editingShowtime.screenId}
                                                        onChange={e => setEditingShowtime({ ...editingShowtime, screenId: parseInt(e.target.value) })}
                                                        className="premium-input w-full appearance-none"
                                                    >
                                                        {theaters.map(t => t.screens?.map(s => <option key={s.id} value={s.id}>{t.name} - {s.name}</option>))}
                                                    </select>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Start Time</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={toLocalDateString(editingShowtime.startTime)}
                                                        onChange={e => setEditingShowtime({ ...editingShowtime, startTime: e.target.value })}
                                                        className="premium-input w-full"
                                                    />
                                                </div>

                                                {editingScreenTiers.length > 0 && (
                                                    <div className="space-y-4 pt-2">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tier Pricing (₹)</label>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {editingScreenTiers.map((tier: string) => (
                                                                <div key={tier} className="relative group">
                                                                    <div className="absolute -top-2 left-3 bg-[#0a0a0b] px-2 text-[8px] font-black text-blue-500 uppercase tracking-widest z-10 transition-all group-focus-within:text-white">
                                                                        {tier}
                                                                    </div>
                                                                    <div className="relative">
                                                                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
                                                                        <input
                                                                            type="number"
                                                                            value={(editingShowtime.tierPrices && editingShowtime.tierPrices[tier]) || ''}
                                                                            onChange={e => setEditingShowtime({
                                                                                ...editingShowtime,
                                                                                tierPrices: { ...(editingShowtime.tierPrices || {}), [tier]: parseFloat(e.target.value) || 0 }
                                                                            })}
                                                                            className="premium-input pl-10 w-full"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex gap-4 pt-4">
                                                    <button className="neon-button flex-1">Apply Changes</button>
                                                    <button type="button" onClick={() => setEditingShowtime(null)} className="flex-1 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Cancel</button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentTab === 'bookings' && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 gap-4">
                                    {bookings.map(booking => (
                                        <div key={booking.id} className="glass-card p-6 rounded-[32px] hover:border-blue-500/30 transition-all flex items-center justify-between group">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 font-black text-xl">
                                                    #{booking.id}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black mb-1">{booking.showtime?.movie?.title}</h3>
                                                    <div className="flex items-center gap-4 text-gray-400 text-sm font-bold">
                                                        <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {booking.showtime?.screen?.theater?.name} • {booking.showtime?.screen?.name}</span>
                                                        <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date(booking.showtime?.startTime).toLocaleString()}</span>
                                                    </div>
                                                    <div className="mt-2 flex items-center gap-4 text-sm">
                                                        <span className="bg-white/5 px-3 py-1 rounded-lg text-gray-400 font-bold">User: {booking.user?.name} ({booking.user?.email})</span>
                                                        <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-lg font-bold">₹{booking.totalAmount}</span>
                                                        <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-lg font-bold capitalize">{booking.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteBooking(booking.id)}
                                                className="w-12 h-12 rounded-2xl bg-red-900/20 border border-red-900/30 flex items-center justify-center hover:bg-red-600 hover:border-red-500 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <span className="text-lg">×</span>
                                            </button>
                                        </div>
                                    ))}
                                    {bookings.length === 0 && (
                                        <div className="text-center py-20 opacity-30">
                                            <p className="text-2xl font-black">No bookings found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Layout Configuration Modal */}
            <AnimatePresence>
                {
                    genScreenId && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-[#0a0a0b]/80 backdrop-blur-xl flex items-center justify-center p-4 z-[90]"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="glass-card p-4 sm:p-12 rounded-[32px] sm:rounded-[48px] max-w-xl w-full mx-4 overflow-y-auto max-h-[90vh]"
                            >
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600/10 rounded-2xl border border-blue-500/20 mb-4 font-black text-blue-500">S</div>
                                    <h3 className="text-2xl font-black tracking-tight leading-none mb-2 text-white">Spatial Architect</h3>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Multi-Tier Grid Engine</p>
                                </div>

                                <div className="space-y-8">
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Columns</label>
                                        <input type="number" value={seatCols} onChange={(e) => setSeatCols(parseInt(e.target.value))} className="premium-input w-24 text-center !bg-gray-900" />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Tier Definitions</label>
                                            <button
                                                onClick={() => setSeatTiers([...seatTiers, { name: 'New Tier', rows: 1, price: 150 }])}
                                                className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400"
                                            >
                                                + Add Tier
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {seatTiers.map((tier, idx) => (
                                                <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-white/5 p-4 rounded-2xl border border-white/10 group">
                                                    <div className="col-span-4">
                                                        <input
                                                            type="text"
                                                            value={tier.name}
                                                            placeholder="Tier Name"
                                                            onChange={e => {
                                                                const newTiers = [...seatTiers];
                                                                newTiers[idx].name = e.target.value;
                                                                setSeatTiers(newTiers);
                                                            }}
                                                            className="premium-input w-full !text-sm !h-10"
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <input
                                                            type="number"
                                                            value={tier.rows}
                                                            placeholder="Rows"
                                                            onChange={e => {
                                                                const newTiers = [...seatTiers];
                                                                newTiers[idx].rows = parseInt(e.target.value);
                                                                setSeatTiers(newTiers);
                                                            }}
                                                            className="premium-input w-full !text-sm !h-10 text-center"
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <input
                                                            type="number"
                                                            value={tier.price}
                                                            placeholder="Price"
                                                            onChange={e => {
                                                                const newTiers = [...seatTiers];
                                                                newTiers[idx].price = parseFloat(e.target.value);
                                                                setSeatTiers(newTiers);
                                                            }}
                                                            className="premium-input w-full !text-sm !h-10 text-center"
                                                        />
                                                    </div>
                                                    <div className="col-span-2 flex justify-end">
                                                        <button
                                                            onClick={() => setSeatTiers(seatTiers.filter((_, i) => i !== idx))}
                                                            className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all font-black"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-3 text-[9px] text-gray-500 font-bold uppercase tracking-widest text-center">
                                            Total Rows: {seatTiers.reduce((acc, t) => acc + (t.rows || 0), 0)} (A-{String.fromCharCode(64 + seatTiers.reduce((acc, t) => acc + (t.rows || 0), 0))})
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-white/5">
                                        <button onClick={() => handleGenerateSeats(genScreenId!)} className="neon-button w-full">
                                            {hasExistingSeats ? 'Update Layout (Overwrite)' : 'Execute Generation'}
                                        </button>
                                        <button onClick={() => setGenScreenId(null)} className="w-full text-gray-600 text-xs font-black uppercase tracking-widest hover:text-white transition-colors">Abort Node Setup</button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
