import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, ChevronRight, Clock, Sparkles, User, LogIn, MapPin, Crosshair, X } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import SiteFooter from '../components/SiteFooter';
import NotificationCenter from '../components/NotificationCenter';
import { useAuth } from '../context/useAuth';
import { useWebSocket } from '../context/WebSocketContextDefinition';
import { onMessageListener } from '../config/firebase';

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

type LocationSource = 'browser' | 'manual';

interface StoredLocation {
    lat: number;
    lng: number;
    label?: string;
    source: LocationSource;
}

const LOCATION_STORAGE_KEY = 'cinepass:location';

const POPULAR_CITIES: { name: string; query: string }[] = [
    { name: 'Mumbai', query: 'Mumbai, India' },
    { name: 'Kochi', query: 'Kochi, India' },
    { name: 'Delhi-NCR', query: 'Delhi NCR, India' },
    { name: 'Bengaluru', query: 'Bengaluru, India' },
    { name: 'Hyderabad', query: 'Hyderabad, India' },
    { name: 'Chandigarh', query: 'Chandigarh, India' },
    { name: 'Ahmedabad', query: 'Ahmedabad, India' },
    { name: 'Pune', query: 'Pune, India' },
    { name: 'Chennai', query: 'Chennai, India' },
    { name: 'Kolkata', query: 'Kolkata, India' },
];

const CATEGORIES = ["All", "Action", "Comedy", "Sci-Fi", "Romantic", "Thriller", "Drama"];

