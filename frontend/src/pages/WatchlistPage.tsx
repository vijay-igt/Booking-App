import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Clock, Star, Film } from 'lucide-react';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';
import api from '../api';

interface Movie {
  id: number;
  title: string;
  description: string;
  genre: string;
  duration: number;
  posterUrl: string;
  rating: string;
  releaseDate?: string;
}

const WatchlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const removeFromWatchlist = async (movieId: number) => {
    try {
      await api.delete(`/movies/${movieId}/watchlist`);
      setMovies((prev) => prev.filter((m) => m.id !== movieId));
    } catch (error) {
      console.error('Error removing from watchlist', error);
    }
  };

  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const res = await api.get('/movies/watchlist');
        setMovies(res.data);
      } catch (error) {
        console.error('Error fetching watchlist', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlist();
  }, []);

  return (
    <div className="min-h-screen bg-[#050509] text-white font-sans selection:bg-emerald-500/30">
      <Navbar />

      <div className="relative h-48 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-purple-500/10 to-transparent" />
        <div className="absolute inset-0 backdrop-blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050509] to-transparent" />
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-28 relative z-10 pb-24">
        <header className="flex items-center justify-between mb-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-widest uppercase">
              <Heart className="w-4 h-4" />
              <span>Watchlist</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Movies you want to watch</h1>
            <p className="text-sm text-neutral-400">
              We will notify you when new showtimes open in your selected city.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          </div>
        ) : movies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-20 h-20 rounded-full border border-dashed border-emerald-500/40 flex items-center justify-center bg-emerald-500/5">
              <Heart className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">No movies in your watchlist yet</h2>
              <p className="text-sm text-neutral-400 max-w-md">
                Browse movies on the home page and tap the heart icon on any title to save it here.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-sm font-bold tracking-widest uppercase shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-transform hover:-translate-y-0.5"
            >
              Discover Movies
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {movies.map((movie, index) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative flex flex-col text-left rounded-3xl overflow-hidden bg-white/5 border border-white/10 hover:border-emerald-500/40 hover:bg-white/10 transition-all shadow-xl hover:-translate-y-1"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/movie/${movie.id}`)}
                  className="relative aspect-[2/3] overflow-hidden w-full text-left"
                >
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 text-[10px] font-semibold tracking-widest uppercase">
                    <Film className="w-3 h-3 text-emerald-400" />
                    <span>Watchlisted</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWatchlist(movie.id);
                    }}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-rose-400 hover:bg-black/80 transition-colors"
                  >
                    <Heart className="w-4 h-4 fill-rose-400" />
                  </button>
                </button>

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold line-clamp-2">{movie.title}</h2>
                      <p className="text-[11px] text-neutral-400 uppercase tracking-[0.18em]">
                        {movie.genre}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] font-semibold">{movie.rating}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>{movie.duration} min</span>
                    </div>
                    {movie.releaseDate && (
                      <span>
                        {new Date(movie.releaseDate).getFullYear()}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
};

export default WatchlistPage;

