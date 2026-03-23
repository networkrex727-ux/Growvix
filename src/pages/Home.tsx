import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Users, Headset, Calendar, History, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Home: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [ticker, setTicker] = useState<string[]>([]);

  useEffect(() => {
    const generateTicker = () => {
      const names = ['John', 'Ali', 'Sara', 'Mike', 'Emma', 'David', 'Sophia', 'James'];
      const amounts = [500, 1000, 2500, 5000, 10000, 15000];
      const newTicker = Array.from({ length: 5 }, () => {
        const name = names[Math.floor(Math.random() * names.length)];
        const amount = amounts[Math.floor(Math.random() * amounts.length)];
        return `User ${name.slice(0, 1)}*** just withdrew ₹${amount}`;
      });
      setTicker(newTicker);
    };

    generateTicker();
    const interval = setInterval(generateTicker, 5000);
    return () => clearInterval(interval);
  }, []);

  const actions = [
    { label: 'Recharge', icon: ArrowUpCircle, path: '/recharge', color: 'text-red-500' },
    { label: 'Withdraw', icon: ArrowDownCircle, path: '/withdraw', color: 'text-blue-500' },
    { label: 'Invite', icon: Users, path: '/team', color: 'text-orange-500' },
    { label: 'Support', icon: Headset, path: '/support', color: 'text-green-500' },
  ];

  const stats = [
    { label: 'Balance', value: `₹${profile?.balance?.toFixed(2) || '0.00'}`, icon: Wallet },
    { label: "Today's Income", value: `₹${profile?.todayIncome?.toFixed(2) || '0.00'}`, icon: Calendar },
    { label: 'Total Income', value: `₹${profile?.totalIncome?.toFixed(2) || '0.00'}`, icon: History },
  ];

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img 
            src="https://i.ibb.co/CcxW3F4/file-0000000054487208abbf2cb1db170f4e.png" 
            alt="Growvix Logo" 
            className="w-10 h-10 object-contain"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-xl font-bold text-gray-800">Growvix</h1>
        </div>
        <div className="text-sm text-gray-500 font-medium">ID: {profile?.phone || 'Guest'}</div>
      </div>

      {/* Balance Card */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-[#ff0000] to-[#cc0000] rounded-[25px] p-6 text-white shadow-xl relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Total Balance</p>
              <h2 className="text-3xl font-black mt-1">₹{profile?.balance?.toFixed(2) || '0.00'}</h2>
            </div>
            <div className="text-right">
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Withdrawable</p>
              <p className="text-lg font-black">₹{profile?.withdrawableBalance?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
          
          <div className="mt-2">
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Deposit Balance: ₹{profile?.depositBalance?.toFixed(2) || '0.00'}</p>
          </div>

          <div className="mt-6 flex gap-4">
            <button 
              onClick={() => navigate('/recharge')}
              className="flex-1 bg-white text-[#ff0000] py-3 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-transform"
            >
              Recharge
            </button>
            <button 
              onClick={() => navigate('/withdraw')}
              className="flex-1 bg-white/20 backdrop-blur-sm text-white py-3 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-transform border border-white/30"
            >
              Withdraw
            </button>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </motion.div>

      {/* Action Grid */}
      <div className="grid grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-active:scale-90 transition-transform`}>
              <action.icon className={action.color} size={28} />
            </div>
            <span className="text-xs font-semibold text-gray-600">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Banner Slider (Static for now) */}
      <div className="relative h-32 rounded-[20px] overflow-hidden shadow-md">
        <img 
          src="https://picsum.photos/seed/investment/800/400" 
          alt="Banner" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center p-6">
          <div className="text-white">
            <h3 className="font-bold text-lg">New VIP Plans</h3>
            <p className="text-xs text-white/80">Earn up to 20% daily income</p>
          </div>
        </div>
      </div>

      {/* Live Ticker */}
      <div className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm border border-gray-50">
        <Megaphone className="text-[#ff0000]" size={20} />
        <div className="flex-1 overflow-hidden h-6 relative">
          <AnimatePresence mode="wait">
            <motion.p
              key={ticker[0]}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="text-sm font-medium text-gray-700 absolute inset-0 truncate"
            >
              {ticker[0]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
              <Calendar className="text-[#ff0000]" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Today's Income</p>
              <p className="text-lg font-bold text-gray-800">₹{profile?.todayIncome?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/check-in')}
            className="bg-[#ff0000] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-transform"
          >
            Check-in
          </button>
        </div>

        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <History className="text-blue-500" size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Income</p>
            <p className="text-lg font-bold text-gray-800">₹{profile?.totalIncome?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => navigate('/team')}
          className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-50 flex flex-col items-center gap-2 active:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
            <Users className="text-orange-500" size={20} />
          </div>
          <span className="text-xs font-bold text-gray-700">Promotions</span>
        </button>
        <button 
          onClick={() => navigate('/history')}
          className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-50 flex flex-col items-center gap-2 active:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
            <History className="text-purple-500" size={20} />
          </div>
          <span className="text-xs font-bold text-gray-700">History</span>
        </button>
      </div>
    </div>
  );
};

export default Home;
