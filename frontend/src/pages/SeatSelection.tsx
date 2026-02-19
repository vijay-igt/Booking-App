import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Info, Wallet, CreditCard, Clock,
    Tag, X, ChevronDown, ChevronUp, Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import CountdownTimer from '../components/CountdownTimer';
import { getPricingQuote } from '../services/pricingService';
import type { PricingQuoteResponse, SeatPriceBreakdown } from '../types';

interface Seat {
    id: number;
    row: string;
    number: number;
    status: 'available' | 'booked';
    price: number;
    type: string;
}

const MEMBERSHIP_COLORS: Record<string, string> = {
    NONE: '',
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

    // ─── Pricing state ────────────────────────────────────────────────────────
    const [quote, setQuote] = useState<PricingQuoteResponse | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState('');
    const [couponError, setCouponError] = useState('');
    const [showBreakdown, setShowBreakdown] = useState(false);
    const quoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const selectedSeatsRef = useRef<number[]>([]);
    const lockExpiryRef = useRef<number | null>(null);
    const bookingSubmittedRef = useRef(false);

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

    // ─── Fetch dynamic price quote whenever selection/coupon changes ──────────
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

    const toggleSeat = (id: number, status: string) => {
        if (status === 'booked' || lockExpiry) return;
        setSelectedSeats(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const handleApplyCoupon = () => {
        const code = couponInput.trim().toUpperCase();
        if (!code) return;
        setAppliedCoupon(code);
        setCouponError('');
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon('');
        setCouponInput('');
        setCouponError('');
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
            const { expiresIn } = response.data;
            bookingSubmittedRef.current = false;
            setLockExpiry(Date.now() + expiresIn * 1000);
        } catch (error: unknown) {
            console.error('Lock error:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                alert(error.response.data.message);
            } else {
                alert('Error locking seats.');
            }
            fetchShowtimeDetails();
            setSelectedSeats([]);
        } finally {
            setIsBooking(false);
        }
    };

    const releaseLock = useCallback(async (updateState = true) => {
        if (!auth.token || !showtimeId) return;
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

        // Use engine-computed total; fall back to seat sum if quote unavailable
        const totalPrice = quote?.total ?? selectedSeats.reduce((acc, id) => {
            const seat = seats.find(s => s.id === id);
            return acc + (seat ? Number(seat.price) : 0);
        }, 0);

        if (paymentMethod === 'WALLET' && walletBalance < totalPrice) {
            alert('Insufficient wallet balance!');
            return;
        }

        setIsBooking(true);
        try {
            const response = await api.post('/bookings', {
                showtimeId: parseInt(showtimeId!),
                seatIds: selectedSeats,
                totalAmount: totalPrice,
                userId: auth.user?.id,
                paymentMethod,
                couponCode: appliedCoupon || undefined,
            });
            if (response.status === 201) {
                await releaseLock(false);
                bookingSubmittedRef.current = false;
            } else {
                bookingSubmittedRef.current = true;
            }
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
        if (!error || typeof error !== 'object') return false;
        const withResponse = error as { response?: unknown };
        if (!withResponse.response || typeof withResponse.response !== 'object') return false;
        const response = withResponse.response as { data?: unknown };
        if (!response.data || typeof response.data !== 'object') return false;
        const data = response.data as { message?: unknown };
        return typeof data.message === 'string';
    }

    // ─── Derived values ───────────────────────────────────────────────────────
    const displayTotal = quote?.total ?? selectedSeats.reduce((acc, id) => {
        const seat = seats.find(s => s.id === id);
        return acc + (seat ? Number(seat.price) : 0);
    }, 0);

    const hasDiscount = quote && (quote.couponDiscount > 0 || quote.seats.some(s => s.membershipDiscountAmount > 0));
    const totalSavings = quote ? (quote.subtotal - quote.total) : 0;
    const membershipTier = quote?.membershipTier ?? 'NONE';

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-amber-500/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800">
                <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
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
                            className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </motion.button>
                        <div>
                            <h1 className="font-bold">Select Seats</h1>
                            <p className="text-xs text-neutral-500">
                                {membershipTier !== 'NONE' && (
                                    <span className={`font-semibold mr-1 ${MEMBERSHIP_COLORS[membershipTier]}`}>
                                        {membershipTier}
                                    </span>
                                )}
                                Choose your preferred seats
                            </p>
                        </div>
                    </div>
                    {lockExpiry ? (
                        <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <CountdownTimer targetTime={lockExpiry} onExpire={handleExpire} />
                        </div>
                    ) : (
                        <button className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center">
                            <Info className="w-5 h-5 text-neutral-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Screen Indicator */}
            <div className="pt-8 pb-6 px-5">
                <div className="max-w-md mx-auto">
                    <div className="h-1 w-full bg-gradient-to-r from-transparent via-amber-500 to-transparent rounded-full mb-2"></div>
                    <p className="text-center text-xs text-neutral-500 font-medium uppercase tracking-wider">Screen</p>
                </div>
            </div>

            {/* Seats */}
            <div className="px-5 pb-80">
                {seats.length === 0 ? (
                    <div className="py-20 text-center">
                        <p className="text-neutral-500">No seats available</p>
                    </div>
                ) : (
                    <div className="max-w-md mx-auto space-y-8">
                        {sortedTiers.map(tier => {
                            const tierSeats = groupedSeats[tier];
                            const tierRows = [...new Set(tierSeats.map(s => s.row))].sort().reverse();
                            // Use engine price if available, else fallback to seat.price
                            const engineSeat = quote?.seats.find(s => s.seatType === tier);
                            const displayPrice = engineSeat ? engineSeat.finalPrice : (tierSeats[0]?.price || 0);
                            const basePrice = tierSeats[0]?.price || 0;
                            const hasSurcharge = engineSeat && engineSeat.finalPrice > basePrice;

                            return (
                                <motion.div
                                    key={tier}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-3"
                                >
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{tier}</span>
                                        <div className="flex items-center gap-2">
                                            {hasSurcharge && (
                                                <span className="text-xs text-neutral-500 line-through">₹{basePrice}</span>
                                            )}
                                            <span className={`text-sm font-bold ${hasSurcharge ? 'text-amber-400' : 'text-amber-400'}`}>
                                                ₹{displayPrice.toFixed(0)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {tierRows.map(row => (
                                            <div key={row} className="flex items-center gap-2">
                                                <span className="w-6 text-xs text-neutral-500 font-bold text-center">{row}</span>
                                                <div className="flex-1 flex justify-center gap-1.5">
                                                    {tierSeats
                                                        .filter(s => s.row === row)
                                                        .sort((a, b) => a.number - b.number)
                                                        .map(seat => {
                                                            const isSelected = selectedSeats.includes(seat.id);
                                                            const isBooked = seat.status === 'booked';
                                                            return (
                                                                <motion.button
                                                                    key={seat.id}
                                                                    whileTap={!isBooked && !lockExpiry ? { scale: 0.9 } : {}}
                                                                    disabled={isBooked || lockExpiry !== null}
                                                                    onClick={() => toggleSeat(seat.id, seat.status)}
                                                                    className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all ${isBooked
                                                                            ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                                                                            : isSelected
                                                                                ? 'bg-amber-500 text-black scale-105 shadow-lg shadow-amber-500/30'
                                                                                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-amber-500/50'
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
            <div className="fixed bottom-0 left-0 right-0 bg-neutral-950/98 backdrop-blur-xl border-t border-neutral-800">
                {/* Legend */}
                <div className="px-5 py-2.5 flex items-center justify-center gap-6 border-b border-neutral-800/60">
                    {[
                        { color: 'bg-neutral-900 border border-neutral-800', label: 'Available' },
                        { color: 'bg-amber-500', label: 'Selected' },
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
                            className="p-4 space-y-3"
                        >
                            {/* ── Coupon Section ── */}
                            {!lockExpiry && (
                                <div className="space-y-2">
                                    {!appliedCoupon ? (
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 focus-within:border-amber-500/50 transition-colors">
                                                <Tag className="w-4 h-4 text-neutral-500 shrink-0" />
                                                <input
                                                    type="text"
                                                    placeholder="Promo code"
                                                    value={couponInput}
                                                    onChange={e => setCouponInput(e.target.value.toUpperCase())}
                                                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                                    className="flex-1 bg-transparent text-sm text-white placeholder-neutral-600 outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={handleApplyCoupon}
                                                disabled={!couponInput.trim()}
                                                className="px-4 rounded-xl bg-amber-500/10 text-amber-400 font-bold text-sm border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${couponError ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                            <div className="flex items-center gap-2">
                                                {couponError
                                                    ? <AlertCircle className="w-4 h-4 text-red-400" />
                                                    : <CheckCircle2 className="w-4 h-4 text-amber-400" />
                                                }
                                                <div>
                                                    <p className={`text-sm font-bold ${couponError ? 'text-red-400' : 'text-amber-400'}`}>
                                                        {appliedCoupon}
                                                    </p>
                                                    {couponError
                                                        ? <p className="text-xs text-red-400/80">{couponError}</p>
                                                        : quote?.coupon && (
                                                            <p className="text-xs text-amber-400/70">−₹{quote.couponDiscount.toFixed(2)} saved</p>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                            <button onClick={handleRemoveCoupon} className="p-1 rounded-full hover:bg-white/10">
                                                <X className="w-4 h-4 text-neutral-400" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Price Summary ── */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-neutral-500 mb-0.5">
                                        {selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} selected
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-2xl font-bold">
                                            {quoteLoading ? (
                                                <span className="text-neutral-500 text-lg animate-pulse">Calculating…</span>
                                            ) : (
                                                `₹${displayTotal.toFixed(0)}`
                                            )}
                                        </p>
                                        {hasDiscount && totalSavings > 0 && (
                                            <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" />
                                                −₹{totalSavings.toFixed(0)} saved
                                            </span>
                                        )}
                                    </div>
                                    {/* Breakdown toggle */}
                                    {quote && quote.seats.length > 0 && (
                                        <button
                                            onClick={() => setShowBreakdown(v => !v)}
                                            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 mt-0.5 transition-colors"
                                        >
                                            {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            {showBreakdown ? 'Hide' : 'View'} breakdown
                                        </button>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1.5 justify-end text-neutral-400 mb-0.5">
                                        <Wallet className="w-3 h-3" />
                                        <span className="text-[10px] uppercase font-bold tracking-wider">Wallet</span>
                                    </div>
                                    <p className={`text-sm font-bold ${walletBalance >= displayTotal ? 'text-amber-500' : 'text-red-400'}`}>
                                        ₹{walletBalance.toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {/* ── Price Breakdown Panel ── */}
                            <AnimatePresence>
                                {showBreakdown && quote && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-neutral-900 rounded-xl p-3 space-y-2 border border-neutral-800">
                                            {/* Per-seat breakdown */}
                                            {quote.seats.map((s: SeatPriceBreakdown) => (
                                                <div key={s.seatId} className="text-xs space-y-1">
                                                    <div className="flex justify-between text-neutral-400 font-semibold">
                                                        <span>{s.seatType} seat</span>
                                                        <span>Base ₹{s.basePrice.toFixed(0)}</span>
                                                    </div>
                                                    {s.appliedRules.map((r, i) => (
                                                        <div key={i} className="flex justify-between text-amber-400/80 pl-2">
                                                            <span>{r.name}</span>
                                                            <span>{r.effect}</span>
                                                        </div>
                                                    ))}
                                                    {s.membershipDiscountAmount > 0 && (
                                                        <div className={`flex justify-between pl-2 ${MEMBERSHIP_COLORS[membershipTier]}`}>
                                                            <span>{membershipTier} membership</span>
                                                            <span>−₹{s.membershipDiscountAmount.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between text-white font-bold border-t border-neutral-800 pt-1">
                                                        <span>Seat total</span>
                                                        <span>₹{s.finalPrice.toFixed(0)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {/* Coupon row */}
                                            {quote.couponDiscount > 0 && (
                                                <div className="flex justify-between text-xs text-amber-400 border-t border-neutral-800 pt-2">
                                                    <span>Coupon ({quote.coupon?.code})</span>
                                                    <span>−₹{quote.couponDiscount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm font-bold border-t border-neutral-700 pt-2">
                                                <span>Total</span>
                                                <span className="text-amber-400">₹{quote.total.toFixed(0)}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── Action Buttons ── */}
                            {!lockExpiry ? (
                                <button
                                    onClick={handleLock}
                                    disabled={isBooking || quoteLoading}
                                    className="h-12 w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-50 flex items-center justify-center gap-2"
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
                                        disabled={isBooking || walletBalance < displayTotal}
                                        className="h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500 flex items-center justify-center gap-2"
                                    >
                                        <Wallet className="w-4 h-4" />
                                        Pay with Wallet
                                    </button>
                                </div>
                            )}
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
