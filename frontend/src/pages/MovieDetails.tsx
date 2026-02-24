import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';
import {
  Clock,
  Calendar,
  Star,
  Play,
  ChevronLeft,
  Share2,
  Heart,
  Info,
  Ticket,
  MapPin
} from 'lucide-react';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';

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
  releaseDate: string;
  language: string;
  director?: string;
  cast?: string[];
  isInWatchlist?: boolean;
}

const getTrailerEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === 'youtu.be') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const id = parts[0];
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }

    if (host === 'youtube.com' || host === 'www.youtube.com' || host.endsWith('.youtube.com')) {
      if (parsed.pathname === '/watch') {
        const id = parsed.searchParams.get('v');
        if (!id) return null;
        return `https://www.youtube.com/embed/${id}`;
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return `https://www.youtube.com${parsed.pathname}${parsed.search}`;
      }
    }

    return url;
  } catch {
    return url;
  }
};

const MovieDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState(false);

  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        const [movieRes, showtimesRes] = await Promise.all([
          api.get(`/movies/${id}`),
          api.get(`/showtimes/movie/${id}`)
        ]);
        setMovie(movieRes.data);
        setShowtimes(showtimesRes.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovieData();
  }, [id]);

  if (loading || !movie) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        {/* Footer */}
        <SiteFooter />
      </div>
    );
  }

  const groupedShowtimes: Record<string, any[]> = showtimes.reduce((acc: Record<string, any[]>, showtime) => {
    const theaterName = showtime.screen?.theater?.name || 'Unknown Theater';
    if (!acc[theaterName]) {
      acc[theaterName] = [];
    }
    acc[theaterName].push(showtime);
    return acc;
  }, {});

  const trailerEmbedUrl = movie.trailerUrl ? getTrailerEmbedUrl(movie.trailerUrl) : null;

  const toggleWatchlist = async () => {
    if (!movie || isUpdatingWatchlist) return;
    setIsUpdatingWatchlist(true);
    try {
      if (movie.isInWatchlist) {
        await api.delete(`/movies/${movie.id}/watchlist`);
        setMovie({ ...movie, isInWatchlist: false });
      } else {
        const location =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('selectedLocation') || undefined
            : undefined;
        await api.post(`/movies/${movie.id}/watchlist`, { location });
        setMovie({ ...movie, isInWatchlist: true });
      }
    } catch (error) {
      console.error('Watchlist update failed', error);
      alert('Unable to update watchlist. Please try again.');
    } finally {
      setIsUpdatingWatchlist(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-emerald-500/30">
      <Navbar />

      {/* Immersive Backdrop */}
      <div className="relative h-[70vh] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={movie.bannerUrl || movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover blur-sm opacity-50 scale-105"
          />
          <div className="absolute inset-0 bg-neutral-950/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent" />
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-[58vh] relative z-10 pb-20">
        <motion.button
          onClick={() => navigate(-1)}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <span className="font-medium">Back</span>
        </motion.button>

        <div className="flex flex-col md:flex-row gap-12 items-start">
          {/* Poster Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-[300px] shrink-0 mx-auto md:mx-0"
          >
            <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 relative group">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
              {trailerEmbedUrl && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-emerald-500/30"
                  >
                    <Play className="w-6 h-6 text-neutral-950 ml-1" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Movie Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1 space-y-8"
          >
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-neutral-950 text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/20">
                  Now Showing
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider border border-white/10">
                  {movie.language}
                </span>
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="font-bold">{movie.rating}</span>
                </div>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-2 leading-tight">
                {movie.title}
              </h1>
              <p className="text-xl text-neutral-400 font-light">{movie.genre}</p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-neutral-300">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-500" />
                <span className="font-medium">{movie.duration}m</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-500" />
                <span className="font-medium">{new Date(movie.releaseDate).getFullYear()}</span>
              </div>
            </div>

            <div className="space-y-4 max-w-2xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-500" />
                Synopsis
              </h3>
              <p className="text-neutral-400 leading-relaxed text-lg">
                {movie.description}
              </p>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={() => document.getElementById('showtimes-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="h-14 px-10 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-lg shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] transition-all hover:-translate-y-1"
              >
                Book Tickets
              </button>
              {trailerEmbedUrl && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="h-14 px-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-2 text-white transition-all hover:-translate-y-1"
                >
                  <Play className="w-5 h-5" />
                  <span className="font-medium text-sm">Watch Trailer</span>
                </button>
              )}
              <button className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white transition-all hover:-translate-y-1">
                <Share2 className="w-6 h-6" />
              </button>
              <button
                onClick={toggleWatchlist}
                disabled={isUpdatingWatchlist}
                className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white transition-all hover:-translate-y-1 disabled:opacity-50"
              >
                <Heart className={movie.isInWatchlist ? 'w-6 h-6 text-rose-500 fill-rose-500' : 'w-6 h-6'} />
              </button>
            </div>

            {/* Showtimes Section */}
            <div id="showtimes-section" className="pt-8 border-t border-white/5 space-y-8">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <Ticket className="w-6 h-6 text-emerald-500" />
                Select Showtime
              </h3>
              {showtimes.length === 0 ? (
                <p className="text-neutral-400">No showtimes available for this movie yet.</p>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedShowtimes).map(([theaterName, theaterShowtimes]: [string, any[]]) => (
                    <div key={theaterName} className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                        <MapPin className="w-5 h-5 text-emerald-500" />
                        <h4 className="text-xl font-bold text-white">{theaterName}</h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {theaterShowtimes.map((showtime) => (
                          <button
                            key={showtime.id}
                            onClick={() => navigate(`/booking/${showtime.id}`)}
                            className="flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-900/50 border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all group"
                          >
                            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">
                              {new Date(showtime.startTime).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                              {new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[9px] text-emerald-500/50 font-medium mt-1 uppercase">
                              {showtime.screen?.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cast & Crew Placeholder */}
            {movie.cast && (
              <div className="pt-8 border-t border-white/5">
                <h3 className="text-lg font-bold text-white mb-4">Cast & Crew</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {/* Placeholder Avatars */}
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-2 min-w-[80px]">
                      <div className="w-20 h-20 rounded-full bg-neutral-800 border border-white/5" />
                      <span className="text-xs text-neutral-400 text-center">Actor Name</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <SiteFooter />

      {trailerEmbedUrl && showTrailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative w-full max-w-3xl mx-4 bg-neutral-950 rounded-2xl overflow-hidden border border-white/10">
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black flex items-center justify-center border border-white/20"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
            <div className="w-full aspect-video bg-black">
              <iframe
                src={trailerEmbedUrl}
                title={`${movie.title} Trailer`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetails;
