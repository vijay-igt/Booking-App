import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';
import {
    ChevronLeft, Info, Wallet, CreditCard, Clock,
    Tag, CheckCircle2, AlertCircle,
    Armchair
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import CountdownTimer from '../components/CountdownTimer';
import { getPricingQuote } from '../services/pricingService';
import type { PricingQuoteResponse } from '../types';
import { toast } from 'react-toastify';
import { cn } from '../lib/utils'; // Assuming cn utility exists

interface Seat {
    id: number;
    row: string;
    number: number;
    status: 'available' | 'booked';
    price: number;
    type: string;
}

const MEMBERSHIP_COLORS: Record<string, string> = {
    NONE: 'text-neutral-400',
    SILVER: 'text-slate-300',
    GOLD: 'text-amber-400',
    PLATINUM: 'text-cyan-400',
};

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

    // Food selection state
    const [selectedFood, setSelectedFood] = useState<any[]>([]);
    const [foodTotal, setFoodTotal] = useState(0);

    useEffect(() => {
        if (location.state?.fromFoodSelection) {
            setSelectedSeats(location.state.selectedSeats || []);
            setSelectedFood(location.state.foodItems || []);
            setFoodTotal(location.state.totalFoodPrice || 0);
            if (location.state.lockExpiry) {
                setLockExpiry(location.state.lockExpiry);
            }
            if (location.state.bookingSubmitted) {
                bookingSubmittedRef.current = true;
            }
        }
    }, [location.state]);

    // Handle auto-restore and lock for pending booking
    useEffect(() => {
        if (!auth.token || !showtimeId || loading) return;

        const pending = localStorage.getItem('pendingBooking');
        if (pending) {
            try {
                const { showtimeId: pShowtimeId, seatIds: pSeatIds, timestamp } = JSON.parse(pending);

                // Only restore if it's the same showtime and within 10 minutes
                if (pShowtimeId === parseInt(showtimeId) && (Date.now() - timestamp < 10 * 60 * 1000)) {
                    setSelectedSeats(pSeatIds);
                    // Clear it so it doesn't re-lock on manual refresh
                    localStorage.removeItem('pendingBooking');

                    // We need to wait for the next tick or state update to ensure selectedSeats is updated
                    // Actually, we can just use pSeatIds directly for the lock call
                    const triggerAutoLock = async () => {
                        try {
                            setIsBooking(true);
                            const response = await api.post('/lock', {
                                showtimeId: pShowtimeId,
                                seatIds: pSeatIds
                            });
                            const { expiresIn } = response.data;
                            bookingSubmittedRef.current = true;
                            const expiryTime = Date.now() + expiresIn * 1000;
                            setLockExpiry(expiryTime);
                            toast.success('Your selection has been restored and locked!');
                        } catch (error: any) {
                            console.error('Auto-lock failed:', error);
                            setSelectedSeats([]);
                            if (error.response?.status === 409) {
                                toast.error('Some of your selected seats were just taken. Please pick new ones.');
                            } else {
                                toast.error('Could not restore your selection. Please try again.');
                            }
                        } finally {
                            setIsBooking(false);
                        }
                    };
                    triggerAutoLock();
                } else {
                    localStorage.removeItem('pendingBooking');
                }
            } catch (e) {
                console.error('Error parsing pending booking:', e);
                localStorage.removeItem('pendingBooking');
            }
        }
    }, [auth.token, showtimeId, loading]); // Dependencies ensure this runs once we have auth and showtime loaded
    const [quote, setQuote] = useState<PricingQuoteResponse | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState('');
    const [couponError, setCouponError] = useState('');

    const quoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const selectedSeatsRef = useRef<number[]>([]);
    const lockExpiryRef = useRef<number | null>(null);
    const bookingSubmittedRef = useRef(false);
    const isBookingRef = useRef(false);

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
    }, [showtimeId]);

    useEffect(() => {
        if (showtimeId) fetchShowtimeDetails();
    }, [showtimeId, fetchShowtimeDetails]);

    useEffect(() => {
        selectedSeatsRef.current = selectedSeats;
    }, [selectedSeats]);

    useEffect(() => {
        lockExpiryRef.current = lockExpiry;
    }, [lockExpiry]);

    const fetchQuote = useCallback(async (seatIds: number[], coupon: string) => {
        if (seatIds.length === 0) { setQuote(null); return; }
        setQuoteLoading(true);
        try {
            const result = await getPricingQuote({
                showtimeId: parseInt(showtimeId!),
                seatIds,
                couponCode: coupon || undefined,
            });
            setQuote(result);
            if (coupon && result.couponError) {
                setCouponError(result.couponError);
            } else {
                setCouponError('');
            }
        } catch {
            setQuote(null);
        } finally {
            setQuoteLoading(false);
        }
    }, [showtimeId]);

    useEffect(() => {
        if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
        quoteDebounceRef.current = setTimeout(() => {
            fetchQuote(selectedSeats, appliedCoupon);
        }, 300);
        return () => { if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current); };
    }, [selectedSeats, appliedCoupon, fetchQuote]);

    const toggleSeat = async (id: number, status: string) => {
        if (status === 'booked') return;

        const isSelecting = !selectedSeats.includes(id);

        if (auth.token) {
            try {
                if (isSelecting) {
                    console.log(`[SeatSelection] Locking seat: ${id}`);
                    const response = await api.post('/lock', {
                        showtimeId: parseInt(showtimeId!),
                        seatIds: [id]
                    });
                    const { expiresIn } = response.data;
                    const expiryTime = Date.now() + expiresIn * 1000;
                    setLockExpiry(expiryTime);
                    setSelectedSeats(prev => [...prev, id]);
                } else {
                    console.log(`[SeatSelection] Unlocking seat: ${id}`);
                    try {
                        await api.post('/unlock', {
                            showtimeId: parseInt(showtimeId!),
                            seatIds: [id]
                        });
                    } catch (unlockError) {
                        console.warn('[SeatSelection] Backend unlock failed, proceeding with local deselect:', unlockError);
                    }

                    setSelectedSeats(prev => {
                        const newSeats = prev.filter(sid => sid !== id);
                        if (newSeats.length === 0) setLockExpiry(null);
                        return newSeats;
                    });
                }
            } catch (error: any) {
                console.error('[SeatSelection] Real-time lock error:', error);
                if (error.response?.status === 409) {
                    toast.error('This seat was just taken by someone else.');
                } else if (error.response?.status !== 403) { // 403 handled by outer logic if needed
                    toast.error('Error updating seat selection.');
                }
                fetchShowtimeDetails();
            }
        } else {
            // Unauthenticated: Just local selection
            setSelectedSeats(prev =>
                isSelecting ? [...prev, id] : prev.filter(sid => sid !== id)
            );
        }
    };

    const handleApplyCoupon = () => {
        const code = couponInput.trim().toUpperCase();
        if (!code) return;
        setAppliedCoupon(code);
        setCouponError('');
    };

    // Removed unused handleRemoveCoupon

    const handleLock = async () => {
        if (!auth.token) {
            // Save pending selection
            localStorage.setItem('pendingBooking', JSON.stringify({
                showtimeId: parseInt(showtimeId!),
                seatIds: selectedSeats,
                timestamp: Date.now()
            }));
            navigate('/login', { state: { from: location.pathname } });
            return;
        }

        if (selectedSeats.length === 0) return;

        // Since seats are already locked in real-time for auth users,
        // we just handle the navigation if we have locks.
        if (lockExpiry) {
            bookingSubmittedRef.current = true; // Prevent release on navigation
            navigate(`/food-selection?showtimeId=${showtimeId}&seatIds=${selectedSeats.join(',')}&basePrice=${displayTotal}&lockExpiry=${lockExpiry}`, { replace: true });
        } else {
            // Fallback for edge cases where seats are selected but not locked
            try {
                setIsBooking(true);
                const response = await api.post('/lock', {
                    showtimeId: parseInt(showtimeId!),
                    seatIds: selectedSeats
                });
                const { expiresIn } = response.data;
                bookingSubmittedRef.current = true;
                const expiryTime = Date.now() + expiresIn * 1000;
                setLockExpiry(expiryTime);
                navigate(`/food-selection?showtimeId=${showtimeId}&seatIds=${selectedSeats.join(',')}&basePrice=${displayTotal}&lockExpiry=${expiryTime}`, { replace: true });
            } catch (error: any) {
                console.error('Final lock error:', error);
                toast.error('Error confirming selection. Seats might have expired.');
                fetchShowtimeDetails();
                setSelectedSeats([]);
            } finally {
                setIsBooking(false);
            }
        }
    };

    const releaseLock = useCallback(async (updateState = true) => {
        if (!auth.token || !showtimeId || isBookingRef.current) return;
        const seatsToRelease = selectedSeatsRef.current;
        if (seatsToRelease.length === 0) return;
        try {
            await api.post('/unlock', {
                showtimeId: parseInt(showtimeId),
                seatIds: seatsToRelease
            });
        } catch (error) {
            console.error('Unlock error:', error);
        }
        if (updateState) {
            bookingSubmittedRef.current = false;
            setLockExpiry(null);
            setSelectedSeats([]);
        }
    }, [auth.token, showtimeId]);

    useEffect(() => {
        return () => {
            if (lockExpiryRef.current && !bookingSubmittedRef.current) {
                releaseLock(false);
            }
        };
    }, [releaseLock]);

    const handleExpire = async () => {
        await releaseLock();
        alert('Session Expired');
        fetchShowtimeDetails();
    };



    const handleBooking = async (paymentMethod: 'WALLET' | 'ONLINE') => {
        if (!auth.token) {
            navigate('/login', { state: { from: location.pathname } });
            return;
        }
        if (selectedSeats.length === 0) return;

        if (selectedSeats.length > 0 && !quote) {
            alert('Pricing not ready. Please wait a moment.');
            return;
        }

        const totalPrice = quote?.total ?? 0;
        const finalPayable = totalPrice + foodTotal;

        if (paymentMethod === 'WALLET' && walletBalance < finalPayable) {
            alert(`Insufficient wallet balance! Total required: ₹${finalPayable}, Available: ₹${walletBalance}`);
            return;
        }

        setIsBooking(true);
        isBookingRef.current = true;
        bookingSubmittedRef.current = true;
        try {
            const response = await api.post('/bookings', {
                showtimeId: parseInt(showtimeId!),
                seatIds: selectedSeats,
                totalAmount: totalPrice + foodTotal,
                userId: auth.user?.id,
                paymentMethod,
                couponCode: appliedCoupon || undefined,
                foodItems: selectedFood
            });
            if (response.status === 201 || response.status === 202) {
                // Booking successful or processing
                toast.success('Booking initiated! Check your history for confirmation.', {
                    position: "top-center",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    theme: "dark",
                });
                setLockExpiry(null);
                setSelectedSeats([]);
                navigate('/history', { replace: true });
            } else {
                bookingSubmittedRef.current = false;
                isBookingRef.current = false;
            }
        } catch (error: unknown) {
            bookingSubmittedRef.current = false;
            isBookingRef.current = false;
            console.error('Booking error:', error);
            alert('Error creating booking.');
        } finally {
            setIsBooking(false);
        }
    };

    // Grouping logic
    const groupedSeats = seats.reduce((acc: { [key: string]: Seat[] }, seat) => {
        if (!acc[seat.type]) acc[seat.type] = [];
        acc[seat.type].push(seat);
        return acc;
    }, {});

    const sortedTiers = Object.keys(groupedSeats).sort((a, b) => {
        const priceA = groupedSeats[a][0]?.price || 0;
        const priceB = groupedSeats[b][0]?.price || 0;
        return priceA - priceB;
    });

    const displayTotal = quote?.total ?? selectedSeats.reduce((acc, id) => {
        const seat = seats.find(s => s.id === id);
        return acc + (seat ? Number(seat.price) : 0);
    }, 0);

    const selectedSeatDetails: Seat[] = selectedSeats
        .map(id => seats.find(s => s.id === id))
        .filter((seat): seat is Seat => Boolean(seat));

    const membershipTier = quote?.membershipTier ?? 'NONE';

    const appliedRuleNames = quote?.seats
        ? Array.from(
            new Set(
                quote.seats.flatMap(seat =>
                    seat.appliedRules ? seat.appliedRules.map(rule => rule.name) : []
                )
            )
        )
        : [];

    const couponSummary =
        quote && quote.coupon && !quote.couponError
            ? {
                code: quote.coupon.code,
                label:
                    quote.coupon.discountType === 'PERCENT'
                        ? `${quote.coupon.discountValue}% off`
                        : `₹${quote.coupon.discountValue} off`,
                amountSaved: quote.coupon.discountAmount,
            }
            : null;

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white selection:bg-emerald-500/30 font-sans">
            <div className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <motion.button
                            onClick={async () => {
                                if (lockExpiry) {
                                    if (window.confirm('Cancelling will release your seats. Continue?')) {
                                        await releaseLock();
                                        navigate(-1);
                                    }
                                } else {
                                    navigate(-1);
                                }
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </motion.button>
                        <div>
                            <h1 className="text-lg font-bold text-white leading-none">Select Seats</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-neutral-400">IMAX 2D</span>
                                <span className="w-1 h-1 rounded-full bg-neutral-700" />
                                <span className={cn("text-xs font-bold", MEMBERSHIP_COLORS[membershipTier])}>
                                    {membershipTier === 'NONE' ? 'Standard Member' : `${membershipTier} Member`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {lockExpiry ? (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <CountdownTimer targetTime={lockExpiry} onExpire={handleExpire} />
                        </div>
                    ) : (
                        <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
                            <Info className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="pt-24 pb-96 px-4 overflow-x-hidden">
                <div className="max-w-7xl mx-auto">
                    {/* Screen Visual */}
                    <div className="mb-12 relative perspective-1000">
                        <div className="w-2/3 mx-auto h-2 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent rounded-full shadow-[0_10px_40px_-5px_rgba(16,185,129,0.3)]" />
                        <div className="w-full text-center mt-4">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500/50">Screen This Way</span>
                        </div>
                        {/* Light Ray Effect */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-emerald-500/10 to-transparent blur-3xl -z-10 pointer-events-none" />
                    </div>

                    {/* Seat Grid */}
                    <div className="space-y-4">
                        {sortedTiers.map(tier => {
                            const tierSeats = groupedSeats[tier];
                            const tierRows = [...new Set(tierSeats.map(s => s.row))].sort().reverse();
                            const displayPrice = tierSeats[0]?.price || 0;

                            return (
                                <div key={tier} className="space-y-4">
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="h-[1px] w-8 bg-neutral-800" />
                                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{tier} - ₹{displayPrice}</span>
                                        <div className="h-[1px] w-8 bg-neutral-800" />
                                    </div>

                                    <div className="flex flex-col items-center gap-3">
                                        {tierRows.map(row => (
                                            <div key={row} className="flex items-center gap-4">
                                                <span className="w-4 text-xs font-bold text-neutral-600 text-right">{row}</span>
                                                <div className="flex gap-2">
                                                    {tierSeats
                                                        .filter(s => s.row === row)
                                                        .sort((a, b) => a.number - b.number)
                                                        .map(seat => {
                                                            const isSelected = selectedSeats.includes(seat.id);
                                                            const isBooked = seat.status === 'booked';

                                                            return (
                                                                <motion.button
                                                                    key={seat.id}
                                                                    whileHover={!isBooked ? { scale: 1.1 } : {}}
                                                                    whileTap={!isBooked ? { scale: 0.9 } : {}}
                                                                    disabled={isBooked}
                                                                    onClick={() => toggleSeat(seat.id, seat.status)}
                                                                    className={cn(
                                                                        "relative w-9 h-9 rounded-t-lg rounded-b-md flex items-center justify-center text-[10px] font-bold transition-all duration-200",
                                                                        isBooked
                                                                            ? "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                                                                            : isSelected
                                                                                ? "bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500/50"
                                                                                : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border border-white/5 hover:border-emerald-500/30"
                                                                    )}
                                                                >
                                                                    <Armchair className={cn(
                                                                        "w-5 h-5",
                                                                        isSelected ? "fill-neutral-950" : "fill-current"
                                                                    )} strokeWidth={2.5} />
                                                                    <span className="absolute -bottom-4 text-[9px] text-neutral-600 font-medium opacity-0 group-hover:opacity-100">{seat.number}</span>
                                                                </motion.button>
                                                            );
                                                        })}
                                                </div>
                                                <span className="w-4 text-xs font-bold text-neutral-600">{row}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-center gap-6 mt-8 text-xs text-neutral-400">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-t-md rounded-b-[6px] bg-neutral-900 border border-white/10 flex items-center justify-center">
                                <Armchair className="w-4 h-4" />
                            </div>
                            <span>Available</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-t-md rounded-b-[6px] bg-emerald-500 text-neutral-950 flex items-center justify-center">
                                <Armchair className="w-4 h-4 fill-neutral-950" />
                            </div>
                            <span>Selected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-t-md rounded-b-[6px] bg-neutral-800 text-neutral-500 flex items-center justify-center">
                                <Armchair className="w-4 h-4" />
                            </div>
                            <span>Booked</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
                {/* Gradient Fade */}
                <div className="h-24 bg-gradient-to-t from-neutral-950 to-transparent" />

                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: selectedSeats.length > 0 ? 0 : "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="bg-neutral-900/95 backdrop-blur-2xl border-t border-white/10 pb-4 pt-3 px-4 shadow-[0_-20px_50px_rgba(0,0,0,0.7)] pointer-events-auto"
                >
                    <div className="max-w-5xl mx-auto">
                        <div className="w-8 h-1 rounded-full bg-neutral-800 mx-auto mb-4" />

                        {/* Phase Toggle: Selection vs Checkout */}
                        {!location.state?.fromFoodSelection ? (
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="flex-1 w-full space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div>
                                                <p className="text-sm text-neutral-400">Total Price</p>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-[10px] text-neutral-500 uppercase font-black tracking-widest leading-none">Total</span>
                                                            <h3 className="text-2xl font-black italic text-white leading-none">₹{displayTotal + foodTotal}</h3>
                                                            {quoteLoading && <span className="text-[10px] text-emerald-500 animate-pulse font-bold">...</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                                                            <p className="text-[10px] font-black text-white uppercase tracking-tighter">{selectedSeats.length} Seats Locked</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {quote && (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 mt-2 border-t border-white/5 pt-2">
                                                    <div className="flex justify-between items-center text-[10px] text-neutral-500">
                                                        <span>Base Amount</span>
                                                        <span className="text-neutral-300 font-medium">₹{quote.subtotal}</span>
                                                    </div>

                                                    {/* Individual Rules (Discounts & Surges) */}
                                                    {(() => {
                                                        const uniqueRules = Array.from(new Set(quote.seats.flatMap(s => s.appliedRules?.map(r => r.name) || [])));
                                                        return uniqueRules.map(ruleName => {
                                                            const seatWithRule = quote.seats.find(s => s.appliedRules?.some(r => r.name === ruleName));
                                                            const ruleInfo = seatWithRule?.appliedRules?.find(r => r.name === ruleName);
                                                            const isSurge = ruleName.toLowerCase().includes('surge') ||
                                                                ruleName.toLowerCase().includes('peak') ||
                                                                (ruleInfo?.effect?.startsWith('×') && parseFloat(ruleInfo.effect.substring(1)) > 1);
                                                            return (
                                                                <div key={ruleName} className={`flex justify-between items-center text-[10px] ${isSurge ? 'text-rose-400/80' : 'text-emerald-500/80'}`}>
                                                                    <span>{ruleName}</span>
                                                                    <span className="font-bold">{isSurge ? 'Surcharge Applied' : 'Discount Applied'}</span>
                                                                </div>
                                                            );
                                                        });
                                                    })()}

                                                    {/* Aggregate Rule Savings (if any) */}
                                                    {(() => {
                                                        const ruleSavings = quote.seats.reduce((acc, s) => acc + (s.basePrice - s.afterRules), 0);
                                                        if (ruleSavings === 0) return null;
                                                        return (
                                                            <div className="flex justify-between items-center text-[10px] text-neutral-400 border-t border-white/5 mt-1 pt-1 opacity-60">
                                                                <span>Other Price Adjustments</span>
                                                                <span className="font-bold">{ruleSavings > 0 ? `−₹${ruleSavings.toFixed(0)}` : `+₹${Math.abs(ruleSavings).toFixed(0)}`}</span>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Membership Savings */}
                                                    {(() => {
                                                        const membershipSavings = quote.seats.reduce((acc, s) => acc + s.membershipDiscountAmount, 0);
                                                        if (membershipSavings <= 0) return null;
                                                        return (
                                                            <div className="flex justify-between items-center text-[10px] text-cyan-500/80">
                                                                <span>Member Savings</span>
                                                                <span className="font-bold">−₹{membershipSavings.toFixed(0)}</span>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Coupon Savings */}
                                                    {quote.couponDiscount > 0 && (
                                                        <div className="flex justify-between items-center text-[10px] text-amber-500/80">
                                                            <span>Coupon Savings</span>
                                                            <span className="font-bold">−₹{quote.couponDiscount.toFixed(0)}</span>
                                                        </div>
                                                    )}

                                                    {/* Food Total */}
                                                    {foodTotal > 0 && (
                                                        <div className="flex justify-between items-center text-[10px] text-neutral-500">
                                                            <span>Food & Snacks</span>
                                                            <span className="text-neutral-300 font-medium">+₹{foodTotal}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {quote && (appliedRuleNames.length > 0 || couponSummary) && (
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                            {appliedRuleNames.length > 0 && (
                                                <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                                                    Offers applied: {appliedRuleNames.slice(0, 3).join(', ')}
                                                    {appliedRuleNames.length > 3 && ' + more'}
                                                </div>
                                            )}
                                            {couponSummary && (
                                                <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                                                    Coupon {couponSummary.code} ({couponSummary.label}) − You save ₹{couponSummary.amountSaved.toFixed(0)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {selectedSeatDetails.length > 0 && (
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                                            <span className="text-neutral-500 font-bold uppercase tracking-widest">Seats:</span>
                                            {selectedSeatDetails.map(seat => (
                                                <span key={seat.id} className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-neutral-300 font-bold">
                                                    {seat.row}{seat.number}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleLock}
                                    disabled={quoteLoading || isBooking}
                                    className="w-full md:w-auto h-12 px-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                                >
                                    {isBooking ? 'LOCKING...' : 'Confirm Seats'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Selection Overview in Checkout Phase */}
                                <div className="flex flex-col md:flex-row items-center gap-6 mb-4 border-b border-white/5 pb-6">
                                    <div className="flex-1 w-full space-y-1">
                                        <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest leading-none">Final Amount</p>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-4xl font-black italic text-emerald-500">₹{displayTotal + foodTotal}</h3>
                                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">All inclusive</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-sm font-black text-white italic">{selectedSeats.length} Seats Locked</p>
                                            <div className="flex items-center gap-2 justify-end mt-1 text-amber-500">
                                                <Clock className="w-3 h-3" />
                                                <CountdownTimer targetTime={lockExpiry || 0} onExpire={handleExpire} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Coupon Input */}
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                        <input
                                            type="text"
                                            placeholder="ENTER COUPON..."
                                            value={couponInput}
                                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                            className="w-full h-12 pl-11 pr-4 rounded-xl bg-neutral-950 border border-white/10 text-white placeholder:text-neutral-700 font-black italic focus:outline-none focus:border-emerald-500/50"
                                        />
                                    </div>
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={!couponInput || quoteLoading}
                                        className="h-12 px-6 rounded-xl bg-neutral-800 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>

                                {appliedCoupon && (
                                    <div className={cn(
                                        "flex items-center gap-3 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest",
                                        couponError ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    )}>
                                        {couponError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                        {couponError || `Coupon '${appliedCoupon}' ACTIVE! Saved ₹${quote?.couponDiscount.toFixed(0)}`}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleBooking('ONLINE')}
                                        disabled={isBooking || quoteLoading || !quote}
                                        className="h-14 rounded-2xl bg-neutral-950 border border-white/10 hover:border-emerald-500/30 text-white font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all hover:-translate-y-1 group disabled:opacity-50"
                                    >
                                        <CreditCard className="w-4 h-4 transition-transform group-hover:scale-110" />
                                        Pay Online
                                    </button>
                                    <button
                                        onClick={() => handleBooking('WALLET')}
                                        disabled={walletBalance < (displayTotal + foodTotal) || isBooking || quoteLoading || !quote}
                                        className="h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-1 group disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:translate-y-0"
                                    >
                                        <Wallet className="w-4 h-4 transition-transform group-hover:scale-110" />
                                        <span>{isBooking ? 'Finalizing...' : `Wallet (₹${walletBalance})`}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default SeatSelection;
