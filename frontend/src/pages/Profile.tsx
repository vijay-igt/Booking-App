import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, User, Mail, Shield, LogOut, Ticket, Settings } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Profile: React.FC = () => {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        auth?.logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white pb-32">
            {/* Header */}
            <div className="p-8 flex items-center gap-6">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate(-1)}
                    className="w-12 h-12 glass-card rounded-full flex items-center justify-center hover:bg-white/10 transition-colors border border-white/20"
                >
                    <ChevronLeft className="w-6 h-6" />
                </motion.button>
                <h1 className="text-3xl font-black tracking-tight">Account Profile</h1>
            </div>

            <main className="max-w-2xl mx-auto px-8 py-12 space-y-8">
                {/* User Info Card */}
                <div className="glass-card p-10 rounded-[40px] border-white/10 bg-gradient-to-br from-blue-600/10 to-transparent flex flex-col items-center text-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)]">
                        <User className="w-12 h-12 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">{auth?.user?.name || 'User Name'}</h2>
                        <p className="text-gray-400 font-medium flex items-center justify-center gap-2 mt-1">
                            <Mail className="w-4 h-4" /> {auth?.user?.email || 'user@example.com'}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-500">
                            {auth?.user?.role === 'admin' ? 'Administrator' : 'Premium Member'}
                        </span>
                    </div>
                </div>

                {/* Settings Grid */}
                <div className="grid gap-4">
                    <button
                        onClick={() => navigate('/history')}
                        className="glass-card p-6 rounded-3xl border-white/5 hover:border-blue-500/50 transition-all flex items-center gap-6 group text-left"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600/20 transition-colors">
                            <Ticket className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-lg">My Tickets</h4>
                            <p className="text-xs text-gray-500 font-medium">View your booking history</p>
                        </div>
                    </button>

                    {auth?.user?.role === 'admin' && (
                        <button
                            onClick={() => navigate('/admin')}
                            className="glass-card p-6 rounded-3xl border-white/5 hover:border-blue-500/50 transition-all flex items-center gap-6 group text-left"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600/20 transition-colors">
                                <Shield className="w-6 h-6 text-blue-500" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg">Admin Dashboard</h4>
                                <p className="text-xs text-gray-500 font-medium">Manage theaters and movies</p>
                            </div>
                        </button>
                    )}

                    <button className="glass-card p-6 rounded-3xl border-white/5 hover:border-white/20 transition-all flex items-center gap-6 group text-left opacity-50 cursor-not-allowed">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                            <Settings className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-lg">Account Settings</h4>
                            <p className="text-xs text-gray-500 font-medium">Manage security and preferences</p>
                        </div>
                    </button>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full py-5 rounded-[32px] bg-red-600/10 border border-red-600/20 text-red-500 font-black uppercase tracking-widest text-xs hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-3"
                >
                    <LogOut className="w-4 h-4" /> Sign Out from CinePass
                </button>
            </main>
        </div>
    );
};

export default Profile;
