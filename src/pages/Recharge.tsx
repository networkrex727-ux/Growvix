import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { useToast } from '../context/ToastContext';
import { TransactionType, TransactionStatus, SystemSettings } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, Wallet, CreditCard, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';

const Recharge: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<string>('');
  const [utr, setUtr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
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

  const adminUpi = settings?.adminUpi || "growvix@upi";
  const minRecharge = settings?.minRecharge || 100;
  const presets = [500, 1000, 2000, 5000, 10000, 20000];

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || parseFloat(amount) < minRecharge) {
      showToast(`Minimum recharge amount is ₹${minRecharge}`, "warning");
      return;
    }

    if (!utr || utr.length < 12) {
      showToast("Please enter a valid 12-digit UTR (Transaction ID)", "warning");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: parseFloat(amount),
        type: TransactionType.RECHARGE,
        status: TransactionStatus.PENDING,
        paymentMethod,
        utr: utr.trim(),
        createdAt: serverTimestamp(),
      });

      showToast("Recharge request submitted! Please wait for admin approval.", "success");
      navigate('/');
    } catch (error) {
      console.error("Recharge error:", error);
      showToast("Failed to submit request. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors shadow-sm">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Recharge</h1>
      </div>

      {/* Balance Card */}
      <div className="bg-white rounded-[25px] p-6 shadow-sm border border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
            <Wallet className="text-[#ff0000]" size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Current Balance</p>
            <p className="text-2xl font-black text-gray-800 truncate max-w-[150px]">₹{profile?.balance?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>

      {/* Recharge Form */}
      <form onSubmit={handleRecharge} className="space-y-6">
        <div className="bg-white rounded-[25px] p-6 shadow-sm border border-gray-50 space-y-6">
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700">Select Amount</p>
            <div className="grid grid-cols-3 gap-3">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className={`py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                    amount === preset.toString() 
                      ? 'bg-red-50 border-[#ff0000] text-[#ff0000]' 
                      : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  ₹{preset}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-700">Custom Amount</p>
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
            <p className="text-[10px] text-gray-400 font-medium">Min: ₹100 | Max: ₹50,000</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700">Payment Method</p>
            <div className="space-y-3">
              {['UPI'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === method 
                      ? 'bg-red-50 border-[#ff0000]' 
                      : 'bg-gray-50 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="text-[#ff0000]" size={20} />
                    <span className={`text-sm font-bold ${paymentMethod === method ? 'text-[#ff0000]' : 'text-gray-600'}`}>{method}</span>
                  </div>
                  {paymentMethod === method && <CheckCircle2 className="text-[#ff0000]" size={20} />}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'UPI' && (
            <div className="space-y-4 bg-red-50/50 p-4 rounded-2xl border border-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Admin UPI ID</p>
                  <p className="text-sm font-black text-gray-800">{adminUpi}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(adminUpi);
                    showToast("UPI ID Copied!", "success");
                  }}
                  className="bg-white text-[#ff0000] px-4 py-2 rounded-xl text-xs font-bold shadow-sm border border-red-100 active:scale-95 transition-transform"
                >
                  Copy
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700">Transaction ID (UTR)</p>
                <input
                  type="text"
                  placeholder="Enter 12-digit UTR number"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  className="w-full bg-white border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none transition-all font-bold text-gray-700 text-sm"
                />
                <p className="text-[10px] text-gray-400 font-medium italic">
                  * Mandatory for verification
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-orange-50 p-4 rounded-2xl flex gap-3 border border-orange-100">
          <AlertCircle className="text-orange-500 shrink-0" size={20} />
          <p className="text-[10px] text-orange-700 font-medium leading-relaxed">
            Please make sure to transfer the exact amount. After payment, it may take 10-30 minutes for the balance to reflect in your account.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white py-4 rounded-[20px] font-black text-lg shadow-xl shadow-red-200 active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Submit Recharge'}
        </button>
      </form>
    </div>
  );
};

export default Recharge;
