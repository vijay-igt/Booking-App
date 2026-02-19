import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, User, Mail, Shield, LogOut, Ticket, ChevronRight, Edit2, Check, X, Briefcase } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import BottomNav from '../components/BottomNav';
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
            icon: Shield,
            label: 'Admin Dashboard',
            description: 'Manage system',
            onClick: () => navigate('/admin'),
            show: auth.user?.role === 'admin' || auth.user?.role === 'super_admin',
            badge: auth.user?.role === 'super_admin' ? 'Super Admin' : 'Admin'
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
                    className="relative rounded-2xl bg-neutral-900 border border-neutral-800 p-6 overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>

                    <div className="relative flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0">
                            <User className="w-10 h-10 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            {isEditing ? (
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500 w-full"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleUpdateProfile}
                                        disabled={isSaving}
                                        className="p-1.5 bg-amber-500 rounded-lg text-black"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setNewName(auth.user?.name || '');
                                            setIsEditing(false);
                                        }}
                                        className="p-1.5 bg-neutral-700 rounded-lg text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mb-2">
                                    <h2 className="text-xl font-bold truncate">{auth.user?.name}</h2>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-1 text-neutral-400 hover:text-white"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-neutral-400 text-sm">
                                <Mail className="w-4 h-4" />
                                <span className="truncate">{auth.user?.email}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Partner Request Section */}
                {auth.user?.role === 'user' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                                        <Briefcase className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-white">Theater Partner</h3>
                                        <p className="text-xs text-neutral-400">
                                            {auth.user?.adminRequestStatus === 'PENDING' ? 'Request under review' :
                                             auth.user?.adminRequestStatus === 'REJECTED' ? 'Request rejected' :
                                             'Become a theater owner'}
                                        </p>
                                    </div>
                                </div>
                                
                                {auth.user?.adminRequestStatus === 'PENDING' ? (
                                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium">
                                        Pending
                                    </span>
                                ) : (
                                    <button
                                        onClick={handleRequestOwner}
                                        disabled={requestLoading || auth.user?.adminRequestStatus === 'REJECTED'} // Maybe allow re-request later
                                        className={`px-4 py-2 rounded-xl text-sm font-medium ${
                                            auth.user?.adminRequestStatus === 'REJECTED'
                                                ? 'bg-red-500/10 text-red-500 cursor-not-allowed'
                                                : 'bg-amber-500 hover:bg-amber-400 text-black active:scale-95 transition-transform'
                                        }`}
                                    >
                                        {requestLoading ? '...' : auth.user?.adminRequestStatus === 'REJECTED' ? 'Rejected' : 'Apply Now'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Menu Items */}
                <div className="space-y-3">
                    {menuItems.filter(item => item.show).map((item, index) => (
                        <motion.button
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 + 0.2 }}
                            onClick={item.onClick}
                            className="w-full flex items-center gap-4 p-4 bg-neutral-900 rounded-2xl border border-neutral-800 active:scale-[0.98] transition-all hover:bg-neutral-800"
                        >
                            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="font-medium text-white flex items-center gap-2">
                                    {item.label}
                                    {item.badge && (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-neutral-400">{item.description}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-neutral-600" />
                        </motion.button>
                    ))}

                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 p-4 bg-red-500/5 rounded-2xl border border-red-500/10 active:scale-[0.98] transition-all hover:bg-red-500/10 mt-6"
                    >
                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                            <LogOut className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-medium text-red-500">Logout</div>
                            <p className="text-xs text-red-400/60">Sign out of your account</p>
                        </div>
                    </motion.button>
                </div>
            </div>

      <SiteFooter />
      <BottomNav />
        </div>
    );
};

export default Profile;
