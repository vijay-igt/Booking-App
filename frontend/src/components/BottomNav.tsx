import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Ticket, User, Wallet } from 'lucide-react';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-card px-8 py-5 rounded-[40px] border-white/10 flex items-center gap-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-50 backdrop-blur-3xl bg-[#0a0a0b]/60">
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/')}
        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/') ? 'text-blue-500' : 'text-gray-500 hover:text-white'
          }`}
      >
        <Home className="w-6 h-6" />
        <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
      </motion.button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/history')}
        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/history') ? 'text-blue-500' : 'text-gray-500 hover:text-white'
          }`}
      >
        <Ticket className="w-6 h-6" />
        <span className="text-[9px] font-black uppercase tracking-widest">Tickets</span>
      </motion.button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/profile')}
        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/profile') ? 'text-blue-500' : 'text-gray-500 hover:text-white'
          }`}
      >
        <User className="w-6 h-6" />
        <span className="text-[9px] font-black uppercase tracking-widest">Profile</span>
      </motion.button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/wallet')}
        className={`flex flex-col items-center gap-1 transition-colors ${isActive('/wallet') ? 'text-blue-500' : 'text-gray-500 hover:text-white'
          }`}
      >
        <Wallet className="w-6 h-6" />
        <span className="text-[9px] font-black uppercase tracking-widest">Wallet</span>
      </motion.button>
    </nav>
  );
};

export default BottomNav;

