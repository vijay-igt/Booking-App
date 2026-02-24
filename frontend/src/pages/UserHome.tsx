import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Star, Clock, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from '../lib/utils';

interface Movie {
    id: number;
    title: string;
    description: string;
    genre: string;
    duration: number;
    posterUrl: string;
    bannerUrl?: string;
    trailerUrl?: string;
    rating: string;
    releaseDate?: string;
    popularityScore?: number;
}

const CATEGORIES = ["All", "Action", "Comedy", "Sci-Fi", "Thriller", "Drama", "Romantic"];

const UserHome: React.FC = () => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [recommended, setRecommended] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingRecommendations, setLoadingRecommendations] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState("All");

    const navigate = useNavigate();
    // const { user } = useAuth(); // Removed unused variable

    const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);
    const [recsEmblaRef, recsEmblaApi] = useEmblaCarousel({ loop: false, align: 'start' });
    const [recsSelectedIndex, setRecsSelectedIndex] = useState(0);
    const [recsScrollSnaps, setRecsScrollSnaps] = useState<number[]>([]);

    useEffect(() => {
        if (!recsEmblaApi) return;
        const onSelect = () => {
            setRecsSelectedIndex(recsEmblaApi.selectedScrollSnap());
        };
        setRecsScrollSnaps(recsEmblaApi.scrollSnapList());
        recsEmblaApi.on('select', onSelect);
        onSelect();
        return () => {
            recsEmblaApi.off('select', onSelect);
        };
    }, [recsEmblaApi]);

    const scrollRecsPrev = () => {
        if (recsEmblaApi) {
            recsEmblaApi.scrollPrev();
        }
    };

    const scrollRecsNext = () => {
        if (recsEmblaApi) {
            recsEmblaApi.scrollNext();
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [moviesRes, recsRes] = await Promise.all([
                    api.get('/movies'),
                    api.get('/movies/recommendations')
                ]);
                setMovies(moviesRes.data);
                setRecommended(recsRes.data);
            } catch (error) {
                console.error('Error loading home data:', error);
            } finally {
                setLoading(false);
                setLoadingRecommendations(false);
            }
        };
        fetchData();
    }, []);

    const filteredMovies = movies.filter(m =>
        (selectedCategory === "All" || m.genre.includes(selectedCategory)) &&
        m.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const featuredMovies = movies.slice(0, 5); // Take top 5 for hero slider

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                    <p className="text-emerald-500 font-medium animate-pulse">Loading Experience...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white selection:bg-emerald-500/30">
            <Navbar />

            {/* Hero Carousel */}
            <section className="relative h-[85vh] w-full overflow-hidden" ref={emblaRef}>
                <div className="flex h-full">
                    {featuredMovies.map((movie) => (
                        <div key={movie.id} className="relative flex-[0_0_100%] h-full min-w-0">
                            {/* Background Image */}
                            <div className="absolute inset-0">
                                <img
                                    src={movie.bannerUrl || movie.posterUrl}
                                    alt={movie.title}
                                    className="w-full h-full object-cover"
                                />
                                {/* Gradients */}
                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/40 to-transparent" />
                            </div>

                            {/* Content */}
                            <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-32">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8 }}
                                    className="max-w-2xl"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                            Now Showing
                                        </span>
                                        <div className="flex items-center gap-1 text-amber-400">
                                            <Star className="w-4 h-4 fill-amber-400" />
                                            <span className="text-sm font-bold">{movie.rating}</span>
                                        </div>
                                    </div>

                                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 text-white leading-tight">
                                        {movie.title}
                                    </h1>

                                    <p className="text-lg text-neutral-300 line-clamp-2 md:line-clamp-3 mb-8 max-w-xl">
                                        {movie.description}
                                    </p>

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => navigate(`/movie/${movie.id}`)}
                                            className="h-14 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-lg flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                                        >
                                            <img src="https://cdn-icons-png.flaticon.com/512/2855/2855422.png" alt="Ticket" className="w-6 h-6 opacity-80" />
                                            Get Tickets
                                        </button>
                                        <button onClick={() => navigate(`/movie/${movie.id}`)} className="h-14 w-14 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all hover:scale-105 group">
                                            <Play className="w-6 h-6 text-white ml-1 group-hover:text-emerald-400 transition-colors" />
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
                    <div className="w-6 h-10 rounded-full border-2 border-white flex justify-center pt-2">
                        <div className="w-1 h-2 bg-white rounded-full animate-scroll" /> {/* Custom animate-scroll needed or just use consistent bounce */}
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-20 relative z-10">

                {loadingRecommendations ? null : recommended.length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl md:text-2xl font-bold text-white">Recommended for you</h2>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider">Based on activity and popularity</p>
                        </div>
                        <div className="relative">
                            <div className="overflow-hidden" ref={recsEmblaRef}>
                                <div className="flex gap-4">
                                    {recommended.map((movie) => (
                                        <motion.div
                                            key={movie.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.3 }}
                                            className="group relative flex-[0_0_70%] sm:flex-[0_0_40%] md:flex-[0_0_30%] lg:flex-[0_0_20%]"
                                        >
                                            <div
                                                onClick={() => navigate(`/movie/${movie.id}`)}
                                                className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-neutral-800 cursor-pointer shadow-2xl transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-emerald-500/10"
                                            >
                                                <img
                                                    src={movie.posterUrl}
                                                    alt={movie.title}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                                                <div className="absolute inset-0 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <button className="w-full h-10 rounded-xl bg-emerald-500 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                                                        Book Now
                                                    </button>
                                                </div>
                                                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-neutral-950/80 backdrop-blur-md border border-white/10 flex items-center gap-1 pointer-events-none">
                                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                    <span className="text-xs font-bold text-white">{movie.rating}</span>
                                                </div>
                                            </div>
                                            <div className="mt-3 space-y-1">
                                                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">{movie.title}</h3>
                                                <div className="flex items-center gap-3 text-xs text-neutral-400">
                                                    <span>{movie.genre.split(',')[0]}</span>
                                                    <span className="w-1 h-1 rounded-full bg-neutral-700" />
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{movie.duration}m</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={scrollRecsPrev}
                                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-neutral-950/80 border border-white/10 items-center justify-center text-white hover:bg-neutral-900"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={scrollRecsNext}
                                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-9 h-9 rounded-full bg-neutral-950/80 border border-white/10 items-center justify-center text-white hover:bg-neutral-900"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex justify-center mt-4 gap-2">
                            {recsScrollSnaps.map((_, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                        if (recsEmblaApi) {
                                            recsEmblaApi.scrollTo(index);
                                        }
                                    }}
                                    className={cn(
                                        "w-2 h-2 rounded-full transition-colors",
                                        index === recsSelectedIndex ? "bg-emerald-500" : "bg-neutral-700"
                                    )}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-2 overflow-x-auto pb-4 md:pb-0 no-scrollbar mask-gradient-right">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "px-6 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border",
                                    selectedCategory === cat
                                        ? "bg-emerald-500 text-neutral-950 border-emerald-500 shadow-lg shadow-emerald-500/20"
                                        : "bg-neutral-900/50 text-neutral-400 border-white/5 hover:border-white/20 hover:text-white backdrop-blur-md"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="relative group w-full md:w-72 shrink-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find a movie..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 rounded-2xl bg-neutral-900/50 border border-white/5 pl-11 pr-4 text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/50 focus:bg-neutral-900 focus:ring-1 focus:ring-emerald-500/20 backdrop-blur-md transition-all"
                        />
                    </div>
                </div>

                {/* Movie Grid */}
                {filteredMovies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
                        <Search className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg">No movies found matching your criteria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredMovies.map((movie, index) => (
                            <motion.div
                                key={movie.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                className="group relative"
                            >
                                {/* Card */}
                                <div
                                    onClick={() => navigate(`/movie/${movie.id}`)}
                                    className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-neutral-800 cursor-pointer shadow-2xl transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-emerald-500/10"
                                >
                                    <img
                                        src={movie.posterUrl}
                                        alt={movie.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        loading="lazy"
                                    />

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />

                                    {/* Hover Reveal Content */}
                                    <div className="absolute inset-0 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <button className="w-full h-10 rounded-xl bg-emerald-500 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                                            Book Now
                                        </button>
                                    </div>

                                    {/* Floating Rating Badge */}
                                    <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-neutral-950/80 backdrop-blur-md border border-white/10 flex items-center gap-1 pointer-events-none">
                                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                        <span className="text-xs font-bold text-white">{movie.rating}</span>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="mt-3 space-y-1">
                                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">{movie.title}</h3>
                                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                                        <span>{movie.genre.split(',')[0]}</span>
                                        <span className="w-1 h-1 rounded-full bg-neutral-700" />
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>{movie.duration}m</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <SiteFooter />
        </div>
    );
};

export default UserHome;
