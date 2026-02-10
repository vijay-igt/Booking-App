import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
    targetTime: number; // Timestamp in milliseconds
    onExpire: () => void;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetTime, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState<number>(() => Math.max(0, targetTime - Date.now()));

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, targetTime - now);
            setTimeLeft(remaining);

            if (remaining <= 0) {
                clearInterval(interval);
                onExpire();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [targetTime, onExpire]);

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    return (
        <div className="font-mono text-xl font-bold text-amber-500">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
    );
};

export default CountdownTimer;
