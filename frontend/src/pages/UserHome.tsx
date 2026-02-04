import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Home, Ticket, User, Star, Play, Info } from 'lucide-react';

interface Movie {
    id: number;
    title: string;
    description: string;
    genre: string;
    duration: number;
    posterUrl: string;
    rating: string;
}

const CATEGORIES = ["All", "Action", "Sci-Fi", "Romance", "Thriller", "Drama"];

const UserHome: React.FC = () => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [heroIndex, setHeroIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/movies');
                setMovies(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching movies:', error);
                setLoading(false);
            }
        };
        fetchMovies();
    }, []);

    // Auto-rotate hero carousel
    useEffect(() => {
        if (movies.length > 0) {
            const interval = setInterval(() => {
                setHeroIndex((prev) => (prev + 1) % Math.min(movies.length, 5));
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [movies]);

    const filteredMovies = movies.filter(m =>
        (selectedCategory === "All" || m.genre.includes(selectedCategory)) &&
        m.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const heroMovies = movies.slice(0, 5);
    const currentHero = heroMovies[heroIndex];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-[#0a0a0b] text-white pb-32 overflow-x-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 to-[#0a0a0b] pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none"></div>

            {/* Header */}
            <header className="px-8 pt-8 pb-4 flex justify-between items-center sticky top-0 z-30 backdrop-blur-md bg-[#0a0a0b]/80 border-b border-white/5">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white"><span className="text-blue-500">Cine</span>Pass</h1>
                </div>
                <motion.div
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate('/profile')}
                    className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-blue-500 cursor-pointer hover:bg-white/10 transition-colors"
                >
                    <User className="w-5 h-5" />
                </motion.div>
            </header>

            <main className="space-y-10">
                {/* Hero Carousel */}
                {currentHero && (
                    <div className="relative h-[55vh] w-full group overflow-hidden">
                        <AnimatePresence mode='wait'>
                            <motion.div
                                key={currentHero.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.7 }}
                                className="absolute inset-0 w-full h-full"
                            >
                                {/* Blurred Background Layer */}
                                <img
                                    src={currentHero.posterUrl}
                                    className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-110"
                                    alt=""
                                />
                                {/* Main Focused Image */}
                                <img
                                    src={currentHero.posterUrl}
                                    className="relative w-full h-full object-contain md:object-cover md:object-[center_20%] opacity-80"
                                    alt={currentHero.title}
                                />
                            </motion.div>
                        </AnimatePresence>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/20 to-transparent"></div>

                        <div className="absolute bottom-0 left-0 w-full p-8 z-10">
                            <motion.div
                                key={`text-${currentHero.id}`}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <span className="px-3 py-1 bg-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg mb-3 inline-block">
                                    Featured Premiere
                                </span>
                                <h2 className="text-5xl font-black tracking-tighter leading-none mb-3 line-clamp-2 text-white">
                                    {currentHero.title}
                                </h2>
                                <div className="flex items-center gap-4 text-xs font-bold text-gray-300 mb-6">
                                    <span className="flex items-center gap-1 text-yellow-500"><Star className="w-3 h-3 fill-yellow-500" /> {currentHero.rating}</span>
                                    <span>•</span>
                                    <span>{currentHero.genre}</span>
                                    <span>•</span>
                                    <span>{currentHero.duration}m</span>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => navigate(`/movie/${currentHero.id}`)}
                                        className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-wider text-xs hover:bg-blue-500 transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                                    >
                                        <Ticket className="w-4 h-4" /> Book Now
                                    </button>
                                    <button
                                        onClick={() => navigate(`/movie/${currentHero.id}`)}
                                        className="glass-card px-6 py-3 rounded-2xl font-black uppercase tracking-wider text-xs hover:bg-white/10 transition-colors flex items-center gap-2"
                                    >
                                        <Info className="w-4 h-4" /> Details
                                    </button>
                                </div>
                            </motion.div>
                        </div>

                        {/* Pagination Dots */}
                        <div className="absolute bottom-8 right-8 flex gap-2 z-20">
                            {heroMovies.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === heroIndex ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/30'}`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Search & Categories */}
                <div className="px-8 space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find your next experience..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="premium-input w-full pl-14 py-4 text-base bg-white/5 border-white/5 focus:bg-white/10"
                        />
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-8 px-8">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 border ${selectedCategory === cat
                                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                    : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30 hover:text-white'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Movie Grid */}
                <section className="px-8">
                    <div className="flex justify-between items-end mb-6">
                        <h3 className="text-xl font-black tracking-tight text-white">Now Showing</h3>
                    </div>

                    {filteredMovies.length === 0 ? (
                        <div className="py-20 text-center glass-card rounded-[32px] border-dashed border-white/5 flex flex-col items-center justify-center text-gray-500 gap-4">
                            <Search className="w-10 h-10 opacity-20" />
                            <p className="font-medium">No movies found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
                            {filteredMovies.map((movie, index) => (
                                <motion.div
                                    key={movie.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.05, duration: 0.4 }}
                                    onClick={() => navigate(`/movie/${movie.id}`)}
                                    className="group cursor-pointer"
                                >
                                    <div className="relative aspect-[2/3] rounded-[32px] overflow-hidden mb-4 shadow-2xl bg-gray-900">
                                        <img
                                            src={movie.posterUrl}
                                            alt={movie.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform duration-300 delay-100">
                                                <Play className="w-6 h-6 ml-1 fill-white" />
                                            </div>
                                        </div>
                                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                            <span className="text-[10px] font-black text-yellow-500 flex items-center gap-1">
                                                <Star className="w-3 h-3 fill-yellow-500" /> {movie.rating}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-white leading-tight line-clamp-1 group-hover:text-blue-500 transition-colors">{movie.title}</h4>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1.5">{movie.genre}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* Premium Floating Bottom Nav */}
            <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-card px-8 py-5 rounded-[40px] border-white/10 flex items-center gap-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-50 backdrop-blur-3xl bg-[#0a0a0b]/60">
                <motion.div
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate('/')}
                    className="cursor-pointer text-blue-500 flex flex-col items-center gap-1"
                >
                    <Home className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
                </motion.div>
                <motion.div
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate('/history')}
                    className="cursor-pointer text-gray-500 hover:text-white transition-colors flex flex-col items-center gap-1"
                >
                    <Ticket className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Tickets</span>
                </motion.div>
                <motion.div
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate('/profile')}
                    className="cursor-pointer text-gray-500 hover:text-white transition-colors flex flex-col items-center gap-1"
                >
                    <User className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Profile</span>
                </motion.div>
            </nav>
        </div>
    );
};

export default UserHome;
