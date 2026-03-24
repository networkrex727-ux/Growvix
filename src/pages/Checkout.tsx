import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { useToast } from '../context/ToastContext';
import { TransactionType, TransactionStatus, SystemSettings } from '../types';
import { motion } from 'motion/react';
import { Copy, Smartphone, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const Checkout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const amount = searchParams.get('amount') || '0';
  const [utr, setUtr] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    const fetchSettings = async () => {
      const settingsDoc = await getDoc(doc(db, 'system', 'settings'));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as SystemSettings);
      }
    };
    fetchSettings();

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const adminUpi = settings?.adminUpi || "growvix@upi";
  const upiString = `upi://pay?pa=${adminUpi}&pn=Merchant&am=${amount}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(adminUpi);
    showToast("UPI ID Copied!", "success");
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (utr.length !== 12) {
      showToast("Please enter a valid 12-digit UTR number", "warning");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: parseFloat(amount),
        type: TransactionType.RECHARGE,
        status: TransactionStatus.PENDING,
        paymentMethod: 'UPI',
        utr: utr.trim(),
        createdAt: serverTimestamp(),
      });

      showToast("Payment submitted! Balance will be added after manual check.", "success");
      navigate('/history');
    } catch (error) {
      console.error("Checkout error:", error);
      showToast("Failed to submit request. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const apps = [
    { name: 'PhonePe', logo: 'https://files.catbox.moe/8q2941.jpg', link: `phonepe://pay?pa=${adminUpi}&pn=Merchant&am=${amount}&cu=INR` },
    { name: 'Paytm', logo: 'https://files.catbox.moe/dwrkgn.jpg', link: `paytmmp://pay?pa=${adminUpi}&pn=Merchant&am=${amount}&cu=INR` }
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6] font-['Poppins'] text-[#1f2937]">
      <div className="max-w-[420px] mx-auto p-[15px]">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#4f46e5] to-[#10b981] text-white p-[15px] text-center rounded-t-[12px]">
          <h1 className="text-xl font-bold">Ola Gateway</h1>
          <div className="mt-[5px] bg-white/10 px-[10px] py-[5px] rounded-[8px] inline-flex items-center gap-2 font-semibold">
            <Clock size={16} />
            <span>Time Left: {formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Payment Card */}
        <div className="bg-white p-[25px] shadow-lg rounded-b-[12px] space-y-6">
          <div className="text-center">
            <p className="text-[#6b7280] font-semibold text-xs uppercase tracking-wider">Payment Amount</p>
            <h2 className="text-[2.8em] font-bold">₹{amount}</h2>
          </div>

          {/* QR Section */}
          <div className="flex justify-center">
            <div className="p-2 bg-white border-[5px] border-white shadow-md rounded-[10px]">
              <img src={qrUrl} alt="Scan to Pay" className="w-[200px] h-[200px]" referrerPolicy="no-referrer" />
            </div>
          </div>

          {/* UPI Info */}
          <div className="flex items-center bg-[#eef2ff] border border-dashed border-[#4f46e5] p-[10px] rounded-[8px] gap-2">
            <span className="flex-1 font-semibold text-[#4f46e5] truncate">{adminUpi}</span>
            <button 
              onClick={handleCopy}
              className="bg-[#4f46e5] text-white px-3 py-1.5 rounded-[6px] text-xs font-bold active:scale-95 transition-transform"
            >
              COPY
            </button>
          </div>

          {/* Apps Container */}
          <div className="grid gap-3">
            {apps.map((app) => (
              <a 
                key={app.name}
                href={app.link}
                className="flex items-center justify-center gap-3 p-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-[10px] text-[#1f2937] font-semibold hover:bg-gray-50 transition-colors"
              >
                <img src={app.logo} alt={app.name} className="h-[30px]" referrerPolicy="no-referrer" />
                <span>Pay with <strong>{app.name}</strong></span>
              </a>
            ))}
          </div>

          {/* UTR Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">STEP 2: Enter 12-digit UTR/Ref. No.</label>
            <input 
              type="text" 
              placeholder="Enter UTR Number" 
              maxLength={12}
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-[8px] text-lg text-center font-bold outline-none focus:border-[#4f46e5] transition-all"
            />
          </div>

          {/* Submit Button */}
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full p-4 bg-gradient-to-br from-[#10b981] to-[#15803d] text-white rounded-[8px] text-lg font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'SUBMIT UTR'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
