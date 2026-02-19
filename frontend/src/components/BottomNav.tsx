import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Ticket, User, Wallet } from 'lucide-react';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 card px-7 py-4 rounded-[24px] border-neutral-800 flex items-center gap-8 shadow-[0_20px_45px_rgba(0,0,0,0.55)] z-40 bg-[var(--bg-card)]/95 backdrop-blur-xl">
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/')}
        className={`flex flex-col items-center gap-1.5 transition-colors ${isActive('/') ? 'text-amber-500' : 'text-neutral-400 hover:text-neutral-100'
          }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Home</span>
      </motion.button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/history')}
        className={`flex flex-col items-center gap-1.5 transition-colors ${isActive('/history') ? 'text-amber-500' : 'text-neutral-400 hover:text-neutral-100'
          }`}
      >
        <Ticket className="w-5 h-5" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Tickets</span>
      </motion.button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/profile')}
        className={`flex flex-col items-center gap-1.5 transition-colors ${isActive('/profile') ? 'text-amber-500' : 'text-neutral-400 hover:text-neutral-100'
          }`}
      >
        <User className="w-5 h-5" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Profile</span>
      </motion.button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/wallet')}
        className={`flex flex-col items-center gap-1.5 transition-colors ${isActive('/wallet') ? 'text-amber-500' : 'text-neutral-400 hover:text-neutral-100'
          }`}
      >
        <Wallet className="w-5 h-5" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Wallet</span>
      </motion.button>
    </nav>
  );
};

export default BottomNav;

