import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';
import { ChevronLeft, MapPin, Monitor } from 'lucide-react';

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
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!theater) return (
        <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col items-center justify-center p-8">
            <p className="text-gray-500 mb-6">Theater not found.</p>
            <button onClick={() => navigate(-1)} className="neon-button px-8">Go Back</button>
        </div>
    );

    return (
        <div className="bg-[#0a0a0b] min-h-screen text-white p-6 pb-20 overflow-x-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none"></div>

            <header className="max-w-xl mx-auto mb-12 flex items-center gap-6 pt-6">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate(-1)}
                    className="w-12 h-12 glass-card rounded-full flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
                >
                    <ChevronLeft className="w-6 h-6" />
                </motion.button>
                <div>
                    <h1 className="text-3xl font-black tracking-tight leading-none mb-2">{theater.name}</h1>
                    <div className="flex items-center gap-2 text-gray-500">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{theater.location}</span>
                    </div>
                </div>
            </header>

            <section className="max-w-xl mx-auto space-y-6">
                <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Select Experience Room</h2>
                {theater.screens && theater.screens.length > 0 ? (
                    <div className="grid gap-4">
                        {theater.screens.map((screen, idx) => (
                            <motion.div
                                key={screen.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => navigate(`/booking/${screen.id}`)}
                                className="glass-card p-6 rounded-[32px] border border-white/5 hover:border-blue-500/50 hover:bg-blue-600/5 transition-all cursor-pointer flex justify-between items-center group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <Monitor className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-lg font-black text-white">{screen.name}</span>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">4K LASER PROJECTION</p>
                                    </div>
                                </div>
                                <span className="bg-blue-600/10 text-blue-500 px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                    Book
                                </span>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center glass-card rounded-[32px] border-dashed border-white/5 text-gray-500 italic font-medium">
                        No screens currently initialized for this venue.
                    </div>
                )}
            </section>
        </div>
    );
};

export default TheaterScreens;
