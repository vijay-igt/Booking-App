import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, User, Mail, Shield, LogOut, Ticket, ChevronRight, Crown, Edit2, Check, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import api from '../api';

const Profile: React.FC = () => {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(auth?.user?.name || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleLogout = () => {
        auth?.logout();
        navigate('/login');
    };

    const handleUpdateProfile = async () => {
        if (!newName.trim() || newName === auth?.user?.name) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            const response = await api.put('/auth/profile', { name: newName });
            if (auth?.user) {
                auth.login(auth.token!, response.data.user);
            }
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        } finally {
            setIsSaving(false);
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
            icon: Shield,
            label: 'Admin Dashboard',
            description: 'Manage system',
            onClick: () => navigate('/admin'),
            show: auth?.user?.role === 'admin',
            badge: 'Admin'
        }
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-white pb-24">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800">
                <div className="px-5 py-4 flex items-center gap-3">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/')}
                        className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.button>
                    <h1 className="font-bold">Profile</h1>
                </div>
            </div>

            <div className="px-5 py-6 space-y-6">
                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-3xl bg-gradient-to-br from-emerald-500/10 to-neutral-900 border border-emerald-500/20 p-6 overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>

                    <div className="relative flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                            <User className="w-10 h-10 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            {isEditing ? (
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500 w-full"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleUpdateProfile}
                                        disabled={isSaving}
                                        className="p-1.5 bg-emerald-500 rounded-lg text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setNewName(auth?.user?.name || '');
                                        }}
                                        className="p-1.5 bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-2xl font-bold truncate">{auth?.user?.name || 'User'}</h2>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-1 hover:text-emerald-400 transition-colors text-neutral-500"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                                <Mail className="w-4 h-4" />
                                <span className="truncate">{auth?.user?.email || 'user@example.com'}</span>
                            </div>
                            {auth?.user?.role === 'admin' && (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                                    <Crown className="w-3 h-3 text-amber-400" />
                                    <span className="text-xs font-semibold text-amber-400">Administrator</span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Menu Items */}
                <div className="space-y-2">
                    {menuItems.filter(item => item.show).map((item, index) => (
                        <motion.button
                            key={item.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={item.onClick}
                            className="w-full p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all flex items-center gap-4 group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">
                                <item.icon className="w-5 h-5 text-neutral-400 group-hover:text-emerald-400 transition-colors" />
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="font-semibold mb-0.5 flex items-center gap-2">
                                    {item.label}
                                    {item.badge && (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400 uppercase">
                                            {item.badge}
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs text-neutral-500">{item.description}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                        </motion.button>
                    ))}
                </div>

                {/* Account Settings (Disabled) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 opacity-50"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-neutral-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold mb-0.5">Account Settings</h3>
                            <p className="text-xs text-neutral-500">Coming soon</p>
                        </div>
                    </div>
                </motion.div>

                {/* Logout Button */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={handleLogout}
                    className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </motion.button>
            </div>

            <BottomNav />
        </div>
    );
};

export default Profile;