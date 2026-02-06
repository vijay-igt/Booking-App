import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Star, Calendar, MapPin, Users, Bell } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import NotificationCenter from '../components/NotificationCenter';

interface Movie {
    id: number;
    title: string;
    description: string;
    genre: string;
    duration: number;
    rating: string;
    posterUrl: string;
    bannerUrl?: string;
    releaseDate: string;
    language: string;
    audio: string;
    format: string;
    showtimes: Showtime[];
}

interface Showtime {
    id: number;
    startTime: string;
    price: number;
    screen: {
        id: number;
        name: string;
        theater: {
            name: string;
        };
    };
}

const MovieDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [movie, setMovie] = useState<Movie | null>(null);
    const [selectedShowtime, setSelectedShowtime] = useState<number | null>(null);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const auth = React.useContext(AuthContext);

    useEffect(() => {
        const fetchMovie = async () => {
            try {
                const response = await api.get(`/movies/${id}`);
                setMovie(response.data);

                // Auto-expand today's showtimes
                if (response.data.showtimes?.length > 0) {
                    const today = new Date().toLocaleDateString();
                    setExpandedDay(today);
                }
            } catch (error) {
                console.error('Error fetching movie details:', error);
            }
        };
        fetchMovie();
    }, [id]);

    const fetchNotifications = async () => {
        if (!auth?.user) return;
        try {
            const response = await api.get('/notifications');
            const unread = response.data.filter((n: any) => !n.isRead).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    useEffect(() => {
        if (auth?.user) {
            fetchNotifications();
        }
    }, [auth?.user]);

    if (!movie) return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin"></div>
            </div>
        </div>
    );

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const groupShowtimesByDate = () => {
        if (!movie.showtimes) return {};

        return movie.showtimes.reduce((acc, showtime) => {
            const dateKey = formatDate(showtime.startTime);
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(showtime);
            return acc;
        }, {} as Record<string, Showtime[]>);
    };

    const groupedShowtimes = groupShowtimesByDate();

    return (
        <div className="min-h-screen bg-neutral-950 text-white pb-32">
            {/* Header with backdrop */}
            <div className="relative h-[45vh]">
                <div className="absolute inset-0">
                    <img
                        src={movie.bannerUrl || movie.posterUrl}
                        alt={movie.title}
                        className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/60 via-neutral-950/80 to-neutral-950"></div>
                </div>

                <div className="absolute top-12 left-5 right-5 z-20 flex items-center justify-between">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-neutral-950/60 backdrop-blur-md border border-white/10 flex items-center justify-center"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.button>

                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsNotifOpen(true)}
                        className="w-10 h-10 rounded-full bg-neutral-950/60 backdrop-blur-md border border-white/10 flex items-center justify-center relative"
                    >
                        <Bell className="w-5 h-5 text-white" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-500 rounded-full border border-neutral-950"></span>
                        )}
                    </motion.button>
                </div>

                {/* Movie info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30">
                                <div className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                    <span className="text-sm font-bold text-amber-400">{movie.rating}</span>
                                </div>
                            </div>
                            <span className="text-xs font-medium text-neutral-400">{movie.genre}</span>
                            <span className="text-neutral-600">•</span>
                            <span className="text-xs font-medium text-neutral-400">{movie.duration} min</span>
                        </div>
                        <h1 className="text-3xl font-bold mb-3">{movie.title}</h1>
                    </motion.div>
                </div>
            </div>

            {/* Content */}
            <div className="px-5 space-y-6 mt-6">
                {/* Description */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wide mb-2">Synopsis</h3>
                    <p className="text-neutral-300 leading-relaxed">{movie.description}</p>
                </motion.div>

                {/* Info Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-2 gap-3"
                >
                    {[
                        { label: 'Language', value: movie.language || 'English', icon: '🌐' },
                        { label: 'Audio', value: movie.audio || 'Dolby Atmos', icon: '🔊' },
                        { label: 'Format', value: movie.format || '2D', icon: '🎬' },
                        { label: 'Release', value: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '—', icon: '📅' }
                    ].map((item, idx) => (
                        <div
                            key={idx}
                            className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800"
                        >
                            <p className="text-2xl mb-1">{item.icon}</p>
                            <p className="text-xs text-neutral-500 font-medium mb-0.5">{item.label}</p>
                            <p className="text-sm font-semibold">{item.value}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Showtimes */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wide mb-3">Select Showtime</h3>

                    {Object.keys(groupedShowtimes).length > 0 ? (
                        <div className="space-y-3">
                            {Object.entries(groupedShowtimes).map(([date, showtimes]) => (
                                <div key={date} className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
                                    <button
                                        onClick={() => setExpandedDay(expandedDay === date ? null : date)}
                                        className="w-full p-4 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-semibold">{date}</p>
                                                <p className="text-xs text-neutral-500">{showtimes.length} shows available</p>
                                            </div>
                                        </div>
                                        <motion.div
                                            animate={{ rotate: expandedDay === date ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <ChevronLeft className="w-5 h-5 text-neutral-500 -rotate-90" />
                                        </motion.div>
                                    </button>

                                    <AnimatePresence>
                                        {expandedDay === date && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-4 space-y-2 border-t border-neutral-800 pt-4">
                                                    {showtimes.map(showtime => (
                                                        <button
                                                            key={showtime.id}
                                                            onClick={() => setSelectedShowtime(showtime.id)}
                                                            className={`w-full p-3 rounded-xl text-left transition-all ${selectedShowtime === showtime.id
                                                                ? 'bg-emerald-500 text-white'
                                                                : 'bg-neutral-800 hover:bg-neutral-750'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-semibold">{formatTime(showtime.startTime)}</span>
                                                                <span className="text-sm font-bold">₹{showtime.price}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs opacity-80">
                                                                <MapPin className="w-3 h-3" />
                                                                <span>{showtime.screen.theater.name} • {showtime.screen.name}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center rounded-2xl bg-neutral-900 border border-dashed border-neutral-800">
                            <Calendar className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                            <p className="text-neutral-500">No showtimes available</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Fixed bottom CTA */}
            <AnimatePresence>
                {selectedShowtime && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-0 left-0 right-0 p-5 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-800"
                    >
                        <button
                            onClick={() => navigate(`/booking/${selectedShowtime}`)}
                            className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold flex items-center justify-center gap-2"
                        >
                            <Users className="w-5 h-5" />
                            Select Seats
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <NotificationCenter
                isOpen={isNotifOpen}
                onClose={() => {
                    setIsNotifOpen(false);
                    fetchNotifications();
                }}
            />
        </div>
    );
};

export default MovieDetails;