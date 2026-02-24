import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Download,
  Share2,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';
import { cn } from '../lib/utils';
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
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 pt-24 pb-24">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent uppercase">
              My Tickets
            </h1>
            <p className="text-sm text-neutral-500 font-medium mt-2 tracking-widest uppercase">
              {bookings.length} Cinematic Experiences
            </p>
          </div>

          {/* Modern Tabs */}
          <div className="flex p-1.5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/5">
            {(['upcoming', 'past'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "relative px-8 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-300 rounded-xl overflow-hidden",
                  tab === t ? "text-neutral-950" : "text-neutral-500 hover:text-white"
                )}
              >
                <span className="relative z-10">{t}</span>
                {tab === t && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {list.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-32 bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/5 border-dashed"
            >
              <div className="w-24 h-24 bg-neutral-900/50 rounded-full mx-auto flex items-center justify-center mb-6 border border-white/5 shadow-2xl">
                <Ticket className="w-12 h-12 text-neutral-700" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No {tab} bookings found</h3>
              <p className="text-neutral-500 text-sm max-w-xs mx-auto">
                {tab === 'upcoming'
                  ? 'Your next adventure is a click away. Explore the latest releases!'
                  : 'You haven\'t watched any movies yet. Let\'s make some memories.'}
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {list.map((b, i) => (
                <motion.div
                  key={b.id}
                  id={`ticket-${b.id}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 overflow-hidden hover:border-emerald-500/30 transition-all duration-500"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Poster Sidebar */}
                    <div className="relative w-full md:w-48 h-64 md:h-auto overflow-hidden">
                      <img
                        src={b.showtime.movie.posterUrl}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        alt={b.showtime.movie.title}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0a0a0a]/90 hidden md:block" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/90 via-transparent to-transparent md:hidden" />

                      <div className="absolute top-4 left-4">
                        <span className={cn(
                          "px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-full backdrop-blur-md shadow-2xl",
                          b.status === 'confirmed' ? "bg-emerald-500 text-neutral-950" :
                            b.status === 'pending' ? "bg-amber-500 text-neutral-950" : "bg-red-500 text-white"
                        )}>
                          {b.status}
                        </span>
                      </div>
                    </div>

                    {/* Ticket Details */}
                    <div className="flex-1 p-8 md:p-10 relative">
                      {/* Perforation Effect */}
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#0a0a0a] rounded-full z-10 hidden md:block" />

                      <div className="flex flex-col h-full justify-between gap-8">
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-3xl font-black tracking-tighter uppercase italic text-white group-hover:text-emerald-400 transition-colors">
                                {b.showtime.movie.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-2 text-neutral-400">
                                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-xs font-bold uppercase tracking-widest">{b.showtime.screen.theater.name}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Ticket ID</p>
                              <p className="text-sm font-bold text-white">#TKN-{b.id.toString().padStart(6, '0')}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-10">
                            <InfoItem icon={<Calendar />} label="Date" value={formatDate(b.showtime.startTime)} />
                            <InfoItem icon={<Clock />} label="Showtime" value={formatTime(b.showtime.startTime)} />
                            <div className="col-span-2 md:col-span-1">
                              <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-1.5">Screen & Seats</p>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{b.showtime.screen.name}</span>
                                <div className="flex gap-1.5">
                                  {b.tickets.slice(0, 3).map((t, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-emerald-400">
                                      {t.seat.row}{t.seat.number}
                                    </span>
                                  ))}
                                  {b.tickets.length > 3 && (
                                    <span className="text-[10px] font-bold text-neutral-600">+{b.tickets.length - 3}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-dashed border-white/10 pt-8 mt-2 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Total Paid</p>
                            <p className="text-3xl font-black text-white italic">
                              <span className="text-emerald-500 mr-1 italic">₹</span>{b.totalAmount}
                            </p>
                          </div>

                          <div className="flex gap-3">
                            <ActionIconButton
                              onClick={() => downloadTicket(b.id)}
                              icon={<Download className="w-5 h-5" />}
                              label="Download"
                            />
                            <ActionIconButton
                              onClick={() => shareTicket(b)}
                              icon={<Share2 className="w-5 h-5" />}
                              label="Share"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
};

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div>
    <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-1.5">{label}</p>
    <div className="flex items-center gap-2">
      <div className="text-emerald-500">{React.cloneElement(icon as React.ReactElement<any>, { size: 14, strokeWidth: 3 })}</div>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  </div>
);

const ActionIconButton = ({ icon, onClick, label }: { icon: React.ReactNode, onClick: () => void, label: string }) => (
  <button
    onClick={onClick}
    className="group/btn flex flex-col items-center gap-2"
  >
    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 shadow-xl shadow-transparent hover:shadow-emerald-500/10">
      {icon}
    </div>
    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-600 group-hover/btn:text-emerald-500 transition-colors">{label}</span>
  </button>
);

export default BookingHistory;
