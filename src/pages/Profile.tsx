import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../App';
import { User, Wallet, ArrowUpCircle, ArrowDownCircle, Users, ShieldCheck, Info, Headset, LogOut, ChevronRight, Settings, TrendingUp, Bell } from 'lucide-react';
import { motion } from 'motion/react';

const Profile: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const menuItems = [
    { label: 'My Investments', icon: TrendingUp, path: '/my-investments', color: 'text-[#ff0000]' },
    { label: 'Notifications', icon: Bell, path: '/notifications', color: 'text-red-500' },
    { label: 'Recharge History', icon: ArrowUpCircle, path: '/history?type=recharge', color: 'text-red-500' },
    { label: 'Withdraw History', icon: ArrowDownCircle, path: '/history?type=withdraw', color: 'text-blue-500' },
    { label: 'Invite Friends', icon: Users, path: '/team', color: 'text-orange-500' },
    { label: 'Rules & Regulations', icon: ShieldCheck, path: '/rules', color: 'text-green-500' },
    { label: 'About Us', icon: Info, path: '/about', color: 'text-purple-500' },
    { label: 'Customer Support', icon: Headset, path: '/support', color: 'text-indigo-500' },
  ];

  if (isAdmin) {
    menuItems.unshift({ label: 'Admin Dashboard', icon: Settings, path: '/admin', color: 'text-[#ff0000]' });
  }

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      {/* User Info Header */}
      <div className="flex items-center gap-4 py-6">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-[#ff0000]/10 overflow-hidden">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
            alt="User Avatar" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">{profile?.phone || 'Guest User'}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-red-50 text-[#ff0000] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {profile?.role || 'User'}
            </span>
            <span className="text-xs text-gray-400 font-medium">ID: {profile?.uid?.slice(0, 8)}...</span>
          </div>
        </div>
      </div>

      {/* Wallet Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-[25px] p-6 shadow-md border border-gray-50 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
            <Wallet className="text-[#ff0000]" size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Available Balance</p>
            <p className="text-xl font-black text-gray-800 truncate max-w-[150px]">₹{profile?.balance?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => navigate('/recharge')}
            className="bg-[#ff0000] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-transform"
          >
            Recharge
          </button>
          <button 
            onClick={() => navigate('/withdraw')}
            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
          >
            Withdraw
          </button>
        </div>
      </motion.div>

      {/* Menu List */}
      <div className="bg-white rounded-[25px] shadow-md border border-gray-50 overflow-hidden divide-y divide-gray-50">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <item.icon className={item.color} size={20} />
              </div>
              <span className="text-sm font-bold text-gray-700">{item.label}</span>
            </div>
            <ChevronRight className="text-gray-300" size={20} />
          </button>
        ))}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full bg-white text-[#ff0000] py-4 rounded-[20px] font-bold text-sm shadow-md border border-red-50 flex items-center justify-center gap-2 active:bg-red-50 transition-colors"
      >
        <LogOut size={20} />
        Logout
      </button>

      <div className="text-center py-4">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Growvix v1.0.0</p>
      </div>
    </div>
  );
};

export default Profile;
