import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useToast } from '../context/ToastContext';
import { UserRole } from '../types';
import { motion } from 'motion/react';
import { Phone, Lock, Eye, EyeOff, ArrowLeft, UserPlus, ShieldCheck, Mail } from 'lucide-react';

const Register: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast("Passwords do not match", "warning");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const user = userCredential.user;

      try {
        // 2. Find Referrer if referralCode provided
        let referredBy = '';
        if (referralCode) {
          const q = query(collection(db, 'users'), where('referralCode', '==', referralCode.trim().toUpperCase()));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            referredBy = querySnapshot.docs[0].id;
          }
        }

        // 3. Create User Profile
        const userProfile = {
          uid: user.uid,
          phone: phone.trim(),
          email: normalizedEmail,
          balance: 0,
          depositBalance: 0,
          withdrawableBalance: 0,
          totalIncome: 0,
          todayIncome: 0,
          referralCode: generateReferralCode(),
          referredBy,
          role: UserRole.USER,
          hasRecharged: false,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'users', user.uid), userProfile);
        showToast("Registration successful!", "success");
        navigate('/');
      } catch (firestoreError: any) {
        console.error("Firestore setup error, rolling back auth:", firestoreError);
        // Delete the auth user if profile creation fails so they can retry
        await user.delete();
        throw firestoreError;
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      showToast(error.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Background Logo */}
      <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
        <img 
          src="https://i.ibb.co/CcxW3F4/file-0000000054487208abbf2cb1db170f4e.png" 
          alt="Background Logo" 
          className="w-full scale-150 -rotate-12"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-8 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4 w-full">
            <button onClick={() => navigate('/login')} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Create Account</h1>
          </div>
          <motion.img 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src="https://i.ibb.co/CcxW3F4/file-0000000054487208abbf2cb1db170f4e.png"
            alt="Growvix Logo"
            className="w-24 h-24 object-cover rounded-full border-4 border-red-50 shadow-lg"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Form Section */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-3">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff0000] transition-colors">
                <Mail size={20} />
              </div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] focus:bg-white rounded-[20px] py-4 pl-12 pr-4 outline-none transition-all font-bold text-gray-700"
              />
            </div>

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff0000] transition-colors">
                <Phone size={20} />
              </div>
              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] focus:bg-white rounded-[20px] py-4 pl-12 pr-4 outline-none transition-all font-bold text-gray-700"
              />
            </div>

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff0000] transition-colors">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] focus:bg-white rounded-[20px] py-4 pl-12 pr-12 outline-none transition-all font-bold text-gray-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff0000] transition-colors">
                <ShieldCheck size={20} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] focus:bg-white rounded-[20px] py-4 pl-12 pr-4 outline-none transition-all font-bold text-gray-700"
              />
            </div>

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff0000] transition-colors">
                <UserPlus size={20} />
              </div>
              <input
                type="text"
                placeholder="Referral Code (Optional)"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] focus:bg-white rounded-[20px] py-4 pl-12 pr-4 outline-none transition-all font-bold text-gray-700"
              />
            </div>
          </div>

          <div className="px-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" required className="w-5 h-5 accent-[#ff0000] rounded" />
              <span className="text-xs text-gray-500 font-bold group-hover:text-gray-700 transition-colors">
                I agree to the <span className="text-[#ff0000] hover:underline">Terms & Conditions</span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white py-4 rounded-[20px] font-black text-lg shadow-xl shadow-red-200 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
            {!loading && <UserPlus size={20} />}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-500 font-medium">
            Already have an account? <Link to="/login" className="text-[#ff0000] font-black hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
