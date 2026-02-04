import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Armchair } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

interface Seat {
    id: number;
    row: string;
    number: number;
    status: 'available' | 'booked';
    price: number;
    type: string;
}

const SeatSelection: React.FC = () => {
    const { showtimeId } = useParams<{ showtimeId: string }>();
    const auth = useContext(AuthContext);
    const [seats, setSeats] = useState<Seat[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
    const [isBooking, setIsBooking] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchShowtimeDetails = async () => {
            try {
                console.log('Fetching seats for showtime:', showtimeId);
                const response = await api.get(`/showtimes/${showtimeId}/seats`);
                console.log('Seats loaded:', response.data.length);
                setSeats(response.data);
            } catch (error) {
                console.error('Error fetching seats:', error);
            } finally {
                setLoading(false);
            }
        };
        if (showtimeId) fetchShowtimeDetails();
    }, [showtimeId]);

    const toggleSeat = (id: number) => {
        setSelectedSeats((prev) =>
            prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
        );
    };

    // ... (keep handleBooking same)
    const handleBooking = async () => {
        if (!auth?.user) {
            alert('Please login to book seats.');
            navigate('/login');
            return;
        }

        setIsBooking(true);
        try {
            const totalPrice = selectedSeats.reduce((acc, id) => {
                const seat = seats.find(s => s.id === id);
                return acc + (seat ? Number(seat.price) : 0);
            }, 0);

            await api.post('/bookings', {
                userId: auth.user.id,
                showtimeId: parseInt(showtimeId || '0'),
                seatIds: selectedSeats,
                totalAmount: totalPrice
            });

            navigate('/history');
        } catch (error: any) {
            console.error('Booking error:', error);
            alert(error.response?.data?.message || 'Error creating booking.');
        } finally {
            setIsBooking(false);
        }
    };

    const rows = [...new Set(seats.map((s) => s.row))].sort();

    const getSeatColor = (status: string, selected: boolean, type: string) => {
        if (status === 'booked') return 'bg-gray-800 text-gray-700 cursor-not-allowed';
        if (selected) return 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]';
        if (type === 'Premium') return 'bg-purple-900/40 border-purple-500/30 text-purple-200 hover:bg-purple-800/60 hover:border-purple-400/50';
        return 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-[#0a0a0b] min-h-screen text-white pb-32">
            {/* Header */}
            <header className="pt-8 px-8 flex items-center justify-between">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate(-1)}
                    className="w-12 h-12 glass-card rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </motion.button>
                <div className="text-center">
                    <h1 className="text-xl font-black tracking-tight">Select Seats</h1>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Showtime #{showtimeId}</p>
                </div>
                <div className="w-12" /> {/* Spacer */}
            </header>

            {/* Screen Area */}
            <div className="mt-12 mb-16 relative perspective-[1000px] flex justify-center overflow-hidden">
                <div className="w-3/4 h-8 bg-blue-500/20 blur-[60px] absolute top-10 rounded-full"></div>
                <div className="relative transform-gpu -rotate-x-12 scale-95 origin-bottom">
                    <svg width="400" height="60" viewBox="0 0 400 60" className="drop-shadow-[0_10px_30px_rgba(59,130,246,0.3)]">
                        <path d="M 0 50 Q 200 0 400 50" fill="none" stroke="url(#screenGradient)" strokeWidth="4" />
                        <defs>
                            <linearGradient id="screenGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
                                <stop offset="50%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-blue-500/50 mt-4">Screen</p>
                </div>
            </div>

            {/* Seat Grid */}
            <div className="px-6 flex flex-col items-center gap-4 mb-12">
                {seats.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <Armchair className="w-12 h-12 mx-auto mb-4" />
                        <p>No seat layout configured for this screen.</p>
                        <p className="text-xs mt-2">Please ask Admin to "Generate Seats".</p>
                    </div>
                ) : (
                    rows.map((row) => (
                        <div key={row} className="flex items-center gap-6">
                            <span className="w-4 text-[10px] font-black text-gray-600 uppercase text-center">{row}</span>
                            <div className="flex gap-3">
                                {seats
                                    .filter((s) => s.row === row)
                                    .sort((a, b) => a.number - b.number)
                                    .map((seat) => (
                                        <motion.button
                                            key={seat.id}
                                            whileTap={seat.status !== 'booked' ? { scale: 0.8 } : {}}
                                            disabled={seat.status === 'booked'}
                                            onClick={() => toggleSeat(seat.id)}
                                            className={`w-10 h-10 rounded-xl border flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${getSeatColor(seat.status, selectedSeats.includes(seat.id), seat.type)
                                                }`}
                                        >
                                            <Armchair className={`w-4 h-4 ${selectedSeats.includes(seat.id) ? 'fill-current' : ''}`} />
                                        </motion.button>
                                    ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-6 px-8 mb-12">
                {[
                    { label: 'Available', color: 'bg-white/10 border-white/20' },
                    { label: 'Selected', color: 'bg-blue-600 border-blue-500' },
                    { label: 'Occupied', color: 'bg-gray-800 border-gray-700' },
                    { label: 'Premium', color: 'bg-purple-900/40 border-purple-500/30' }
                ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-lg border ${item.color}`}></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{item.label}</span>
                    </div>
                ))}
            </div>

            {/* Sticky Summary */}
            <AnimatePresence>
                {selectedSeats.length > 0 && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-0 left-0 w-full p-6 z-40"
                    >
                        <div className="glass-card bg-[#0a0a0b]/90 backdrop-blur-xl border-white/10 p-6 rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Total</p>
                                    <p className="text-3xl font-black text-white">
                                        ${selectedSeats.reduce((acc, id) => {
                                            const seat = seats.find(s => s.id === id);
                                            return acc + (seat ? Number(seat.price) : 0);
                                        }, 0)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Seats</p>
                                    <div className="flex -space-x-2 justify-end">
                                        {selectedSeats.slice(0, 4).map((_, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-blue-600 border-2 border-[#0a0a0b] flex items-center justify-center text-[10px] font-black">
                                                ★
                                            </div>
                                        ))}
                                        {selectedSeats.length > 4 && (
                                            <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-[#0a0a0b] flex items-center justify-center text-[8px] font-black">
                                                +{selectedSeats.length - 4}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                disabled={isBooking}
                                onClick={handleBooking}
                                className="w-full neon-button py-4 rounded-2xl flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                            >
                                {isBooking ? (
                                    <>Processing...</>
                                ) : (
                                    <>Confirm <Check className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SeatSelection;
