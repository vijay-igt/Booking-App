import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

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
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTheater = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/admin/theaters');
                const found = response.data.find((t: Theater) => t.id === parseInt(id || ''));
                setTheater(found);
            } catch (error) {
                console.error('Error fetching theater screens:', error);
            }
        };
        fetchTheater();
    }, [id]);

    if (!theater) return <div className="p-8 text-center">Loading theater details...</div>;

    return (
        <div className="p-6 max-w-lg mx-auto bg-gray-50 min-h-screen">
            <button onClick={() => navigate(-1)} className="mb-6 text-blue-600 font-medium">← Back</button>

            <header className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900">{theater.name}</h1>
                <p className="text-gray-500 mt-1">{theater.location}</p>
            </header>

            <section>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Screen</h2>
                {theater.screens && theater.screens.length > 0 ? (
                    <div className="grid gap-3">
                        {theater.screens.map((screen) => (
                            <div
                                key={screen.id}
                                onClick={() => navigate(`/booking/${screen.id}`)}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer flex justify-between items-center group"
                            >
                                <span className="text-lg font-semibold text-gray-700">{screen.name}</span>
                                <span className="text-blue-500 px-4 py-1 bg-blue-50 rounded-full text-sm font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    Book
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 italic">No screens available in this theater.</p>
                )}
            </section>
        </div>
    );
};

export default TheaterScreens;
