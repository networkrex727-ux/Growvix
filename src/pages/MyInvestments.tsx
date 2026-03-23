import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, updateDoc, doc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { useToast } from '../context/ToastContext';
import { Investment, InvestmentStatus, TransactionType, TransactionStatus } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, TrendingUp, Clock, CheckCircle2, AlertCircle, Calendar, Wallet } from 'lucide-react';

const MyInvestments: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'investments'),
      where('userId', '==', user.uid),
      where('status', '==', InvestmentStatus.ACTIVE)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const investData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment));
      setInvestments(investData);
      setLoading(false);
    }, (error) => {
      console.error("Investments fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleClaimIncome = async (investment: Investment) => {
    if (!user || !profile) return;

    // Check if 24 hours have passed since last claim
    const lastClaim = new Date(investment.lastIncomeClaimed);
    const now = new Date();
    const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastClaim < 24) {
      const remainingHours = Math.ceil(24 - hoursSinceLastClaim);
      showToast(`You can claim again in ${remainingHours} hours.`, "warning");
      return;
    }

    setClaiming(investment.id);
    try {
      // 1. Update User Balance
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(investment.dailyIncome),
        withdrawableBalance: increment(investment.dailyIncome),
        totalIncome: increment(investment.dailyIncome),
        todayIncome: increment(investment.dailyIncome),
      });

      // 2. Update Investment lastClaimed
      await updateDoc(doc(db, 'investments', investment.id), {
        lastIncomeClaimed: now.toISOString(),
      });

      // 3. Create Transaction Log
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: investment.dailyIncome,
        type: TransactionType.INCOME,
        status: TransactionStatus.COMPLETED,
        createdAt: serverTimestamp(),
        description: `Daily income from ${investment.planName}`,
      });

      showToast(`Successfully claimed ₹${investment.dailyIncome}!`, "success");
    } catch (error) {
      console.error("Claim error:", error);
      showToast("Failed to claim income. Please try again.", "error");
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors shadow-sm">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">My Investments</h1>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-50 flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
            <TrendingUp className="text-[#ff0000]" size={20} />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Plans</p>
          <p className="text-lg font-black text-gray-800">{investments.length}</p>
        </div>
        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-50 flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <Wallet className="text-blue-500" size={20} />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Income</p>
          <p className="text-lg font-black text-gray-800">₹{profile?.totalIncome?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      {/* Investments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#ff0000] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : investments.length > 0 ? (
          investments.map((inv) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[25px] p-5 shadow-md border border-gray-50 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-[#ff0000]" size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">{inv.planName}</h3>
                    <p className="text-[10px] text-gray-400 font-medium">Daily: ₹{inv.dailyIncome}</p>
                  </div>
                </div>
                <div className="bg-green-50 text-green-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Active
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50">
                <div className="flex items-center gap-2">
                  <Calendar className="text-gray-300" size={14} />
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Purchase Date</p>
                    <p className="text-xs font-bold text-gray-700">{new Date(inv.purchaseDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="text-gray-300" size={14} />
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Expiry Date</p>
                    <p className="text-xs font-bold text-gray-700">{new Date(inv.expiryDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleClaimIncome(inv)}
                disabled={claiming === inv.id}
                className="w-full bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white py-3 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-transform disabled:opacity-50"
              >
                {claiming === inv.id ? 'Processing...' : 'Claim Daily Income'}
              </button>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <TrendingUp size={40} className="mb-2 opacity-20" />
            <p className="text-sm font-medium">No active investments found</p>
            <button 
              onClick={() => navigate('/product')}
              className="mt-4 text-[#ff0000] font-bold text-sm hover:underline"
            >
              Browse Plans
            </button>
          </div>
        )}
      </div>

      <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 border border-blue-100">
        <AlertCircle className="text-blue-500 shrink-0" size={20} />
        <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
          Daily income can be claimed every 24 hours. Make sure to claim your income daily to maximize your earnings.
        </p>
      </div>
    </div>
  );
};

export default MyInvestments;
