import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import {
    Film,
    LogOut,
    Menu,
    X,
    Search,
    Ticket,
    LayoutDashboard,
    Bell,
    ChevronDown,
    MapPin,
    Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Target } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import api from '../api';
import { useWebSocket } from '../context/WebSocketContextDefinition';

const Navbar: React.FC = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(() => {
        return localStorage.getItem('selectedLocation') || 'Mumbai';
    });
    const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
    const [locationSearch, setLocationSearch] = useState('');
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifRefreshToken, setNotifRefreshToken] = useState(0);
    const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad', 'Kolkata', 'Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal'];

    const { subscribe } = useWebSocket();

    // Handle scroll effect for glassmorphism
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Sync location to localStorage
    useEffect(() => {
        localStorage.setItem('selectedLocation', selectedLocation);
    }, [selectedLocation]);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    // Fetch unread notification count
    useEffect(() => {
        const fetchUnreadCount = async () => {
            if (!user) return;
            try {
                const response = await api.get('/notifications/unread/count');
                setUnreadCount(response.data.count);
            } catch (error) {
                console.error('Error fetching unread count:', error);
            }
        };

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, [user, isNotificationsOpen]);

    // Real-time updates via WebSocket
    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribe('NOTIFICATION_RECEIVED', () => {
            setUnreadCount(prev => prev + 1);
            if (isNotificationsOpen) {
                setNotifRefreshToken(prev => prev + 1);
            }
        });

        return () => unsubscribe();
    }, [user, subscribe, isNotificationsOpen]);

    const handleLocationSelect = (loc: string) => {
        setSelectedLocation(loc);
        setIsLocationDropdownOpen(false);
        setLocationSearch('');
    };

    const detectLocation = () => {
        setIsDetectingLocation(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        // Using a free reverse geocoding API (or simulated for now)
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await response.json();
                        const city = data.address.city || data.address.town || data.address.village || 'Mumbai';
                        setSelectedLocation(city);
                        setIsLocationDropdownOpen(false);
                    } catch (error) {
                        console.error('Error detecting location:', error);
                        alert('Could not determine city from coordinates.');
                    } finally {
                        setIsDetectingLocation(false);
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    alert('Location access denied or unavailable.');
                    setIsDetectingLocation(false);
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
            setIsDetectingLocation(false);
        }
    };

    const filteredLocations = locations.filter(loc =>
        loc.toLowerCase().includes(locationSearch.toLowerCase())
    );

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // Implement search navigation or modal here
            console.log('Searching for:', searchQuery);
        }
    };

    const navLinks = [
        { name: 'Movies', path: '/', icon: Film },
        ...(user ? [
            { name: 'My Bookings', path: '/history', icon: Ticket },
            { name: 'Wallet', path: '/wallet', icon: Wallet }
        ] : []),
    ];

    if (user?.role === 'admin' || user?.role === 'super_admin') {
        navLinks.push({ name: 'Dashboard', path: '/admin', icon: LayoutDashboard });
    }

    return (
        <>
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
                    isScrolled ? "bg-neutral-950/80 backdrop-blur-md border-white/5 py-3 shadow-2xl" : "bg-transparent py-5"
                )}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-6">
                            <Link to="/" className="flex items-center gap-2 group">
                                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
                                    <Film className="w-5 h-5 text-white" />
                                    <div className="absolute inset-0 bg-white/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <span className="text-xl font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                                    Cine<span className="text-emerald-500">Verse</span>
                                </span>
                            </Link>

                            {/* Location Selector */}
                            <div className="relative ml-4">
                                <button
                                    onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all group"
                                >
                                    <MapPin className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm font-medium text-neutral-300 group-hover:text-white">{selectedLocation}</span>
                                    <ChevronDown className={cn("w-3.5 h-3.5 text-neutral-500 transition-transform", isLocationDropdownOpen && "rotate-180")} />
                                </button>

                                <AnimatePresence>
                                    {isLocationDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute top-full left-0 mt-2 w-64 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-2"
                                        >
                                            {/* Search Input */}
                                            <div className="relative mb-2">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Search city..."
                                                    value={locationSearch}
                                                    onChange={(e) => setLocationSearch(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && locationSearch) {
                                                            handleLocationSelect(locationSearch);
                                                        }
                                                    }}
                                                    className="w-full h-9 rounded-xl bg-white/5 border border-white/5 pl-9 pr-3 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/30 transition-all font-medium"
                                                />
                                            </div>

                                            {/* Detect Location Button */}
                                            <button
                                                onClick={detectLocation}
                                                disabled={isDetectingLocation}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all mb-1 disabled:opacity-50"
                                            >
                                                <Target className={cn("w-3.5 h-3.5", isDetectingLocation && "animate-spin")} />
                                                {isDetectingLocation ? 'Detecting...' : 'Detect My Location'}
                                            </button>

                                            <div className="border-t border-white/5 my-2" />

                                            {/* Location List */}
                                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                {filteredLocations.length > 0 ? (
                                                    filteredLocations.map(loc => (
                                                        <button
                                                            key={loc}
                                                            onClick={() => handleLocationSelect(loc)}
                                                            className={cn(
                                                                "w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/5 rounded-lg flex items-center justify-between group",
                                                                selectedLocation === loc ? "text-emerald-500 bg-emerald-500/5 font-bold" : "text-neutral-400 font-medium"
                                                            )}
                                                        >
                                                            {loc}
                                                            {selectedLocation === loc && <div className="w-1 h-1 rounded-full bg-emerald-500" />}
                                                        </button>
                                                    ))
                                                ) : (
                                                    locationSearch && (
                                                        <button
                                                            onClick={() => handleLocationSelect(locationSearch)}
                                                            className="w-full px-3 py-2 text-left text-xs text-emerald-500 hover:bg-emerald-500/5 rounded-lg font-bold flex items-center gap-2"
                                                        >
                                                            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-[10px]">Add</div>
                                                            Use "{locationSearch}"
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            <div className="flex items-center gap-6">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        className={cn(
                                            "text-sm font-medium transition-colors hover:text-emerald-400 flex items-center gap-2",
                                            location.pathname === link.path ? "text-emerald-500" : "text-neutral-400"
                                        )}
                                    >
                                        <link.icon className="w-4 h-4" />
                                        {link.name}
                                    </Link>
                                ))}
                            </div>

                            {/* Search Bar */}
                            <form onSubmit={handleSearch} className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search movies..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-10 w-64 rounded-full bg-white/5 border border-white/10 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/50 focus:bg-neutral-900 focus:w-80 transition-all duration-300"
                                />
                            </form>

                            {/* Notification & User Menu */}
                            {user ? (
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setIsNotificationsOpen(true)}
                                        className="relative p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
                                    >
                                        <Bell className="w-5 h-5" />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-2 right-2 flex min-w-[14px] h-[14px] items-center justify-center px-1 rounded-full bg-emerald-500 text-[9px] font-bold text-neutral-950 border border-neutral-900">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                                        <button
                                            onClick={() => navigate('/profile')}
                                            className="flex items-center gap-3 group text-right hover:opacity-80 transition-opacity"
                                        >
                                            <div className="hidden lg:block">
                                                <p className="text-sm font-bold text-white leading-none group-hover:text-emerald-400 transition-colors">{user.name}</p>
                                                <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">{user.role.replace('_', ' ')}</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-neutral-950 font-bold border border-white/5">
                                                {user?.name?.charAt(0)}
                                            </div>
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/10 hover:text-red-500 border border-white/5 hover:border-red-500/20 text-neutral-400 flex items-center justify-center transition-all"
                                            title="Logout"
                                        >
                                            <LogOut className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                                    <Link
                                        to="/login"
                                        state={{ from: location.pathname }}
                                        className="text-sm font-bold text-white hover:text-emerald-400 transition-colors"
                                    >
                                        Log In
                                    </Link>
                                    <Link
                                        to="/register"
                                        state={{ from: location.pathname }}
                                        className="h-9 px-4 rounded-full bg-emerald-500 text-neutral-950 text-sm font-bold flex items-center hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                                    >
                                        Sign Up
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </motion.nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-40 bg-neutral-950/95 backdrop-blur-xl md:hidden pt-24 px-6"
                    >
                        <div className="flex flex-col gap-6">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className="text-lg font-medium text-white flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <link.icon className="w-5 h-5" />
                                    </div>
                                    {link.name}
                                </Link>
                            ))}

                            {!user && (
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <Link
                                        to="/login"
                                        state={{ from: location.pathname }}
                                        className="h-12 rounded-xl border border-white/10 flex items-center justify-center text-white font-bold"
                                    >
                                        Log In
                                    </Link>
                                    <Link
                                        to="/register"
                                        state={{ from: location.pathname }}
                                        className="h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-neutral-950 font-bold"
                                    >
                                        Sign Up
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <NotificationCenter
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                refreshToken={notifRefreshToken}
            />
        </>
    );
};

export default Navbar;
