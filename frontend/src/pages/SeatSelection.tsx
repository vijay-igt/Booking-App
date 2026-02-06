import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Info } from 'lucide-react';
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
    const location = useLocation();

    useEffect(() => {
        const fetchShowtimeDetails = async () => {
            try {
                const response = await api.get(`/showtimes/${showtimeId}/seats`);
                setSeats(response.data);
            } catch (error) {
                console.error('Error fetching seats:', error);
            } finally {
                setLoading(false);
            }
        };
        if (showtimeId) fetchShowtimeDetails();
    }, [showtimeId]);

    const toggleSeat = (id: number, status: string) => {
        if (status === 'booked') return;
        setSelectedSeats((prev) =>
            prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
        );
    };

    const handleBooking = async () => {
        if (!auth?.token) {
            navigate('/login', { state: { from: location.pathname } });
            return;
        }

        if (selectedSeats.length === 0) return;
        setIsBooking(true);
        try {
            const totalPrice = selectedSeats.reduce((acc, id) => {
                const seat = seats.find(s => s.id === id);
                return acc + (seat ? Number(seat.price) : 0);
            }, 0);

            const bookingData = {
                showtimeId: parseInt(showtimeId!),
                seatIds: selectedSeats,
                totalAmount: totalPrice,
                userId: auth?.user?.id
            };
            await api.post('/bookings', bookingData);

            navigate('/history');
        } catch (error: any) {
            console.error('Booking error:', error);
            alert(error.response?.data?.message || 'Error creating booking.');
        } finally {
            setIsBooking(false);
        }
    };

    const groupedSeats = seats.reduce((acc: { [key: string]: Seat[] }, seat) => {
        if (!acc[seat.type]) acc[seat.type] = [];
        acc[seat.type].push(seat);
        return acc;
    }, {});

    const sortedTiers = Object.keys(groupedSeats).sort((a, b) => {
        const priceA = groupedSeats[a][0]?.price || 0;
        const priceB = groupedSeats[b][0]?.price || 0;
        return priceB - priceA;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin"></div>
                </div>
            </div>
        );
    }

    const totalPrice = selectedSeats.reduce((acc, id) => {
        const seat = seats.find(s => s.id === id);
        return acc + (seat ? Number(seat.price) : 0);
    }, 0);

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800">
                <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </motion.button>
                        <div>
                            <h1 className="font-bold">Select Seats</h1>
                            <p className="text-xs text-neutral-500">Choose your preferred seats</p>
                        </div>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center">
                        <Info className="w-5 h-5 text-neutral-400" />
                    </button>
                </div>
            </div>

            {/* Screen Indicator */}
            <div className="pt-8 pb-6 px-5">
                <div className="max-w-md mx-auto">
                    <div className="h-1 w-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent rounded-full mb-2"></div>
                    <p className="text-center text-xs text-neutral-500 font-medium uppercase tracking-wider">Screen</p>
                </div>
            </div>

            {/* Seats */}
            <div className="px-5 pb-32">
                {seats.length === 0 ? (
                    <div className="py-20 text-center">
                        <p className="text-neutral-500">No seats available</p>
                    </div>
                ) : (
                    <div className="max-w-md mx-auto space-y-8">
                        {sortedTiers.map((tier) => {
                            const tierSeats = groupedSeats[tier];
                            const tierRows = [...new Set(tierSeats.map(s => s.row))].sort().reverse();
                            const price = tierSeats[0]?.price || 0;

                            return (
                                <motion.div
                                    key={tier}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-3"
                                >
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{tier}</span>
                                        <span className="text-sm font-bold text-emerald-400">₹{price}</span>
                                    </div>

                                    <div className="space-y-2">
                                        {tierRows.map((row) => (
                                            <div key={row} className="flex items-center gap-2">
                                                <span className="w-6 text-xs text-neutral-500 font-bold text-center">{row}</span>
                                                <div className="flex-1 flex justify-center gap-1.5">
                                                    {tierSeats
                                                        .filter((s) => s.row === row)
                                                        .sort((a, b) => a.number - b.number)
                                                        .map((seat) => {
                                                            const isSelected = selectedSeats.includes(seat.id);
                                                            const isBooked = seat.status === 'booked';

                                                            return (
                                                                <motion.button
                                                                    key={seat.id}
                                                                    whileTap={!isBooked ? { scale: 0.9 } : {}}
                                                                    disabled={isBooked}
                                                                    onClick={() => toggleSeat(seat.id, seat.status)}
                                                                    className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all ${isBooked
                                                                        ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                                                                        : isSelected
                                                                            ? 'bg-emerald-500 text-white scale-105 shadow-lg shadow-emerald-500/50'
                                                                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-emerald-500/50'
                                                                        }`}
                                                                >
                                                                    {seat.number}
                                                                </motion.button>
                                                            );
                                                        })}
                                                </div>
                                                <span className="w-6 text-xs text-neutral-500 font-bold text-center">{row}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Fixed Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-800">
                {/* Legend */}
                <div className="px-5 py-3 flex items-center justify-center gap-6 border-b border-neutral-800">
                    {[
                        { color: 'bg-neutral-900 border border-neutral-800', label: 'Available' },
                        { color: 'bg-emerald-500', label: 'Selected' },
                        { color: 'bg-neutral-800', label: 'Occupied' }
                    ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${item.color}`}></div>
                            <span className="text-xs text-neutral-500">{item.label}</span>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <AnimatePresence>
                    {selectedSeats.length > 0 && (
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            className="p-5"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-xs text-neutral-500 mb-0.5">{selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} selected</p>
                                    <p className="text-2xl font-bold">₹{totalPrice}</p>
                                </div>
                                <button
                                    onClick={handleBooking}
                                    disabled={isBooking}
                                    className="px-8 py-4 rounded-2xl bg-emerald-500 text-white font-bold disabled:opacity-50"
                                >
                                    {isBooking ? 'Processing...' : 'Continue'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {selectedSeats.length === 0 && (
                    <div className="p-5 text-center">
                        <p className="text-sm text-neutral-500">Select seats to continue</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SeatSelection;