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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive 
                  ? "text-[#ff0000]" 
                  : "text-gray-400"
              )
            }
          >
            <item.icon size={22} strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-tight">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
