import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    Search,
    Plus,
    Minus,
    ShoppingCart,
    Info,
    Ticket,
    ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-toastify';

interface FoodItem {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string;
    isVeg: boolean;
    calories?: number;
    allergens?: string;
}

interface CartItem extends FoodItem {
    quantity: number;
}

const FoodSelection: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const showtimeId = searchParams.get('showtimeId');
    const seatIds = searchParams.get('seatIds')?.split(',').map(Number) || [];
    const basePrice = parseFloat(searchParams.get('basePrice') || '0');

    const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showtime, setShowtime] = useState<any>(null);

    const categories = ['All', 'Snacks', 'Beverages', 'Desserts'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                // First get showtime if needed to know theaterId
                let tId = null;
                let currentShowtime = null;

                if (showtimeId) {
                    const res = await api.get(`/showtimes/${showtimeId}`);
                    currentShowtime = res.data;
                    tId = currentShowtime?.screen?.theaterId;
                    setShowtime(currentShowtime);
                }

                // Fetch food items for this specific theater
                const foodRes = await api.get(tId ? `/food?theaterId=${tId}` : '/food');
                setFoodItems(foodRes.data);
            } catch (error) {
                console.error('Error fetching food data:', error);
                toast.error('Failed to load food items');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [showtimeId]);

    const filteredItems = useMemo(() => {
        return foodItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [foodItems, searchQuery, activeCategory]);

    const addToCart = (item: FoodItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const removeFromCart = (id: number) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === id);
            if (existing && existing.quantity > 1) {
                return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
            }
            return prev.filter(i => i.id !== id);
        });
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const grandTotal = basePrice + cartTotal;

    const handleProceed = () => {
        navigate(`/booking/${showtimeId}`, {
            state: {
                selectedSeats: seatIds,
                foodItems: cart.map(item => ({ id: item.id, quantity: item.quantity, price: item.price })),
                totalFoodPrice: cartTotal,
                fromFoodSelection: true,
                lockExpiry: Number(searchParams.get('lockExpiry')) || null,
                bookingSubmitted: true
            },
            replace: true
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30 relative overflow-hidden">
            {/* Cinematic Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse " style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-neutral-950/20 pointer-events-none" />
            </div>

            {/* Header */}
            <header className="bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-neutral-400 hover:text-white"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black italic tracking-tighter uppercase text-white leading-none">
                                {showtime?.movie?.title || 'Grab a Bite'}
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mt-1">
                                {showtime?.screen?.theater?.name} • {showtime ? new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleProceed()}
                        className="px-8 py-2.5 bg-emerald-500 text-neutral-950 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                    >
                        Skip F&B
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-12 flex flex-col lg:flex-row gap-12 relative z-10">
                {/* Food Catalog */}
                <div className="flex-1 space-y-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent uppercase">
                                Cineworld Cafe
                            </h2>
                            <p className="text-sm text-neutral-500 font-medium mt-2 tracking-widest uppercase">
                                Enhance your cinematic journey
                            </p>
                        </div>
                        <div className="relative w-full md:w-96 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 transition-colors group-focus-within:text-emerald-500" />
                            <input
                                type="text"
                                placeholder="SEARCH FOR FLAVORS..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-14 pl-14 pr-5 bg-white/5 border border-white/10 rounded-2xl text-sm font-medium focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all placeholder:text-neutral-700 uppercase tracking-widest"
                            />
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="flex p-1.5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/5 w-fit">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={cn(
                                    "relative px-8 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-xl overflow-hidden",
                                    activeCategory === cat ? "text-neutral-950" : "text-neutral-500 hover:text-white"
                                )}
                            >
                                <span className="relative z-10">{cat}</span>
                                {activeCategory === cat && (
                                    <motion.div
                                        layoutId="category-bg"
                                        className="absolute inset-0 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filteredItems.map(item => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={item.id}
                                    className="group bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-4 flex gap-4 hover:border-emerald-500/30 transition-all duration-500 shadow-2xl overflow-hidden"
                                >
                                    <div className="relative w-36 h-36 flex-shrink-0 overflow-hidden rounded-[1.75rem] border border-white/5">
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute top-3 left-3">
                                            <div className={cn(
                                                "w-5 h-5 border-[1.5px] flex items-center justify-center rounded-md bg-black/40 backdrop-blur-md",
                                                item.isVeg ? "border-green-500" : "border-red-500"
                                            )}>
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    item.isVeg ? "bg-green-500" : "bg-red-500"
                                                )} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-lg font-black italic tracking-tight uppercase text-white group-hover:text-emerald-400 transition-colors leading-tight">
                                                {item.name}
                                            </h3>
                                            <p className="text-[10px] text-neutral-500 line-clamp-2 leading-relaxed font-medium uppercase tracking-wider">
                                                {item.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                            <div className="flex flex-col">
                                                <span className="text-[7px] font-black text-neutral-600 uppercase tracking-[0.2em]">Live Price</span>
                                                <span className="font-black text-2xl italic text-white flex items-baseline">
                                                    <span className="text-emerald-500 mr-0.5 text-base italic">₹</span>{Number(item.price).toFixed(2).replace(/\.00$/, '')}
                                                </span>
                                            </div>

                                            <div className="flex items-center">
                                                {cart.find(i => i.id === item.id) ? (
                                                    <div className="flex items-center bg-white/5 border border-emerald-500/30 rounded-xl overflow-hidden h-10 p-0.5 backdrop-blur-md">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                                                            className="w-8 h-8 flex items-center justify-center hover:bg-emerald-500/10 text-emerald-500 transition-colors rounded-lg"
                                                        >
                                                            <Minus className="w-3 h-3 stroke-[3]" />
                                                        </button>
                                                        <span className="w-8 text-center font-black text-xs text-white italic">{cart.find(i => i.id === item.id)?.quantity}</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                                                            className="w-8 h-8 flex items-center justify-center hover:bg-emerald-500/10 text-emerald-500 transition-colors rounded-lg"
                                                        >
                                                            <Plus className="w-3 h-3 stroke-[3]" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => addToCart(item)}
                                                        className="h-10 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black uppercase text-[8px] tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                                    >
                                                        <span>Add</span>
                                                        <Plus className="w-3 h-3 stroke-[3]" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Sidebar / Cart */}
                <div className="w-full lg:w-[400px] space-y-8">
                    <div className="bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 overflow-hidden sticky top-32 shadow-2xl">
                        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div>
                                <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Base Booking</p>
                                <p className="text-3xl font-black text-white italic leading-tight mt-1">
                                    <span className="text-emerald-500 mr-1 italic">₹</span>{basePrice.toFixed(0)}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400">
                                <Ticket className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="p-10">
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white mb-8 border-l-4 border-emerald-500 pl-4">
                                Your Selection
                            </h3>

                            <AnimatePresence mode="popLayout">
                                {cart.length > 0 ? (
                                    <div className="space-y-6">
                                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-6">
                                            {cart.map(item => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    className="flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-2.5 h-2.5 border flex items-center justify-center rounded-sm",
                                                            item.isVeg ? "border-green-500" : "border-red-500"
                                                        )}>
                                                            <div className={cn(
                                                                "w-1 h-1 rounded-full",
                                                                item.isVeg ? "bg-green-500" : "bg-red-500"
                                                            )} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black uppercase text-neutral-300 tracking-wider transition-colors group-hover:text-emerald-400">{item.name}</span>
                                                            <span className="text-[9px] text-neutral-600 font-bold uppercase mt-0.5">₹{item.price} each</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex items-center bg-white/5 rounded-xl overflow-hidden h-8 p-0.5 border border-white/5">
                                                            <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-neutral-500 hover:text-white transition-colors"><Minus className="w-3 h-3" /></button>
                                                            <span className="w-7 text-center text-xs font-black italic text-white">{item.quantity}</span>
                                                            <button onClick={() => addToCart(item)} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-neutral-500 hover:text-white transition-colors"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                        <span className="text-sm font-black italic w-16 text-right text-white">₹{(Number(item.price) * item.quantity).toFixed(2).replace(/\.00$/, '')}</span>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>

                                        <div className="pt-8 border-t border-dashed border-white/20 space-y-4">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] text-neutral-500 uppercase font-black tracking-[0.2em]">F&B Total</span>
                                                <span className="font-black text-xl italic text-white">₹{cartTotal.toFixed(2).replace(/\.00$/, '')}</span>
                                            </div>
                                            <div className="flex justify-between items-end bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                                                <span className="text-xs text-emerald-500 uppercase font-black tracking-[0.3em]">Payable</span>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-neutral-500 block line-through opacity-50">₹{(grandTotal + 40).toFixed(2).replace(/\.00$/, '')}</span>
                                                    <span className="text-4xl font-black italic uppercase tracking-tighter text-emerald-500">
                                                        ₹{grandTotal.toFixed(2).replace(/\.00$/, '')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleProceed()}
                                            className="w-full h-16 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black uppercase text-sm tracking-[0.2em] rounded-[1.5rem] shadow-2xl shadow-emerald-500/30 transition-all hover:-translate-y-1 active:scale-95 mt-6 group overflow-hidden relative"
                                        >
                                            <div className="relative z-10 flex items-center justify-center gap-3">
                                                <span>Finalize Order</span>
                                                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] skew-x-[-20deg] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="py-16 text-center space-y-6">
                                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-white/10 group-hover:scale-110 transition-transform duration-500">
                                            <ShoppingCart className="w-10 h-10 text-neutral-800" />
                                        </div>
                                        <p className="text-neutral-600 text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px] mx-auto leading-relaxed">
                                            Your tray is empty for <br /> some cinematic snacks
                                        </p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl flex gap-4 backdrop-blur-md">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                            <Info className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest leading-relaxed">
                            Food & Beverage items cannot be cancelled or refunded once ordered.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default FoodSelection;
