import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateDoc, doc, increment, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { useToast } from '../context/ToastContext';
import { TransactionType, TransactionStatus } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, Gift, Calendar, CheckCircle2, Wallet, Sparkles, AlertCircle } from 'lucide-react';

const CheckIn: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCheckIn = async () => {
    if (!user || !profile) return;

    // Check if user already checked in today
    const lastCheckIn = profile.lastCheckIn ? new Date(profile.lastCheckIn) : null;
    const today = new Date();
    
    if (lastCheckIn && 
        lastCheckIn.getDate() === today.getDate() && 
        lastCheckIn.getMonth() === today.getMonth() && 
        lastCheckIn.getFullYear() === today.getFullYear()) {
      showToast("You have already checked in today!", "warning");
      return;
    }

    setLoading(true);
    try {
      const reward = 10; // ₹10 daily bonus

      // 1. Update User Profile
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(reward),
        withdrawableBalance: increment(reward),
        totalIncome: increment(reward),
        todayIncome: increment(reward),
        lastCheckIn: today.toISOString(),
      });

      // 2. Create Transaction Log
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: reward,
        type: TransactionType.BONUS,
        status: TransactionStatus.COMPLETED,
        createdAt: serverTimestamp(),
        description: 'Daily Check-in Bonus',
      });

      showToast(`Successfully checked in! You earned ₹${reward}`, "success");
      navigate('/');
    } catch (error) {
      console.error("Check-in error:", error);
      showToast("Failed to check in. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const isCheckedInToday = () => {
    if (!profile?.lastCheckIn) return false;
    const lastCheckIn = new Date(profile.lastCheckIn);
    const today = new Date();
    return lastCheckIn.getDate() === today.getDate() && 
           lastCheckIn.getMonth() === today.getMonth() && 
           lastCheckIn.getFullYear() === today.getFullYear();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors shadow-sm">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Daily Check-in</h1>
      </div>

      {/* Reward Card */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-[#ff0000] to-[#cc0000] rounded-[30px] p-8 text-white shadow-xl relative overflow-hidden flex flex-col items-center text-center space-y-4"
      >
        <div className="relative z-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 mx-auto">
            <Gift size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-black">₹10.00</h2>
          <p className="text-white/80 text-sm font-medium">Daily Reward Amount</p>
        </div>
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </motion.div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-50 flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
            <Wallet className="text-[#ff0000]" size={20} />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Balance</p>
          <p className="text-lg font-black text-gray-800">₹{profile?.balance?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-50 flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
            <Sparkles className="text-orange-500" size={20} />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Streak</p>
          <p className="text-lg font-black text-gray-800">1 Day</p>
        </div>
      </div>

      {/* Calendar View (Static) */}
      <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-50 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Calendar size={18} className="text-[#ff0000]" />
            Weekly Rewards
          </h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">March 2026</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <div key={day} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-12 rounded-xl flex items-center justify-center font-bold text-xs transition-colors ${
                day === 1 && isCheckedInToday() 
                  ? 'bg-green-500 text-white shadow-lg shadow-green-100' 
                  : 'bg-gray-50 text-gray-400'
              }`}>
                {day === 1 && isCheckedInToday() ? <CheckCircle2 size={16} /> : `+₹10`}
              </div>
              <span className="text-[10px] font-bold text-gray-400">Day {day}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleCheckIn}
          disabled={loading || isCheckedInToday()}
          className={`w-full py-4 rounded-[20px] font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
            isCheckedInToday() 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white shadow-red-200'
          }`}
        >
          {loading ? 'Processing...' : isCheckedInToday() ? 'Already Checked-in' : 'Check-in Now'}
        </button>
      </div>

      <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 border border-blue-100">
        <AlertCircle className="text-blue-500 shrink-0" size={20} />
        <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
          Check-in every day to earn rewards. If you miss a day, your streak will reset. Rewards are added directly to your balance.
        </p>
      </div>
    </div>
  );
};

export default CheckIn;
