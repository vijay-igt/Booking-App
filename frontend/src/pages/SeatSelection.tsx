import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';
import { ChevronLeft, Armchair, Search } from 'lucide-react';
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

    const getSeatColor = (status: string, selected: boolean) => {
        if (status === 'booked') return 'bg-[#ebebeb] border-[#ebebeb] text-[#ebebeb] cursor-not-allowed';
        if (selected) return 'bg-[#4abd5d] border-[#4abd5d] text-white';
        return 'bg-white border-[#4abd5d] text-[#4abd5d] hover:bg-[#4abd5d]/5';
    };

    const groupedSeats = seats.reduce((acc: { [key: string]: Seat[] }, seat) => {
        if (!acc[seat.type]) acc[seat.type] = [];
        acc[seat.type].push(seat);
        return acc;
    }, {});

    // Sort tiers by price descending (typically premium at the back/top)
    const sortedTiers = Object.keys(groupedSeats).sort((a, b) => {
        const priceA = groupedSeats[a][0]?.price || 0;
        const priceB = groupedSeats[b][0]?.price || 0;
        return priceB - priceA;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen text-gray-900 pb-32">
            {/* Header */}
            <header className="py-4 px-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </motion.button>
                    <div>
                        <h1 className="text-sm font-bold text-gray-800">Select Seats</h1>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Showtime #{showtimeId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Search className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto pt-12 px-4 relative">
                {/* Row Sidebar (Left) */}
                <div className="absolute left-4 top-24 bottom-24 w-8 flex flex-col items-center py-8 bg-gray-50/50 rounded-full border border-gray-100 hidden md:flex">
                    {rows.reverse().map(row => (
                        <div key={row} className="h-10 flex items-center justify-center text-[10px] font-bold text-gray-400">
                            {row}
                        </div>
                    ))}
                </div>

                <div className="flex flex-col items-center gap-12">
                    {seats.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <Armchair className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-xl font-bold text-gray-400">Cinema layout pending</p>
                        </div>
                    ) : (
                        <div className="w-full space-y-12">
                            {sortedTiers.map((tier) => {
                                const tierSeats = groupedSeats[tier];
                                const tierRows = [...new Set(tierSeats.map(s => s.row))].sort().reverse();
                                const price = tierSeats[0]?.price || 0;

                                return (
                                    <div key={tier} className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-gray-100"></div>
                                            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                                                ₹{price} {tier} Rows
                                            </h2>
                                            <div className="h-[1px] flex-1 bg-gray-100"></div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {tierRows.map((row) => (
                                                <div key={row} className="flex justify-center gap-2">
                                                    {tierSeats
                                                        .filter((s) => s.row === row)
                                                        .sort((a, b) => a.number - b.number)
                                                        .map((seat) => (
                                                            <motion.button
                                                                key={seat.id}
                                                                whileHover={seat.status !== 'booked' ? { scale: 1.05 } : {}}
                                                                whileTap={seat.status !== 'booked' ? { scale: 0.95 } : {}}
                                                                disabled={seat.status === 'booked'}
                                                                onClick={() => toggleSeat(seat.id)}
                                                                className={`w-7 h-7 rounded-md border text-[9px] font-bold transition-all flex items-center justify-center ${getSeatColor(seat.status, selectedSeats.includes(seat.id))
                                                                    }`}
                                                            >
                                                                {seat.number.toString().padStart(2, '0')}
                                                            </motion.button>
                                                        ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Bottom Screen Projection */}
                    <div className="mt-12 flex flex-col items-center w-full max-w-md">
                        <div className="w-full h-8 bg-blue-50/50 rounded-b-[40px] border-b-2 border-blue-100 shadow-[0_15px_30px_-10px_rgba(59,130,246,0.1)] relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent rounded-b-[40px]"></div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 mt-4 uppercase tracking-wider">All eyes this way please</p>
                    </div>
                </div>

            </main>

            {/* Bottom Legend */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 py-6 px-8 z-40">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-wrap items-center justify-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-md border border-amber-400 bg-amber-50"></div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bestseller</span>
                            <div className="w-2 h-2 rounded-full border border-gray-300"></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-md border border-[#4abd5d]"></div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-md bg-[#4abd5d]"></div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-md bg-[#ebebeb]"></div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sold</span>
                        </div>
                    </div>

                    {selectedSeats.length > 0 && (
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={handleBooking}
                            disabled={isBooking}
                            className="w-full md:w-auto px-12 py-3 bg-[#4abd5d] text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#4abd5d]/20 hover:bg-[#3ea850] transition-all"
                        >
                            {isBooking ? 'Processing...' : `Pay ₹${selectedSeats.reduce((acc, id) => {
                                const seat = seats.find(s => s.id === id);
                                return acc + (seat ? Number(seat.price) : 0);
                            }, 0)}`}
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SeatSelection;
