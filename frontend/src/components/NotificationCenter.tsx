import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Info, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/useAuth';

interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
    isRead: boolean;
    createdAt: string;
}

const NotificationCenter: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const auth = useAuth();

    const fetchNotifications = useCallback(async () => {
        if (!auth.user) return;
        setLoading(true);
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [auth.user]);

    useEffect(() => {
        if (isOpen && auth.user) {
            fetchNotifications();
        }
    }, [isOpen, auth.user, fetchNotifications]);

    const markAsRead = async (id: number) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (id: number) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const deleteAllNotifications = async () => {
        if (!window.confirm('Are you sure you want to delete all notifications?')) return;
        try {
            await api.delete('/notifications/all');
            setNotifications([]);
        } catch (error) {
            console.error('Error deleting all notifications:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
            default: return <Info className="w-5 h-5 text-blue-400" />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />

                    {/* Notification Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-sm bg-neutral-900 border-l border-neutral-800 z-[70] shadow-2xl"
                    >
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-lg">Notifications</h2>
                                        <p className="text-xs text-neutral-500">
                                            {notifications.filter(n => !n.isRead).length} unread messages
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Actions */}
                            {notifications.length > 0 && (
                                <div className="px-6 py-2 border-b border-neutral-800 bg-neutral-900/50 flex justify-between items-center">
                                    <button
                                        onClick={deleteAllNotifications}
                                        className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Clear All
                                    </button>
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                                    >
                                        <Check className="w-3 h-3" />
                                        Mark all as read
                                    </button>
                                </div>
                            )}

                            {/* List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {loading && notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40">
                                        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                                        <p className="text-sm text-neutral-500">Loading notifications...</p>
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                                            <Bell className="w-8 h-8 text-neutral-600" />
                                        </div>
                                        <h3 className="font-semibold text-neutral-400">All caught up!</h3>
                                        <p className="text-sm text-neutral-600 max-w-[200px] mt-2">
                                            You'll receive notifications when your bookings are confirmed.
                                        </p>
                                    </div>
                                ) : (
                                    notifications.map((notif) => (
                                        <motion.div
                                            key={notif.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`p-4 rounded-2xl border transition-all ${notif.isRead
                                                ? 'bg-neutral-900/50 border-neutral-800 opacity-60'
                                                : 'bg-neutral-800/50 border-neutral-700 shadow-lg'
                                                }`}
                                        >
                                            <div className="flex gap-4">
                                                <div className="mt-1 shrink-0">
                                                    {getIcon(notif.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h4 className={`font-bold text-sm ${notif.isRead ? 'text-neutral-300' : 'text-white'}`}>
                                                            {notif.title}
                                                        </h4>
                                                        {!notif.isRead && (
                                                            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-neutral-400 leading-relaxed mb-3">
                                                        {notif.message}
                                                    </p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] text-neutral-600 font-medium font-mono uppercase">
                                                            {new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            {!notif.isRead && (
                                                                <button
                                                                    onClick={() => markAsRead(notif.id)}
                                                                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider"
                                                                >
                                                                    Mark as read
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => deleteNotification(notif.id)}
                                                                className="text-[10px] font-bold text-neutral-500 hover:text-rose-400 uppercase tracking-wider transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default NotificationCenter;
