import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, Users, User } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/product', icon: ShoppingBag, label: 'Product' },
    { to: '/team', icon: Users, label: 'Team' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const handleVibrate = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  return (
    <nav className="fixed bottom-6 left-0 right-0 z-50 pointer-events-none px-6">
      <div className="relative w-full max-w-md mx-auto h-20 flex items-center justify-around bg-white/80 backdrop-blur-xl rounded-[30px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 pointer-events-auto px-2 overflow-hidden">
        {/* Dynamic Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#ff0000]/5 to-transparent pointer-events-none" />
        
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={handleVibrate}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 transition-all duration-500 flex-1 relative py-2 z-10",
                isActive 
                  ? "text-[#ff0000]" 
                  : "text-gray-400 hover:text-gray-600"
              )
            }
          >
            {({ isActive }) => (
              <>
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  animate={isActive ? { y: -4 } : { y: 0 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={cn(
                    "p-2 rounded-2xl transition-all duration-500",
                    isActive ? "bg-red-50 shadow-inner" : "bg-transparent"
                  )}>
                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-300",
                    isActive ? "opacity-100 scale-100" : "opacity-0 scale-75"
                  )}>
                    {item.label}
                  </span>
                </motion.div>
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute -bottom-1 w-8 h-1 bg-[#ff0000] rounded-full shadow-[0_0_10px_rgba(255,0,0,0.5)]"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
