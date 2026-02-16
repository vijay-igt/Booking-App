import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, ChevronRight, Clock, Sparkles, User, LogIn } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import NotificationCenter from '../components/NotificationCenter';
import { useAuth } from '../context/useAuth';
import { useWebSocket } from '../context/WebSocketContextDefinition';
import { requestForToken, onMessageListener } from '../config/firebase';

interface Movie {
    id: number;
    title: string;
    description: string;
    genre: string;
    duration: number;
    posterUrl: string;
    bannerUrl?: string;
    rating: string;
}

interface Notification {
    id: string;
    message: string;
    isRead: boolean;
    timestamp: string;
    userId: number;
}

const CATEGORIES = ["All", "Action", "Comedy", "Sci-Fi", "Romantic", "Thriller", "Drama"];

const UserHome: React.FC = () => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const auth = useAuth();
    const { subscribe } = useWebSocket();

    console.log('[UserHome] Rendered. UseAuth user:', auth.user?.email);

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const response = await api.get('/movies');
                setMovies(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching movies:', error);
                setLoading(false);
            }
        };
        fetchMovies();
    }, []);

    const fetchNotifications = useCallback(async () => {
        if (!auth.user) return;
        try {
            const response = await api.get('/notifications');
            const unread = response.data.filter((n: Notification) => !n.isRead).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    }, [auth.user, setUnreadCount]);

    useEffect(() => {
        const unsubscribe = onMessageListener((payload) => {
            console.log('[UserHome] Foreground notification received:', payload);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!auth.user) return;
        let isActive = true;

        const loadUnreadCount = async () => {
            try {
                const response = await api.get('/notifications');
                if (!isActive) return;
                const unread = response.data.filter((n: Notification) => !n.isRead).length;
                setUnreadCount(unread);
            } catch (error) {
                console.error('Error fetching unread count:', error);
            }
        };

        const registerPush = async () => {
            const token = await requestForToken();
            if (token) {
                try {
                    await api.post('/notifications/subscribe', {
                        token,
                        platform: 'web'
                    });
                    console.log('[Push] Registered token with backend:', token);
                } catch (err) {
                    console.error('[Push] Failed to sync token with backend:', err);
                }
            }
        };

        loadUnreadCount();
        registerPush();

        const unsubscribe = subscribe('NOTIFICATION_RECEIVED', () => {
            console.log('[UserHome] Real-time notification received, refreshing...');
            fetchNotifications();
        });

        return () => {
            isActive = false;
            unsubscribe();
        };
    }, [auth.user, fetchNotifications, subscribe]);

    useEffect(() => {
        if (movies.length > 0) {
            const interval = setInterval(() => {
                setFeaturedIndex((prev) => (prev + 1) % Math.min(movies.length, 3));
            }, 6000);
            return () => clearInterval(interval);
        }
    }, [movies, setFeaturedIndex]);

    const filteredMovies = movies.filter(m =>
        (selectedCategory === "All" || m.genre.includes(selectedCategory)) &&
        m.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const featuredMovies = movies.slice(0, 3);
    const currentFeatured = featuredMovies[featuredIndex];

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white pb-24">
            {/* Status Bar Spacer */}
            <div className="h-safe-top bg-neutral-950"></div>

            {/* Header */}
            <header className="px-5 pt-4 pb-3">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-neutral-500 text-sm font-medium mb-0.5"
                        >
                            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}
                        </motion.p>
                        <motion.h1
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-2xl font-bold"
                        >
                            Book Your Show
                        </motion.h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {auth.user ? (
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => navigate('/profile')}
                                className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-full pl-1 pr-4 py-1"
                            >
                                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="text-left hidden sm:block">
                                    <p className="text-xs text-neutral-400 font-medium leading-none mb-0.5">Hello,</p>
                                    <p className="text-sm font-bold text-white leading-none">{auth.user.name}</p>
                                </div>
                            </motion.button>
                        ) : (
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => navigate('/login')}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-full text-white font-semibold text-sm shadow-lg shadow-emerald-500/20"
                            >
                                <LogIn className="w-4 h-4" />
                                <span>Sign In</span>
                            </motion.button>
                        )}


                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsNotifOpen(true)}
                            className="relative w-11 h-11 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800"
                        >
                            <Bell className="w-5 h-5 text-neutral-400" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-neutral-950"></span>
                            )}
                        </motion.button>
                    </div>
                </div>

                <NotificationCenter
                    isOpen={isNotifOpen}
                    onClose={() => {
                        setIsNotifOpen(false);
                        fetchNotifications(); // Refresh count when closing
                    }}
                />

                {/* Search Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative z-50"
                >
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Search movies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />

                    {/* Search Suggestions Dropdown */}
                    <AnimatePresence>
                        {searchQuery.length > 0 && filteredMovies.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl"
                            >
                                {filteredMovies.slice(0, 5).map((movie) => (
                                    <button
                                        key={movie.id}
                                        onClick={() => navigate(`/movie/${movie.id}`)}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-800 transition-colors text-left"
                                    >
                                        <img
                                            src={movie.posterUrl}
                                            alt={movie.title}
                                            className="w-8 h-10 object-cover rounded"
                                        />
                                        <div>
                                            <p className="font-semibold text-sm text-white">{movie.title}</p>
                                            <p className="text-xs text-neutral-500">{movie.genre} • {movie.rating}</p>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </header>

            {/* Featured Section */}
            {currentFeatured && (
                <section className="px-5 mb-8">
                    <div className="relative h-[280px] rounded-3xl overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentFeatured.id}
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.6 }}
                                className="absolute inset-0"
                            >
                                <img
                                    src={currentFeatured.bannerUrl || currentFeatured.posterUrl}
                                    alt={currentFeatured.title}
                                    className="w-full h-full object-cover object-top"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent"></div>
                            </motion.div>
                        </AnimatePresence>

                        <div className="absolute inset-0 p-5 flex flex-col justify-end">
                            <motion.div
                                key={`content-${currentFeatured.id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-2">
                                    <Sparkles className="w-3 h-3 text-emerald-400" />
                                    <span className="text-xs font-semibold text-emerald-400">Featured</span>
                                </div>
                                <h2 className="text-2xl font-bold mb-1.5 line-clamp-1">{currentFeatured.title}</h2>
                                <p className="text-sm text-neutral-400 mb-3 line-clamp-2">{currentFeatured.description}</p>
                                <button
                                    onClick={() => navigate(`/movie/${currentFeatured.id}`)}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-neutral-950 font-semibold text-sm"
                                >
                                    Book Now
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </motion.div>
                        </div>

                        {/* Pagination Dots */}
                        <div className="absolute top-5 right-5 flex gap-1.5">
                            {featuredMovies.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1 rounded-full transition-all duration-300 ${idx === featuredIndex ? 'w-6 bg-white' : 'w-1 bg-white/40'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Categories */}
            <section className="mb-6">
                <div className="flex gap-2 overflow-x-auto px-5 pb-2 no-scrollbar">
                    {CATEGORIES.map((cat, idx) => (
                        <motion.button
                            key={cat}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${selectedCategory === cat
                                ? 'bg-emerald-500 text-white'
                                : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                                }`}
                        >
                            {cat}
                        </motion.button>
                    ))}
                </div>
            </section>

            {/* Movies Grid */}
            <section className="px-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Now Showing</h3>
                    <button className="text-sm text-neutral-400 font-medium">See all</button>
                </div>

                {filteredMovies.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mx-auto mb-3">
                            <Search className="w-8 h-8 text-neutral-700" />
                        </div>
                        <p className="text-neutral-500">No movies found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredMovies.map((movie, index) => (
                            <motion.div
                                key={movie.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => navigate(`/movie/${movie.id}`)}
                                className="group"
                            >
                                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-2 bg-neutral-900">
                                    <img
                                        src={movie.posterUrl}
                                        alt={movie.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    {/* Rating Badge */}
                                    <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-neutral-950/80 backdrop-blur-sm border border-white/10">
                                        <span className="text-xs font-bold text-amber-400">★ {movie.rating}</span>
                                    </div>
                                </div>
                                <h4 className="font-semibold text-sm mb-0.5 line-clamp-1">{movie.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                    <span>{movie.genre}</span>
                                    <span>•</span>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{movie.duration}m</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            <BottomNav />
        </div>
    );
};

export default UserHome;
