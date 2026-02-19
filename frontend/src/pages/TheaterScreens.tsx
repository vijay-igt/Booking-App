import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  MapPin,
  Monitor,
  ChevronRight,
  Layers
} from 'lucide-react';

interface Screen {
  id: number;
  name: string;
  totalSeats?: number;
}

interface Theater {
  id: number;
  name: string;
  location: string;
  bannerUrl?: string;
  screens: Screen[];
}

const TheaterScreens: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [theater, setTheater] = useState<Theater | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTheater = async () => {
      if (!id) return;

      try {
        const response = await api.get(`/admin/theaters/${id}`);
        setTheater(response.data);
      } catch (error) {
        console.error('Error fetching theater:', error);
        setTheater(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTheater();
  }, [id]);

  /* ---------------- LOADING SKELETON ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-amber-500/10 rounded-full blur-3xl -mr-40 -mt-40" />
        <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-amber-500/5 rounded-full blur-3xl -ml-40 -mb-40" />
        <div className="h-40 bg-neutral-900/60 border-b border-neutral-800 animate-pulse" />
        <div className="px-6 pt-6 space-y-4 relative z-10">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  /* ---------------- NOT FOUND ---------------- */

  if (!theater) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-amber-500/10 rounded-full blur-3xl -mr-40 -mt-40" />
        <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-amber-500/5 rounded-full blur-3xl -ml-40 -mb-40" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4">
            <MapPin className="w-10 h-10 text-neutral-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            Theater not found
          </h3>
          <p className="text-sm text-neutral-400 mb-6 text-center max-w-sm">
            This theater may have been removed or does not exist anymore.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- MAIN UI ---------------- */

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-amber-500/10 rounded-full blur-3xl -mr-40 -mt-40" />
      <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-amber-500/5 rounded-full blur-3xl -ml-40 -mb-40" />
      <div className="relative z-10">
      {/* HERO SECTION */}
      <div className="relative">
        <div
          className="h-44 w-full bg-cover bg-center"
          style={{
            backgroundImage: theater.bannerUrl
              ? `url(${theater.bannerUrl})`
              : 'linear-gradient(to right, #0f172a, #111827)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black" />

        {/* HEADER OVERLAY */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Theater Info */}
        <div className="absolute bottom-4 left-6 right-6">
          <h1 className="text-2xl font-bold truncate">
            {theater.name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-neutral-300 mt-1">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span className="truncate">{theater.location}</span>
          </div>
        </div>
      </div>

      {/* STATS SECTION */}
      <div className="px-6 mt-6 flex gap-4">
        <div className="flex-1 bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-4 text-center">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">
            Screens
          </p>
          <p className="text-xl font-bold mt-1">
            {theater.screens.length}
          </p>
        </div>
        <div className="flex-1 bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-4 text-center">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">
            Theater ID
          </p>
          <p className="text-xl font-bold mt-1">
            #{theater.id}
          </p>
        </div>
      </div>

      {/* SCREEN LIST */}
      <div className="px-6 mt-8 pb-6">
        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wide mb-4">
          Available Screens
        </h2>

        {theater.screens.length > 0 ? (
          <div className="space-y-4">
            {theater.screens.map((screen, idx) => (
              <motion.button
                key={screen.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/booking/${screen.id}`)}
                className="w-full p-5 rounded-2xl bg-neutral-900/70 backdrop-blur-xl border border-neutral-800 
                hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 
                transition-all duration-300 flex items-center gap-4 group"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 
                flex items-center justify-center group-hover:from-amber-500/10 
                group-hover:to-amber-600/10 transition-all">
                  <Monitor className="w-6 h-6 text-neutral-400 group-hover:text-amber-400 transition-colors" />
                </div>

                <div className="flex-1 text-left">
                  <h3 className="font-semibold mb-1">
                    {screen.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <Layers className="w-3 h-3" />
                    <span>
                      {screen.totalSeats ?? '—'} seats
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-neutral-300 transition-colors" />
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center rounded-2xl bg-neutral-900/80 border border-dashed border-neutral-700">
            <Monitor className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400">
              No screens configured yet
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default TheaterScreens;
