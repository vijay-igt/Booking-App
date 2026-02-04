import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Film, Star, Calendar, MapPin, Globe, Mic, Info, X } from 'lucide-react';

interface Movie {
    id: number;
    title: string;
    description: string;
    genre: string;
    duration: number;
    rating: string;
    posterUrl: string;
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
    const navigate = useNavigate();
    const containerRef = useRef(null);

    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 500], [0, 150]);
    const opacity = useTransform(scrollY, [0, 400], [1, 0]);

    useEffect(() => {
        const fetchMovie = async () => {
            try {
                const response = await api.get(`/movies/${id}`);
                setMovie(response.data);
            } catch (error) {
                console.error('Error fetching movie details:', error);
            }
        };
        fetchMovie();
    }, [id]);

    if (!movie) return (
        <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
        <div className="bg-[#0a0a0b] min-h-screen text-white pb-40" ref={containerRef}>
            {/* Parallax Hero */}
            <div className="relative h-[75vh] w-full overflow-hidden">
                <motion.div style={{ y, opacity }} className="absolute inset-0 w-full h-full">
                    <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/20 to-transparent"></div>
                </motion.div>

                {/* Back Button */}
                <div className="absolute top-8 left-8 z-30">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(-1)}
                        className="w-12 h-12 glass-card rounded-full flex items-center justify-center hover:bg-white/10 transition-colors border border-white/20 backdrop-blur-md"
                    >
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </motion.button>
                </div>

                {/* Hero Content */}
                <div className="absolute bottom-0 left-0 w-full p-8 z-20 bg-gradient-to-t from-[#0a0a0b] to-transparent pt-32">
                    <div className="max-w-4xl mx-auto">
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6 }}
                            className="space-y-6"
                        >
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                                    Now Showing
                                </span>
                                <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-lg border border-yellow-500/20">
                                    <Star className="w-3 h-3 fill-yellow-500" />
                                    <span className="text-xs font-black">{movie.rating}</span>
                                </div>
                                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">{movie.duration} min</span>
                                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">{movie.genre}</span>
                            </div>

                            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none text-white drop-shadow-2xl">
                                {movie.title}
                            </h1>

                            <div className="flex gap-6 pt-4">
                                <div className="flex items-start gap-3 glass-card p-4 rounded-2xl max-w-sm border-white/10 bg-white/5">
                                    <Info className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                                    <p className="text-sm text-gray-300 leading-relaxed font-medium line-clamp-3">
                                        {movie.description}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-4xl mx-auto px-8 py-12 space-y-16">

                {/* Tech Specs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: Globe, label: "Language", value: movie.language || "English" },
                        { icon: Mic, label: "Audio", value: movie.audio || "Dolby Atmos" },
                        { icon: Film, label: "Format", value: movie.format || "IMAX 2D" },
                        { icon: Calendar, label: "Release", value: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "2024" }
                    ].map((item, idx) => (
                        <div key={idx} className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center group hover:bg-white/5 transition-colors">
                            <item.icon className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                            <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest">{item.label}</p>
                            <p className="text-sm font-bold text-white">{item.value}</p>
                        </div>
                    ))}
                </div>

                {/* Showtimes */}
                <div id="showtimes">
                    <h3 className="text-2xl font-black tracking-tight mb-8 flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-blue-500" />
                        Select Showtime
                    </h3>

                    {movie.showtimes && movie.showtimes.length > 0 ? (
                        <div className="space-y-4">
                            {movie.showtimes.map((st, index) => (
                                <motion.div
                                    key={st.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => setSelectedShowtime(st.id)}
                                    className={`glass-card p-6 rounded-3xl border transition-all cursor-pointer group flex justify-between items-center ${selectedShowtime === st.id
                                        ? 'border-blue-500 bg-blue-600/10 shadow-[0_0_30px_rgba(37,99,235,0.2)]'
                                        : 'border-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border transition-colors ${selectedShowtime === st.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'
                                            }`}>
                                            <span className="text-xs font-black uppercase">{formatTime(st.startTime).split(' ')[1]}</span>
                                            <span className="text-lg font-black">{formatTime(st.startTime).split(' ')[0]}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-white">{st.screen.theater.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <MapPin className="w-3 h-3 text-gray-500" />
                                                <p className="text-xs text-gray-500 font-medium">{st.screen.name} • {formatDate(st.startTime)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-white">${st.price}</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Per Ticket</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center glass-card rounded-3xl border-dashed border-white/10">
                            <p className="text-gray-500 font-medium">No showtimes available presently.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Booking Bar */}
            <AnimatePresence>
                {selectedShowtime && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-0 left-0 w-full p-6 z-40 bg-[#0a0a0b]/80 backdrop-blur-xl border-t border-white/10"
                    >
                        <div className="max-w-4xl mx-auto flex items-center justify-between">
                            <div className="hidden md:block">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Total Selection</p>
                                <p className="text-white text-lg font-black">1 Showtime Selected</p>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <button
                                    onClick={() => setSelectedShowtime(null)}
                                    className="p-4 rounded-2xl glass-card hover:bg-white/10 transition-colors md:hidden"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => navigate(`/booking/${selectedShowtime}`)}
                                    className="flex-1 md:flex-none neon-button py-4 px-12 text-sm uppercase tracking-widest flex items-center justify-center gap-3"
                                >
                                    Proceed to Seats <ChevronLeft className="w-4 h-4 rotate-180" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MovieDetails;
