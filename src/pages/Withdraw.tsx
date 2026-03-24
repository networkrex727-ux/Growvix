import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp, updateDoc, doc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { useToast } from '../context/ToastContext';
import { TransactionType, TransactionStatus, SystemSettings } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, Wallet, CreditCard, Smartphone, CheckCircle2, AlertCircle, Banknote } from 'lucide-react';

const Withdraw: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<string>('');
  const [holderName, setHolderName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const settingsDoc = await getDoc(doc(db, 'system', 'settings'));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as SystemSettings);
      }
    };
    fetchSettings();
  }, []);

  const minWithdrawal = settings?.minWithdrawal || 200;
  const withdrawalFee = settings?.withdrawalFee || 5;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !amount) return;

    if (!holderName || !accountNo || !ifsc) {
      showToast("Please fill in all bank details", "warning");
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount < minWithdrawal) {
      showToast(`Minimum withdrawal amount is ₹${minWithdrawal}`, "warning");
      return;
    }

    if (withdrawAmount > profile.withdrawableBalance) {
      showToast("Insufficient withdrawable balance. Only income can be withdrawn.", "error");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Withdrawal Request
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: withdrawAmount,
        type: TransactionType.WITHDRAW,
        status: TransactionStatus.PENDING,
        bankDetails: {
          holderName: holderName.trim(),
          accountNo: accountNo.trim(),
          ifsc: ifsc.trim().toUpperCase(),
          upiId: upiId.trim(),
        },
        createdAt: serverTimestamp(),
      });

      // 2. Deduct Balance (Hold the amount)
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: increment(-withdrawAmount),
        withdrawableBalance: increment(-withdrawAmount),
      });

      showToast(`Withdrawal request submitted! ₹${withdrawAmount} has been deducted from your balance and is pending approval.`, "success");
      navigate('/');
    } catch (error) {
      console.error("Withdrawal error:", error);
      showToast("Failed to submit request. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors shadow-sm">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Withdraw</h1>
      </div>

      {/* Balance Card */}
      <div className="bg-white rounded-[25px] p-6 shadow-sm border border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
            <Wallet className="text-[#ff0000]" size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Withdrawable Balance</p>
            <p className="text-2xl font-black text-gray-800 truncate max-w-[150px]">₹{profile?.withdrawableBalance?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>

      {/* Withdraw Form */}
      <form onSubmit={handleWithdraw} className="space-y-6">
        <div className="bg-white rounded-[25px] p-6 shadow-sm border border-gray-50 space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-700">Withdraw Amount</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
              <input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] focus:bg-white rounded-xl py-4 pl-8 pr-4 outline-none transition-all font-bold text-gray-700"
              />
            </div>
            <p className="text-[10px] text-gray-400 font-medium">Min: ₹{minWithdrawal} | Max: ₹50,000</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700">Bank Details</p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Account Holder Name"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none transition-all font-bold text-gray-700 text-sm"
              />
              <input
                type="text"
                placeholder="Account Number"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none transition-all font-bold text-gray-700 text-sm"
              />
              <input
                type="text"
                placeholder="IFSC Code"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none transition-all font-bold text-gray-700 text-sm"
              />
              <input
                type="text"
                placeholder="UPI ID (Optional)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none transition-all font-bold text-gray-700 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 border border-blue-100">
          <AlertCircle className="text-blue-500 shrink-0" size={20} />
          <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
            Withdrawals are processed within 24 hours. A {withdrawalFee}% service fee will be deducted from the withdrawal amount.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white py-4 rounded-[20px] font-black text-lg shadow-xl shadow-red-200 active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Submit Withdrawal'}
        </button>
      </form>
    </div>
  );
};

export default Withdraw;
