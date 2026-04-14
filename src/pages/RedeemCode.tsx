import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, increment, arrayUnion, addDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Coupon, Transaction, TransactionType, TransactionStatus } from '../types';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Gift, Ticket, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const RedeemCode: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid),
      where('type', '==', TransactionType.BONUS),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setHistory(transData);
      setLoading(false);
    }, (error) => {
      console.error("Redemption history error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) {
      showToast("Please enter a coupon code", "warning");
      return;
    }

    if (!profile) return;

    setRedeeming(true);
    try {
      const q = query(collection(db, 'coupons'), where('code', '==', couponCode.toUpperCase().trim()), where('isActive', '==', true));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showToast("Invalid or inactive coupon code", "error");
        return;
      }

      const couponDoc = querySnapshot.docs[0];
      const couponData = couponDoc.data() as Coupon;

      // Check usage limit
      if (couponData.usedCount >= couponData.usageLimit) {
        showToast("Coupon usage limit reached", "error");
        return;
      }

      // Check expiry
      if (new Date(couponData.expiryDate) < new Date()) {
        showToast("Coupon has expired", "error");
        return;
      }

      // Check if user already used it
      if (couponData.usedBy.includes(profile.uid)) {
        showToast("You have already redeemed this coupon", "warning");
        return;
      }

      // 1. Update User Balance
      await updateDoc(doc(db, 'users', profile.uid), {
        balance: increment(couponData.rewardAmount),
        withdrawableBalance: increment(couponData.rewardAmount)
      });

      // 2. Update Coupon usage
      await updateDoc(doc(db, 'coupons', couponDoc.id), {
        usedCount: increment(1),
        usedBy: arrayUnion(profile.uid)
      });

      // 3. Create Transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: profile.uid,
        amount: couponData.rewardAmount,
        type: TransactionType.BONUS,
        status: TransactionStatus.COMPLETED,
        description: `Coupon Redeemed: ${couponData.code}`,
        createdAt: new Date().toISOString()
      });

      showToast(`Success! ₹${couponData.rewardAmount} added to your balance`, "success");
      setCouponCode('');
    } catch (error) {
      console.error("Redemption error:", error);
      showToast("Failed to redeem coupon", "error");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 max-w-md mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Redeem Code</h1>
      </div>

      {/* Redemption Card */}
      <div className="bg-gradient-to-br from-red-50 to-white rounded-[35px] p-8 border border-red-100 shadow-xl shadow-red-50/50 space-y-6 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-5 rotate-12">
          <Gift size={120} />
        </div>
        
        <div className="flex flex-col items-center text-center space-y-2 relative z-10">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#ff0000] shadow-lg shadow-red-100 mb-2">
            <Ticket size={32} />
          </div>
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Have a Coupon?</h2>
          <p className="text-xs text-gray-400 font-bold max-w-[200px]">Enter your special code below to receive instant bonus balance.</p>
        </div>
        
        <div className="space-y-4 relative z-10">
          <input 
            type="text" 
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="ENTER CODE HERE"
            className="w-full bg-white border-2 border-transparent focus:border-[#ff0000] rounded-2xl py-4 px-6 outline-none font-black text-center text-lg text-gray-700 uppercase placeholder:text-gray-200 tracking-widest shadow-inner"
          />
          <button 
            onClick={handleRedeemCoupon}
            disabled={redeeming}
            className="w-full bg-[#ff0000] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-red-200 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {redeeming ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Redeem Now
                <CheckCircle2 size={20} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
            <Clock size={16} className="text-[#ff0000]" />
            Redemption History
          </h3>
          <span className="text-[10px] text-gray-400 font-bold uppercase">{history.length} Total</span>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-[#ff0000] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : history.length > 0 ? (
            history.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                    <Gift size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">₹{item.amount.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{item.description?.split(': ')[1] || 'Coupon'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-bold">{new Date(item.createdAt).toLocaleDateString()}</p>
                  <p className="text-[8px] text-gray-300 font-bold uppercase">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-[30px] border border-dashed border-gray-200">
              <AlertCircle size={40} className="mx-auto text-gray-200 mb-2" />
              <p className="text-xs text-gray-400 font-bold">No redemption history yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RedeemCode;
