import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Star, Users, Bell } from 'lucide-react';
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
  const navigate = useNavigate();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [selectedShowtime, setSelectedShowtime] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount] = useState(0);

  useEffect(() => {
    (async () => {
      const res = await api.get(`/movies/${id}`);
      setMovie(res.data);
    })();
  }, [id]);

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const formatDateKey = (d: string) =>
    new Date(d).toDateString();

  const formatDisplayDate = (d: string) =>
    new Date(d).toLocaleDateString([], {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  const groupedShowtimes = useMemo(() => {
    if (!movie?.showtimes) return {};

    return movie.showtimes.reduce((acc, show) => {
      const key = formatDateKey(show.startTime);
      if (!acc[key]) acc[key] = [];
      acc[key].push(show);
      return acc;
    }, {} as Record<string, Showtime[]>);
  }, [movie]);

  const effectiveSelectedDate = selectedDate || Object.keys(groupedShowtimes)[0] || null;

  if (!movie) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-28">

      {/* HERO BANNER */}
      <div className="relative h-[50vh]">
        <img
          src={movie.bannerUrl || movie.posterUrl}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent" />

        {/* Top Controls */}
        <div className="absolute top-10 left-4 right-4 flex justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center"
          >
            <ChevronLeft />
          </button>

          <button
            onClick={() => setIsNotifOpen(true)}
            className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center relative"
          >
            <Bell />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Movie Info */}
        <div className="absolute bottom-6 left-5 right-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="px-2 py-1 rounded bg-amber-500/20 flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-bold text-amber-400">
                {movie.rating}
              </span>
            </div>
            <span className="text-sm text-neutral-400">
              {movie.genre} • {movie.duration} min
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight">
            {movie.title}
          </h1>

          <div className="flex flex-wrap gap-2 mt-3">
            {[movie.language, movie.audio, movie.format].map((item, i) => (
              <span
                key={i}
                className="px-3 py-1 text-xs font-semibold rounded-full bg-neutral-800"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* SYNOPSIS */}
      <div className="px-5 mt-6">
        <h3 className="text-sm font-bold text-neutral-400 uppercase mb-2">
          Synopsis
        </h3>
        <p className="text-neutral-300 leading-relaxed">
          {movie.description}
        </p>
      </div>

      {/* DATE SELECTOR (Horizontal like BMS) */}
      <div className="mt-6 px-5">
        <h3 className="text-sm font-bold text-neutral-400 uppercase mb-3">
          Select Date
        </h3>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {Object.keys(groupedShowtimes).map(date => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`min-w-[100px] p-3 rounded-xl text-center transition ${
                effectiveSelectedDate === date
                  ? 'bg-amber-500 text-black'
                  : 'bg-neutral-900 border border-neutral-800'
              }`}
            >
              <p className="text-xs font-medium">
                {formatDisplayDate(date)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* SHOWTIMES GRID */}
      <div className="px-5 mt-6">
        <h3 className="text-sm font-bold text-neutral-400 uppercase mb-3">
          Select Showtime
        </h3>

        {effectiveSelectedDate && groupedShowtimes[effectiveSelectedDate] ? (
          <div className="grid grid-cols-2 gap-3">
            {groupedShowtimes[effectiveSelectedDate].map(show => (
              <button
                key={show.id}
                onClick={() =>
                  setSelectedShowtime(prev =>
                    prev === show.id ? null : show.id
                  )
                }
                className={`p-4 rounded-xl border transition text-left ${
                  selectedShowtime === show.id
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'bg-neutral-900 border-neutral-800 hover:border-amber-500'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">
                    {formatTime(show.startTime)}
                  </span>
                </div>
                <p className="text-xs opacity-80">
                  {show.screen.theater.name} • {show.screen.name}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-neutral-500">
            No showtimes available
          </div>
        )}
      </div>

      {/* FIXED CTA */}
      <AnimatePresence>
        {selectedShowtime !== null && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-5 bg-neutral-950 border-t border-neutral-800"
          >
            <button
              onClick={() => navigate(`/booking/${selectedShowtime}`)}
              className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              Select Seats
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <NotificationCenter
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />
    </div>
  );
};

export default MovieDetails;
