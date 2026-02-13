import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import api from '../api';

const AuthCallback: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();

    useEffect(() => {
        const handleAuthCallback = async () => {
            const params = new URLSearchParams(location.search);
            const token = params.get('token');
            const error = params.get('error');

            if (error) {
                console.error('Google OAuth Error:', error);
                // Redirect to login with an error message
                navigate('/login', { state: { error: 'Google login failed. Please try again.' } });
                return;
            }

            if (token) {
                try {
                    // Fetch user data using the token
                    const userResponse = await api.get('/auth/me', {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    auth.login(token, userResponse.data);
                    navigate('/'); // Redirect to home or dashboard
                } catch (e) {
                    console.error('Error processing token or fetching user data:', e);
                    navigate('/login', { state: { error: 'Failed to process login token or fetch user data.' } });
                }
            } else {
                // No token and no error, something went wrong
                navigate('/login', { state: { error: 'Authentication callback failed.' } });
            }
        };

        handleAuthCallback();
    }, [location, navigate, auth]);

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4"
            >
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <p className="text-lg text-neutral-400">Logging you in...</p>
            </motion.div>
        </div>
    );
};

export default AuthCallback;
