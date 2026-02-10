import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Info, Wallet, CreditCard, Clock } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import CountdownTimer from '../components/CountdownTimer';

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
    const auth = useAuth();
    const [seats, setSeats] = useState<Seat[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
    const [isBooking, setIsBooking] = useState(false);
    const [loading, setLoading] = useState(true);
    const [walletBalance, setWalletBalance] = useState(0);
    const [lockExpiry, setLockExpiry] = useState<number | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (auth.token) {
            api.get('/wallet/balance')
                .then(res => setWalletBalance(Number(res.data.balance)))
                .catch(err => console.error(err));
        }
    }, [auth?.token]);

    const fetchShowtimeDetails = useCallback(async () => {
        try {
            const response = await api.get(`/showtimes/${showtimeId}/seats`);
            setSeats(response.data);
        } catch (error) {
            console.error('Error fetching seats:', error);
        } finally {
            setLoading(false);
        }
    }, [showtimeId, setSeats, setLoading]);

    useEffect(() => {
        if (showtimeId) fetchShowtimeDetails();
    }, [showtimeId, fetchShowtimeDetails]);

    const toggleSeat = (id: number, status: string) => {
        if (status === 'booked' || lockExpiry) return;
        setSelectedSeats((prev) =>
            prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
        );
    };

    const handleLock = async () => {
        if (!auth.token) {
            navigate('/login', { state: { from: location.pathname } });
            return;
        }
        if (selectedSeats.length === 0) return;

        setIsBooking(true);
        try {
            const response = await api.post('/lock', {
                showtimeId: parseInt(showtimeId!),
                seatIds: selectedSeats
            });
            const { expiresIn } = response.data; // seconds
            setLockExpiry(Date.now() + expiresIn * 1000);
        } catch (error: unknown) {
            console.error('Lock error:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                alert(error.response.data.message);
            } else {
                alert('Error locking seats.');
            }
            // Refresh seats to show what's taken
            fetchShowtimeDetails();
            setSelectedSeats([]);
        } finally {
            setIsBooking(false);
        }
    };

    const handleExpire = () => {
        alert("Session Expired");
        setLockExpiry(null);
        setSelectedSeats([]);
        fetchShowtimeDetails();
    };

    const handleBooking = async (paymentMethod: 'WALLET' | 'ONLINE') => {
        if (!auth.token) {
            navigate('/login', { state: { from: location.pathname } });
            return;
        }

        if (selectedSeats.length === 0) return;

        const totalPrice = selectedSeats.reduce((acc, id) => {
            const seat = seats.find(s => s.id === id);
            return acc + (seat ? Number(seat.price) : 0);
        }, 0);

        if (paymentMethod === 'WALLET' && walletBalance < totalPrice) {
            alert('Insufficient wallet balance!');
            return;
        }

        setIsBooking(true);
        try {
            const bookingData = {
                showtimeId: parseInt(showtimeId!),
                seatIds: selectedSeats,
                totalAmount: totalPrice,
                userId: auth.user?.id,
                paymentMethod
            };
            await api.post('/bookings', bookingData);

            navigate('/history');
        } catch (error: unknown) {
            console.error('Booking error:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                alert(error.response.data.message);
            } else {
                alert('Error creating booking.');
            }
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

    function isAxiosError(error: unknown): error is { response: { data: { message: string } } } {
        if (typeof error !== 'object' || error === null) {
            return false;
        }

        if (!('response' in error) || typeof (error as { response: unknown }).response !== 'object' || (error as { response: unknown }).response === null) {
            return false;
        }

        const response = (error as { response: { data: unknown } }).response;

        if (!('data' in response) || typeof response.data !== 'object' || response.data === null) {
            return false;
        }

        const data = (response as { data: { message: unknown } }).data;

        return 'message' in data && typeof (data as { message: unknown }).message === 'string';
    }

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
                            onClick={() => {
                                if (lockExpiry) {
                                    if (window.confirm("Cancelling will release your seats. Continue?")) {
                                        navigate(-1);
                                    }
                                } else {
                                    navigate(-1);
                                }
                            }}
                            className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </motion.button>
                        <div>
                            <h1 className="font-bold">Select Seats</h1>
                            <p className="text-xs text-neutral-500">Choose your preferred seats</p>
                        </div>
                    </div>
                    {lockExpiry && (
                         <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <CountdownTimer targetTime={lockExpiry} onExpire={handleExpire} />
                         </div>
                    )}
                    {!lockExpiry && (
                         <button className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center">
                            <Info className="w-5 h-5 text-neutral-400" />
                        </button>
                    )}
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
                                                                    whileTap={!isBooked && !lockExpiry ? { scale: 0.9 } : {}}
                                                                    disabled={isBooked || (lockExpiry !== null)}
                                                                    onClick={() => toggleSeat(seat.id, seat.status)}
                                                                    className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all ${isBooked
                                                                        ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                                                                        : isSelected
                                                                            ? 'bg-emerald-500 text-white scale-105 shadow-lg shadow-emerald-500/50'
                                                                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-emerald-500/50'
                                                                        } ${lockExpiry ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-neutral-500 mb-0.5">{selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} selected</p>
                                        <p className="text-2xl font-bold">₹{totalPrice}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1.5 justify-end text-neutral-400 mb-0.5">
                                            <Wallet className="w-3 h-3" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Wallet Balance</span>
                                        </div>
                                        <p className={`text-sm font-bold ${walletBalance >= totalPrice ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            ₹{walletBalance.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                {!lockExpiry ? (
                                    <button
                                        onClick={handleLock}
                                        disabled={isBooking}
                                        className="h-12 w-full rounded-xl bg-emerald-500 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                                    >
                                        Proceed to Payment
                                    </button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleBooking('ONLINE')}
                                            disabled={isBooking}
                                            className="h-12 rounded-xl bg-neutral-800 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 border border-white/5 hover:bg-neutral-700"
                                        >
                                            <CreditCard className="w-4 h-4" />
                                            Pay Online
                                        </button>
                                        <button
                                            onClick={() => handleBooking('WALLET')}
                                            disabled={isBooking || walletBalance < totalPrice}
                                            className="h-12 rounded-xl bg-emerald-500 text-white font-bold disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                                        >
                                            <Wallet className="w-4 h-4" />
                                            Pay with Wallet
                                        </button>
                                    </div>
                                )}
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
