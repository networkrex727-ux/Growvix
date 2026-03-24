import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, updateDoc, doc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { useToast } from '../context/ToastContext';
import { Investment, InvestmentStatus, TransactionType, TransactionStatus } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, TrendingUp, Clock, CheckCircle2, AlertCircle, Calendar, Wallet, Zap } from 'lucide-react';

const CountdownTimer: React.FC<{ lastClaim: string; onComplete: () => void }> = ({ lastClaim, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState<string>('24:00:00');

  useEffect(() => {
    const calculate = () => {
      const last = new Date(lastClaim).getTime();
      const next = last + 24 * 60 * 60 * 1000;
      const now = new Date().getTime();
      const diff = next - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        onComplete();
        return false;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      return true;
    };

    calculate();
    const interval = setInterval(() => {
      if (!calculate()) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastClaim, onComplete]);

  return (
    <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
      <Clock size={14} className="text-[#ff0000] animate-pulse" />
      <span className="text-xs font-black text-[#ff0000] font-mono tracking-wider">{timeLeft}</span>
    </div>
  );
};

const MyInvestments: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<Set<string>>(new Set());

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

  const handleClaimIncome = useCallback(async (investment: Investment) => {
    if (!user || !profile || claiming.has(investment.id)) return;

    // Check if 24 hours have passed since last claim
    const lastClaim = new Date(investment.lastIncomeClaimed);
    const now = new Date();
    const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastClaim < 24) return;

    setClaiming(prev => new Set(prev).add(investment.id));
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

      showToast(`Auto-claimed ₹${investment.dailyIncome} from ${investment.planName}!`, "success");
    } catch (error) {
      console.error("Claim error:", error);
    } finally {
      setClaiming(prev => {
        const next = new Set(prev);
        next.delete(investment.id);
        return next;
      });
    }
  }, [user, profile, claiming, showToast]);

  // Initial check for auto-claim on load
  useEffect(() => {
    if (investments.length > 0 && !loading) {
      investments.forEach(inv => {
        const lastClaim = new Date(inv.lastIncomeClaimed);
        const now = new Date();
        const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastClaim >= 24) {
          handleClaimIncome(inv);
        }
      });
    }
  }, [investments, loading, handleClaimIncome]);

  const totalDailyIncome = investments.reduce((sum, inv) => sum + inv.dailyIncome, 0);

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
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-[20px] shadow-sm border border-gray-50 flex flex-col items-center gap-1.5">
          <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
            <TrendingUp className="text-[#ff0000]" size={16} />
          </div>
          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Active</p>
          <p className="text-sm font-black text-gray-800">{investments.length}</p>
        </div>
        <div className="bg-white p-3 rounded-[20px] shadow-sm border border-gray-50 flex flex-col items-center gap-1.5">
          <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
            <Wallet className="text-blue-500" size={16} />
          </div>
          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Total</p>
          <p className="text-sm font-black text-gray-800">₹{profile?.totalIncome?.toFixed(0) || '0'}</p>
        </div>
        <div className="bg-white p-3 rounded-[20px] shadow-sm border border-gray-50 flex flex-col items-center gap-1.5">
          <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center">
            <Zap className="text-orange-500" size={16} />
          </div>
          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Daily</p>
          <p className="text-sm font-black text-gray-800">₹{totalDailyIncome}</p>
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
              className="bg-white rounded-[25px] p-5 shadow-md border border-gray-50 space-y-4 relative overflow-hidden"
            >
              {claiming.has(inv.id) && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-[#ff0000] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-[#ff0000] uppercase tracking-widest">Auto Claiming...</p>
                  </div>
                </div>
              )}

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
                <div className="flex flex-col items-end gap-2">
                  <div className="bg-green-50 text-green-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Active
                  </div>
                  <CountdownTimer 
                    lastClaim={inv.lastIncomeClaimed} 
                    onComplete={() => handleClaimIncome(inv)} 
                  />
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

              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Auto-Claim Enabled</span>
                </div>
                <p className="text-[10px] font-black text-[#ff0000]">₹{inv.dailyIncome}/24h</p>
              </div>
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

      <div className="bg-orange-50 p-4 rounded-2xl flex gap-3 border border-orange-100">
        <Zap className="text-orange-500 shrink-0" size={20} />
        <p className="text-[10px] text-orange-700 font-medium leading-relaxed">
          Auto-claim is active! Your daily income will be automatically added to your balance every 24 hours. Keep this page open or visit daily to ensure all earnings are processed.
        </p>
      </div>
    </div>
  );
};

export default MyInvestments;
