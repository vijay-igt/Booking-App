import React, { useState, useEffect, useContext } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Calendar, Clock, MapPin, Download, Share2, Ticket, QrCode } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

interface Booking {
    id: number;
    totalAmount: number;
    createdAt: string;
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
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBookings = async () => {
            if (!auth?.user) return;
            try {
                const response = await api.get(`/bookings/user/${auth.user.id}`);
                setBookings(response.data);
            } catch (error) {
                console.error('Error fetching bookings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBookings();
    }, [auth?.user]);

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const now = new Date();
    const upcomingBookings = bookings.filter(b => new Date(b.showtime.startTime) >= now);
    const pastBookings = bookings.filter(b => new Date(b.showtime.startTime) < now);
    const displayBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

    if (isLoading) return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin"></div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-neutral-950 text-white pb-24">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800">
                <div className="px-5 py-4 flex items-center gap-3">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/')}
                        className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.button>
                    <div>
                        <h1 className="font-bold">My Bookings</h1>
                        <p className="text-xs text-neutral-500">{bookings.length} total tickets</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-5 gap-4">
                    {['upcoming', 'past'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as 'upcoming' | 'past')}
                            className="relative pb-3 capitalize"
                        >
                            <span className={`text-sm font-semibold ${activeTab === tab ? 'text-white' : 'text-neutral-500'
                                }`}>
                                {tab}
                            </span>
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="px-5 pt-5 space-y-4">
                {displayBookings.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="py-20 text-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-neutral-900 flex items-center justify-center mx-auto mb-4">
                            <Ticket className="w-10 h-10 text-neutral-700" />
                        </div>
                        <h3 className="font-semibold mb-2">No {activeTab} bookings</h3>
                        <p className="text-sm text-neutral-500 mb-6">
                            {activeTab === 'upcoming'
                                ? 'Book your next movie now!'
                                : 'Your past bookings will appear here'}
                        </p>
                        {activeTab === 'upcoming' && (
                            <button
                                onClick={() => navigate('/')}
                                className="px-6 py-3 rounded-full bg-emerald-500 text-white font-semibold"
                            >
                                Browse Movies
                            </button>
                        )}
                    </motion.div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {displayBookings.map((booking, index) => (
                            <motion.div
                                key={booking.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                                className="rounded-3xl bg-neutral-900 border border-neutral-800 overflow-hidden"
                            >
                                {/* Header with poster */}
                                <div className="relative h-32 overflow-hidden">
                                    <img
                                        src={booking.showtime.movie.posterUrl}
                                        alt={booking.showtime.movie.title}
                                        className="w-full h-full object-cover blur-sm scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/80 to-neutral-900/40"></div>
                                    <div className="absolute inset-0 p-4 flex items-end">
                                        <div className="flex items-center gap-3 w-full">
                                            <img
                                                src={booking.showtime.movie.posterUrl}
                                                alt={booking.showtime.movie.title}
                                                className="w-16 h-20 rounded-xl object-cover border-2 border-neutral-800"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-lg line-clamp-1">{booking.showtime.movie.title}</h3>
                                                <p className="text-xs text-neutral-400">{booking.showtime.screen.theater.name}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
                                                <Calendar className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Date</p>
                                                <p className="text-sm font-semibold truncate">{formatDate(booking.showtime.startTime)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
                                                <Clock className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Time</p>
                                                <p className="text-sm font-semibold">{formatTime(booking.showtime.startTime)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                                            <MapPin className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-1">Screen & Seats</p>
                                            <p className="text-sm font-semibold mb-2">{booking.showtime.screen.name}</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {booking.tickets.map((t, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-2.5 py-1 rounded-lg bg-neutral-800 text-xs font-bold border border-neutral-700"
                                                    >
                                                        {t.seat.row}{t.seat.number}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="flex items-center gap-2 py-2">
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent"></div>
                                        <QrCode className="w-5 h-5 text-neutral-700" />
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent"></div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-neutral-500 uppercase tracking-wide mb-0.5">Total Amount</p>
                                            <p className="text-xl font-bold text-emerald-400">₹{booking.totalAmount}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-750">
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-750">
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default BookingHistory;