import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';
import { ChevronLeft, MapPin, Monitor, ChevronRight } from 'lucide-react';

interface Screen {
    id: number;
    name: string;
}

interface Theater {
    id: number;
    name: string;
    location: string;
    screens: Screen[];
}

const TheaterScreens: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [theater, setTheater] = useState<Theater | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTheater = async () => {
            try {
                const response = await api.get('/admin/theaters');
                const found = response.data.find((t: Theater) => t.id === parseInt(id || ''));
                setTheater(found);
            } catch (error) {
                console.error('Error fetching theater screens:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTheater();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!theater) {
        return (
            <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-5">
                <div className="w-20 h-20 rounded-full bg-neutral-900 flex items-center justify-center mb-4">
                    <MapPin className="w-10 h-10 text-neutral-700" />
                </div>
                <h3 className="font-semibold mb-2">Theater not found</h3>
                <p className="text-sm text-neutral-500 mb-6">This theater doesn't exist or has been removed</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-3 rounded-full bg-emerald-500 text-white font-semibold"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white pb-8">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800">
                <div className="px-5 py-4 flex items-center gap-3">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-bold truncate">{theater.name}</h1>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span className="truncate">{theater.location}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-5 pt-6">
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wide mb-4">
                    Available Screens
                </h2>

                {theater.screens && theater.screens.length > 0 ? (
                    <div className="space-y-3">
                        {theater.screens.map((screen, idx) => (
                            <motion.button
                                key={screen.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => navigate(`/booking/${screen.id}`)}
                                className="w-full p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all flex items-center gap-4 group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center group-hover:bg-emerald-500/10 transition-all">
                                    <Monitor className="w-6 h-6 text-neutral-400 group-hover:text-emerald-400 transition-colors" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-semibold mb-0.5">{screen.name}</h3>
                                    <p className="text-xs text-neutral-500">Select seats for this screen</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                            </motion.button>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center rounded-2xl bg-neutral-900 border border-dashed border-neutral-800">
                        <Monitor className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                        <p className="text-neutral-500">No screens configured yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TheaterScreens;