const UserHome: React.FC = () => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [locationPromptOpen, setLocationPromptOpen] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);
    const [manualLocationQuery, setManualLocationQuery] = useState('');
    const [userLocation, setUserLocation] = useState<StoredLocation | null>(null);
    const [locationLabel, setLocationLabel] = useState<string | null>(null);
    const navigate = useNavigate();
    const auth = useAuth();
    const { subscribe } = useWebSocket();
    const locationInitializedRef = useRef(false);
    const autoDetectAttemptedRef = useRef(false);

    const reverseGeocodeClient = useCallback(async (lat: number, lng: number): Promise<string | null> => {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            if (!data || !data.address) return null;
            const address = data.address as Record<string, string | undefined>;
            const city = address.city || address.town || address.village || address.county;
            const state = address.state || address.region;
            if (city && state) return `${city}, ${state}`;
            if (city) return city;
            if (state) return state;
            if (typeof data.display_name === 'string') return data.display_name;
            return null;
        } catch (error) {
            console.error('Error reverse geocoding client location:', error);
            return null;
        }
    }, []);

    const geocodeQueryClient = useCallback(async (query: string): Promise<{ lat: number; lng: number; label: string } | null> => {
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            if (!Array.isArray(data) || !data[0]) return null;
            const first = data[0];
            const lat = parseFloat(first.lat);
            const lng = parseFloat(first.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            const label = typeof first.display_name === 'string' ? first.display_name : query;
            return { lat, lng, label };
        } catch (error) {
            console.error('Error geocoding manual location query:', error);
            return null;
        }
    }, []);

    const storeLocationPreference = useCallback((location: StoredLocation) => {
        try {
            localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
        } catch (error) {
            console.error('Error storing location preference:', error);
        }
    }, []);

    const applyLocation = useCallback(async (lat: number, lng: number, source: LocationSource, labelOverride?: string) => {
        setIsDetectingLocation(true);
        setLocationError('');
        try {
            let label: string | null | undefined = labelOverride;
            if (!label) {
                label = await reverseGeocodeClient(lat, lng);
            }
            const finalLabel = label ?? undefined;
            const stored: StoredLocation = {
                lat,
                lng,
                label: finalLabel,
                source,
            };
            setUserLocation(stored);
            if (finalLabel) {
                setLocationLabel(finalLabel);
            }
            storeLocationPreference(stored);
            setLocationPromptOpen(false);
        } finally {
            setIsDetectingLocation(false);
        }
    }, [reverseGeocodeClient, storeLocationPreference]);

    const handleDetectLocation = useCallback(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setLocationError('Location detection is not supported in this browser.');
            return;
        }
        setIsDetectingLocation(true);
        setLocationError('');
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                applyLocation(latitude, longitude, 'browser');
            },
            error => {
                console.error('Geolocation error:', error);
                if (error.code === 1) {
                    setLocationError('Permission denied. You can search your city manually.');
                } else {
                    setLocationError('Unable to detect location. Please try manual search.');
                }
                setIsDetectingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            },
        );
    }, [applyLocation]);

    const handleManualLocationSubmit = useCallback(async (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        setLocationError('');
        setIsDetectingLocation(true);
        try {
            const result = await geocodeQueryClient(trimmed);
            if (!result) {
                setLocationError('Could not find this location. Try another city or ZIP code.');
                return;
            }
            await applyLocation(result.lat, result.lng, 'manual', result.label);
        } finally {
            setIsDetectingLocation(false);
        }
    }, [applyLocation, geocodeQueryClient]);

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
        const unsubscribe = onMessageListener(() => {
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

        loadUnreadCount();

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

    useEffect(() => {
        if (locationInitializedRef.current) return;
        locationInitializedRef.current = true;
        try {
            const storedRaw = localStorage.getItem(LOCATION_STORAGE_KEY);
            if (storedRaw) {
                const parsed = JSON.parse(storedRaw) as StoredLocation;
                if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
                    setUserLocation(parsed);
                    if (parsed.label) {
                        setLocationLabel(parsed.label);
                    }
                    return;
                }
            }
        } catch (error) {
            console.error('Error loading stored location preference:', error);
        }
        setLocationPromptOpen(true);
    }, []);

    useEffect(() => {
        if (!locationPromptOpen) return;
        if (autoDetectAttemptedRef.current) return;
        if (typeof navigator === 'undefined' || !navigator.geolocation) return;
        autoDetectAttemptedRef.current = true;
        handleDetectLocation();
    }, [locationPromptOpen, handleDetectLocation]);

    const filteredMovies = movies.filter(m =>
        (selectedCategory === "All" || m.genre.includes(selectedCategory)) &&
        m.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const featuredMovies = movies.slice(0, 3);
    const currentFeatured = featuredMovies[featuredIndex];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-amber-500/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white pb-32">
            <div className="h-safe-top bg-transparent"></div>

            <header className="px-5 pt-4 pb-3">
                <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    <div>
                        <motion.p
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="text-[11px] uppercase tracking-[0.2em] text-amber-400/80 font-medium"
                        >
                            Cinepass Presents
                        </motion.p>
                        <motion.h1
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12 }}
                            className="text-3xl font-extrabold tracking-tight"
                        >
                            Book movies in a new light
                        </motion.h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {auth.user ? (
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/profile')}
                                className="flex items-center gap-3 rounded-full pl-1 pr-4 py-1 bg-neutral-900 border border-neutral-800"
                            >
                                <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-lg">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="text-left hidden sm:block">
                                    <p className="text-[11px] text-neutral-500 font-medium leading-none mb-0.5">Welcome back</p>
                                    <p className="text-sm font-semibold text-white leading-none">{auth.user.name}</p>
                                </div>
                            </motion.button>
                        ) : (
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/login')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm"
                            >
                                <LogIn className="w-4 h-4" />
                                <span>Sign In</span>
                            </motion.button>
                        )}


                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsNotifOpen(true)}
                            aria-label="Open notifications"
                            aria-haspopup="dialog"
                            aria-expanded={isNotifOpen}
                            className="relative w-11 h-11 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800"
                        >
                            <Bell className="w-5 h-5 text-slate-200" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border-2 border-neutral-950"></span>
                            )}
                        </motion.button>
                    </div>
                </div>

                <NotificationCenter
                    isOpen={isNotifOpen}
                    onClose={() => {
                        setIsNotifOpen(false);
                        fetchNotifications();
                    }}
                />

                <div className="mt-3 md:mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <button
                        type="button"
                        onClick={() => setLocationPromptOpen(true)}
                        className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                    >
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                            <span className="text-[11px] uppercase tracking-wide text-neutral-500">
                                {locationLabel ? 'Showing content near' : 'Choose your location'}
                            </span>
                            <span className="text-sm font-semibold text-white truncate max-w-full">
                                {locationLabel || 'Tap to set your city'}
                            </span>
                        </div>
                    </button>
                    {userLocation && (
                        <button
                            type="button"
                            onClick={() => setLocationPromptOpen(true)}
                            className="shrink-0 h-9 px-3 inline-flex items-center justify-center rounded-full text-xs font-semibold text-amber-400 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                        >
                            Change
                        </button>
                    )}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative z-30 mt-2"
                >
                    <label htmlFor="home-search" className="sr-only">
                        Search movies
                    </label>
                    <div className="relative h-12 md:h-13 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center shadow-[0_18px_45px_rgba(0,0,0,0.6)] focus-within:ring-2 focus-within:ring-amber-500/70 focus-within:ring-offset-2 focus-within:ring-offset-neutral-950">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                        <input
                            id="home-search"
                            type="text"
                            placeholder="Search for a movie, language, or genre"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-full pl-12 pr-4 bg-transparent rounded-xl text-sm md:text-base text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                        />
                    </div>

                    <AnimatePresence>
                        {searchQuery.length > 0 && filteredMovies.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-neutral-950/95 border border-neutral-800 backdrop-blur-xl overflow-hidden"
                            >
                                {filteredMovies.slice(0, 5).map((movie) => (
                                    <button
                                        key={movie.id}
                                        type="button"
                                        onClick={() => navigate(`/movie/${movie.id}`)}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-900 transition-colors text-left"
                                    >
                                        <img
                                            src={movie.posterUrl}
                                            alt={movie.title}
                                            loading="lazy"
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
                </div>
            </header>

            {currentFeatured && (
                <section className="px-5 mb-8">
                    <div className="max-w-6xl mx-auto">
                    <div className="relative h-[280px] md:h-[320px] rounded-2xl overflow-hidden card border border-neutral-800">
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
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 mb-2">
                                    <Sparkles className="w-3 h-3 text-amber-400" />
                                    <span className="text-xs font-semibold text-amber-300">Featured</span>
                                </div>
                                <h2 className="text-2xl font-bold mb-1.5 line-clamp-1">{currentFeatured.title}</h2>
                                <p className="text-sm text-neutral-400 mb-3 line-clamp-2">{currentFeatured.description}</p>
                                <button
                                    onClick={() => navigate(`/movie/${currentFeatured.id}`)}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm"
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
                    </div>
                </section>
            )}

            <section className="mb-6 px-5">
                <div className="max-w-6xl mx-auto">
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {CATEGORIES.map((cat, idx) => (
                            <motion.button
                                key={cat}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                                    selectedCategory === cat
                                        ? 'bg-amber-500 text-black'
                                        : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:border-neutral-700'
                                }`}
                            >
                                {cat}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-5">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">Now Showing</h3>
                        <button
                            type="button"
                            className="text-sm text-neutral-400 font-medium hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 rounded-full px-3 py-1"
                        >
                            See all
                        </button>
                    </div>

                    {filteredMovies.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                                <Search className="w-8 h-8 text-neutral-500" />
                            </div>
                            <p className="text-neutral-500">No movies found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
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
                                    <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-2 bg-neutral-900 border border-neutral-800">
                                        <img
                                            src={movie.posterUrl}
                                            alt={movie.title}
                                            loading="lazy"
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                        <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-neutral-950/90 border border-amber-500/40">
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
                </div>
            </section>

            <AnimatePresence>
                {locationPromptOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 backdrop-blur-sm"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="location-dialog-title"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                            className="mt-20 w-full max-w-xl mx-4 rounded-2xl card border border-neutral-800"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                                <div>
                                    <p className="text-[11px] font-semibold text-amber-400 tracking-wide uppercase">
                                        Location
                                    </p>
                                    <h3 id="location-dialog-title" className="mt-1 text-lg font-bold">
                                        Choose where you watch movies
                                    </h3>
                                    <p className="mt-1 text-xs text-neutral-400 max-w-md">
                                        Set your city so Cinepass can personalize showtimes, offers, and reminders for you.
                                    </p>
                                </div>
                            <button
                                    type="button"
                                    onClick={() => setLocationPromptOpen(false)}
                                className="ml-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="px-5 py-4 space-y-4">
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs font-semibold text-neutral-300 mb-1.5">
                                            Search your city or PIN code
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={manualLocationQuery}
                                                    onChange={(e) => setManualLocationQuery(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleManualLocationSubmit(manualLocationQuery);
                                                        }
                                                    }}
                                                    placeholder="Try Mumbai, Kochi, or your PIN code"
                                                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                disabled={manualLocationQuery.trim().length === 0 || isDetectingLocation}
                                                onClick={() => handleManualLocationSubmit(manualLocationQuery)}
                                                className="inline-flex items-center justify-center px-3 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-black disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                Set
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {POPULAR_CITIES.map((city) => (
                                            <button
                                                key={city.name}
                                                type="button"
                                                onClick={() => handleManualLocationSubmit(city.query)}
                                                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-200 hover:border-amber-500/50 hover:text-white transition-colors text-left"
                                            >
                                                {city.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t border-slate-700/80 pt-4 mt-2 space-y-3">
                                    <p className="text-xs font-semibold text-neutral-300">
                                        Or let Cinepass detect your location
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleDetectLocation}
                                        disabled={isDetectingLocation}
                                        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center">
                                                <Crosshair className="w-4 h-4 text-amber-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-semibold text-white">Use my current location</p>
                                                <p className="text-xs text-neutral-400">
                                                    Your browser will ask for permission. We do not store precise GPS data.
                                                </p>
                                            </div>
                                        </div>
                                        {isDetectingLocation ? (
                                            <div className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        )}
                                    </button>

                                    {locationError && (
                                        <p className="text-xs text-red-300 mt-1">
                                            {locationError}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SiteFooter />
            <BottomNav />
        </div>
    );
};

export default UserHome;
