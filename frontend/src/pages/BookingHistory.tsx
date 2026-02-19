import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Download,
  Share2,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import BottomNav from '../components/BottomNav';
import SiteFooter from '../components/SiteFooter';
import * as htmlToImage from 'html-to-image';

interface Booking {
  id: number;
  totalAmount: number;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  showtime: {
    startTime: string;
    movie: {
      title: string;
      posterUrl: string;
    };
    screen: {
      name: string;
      theater: {
        name: string;
      };
    };
  };
  tickets: {
    seat: {
      row: string;
      number: number;
    };
  }[];
}

const BookingHistory: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
  if (!auth?.user) return;

  const userId = auth.user.id; // ✅ store in local variable

  (async () => {
    try {
      const res = await api.get(`/bookings/user/${userId}`);
      setBookings(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  })();
}, [auth?.user]);

  const now = Date.now();

  const upcoming = useMemo(
    () =>
      bookings.filter(
        b =>
          b.status !== 'cancelled' &&
          new Date(b.showtime.startTime).getTime() >= now
      ),
    [bookings, now]
  );

  const past = useMemo(
    () =>
      bookings.filter(
        b =>
          b.status !== 'cancelled' &&
          new Date(b.showtime.startTime).getTime() < now
      ),
    [bookings, now]
  );

  const list = tab === 'upcoming' ? upcoming : past;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const downloadTicket = async (id: number) => {
    const el = document.getElementById(`ticket-${id}`);
    if (!el) return;

    const img = await htmlToImage.toPng(el, {
      pixelRatio: 2,
      backgroundColor: '#0a0a0a',
    });

    const link = document.createElement('a');
    link.href = img;
    link.download = `ticket-${id}.png`;
    link.click();
  };

  const shareTicket = async (booking: Booking) => {
    const text = `🎬 ${booking.showtime.movie.title}\n📍 ${booking.showtime.screen.theater.name}\n🎟 Seats: ${booking.tickets
      .map(t => `${t.seat.row}${t.seat.number}`)
      .join(', ')}`;

    if (navigator.share) {
      await navigator.share({ title: 'Movie Ticket', text });
    } else {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-neutral-950/95 backdrop-blur border-b border-neutral-800">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center"
          >
            <ChevronLeft />
          </button>
          <div>
            <h1 className="font-bold text-lg">My Bookings</h1>
            <p className="text-xs text-neutral-500">
              {bookings.length} tickets
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-6">
          {(['upcoming', 'past'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative pb-3 capitalize"
            >
              <span
                className={`text-sm font-semibold ${
                  tab === t ? 'text-white' : 'text-neutral-500'
                }`}
              >
                {t}
              </span>
              {tab === t && (
                <motion.div
                  layoutId="tab"
                  className="absolute left-0 right-0 bottom-0 h-0.5 bg-amber-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-5 space-y-5">
        {list.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-neutral-900 rounded-full mx-auto flex items-center justify-center mb-4">
              <Ticket className="w-10 h-10 text-neutral-600" />
            </div>
            <h3 className="font-semibold mb-2">No {tab} bookings</h3>
            <p className="text-sm text-neutral-500">
              {tab === 'upcoming'
                ? 'Book a movie to see it here'
                : 'Your past movies will appear here'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {list.map((b, i) => (
              <motion.div
                key={b.id}
                id={`ticket-${b.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4 }}
                className="relative card border border-neutral-800 rounded-2xl overflow-hidden"
              >
                {/* Perforation */}
                <div className="absolute -left-3 top-1/2 w-6 h-6 bg-neutral-950 rounded-full -translate-y-1/2" />
                <div className="absolute -right-3 top-1/2 w-6 h-6 bg-neutral-950 rounded-full -translate-y-1/2" />

                {/* Poster */}
                <div className="relative h-40">
                  <img
                    src={b.showtime.movie.posterUrl}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-xl font-extrabold tracking-tight">
                      {b.showtime.movie.title}
                    </h3>
                    <p className="text-sm text-neutral-400">
                      {b.showtime.screen.theater.name}
                    </p>
                  </div>

                  <span
                    className={`absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full ${
                      b.status === 'confirmed'
                        ? 'bg-amber-500/20 text-amber-400'
                        : b.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {b.status.toUpperCase()}
                  </span>
                </div>

                {/* Details */}
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Info icon={<Calendar />} label="Date" value={formatDate(b.showtime.startTime)} />
                    <Info icon={<Clock />} label="Time" value={formatTime(b.showtime.startTime)} />
                  </div>

                  <div>
                    <Info
                      icon={<MapPin />}
                      label="Screen & Seats"
                      value={b.showtime.screen.name}
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {b.tickets.map((t, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-lg bg-neutral-800 text-xs font-bold"
                        >
                          {t.seat.row}
                          {t.seat.number}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-dashed border-neutral-700" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-neutral-500">Total</p>
                      <p className="text-2xl font-extrabold text-amber-400">
                        ₹{b.totalAmount}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <ActionBtn onClick={() => downloadTicket(b.id)} icon={<Download />} />
                      <ActionBtn onClick={() => shareTicket(b)} icon={<Share2 />} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <SiteFooter />
      <BottomNav />
    </div>
  );
};

const Info = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 bg-neutral-800 rounded-lg flex items-center justify-center text-amber-400">
      {icon}
    </div>
    <div>
      <p className="text-[10px] text-neutral-500 uppercase">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  </div>
);

const ActionBtn = ({
  icon,
  onClick,
}: {
  icon: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition"
  >
    {icon}
  </button>
);

export default BookingHistory;
