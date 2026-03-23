import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { useToast } from '../context/ToastContext';
import { Plan, InvestmentStatus, TransactionType, TransactionStatus } from '../types';
import { motion } from 'motion/react';
import { ShoppingBag, TrendingUp, Clock, ShieldCheck } from 'lucide-react';

const Product: React.FC = () => {
  const { profile, user } = useAuth();
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [investing, setInvesting] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'plans'));
        const plansData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
        
        // If no plans exist, add some default ones (for demo)
        if (plansData.length === 0) {
          const defaultPlans = [
            { id: 'vip1', name: 'VIP 1', price: 500, dailyIncome: 50, validityDays: 30, imageUrl: 'https://picsum.photos/seed/vip1/400/300' },
            { id: 'vip2', name: 'VIP 2', price: 1000, dailyIncome: 110, validityDays: 30, imageUrl: 'https://picsum.photos/seed/vip2/400/300' },
            { id: 'vip3', name: 'VIP 3', price: 5000, dailyIncome: 600, validityDays: 30, imageUrl: 'https://picsum.photos/seed/vip3/400/300' },
            { id: 'vip4', name: 'VIP 4', price: 10000, dailyIncome: 1300, validityDays: 30, imageUrl: 'https://picsum.photos/seed/vip4/400/300' },
          ];
          setPlans(defaultPlans);
        } else {
          setPlans(plansData);
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleInvest = async (plan: Plan) => {
    if (!user || !profile) return;
    if (profile.balance < plan.price) {
      showToast("Insufficient balance. Please recharge.", "error");
      return;
    }

    if (!profile.hasRecharged) {
      showToast("Please make at least one recharge to start investing.", "warning");
      return;
    }

    setInvesting(plan.id);
    try {
      const purchaseDate = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(purchaseDate.getDate() + plan.validityDays);

      // Calculate how much to deduct from each balance
      // We prioritize depositBalance, then withdrawableBalance
      let remainingToDeduct = plan.price;
      
      const currentDeposit = profile.depositBalance || 0;
      const currentWithdrawable = profile.withdrawableBalance || 0;

      const depositDeduction = Math.min(currentDeposit, remainingToDeduct);
      remainingToDeduct -= depositDeduction;
      
      const withdrawableDeduction = Math.min(currentWithdrawable, remainingToDeduct);
      remainingToDeduct -= withdrawableDeduction;

      // If there's still a gap (e.g. if total balance was high but sub-balances were 0)
      // we deduct the rest from whichever is available or just balance
      if (remainingToDeduct > 0) {
        console.warn("Balance mismatch detected. Deducting remaining from total balance.");
      }

      // 1. Create Investment
      try {
        await addDoc(collection(db, 'investments'), {
          userId: user.uid,
          planId: plan.id,
          planName: plan.name,
          dailyIncome: plan.dailyIncome,
          purchaseDate: purchaseDate.toISOString(),
          expiryDate: expiryDate.toISOString(),
          lastIncomeClaimed: purchaseDate.toISOString(),
          status: InvestmentStatus.ACTIVE,
          createdAt: serverTimestamp(),
        });
      } catch (e: any) {
        console.error("Step 1 (Investment) failed:", e);
        throw new Error(`Investment creation failed: ${e.message}`);
      }

      // 2. Deduct Balance
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          depositBalance: increment(-depositDeduction),
          withdrawableBalance: increment(-withdrawableDeduction),
          balance: increment(-plan.price),
        });
      } catch (e: any) {
        console.error("Step 2 (Balance) failed:", e);
        throw new Error(`Balance update failed: ${e.message}`);
      }

      // 3. Create Transaction Log
      try {
        await addDoc(collection(db, 'transactions'), {
          userId: user.uid,
          amount: plan.price,
          type: TransactionType.INVESTMENT,
          status: TransactionStatus.COMPLETED,
          createdAt: serverTimestamp(),
          description: `Purchased ${plan.name}`,
        });
      } catch (e: any) {
        console.error("Step 3 (Transaction) failed:", e);
        throw new Error(`Transaction log failed: ${e.message}`);
      }

      showToast(`Successfully invested in ${plan.name}!`, "success");
    } catch (error: any) {
      console.error("Investment error:", error);
      showToast(error.message || "Something went wrong. Please try again.", "error");
    } finally {
      setInvesting(null);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading plans...</div>;

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#ff0000] rounded-full flex items-center justify-center text-white">
          <ShoppingBag size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Investment Plans</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[25px] overflow-hidden shadow-md border border-gray-50 group"
          >
            <div className="relative h-40">
              <img 
                src={plan.imageUrl} 
                alt={plan.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 bg-[#ff0000] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                HOT
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
                  <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1">
                    <ShieldCheck size={14} className="text-green-500" /> Secure Investment
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-[#ff0000]">₹{plan.price}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Price</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-50">
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-800">₹{plan.dailyIncome}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Daily</p>
                </div>
                <div className="text-center border-x border-gray-50">
                  <p className="text-sm font-bold text-gray-800">₹{plan.dailyIncome * plan.validityDays}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-800">{plan.validityDays} Days</p>
                  <p className="text-[10px] text-gray-400 font-medium">Validity</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp size={18} className="text-[#ff0000]" />
                  <span className="text-xs font-bold">20% ROI</span>
                </div>
                <button
                  onClick={() => handleInvest(plan)}
                  disabled={investing === plan.id}
                  className="flex-1 bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white py-3 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                >
                  {investing === plan.id ? 'Processing...' : 'Invest Now'}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Product;
