import React, { useState, useEffect } from 'react';
import type { AxiosError } from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, ChevronDown, Tag, Film } from 'lucide-react';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../services/pricingService';
import type { Coupon, Movie, Showtime } from '../types';
import api from '../api';

const EMPTY_COUPON: Partial<Coupon> = {
    code: '',
    discountType: 'PERCENT',
    discountValue: 10,
    maxUses: null,
    perUserLimit: null,
    minOrderValue: 0,
    validFrom: null,
    expiresAt: null,
    movieId: null,
    showtimeId: null,
    seatCategory: null,
    paymentMethod: null,
    isActive: true,
};

interface Props {
    compact?: boolean;
}

const CouponManager: React.FC<Props> = ({ compact = false }) => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [showtimes, setShowtimes] = useState<Showtime[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Coupon | null>(null);
    const [form, setForm] = useState<Partial<Coupon>>(EMPTY_COUPON);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // ─── Data loading ──────────────────────────────────────────────────────────

    const load = async () => {
        setLoading(true);
        try {
            const [couponsRes, moviesRes, showtimesRes] = await Promise.all([
                getCoupons(),
                api.get<Movie[]>('/movies'),
                api.get<Showtime[]>('/admin/showtimes'),
            ]);
            setCoupons(couponsRes);
            setMovies(moviesRes.data);
            const now = new Date();
            setShowtimes(showtimesRes.data.filter((s: Showtime) => new Date(s.startTime) > now));
        } catch {
            setError('Failed to load data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // ─── Helpers ───────────────────────────────────────────────────────────────

    const getErrorMessage = (error: unknown) => {
        if (!error || typeof error !== 'object') return null;
        const axiosError = error as AxiosError<{ message?: string }>;
        const message = axiosError.response?.data?.message;
        return typeof message === 'string' ? message : null;
    };

    /** Showtimes that belong to the currently selected movie */
    const filteredShowtimes = form.movieId
        ? showtimes.filter(s => s.movieId === form.movieId)
        : showtimes;

    const movieName = (id: number | null | undefined) =>
        movies.find(m => m.id === id)?.title ?? `Movie #${id}`;

    const formatShowtime = (s: Showtime) => {
        const d = new Date(s.startTime);
        return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    };

    // ─── Form helpers ──────────────────────────────────────────────────────────

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_COUPON);
        setError('');
        setShowForm(true);
    };

    const openEdit = (coupon: Coupon) => {
        setEditing(coupon);
        setForm({ ...coupon });
        setError('');
        setShowForm(true);
    };

    const handleMovieChange = (movieId: number | null) => {
        // Reset showtime when movie changes
        setForm(f => ({ ...f, movieId, showtimeId: null }));
    };

    const handleSubmit = async () => {
        if (!form.code?.trim()) { setError('Coupon code is required.'); return; }
        if (!form.discountValue || Number(form.discountValue) <= 0) { setError('Discount value must be > 0.'); return; }
        setSaving(true);
        setError('');
        try {
            const payload = { ...form, code: form.code.toUpperCase() };
            if (editing) {
                await updateCoupon(editing.id, payload);
            } else {
                await createCoupon(payload);
            }
            setShowForm(false);
            await load();
        } catch (error: unknown) {
            setError(getErrorMessage(error) ?? 'Failed to save coupon.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (coupon: Coupon) => {
        try {
            await updateCoupon(coupon.id, { isActive: !coupon.isActive });
            setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c));
        } catch {
            setError('Failed to update coupon.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this coupon?')) return;
        try {
            await deleteCoupon(id);
            setCoupons(prev => prev.filter(c => c.id !== id));
        } catch {
            setError('Failed to delete coupon.');
        }
    };

    const discountLabel = (c: Coupon) =>
        c.discountType === 'PERCENT' ? `${c.discountValue}% off` : `₹${c.discountValue} off`;

    // ─── Render ────────────────────────────────────────────────────────────────

    const sortedCoupons = [...coupons].sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return b.id - a.id;
    });
    const activeCount = coupons.filter(c => c.isActive).length;
    const inactiveCount = coupons.length - activeCount;

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {!compact && (
                    <div>
                        <h2 className="text-lg font-bold text-white">Coupon Codes</h2>
                        <p className="text-xs text-neutral-500 mt-1">Active coupons appear first.</p>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <div className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
                        {coupons.length} total
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                        {activeCount} active
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
                        {inactiveCount} inactive
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Coupon
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>
            )}

            {/* Coupons List */}
            {loading ? (
                <div className="text-center py-10 text-neutral-500 text-sm">Loading coupons…</div>
            ) : coupons.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 text-sm">No coupons yet. Create one to get started.</div>
            ) : (
                <div className="space-y-2">
                    {sortedCoupons.map(coupon => (
                        <motion.div
                            key={coupon.id}
                            layout
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${coupon.isActive
                                ? 'bg-gradient-to-r from-neutral-900 to-neutral-900/70 border-neutral-800'
                                : 'bg-neutral-900/40 border-neutral-800/40 opacity-60'
                                }`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5 text-amber-400" />
                                        <span className="font-bold text-sm text-amber-400 font-mono">{coupon.code}</span>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                                        {discountLabel(coupon)}
                                    </span>
                                    {coupon.maxUses && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800/70 text-neutral-400">
                                            {coupon.usedCount}/{coupon.maxUses} used
                                        </span>
                                    )}
                                    {coupon.isActive ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-500">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1 flex-wrap">
                                    {coupon.minOrderValue > 0 && <span>Min ₹{coupon.minOrderValue} ·</span>}
                                    {coupon.movieId && (
                                        <span className="flex items-center gap-0.5">
                                            <Film className="w-3 h-3" />
                                            {movieName(coupon.movieId)} ·
                                        </span>
                                    )}
                                    {coupon.seatCategory && <span>{coupon.seatCategory} seats ·</span>}
                                    <span>{coupon.expiresAt ? `Expires ${coupon.expiresAt}` : 'No expiry'}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                                <button onClick={() => handleToggle(coupon)} className="text-neutral-400 hover:text-white transition-colors">
                                    {coupon.isActive
                                        ? <ToggleRight className="w-5 h-5 text-amber-500" />
                                        : <ToggleLeft className="w-5 h-5" />
                                    }
                                </button>
                                <button onClick={() => openEdit(coupon)} className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(coupon.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
                    >
                        <motion.div
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 40, opacity: 0 }}
                            className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                                <h3 className="font-bold text-white">{editing ? 'Edit Coupon' : 'New Coupon'}</h3>
                                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full hover:bg-neutral-800">
                                    <X className="w-4 h-4 text-neutral-400" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                                {/* Code */}
                                <div>
                                    <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Coupon Code</label>
                                    <input
                                        value={form.code || ''}
                                        onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                        placeholder="e.g. SAVE50"
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-amber-400 font-mono placeholder-neutral-600 outline-none focus:border-amber-500/50 uppercase"
                                    />
                                </div>

                                {/* Discount */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Discount Type</label>
                                        <div className="relative">
                                            <select
                                                value={form.discountType}
                                                onChange={e => setForm(f => ({ ...f, discountType: e.target.value as 'PERCENT' | 'FLAT' }))}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50 appearance-none"
                                            >
                                                <option value="PERCENT">Percentage (%)</option>
                                                <option value="FLAT">Flat Amount (₹)</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">
                                            Value {form.discountType === 'PERCENT' ? '(%)' : '(₹)'}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step={form.discountType === 'PERCENT' ? '1' : '0.01'}
                                            value={form.discountValue ?? ''}
                                            onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))}
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                                        />
                                    </div>
                                </div>

                                {/* Limits */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Max Uses (total)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Unlimited"
                                            value={form.maxUses ?? ''}
                                            onChange={e => setForm(f => ({ ...f, maxUses: e.target.value ? Number(e.target.value) : null }))}
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Per-User Limit</label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Unlimited"
                                            value={form.perUserLimit ?? ''}
                                            onChange={e => setForm(f => ({ ...f, perUserLimit: e.target.value ? Number(e.target.value) : null }))}
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50"
                                        />
                                    </div>
                                </div>

                                {/* Min Order */}
                                <div>
                                    <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Minimum Order Value (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={form.minOrderValue ?? 0}
                                        onChange={e => setForm(f => ({ ...f, minOrderValue: Number(e.target.value) }))}
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                                    />
                                </div>

                                {/* ── Scope ─────────────────────────────────────────────────────────── */}
                                <div className="space-y-3">
                                    <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                                        Scope <span className="text-neutral-600 normal-case font-normal">(optional — leave blank to apply to all)</span>
                                    </p>

                                    {/* Movie dropdown */}
                                    <div>
                                        <label className="text-xs text-neutral-600 mb-1 block">Restrict to Movie</label>
                                        <div className="relative">
                                            <Film className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                                            <select
                                                value={form.movieId ?? ''}
                                                onChange={e => handleMovieChange(e.target.value ? Number(e.target.value) : null)}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white outline-none focus:border-amber-500/50 appearance-none"
                                            >
                                                <option value="">Any movie</option>
                                                {movies.map(m => (
                                                    <option key={m.id} value={m.id}>{m.title}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Showtime dropdown — only shows if a movie is selected */}
                                    <div>
                                        <label className="text-xs text-neutral-600 mb-1 block">
                                            Restrict to Showtime
                                            {!form.movieId && <span className="ml-1 text-neutral-700">(select a movie first to filter)</span>}
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={form.showtimeId ?? ''}
                                                onChange={e => setForm(f => ({ ...f, showtimeId: e.target.value ? Number(e.target.value) : null }))}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50 appearance-none"
                                            >
                                                <option value="">Any showtime</option>
                                                {filteredShowtimes.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {!form.movieId
                                                            ? `${movies.find(m => m.id === s.movieId)?.title ?? 'Movie'} — `
                                                            : ''
                                                        }{formatShowtime(s)}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Seat category + payment method */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-neutral-600 mb-1 block">Seat Category</label>
                                            <input
                                                placeholder="e.g. PREMIUM"
                                                value={form.seatCategory ?? ''}
                                                onChange={e => setForm(f => ({ ...f, seatCategory: e.target.value || null }))}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-600 mb-1 block">Payment Method</label>
                                            <div className="relative">
                                                <select
                                                    value={form.paymentMethod ?? ''}
                                                    onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value || null }))}
                                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50 appearance-none"
                                                >
                                                    <option value="">Any</option>
                                                    <option value="WALLET">Wallet</option>
                                                    <option value="ONLINE">Online</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Validity */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Valid From</label>
                                        <input
                                            type="date"
                                            value={form.validFrom ?? ''}
                                            onChange={e => setForm(f => ({ ...f, validFrom: e.target.value || null }))}
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Expires At</label>
                                        <input
                                            type="date"
                                            value={form.expiresAt ?? ''}
                                            onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value || null }))}
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                                        />
                                    </div>
                                </div>

                                {/* Active toggle */}
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Active</span>
                                    <div
                                        onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                                        className={`relative w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-amber-500' : 'bg-neutral-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </div>
                                </label>

                                {error && <p className="text-sm text-red-400">{error}</p>}
                            </div>

                            <div className="px-5 py-4 border-t border-neutral-800 flex gap-3">
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 h-11 rounded-xl bg-neutral-800 text-neutral-300 font-semibold text-sm hover:bg-neutral-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="flex-1 h-11 rounded-xl bg-amber-500 text-white font-bold text-sm disabled:opacity-50 hover:bg-amber-600 transition-colors"
                                >
                                    {saving ? 'Saving…' : editing ? 'Update Coupon' : 'Create Coupon'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CouponManager;
