import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Home, ArrowLeft } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-32 h-32 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-8 relative"
      >
        <Search size={64} />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 border-4 border-dashed border-red-100 rounded-full"
        />
      </motion.div>
      
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-6xl font-black text-gray-900 mb-2 uppercase tracking-tighter"
      >
        404
      </motion.h1>
      
      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-black text-gray-800 mb-4 uppercase tracking-widest"
      >
        Page Not Found
      </motion.h2>
      
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-gray-500 font-medium max-w-xs mb-10"
      >
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col w-full max-w-xs gap-3"
      >
        <button
          onClick={() => navigate('/')}
          className="w-full bg-[#ff0000] text-white py-4 rounded-2xl font-black shadow-xl shadow-red-100 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-widest"
        >
          <Home size={18} />
          Go to Home
        </button>
        
        <button
          onClick={() => navigate(-1)}
          className="w-full bg-white text-gray-600 py-4 rounded-2xl font-black border-2 border-gray-100 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-widest"
        >
          <ArrowLeft size={18} />
          Go Back
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-16 pt-8 border-t border-gray-50 w-full max-w-xs"
      >
        <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em]">
          Growvix Navigation System
        </p>
      </motion.div>
    </div>
  );
};

export default NotFound;
