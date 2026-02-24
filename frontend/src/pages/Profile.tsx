import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Shield, LogOut, Ticket, ChevronRight, Edit2, Check, X, Briefcase, Wallet, Heart } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { cn } from '../lib/utils';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';
import api from '../api';
import { AxiosError } from 'axios';

interface ErrorResponseData {
    message: string;
}

const Profile: React.FC = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(auth.user?.name || '');
    const [isSaving, setIsSaving] = useState(false);
    const [requestLoading, setRequestLoading] = useState(false);

    const handleLogout = () => {
        auth.logout();
        navigate('/login');
    };

    const handleUpdateProfile = async () => {
        if (!newName.trim() || newName === auth.user?.name) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            await api.put('/auth/profile', { name: newName });
            if (auth.user && auth.token) {
                auth.fetchUser(auth.user.id, auth.token);
            }
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRequestOwner = async () => {
        if (!confirm('Are you sure you want to request to become a Theater Owner?')) return;
        setRequestLoading(true);
        try {
            await api.post('/users/request-owner');
            alert('Request submitted successfully! Please wait for Super Admin approval.');
            if (auth.user && auth.token) auth.fetchUser(auth.user.id, auth.token); // Refresh user data
        } catch (error) {
            const axiosError = error as AxiosError<ErrorResponseData>;
            console.error('Error requesting owner status:', axiosError);
            alert(axiosError.response?.data?.message || 'Failed to submit request');
        } finally {
            setRequestLoading(false);
        }
    };

    const menuItems = [
        {
            icon: Ticket,
            label: 'My Bookings',
            description: 'View booking history',
            onClick: () => navigate('/history'),
            show: true
        },
        {
            icon: Heart,
            label: 'Watchlist',
            description: 'Movies you want to see',
            onClick: () => navigate('/watchlist'),
            show: true
        },
        {
            icon: Shield,
            label: 'Admin Dashboard',
            description: 'Manage system',
            onClick: () => navigate('/admin'),
            show: auth.user?.role === 'admin' || auth.user?.role === 'super_admin',
            badge: auth.user?.role === 'super_admin' ? 'Super Admin' : 'Admin'
        },
        {
            icon: Wallet,
            label: 'My Wallet',
            description: 'Balance & Top-up',
            onClick: () => navigate('/wallet'),
            show: true
        }
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30">
            <Navbar />

            {/* Cinematic Backdrop for Profile */}
            <div className="relative h-64 w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-emerald-500/10 to-transparent" />
                <div className="absolute inset-0 backdrop-blur-3xl" />
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
            </div>

            <div className="max-w-3xl mx-auto px-6 -mt-32 relative z-10 space-y-12 pb-24">
                {/* Identity Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center text-center"
                >
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500 to-emerald-700 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <div className="w-32 h-32 rounded-full bg-neutral-900 border-2 border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden">
                            <User className="w-16 h-16 text-emerald-500/50" />
                            <div className="absolute inset-0 bg-white/5 opacity-50" />
                        </div>
                    </div>

                    {isEditing ? (
                        <div className="mt-8 flex items-center gap-3">
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-center text-xl font-bold focus:outline-none focus:border-emerald-500/50 transition-all backdrop-blur-xl"
                                autoFocus
                            />
                            <button
                                onClick={handleUpdateProfile}
                                disabled={isSaving}
                                className="w-12 h-12 bg-emerald-500 rounded-2xl text-neutral-950 flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <Check className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    setNewName(auth.user?.name || '');
                                    setIsEditing(false);
                                }}
                                className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="mt-8">
                            <div className="flex items-center justify-center gap-3">
                                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent italic">
                                    {auth.user?.name}
                                </h1>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 text-neutral-500 hover:text-white transition-all shadow-sm"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-neutral-500 font-medium mt-2">
                                <Mail className="w-4 h-4 text-emerald-500/50" />
                                <span>{auth.user?.email}</span>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Account Settings / Meta */}
                <div className="grid grid-cols-1 gap-4">
                    {/* Partner Request Section */}
                    {auth.user?.role === 'user' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden group"
                        >
                            <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-500/10 blur-3xl rounded-full" />
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner">
                                        <Briefcase className="w-8 h-8" />
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-wider">Theater Partner</h3>
                                        <p className="text-sm text-neutral-400">
                                            {auth.user?.adminRequestStatus === 'PENDING'
                                                ? 'Your application is being reviewed'
                                                : auth.user?.adminRequestStatus === 'REJECTED'
                                                    ? 'Application rejected'
                                                    : 'Start managing your own cinema'}
                                        </p>
                                    </div>
                                </div>

                                {auth.user?.adminRequestStatus === 'PENDING' ? (
                                    <span className="px-6 py-3 rounded-2xl bg-amber-500/10 text-amber-500 text-sm font-bold uppercase tracking-widest border border-amber-500/20">
                                        Pending
                                    </span>
                                ) : (
                                    <button
                                        onClick={handleRequestOwner}
                                        disabled={requestLoading || auth.user?.adminRequestStatus === 'REJECTED'}
                                        className={cn(
                                            "px-8 py-4 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all shadow-xl active:scale-95",
                                            auth.user?.adminRequestStatus === 'REJECTED'
                                                ? 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 hover:shadow-amber-500/30 hover:scale-105'
                                        )}
                                    >
                                        {requestLoading ? '...' : auth.user?.adminRequestStatus === 'REJECTED' ? 'Rejected' : 'Apply Now'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Menu Items */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {menuItems
                            .filter((item) => item.show)
                            .map((item, index) => (
                                <motion.button
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + (index * 0.1) }}
                                    onClick={item.onClick}
                                    className="group relative flex flex-col items-center justify-center gap-6 p-8 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/5 hover:border-emerald-500/30 transition-all hover:-translate-y-1 overflow-hidden"
                                >
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div className="w-20 h-20 rounded-[2rem] bg-neutral-900 border border-white/5 flex items-center justify-center text-neutral-500 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-all duration-500 shadow-xl group-hover:shadow-emerald-500/20">
                                        <item.icon className="w-10 h-10" />
                                    </div>
                                    <div className="text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-lg font-bold text-white tracking-tight uppercase tracking-[0.1em]">{item.label}</span>
                                            {item.badge && (
                                                <span className="px-3 py-1 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-black uppercase tracking-[0.1em] shadow-lg shadow-emerald-500/20">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-xs text-neutral-500 font-medium">{item.description}</p>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/50 transition-all duration-700" />
                                </motion.button>
                            ))}
                    </div>

                    {/* Logout Button */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        onClick={handleLogout}
                        className="group flex items-center gap-6 p-6 rounded-[2.5rem] bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 border border-red-500/20 shadow-lg group-hover:scale-110 transition-transform">
                            <LogOut className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="font-bold text-red-500 uppercase tracking-widest text-lg">Sign Out</h3>
                            <p className="text-xs text-red-400 opacity-60">End your current session securely</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-red-500/30 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                </div>
            </div>

            <SiteFooter />
        </div>
    );
};

export default Profile;
