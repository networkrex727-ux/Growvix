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
    <nav className="fixed bottom-8 left-0 right-0 z-50 pointer-events-none px-8">
      <div className="flex justify-between items-center w-full max-w-md mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={handleVibrate}
            className={({ isActive }) =>
              cn(
                "pointer-events-auto flex flex-col items-center gap-1 transition-all duration-500 flex-1 relative py-2",
                isActive 
                  ? "text-[#ff0000] scale-125 -translate-y-4" 
                  : "text-gray-400 hover:text-gray-600"
              )
            }
          >
            {({ isActive }) => (
              <>
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-1"
                >
                  <item.icon size={26} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                    isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                  )}>
                    {item.label}
                  </span>
                </motion.div>
                {isActive && (
                  <motion.div 
                    layoutId="active-dot"
                    className="absolute -bottom-2 w-1.5 h-1.5 bg-[#ff0000] rounded-full"
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
