import React, { useState, useEffect, useContext } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Calendar, Clock, MapPin, QrCode, Download, Share2, Ticket } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

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
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    };

    if (isLoading) return (
        <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white p-6 pb-32">
            <header className="mb-10 flex justify-between items-center max-w-lg mx-auto">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate('/')}
                    className="w-12 h-12 glass-card rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </motion.button>
                <h1 className="text-xl font-black tracking-tight">My Tickets</h1>
                <div className="w-12"></div>
            </header>

            <div className="max-w-lg mx-auto space-y-8">
                {bookings.length === 0 ? (
                    <div className="text-center py-20 glass-card rounded-[40px] border-dashed border-white/10">
                        <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium mb-6">Your ticket wallet is empty.</p>
                        <button
                            onClick={() => navigate('/')}
                            className="neon-button py-3 px-8 text-xs uppercase tracking-widest"
                        >
                            Explore Movies
                        </button>
                    </div>
                ) : (
                    <AnimatePresence>
                        {bookings.map((booking, index) => (
                            <motion.div
                                key={booking.id}
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative group"
                            >
                                {/* Ticket Card */}
                                <div className="bg-white text-black rounded-[32px] overflow-hidden shadow-2xl relative z-10">
                                    {/* Top Section */}
                                    <div className="h-40 relative">
                                        <img src={booking.showtime.movie.posterUrl} alt={booking.showtime.movie.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                        <div className="absolute bottom-4 left-6 text-white">
                                            <h3 className="text-2xl font-black leading-none mb-1">{booking.showtime.movie.title}</h3>
                                            <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">{booking.showtime.screen.theater.name}</p>
                                        </div>
                                    </div>

                                    {/* Middle Section */}
                                    <div className="p-6 pb-8 border-b-2 border-dashed border-gray-200 relative">
                                        <div className="grid grid-cols-2 gap-6 mb-6">
                                            <div>
                                                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Date</span>
                                                </div>
                                                <p className="text-sm font-black">{formatDate(booking.showtime.startTime)}</p>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Time</span>
                                                </div>
                                                <p className="text-sm font-black">{formatTime(booking.showtime.startTime)}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-gray-400 mb-2">
                                                <MapPin className="w-3 h-3" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">{booking.showtime.screen.name}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {booking.tickets.map(t => (
                                                    <span key={`${t.seat.row}${t.seat.number}`} className="bg-gray-100 px-3 py-1 rounded-lg text-xs font-black border border-gray-200">
                                                        {t.seat.row}{t.seat.number}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Perforation Circles */}
                                        <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-[#0a0a0b] rounded-full"></div>
                                        <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-[#0a0a0b] rounded-full"></div>
                                    </div>

                                    {/* Bottom Section (QR) */}
                                    <div className="p-6 bg-gray-50 flex justify-between items-center">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Booking ID</p>
                                            <p className="text-lg font-mono font-bold text-gray-600">#{booking.id.toString().padStart(6, '0')}</p>
                                        </div>
                                        <div className="bg-white p-2 rounded-xl border border-gray-200">
                                            <QrCode className="w-12 h-12 text-black" />
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-4 flex justify-center gap-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
                                        <Download className="w-4 h-4" /> Save
                                    </button>
                                    <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
                                        <Share2 className="w-4 h-4" /> Share
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default BookingHistory;
