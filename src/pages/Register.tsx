import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import { useToast } from '../context/ToastContext';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, UserPlus, ShieldCheck, User } from 'lucide-react';

const Register: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.includes('@')) {
      showToast("Please enter a valid email address", "error");
      return;
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "warning");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, referralCode })
      });
      const data = await response.json();

      if (data.success) {
        login(data.token, data.user);
        showToast("Registration successful!", "success");
        navigate('/dashboard');
      } else {
        showToast(data.message || "Registration failed", "error");
      }
    } catch (error) {
      showToast("Auth process failed. Try again later.", "error");
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
          className="w-full scale-150 rotate-12"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-8 relative z-10">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-4 w-full">
            <button onClick={() => navigate('/login')} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Create Account</h1>
          </div>
          
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center shadow-lg shadow-red-100 border border-red-100/50 overflow-hidden"
          >
            <img 
              src="https://i.ibb.co/CcxW3F4/file-0000000054487208abbf2cb1db170f4e.png"
              alt="Logo"
              className="w-full h-full object-cover p-2"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-3">
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff0000] transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] focus:bg-white rounded-[22px] py-4 pl-14 pr-4 outline-none transition-all font-bold text-gray-700 placeholder:text-gray-300"
              />
            </div>

            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff0000] transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] focus:bg-white rounded-[22px] py-4 pl-14 pr-4 outline-none transition-all font-bold text-gray-700 placeholder:text-gray-300"
              />
            </div>

            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff0000] transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Set Login Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] focus:bg-white rounded-[22px] py-4 pl-14 pr-12 outline-none transition-all font-bold text-gray-700 placeholder:text-gray-300"
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
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#ff0000] transition-colors">
                <UserPlus size={18} />
              </div>
              <input
                type="text"
                placeholder="Referral Code (Optional)"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] focus:bg-white rounded-[22px] py-4 pl-14 pr-4 outline-none transition-all font-bold text-gray-700 placeholder:text-gray-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white py-5 rounded-[22px] font-black text-lg shadow-xl shadow-red-200 active:scale-95 transition-transform flex items-center justify-center gap-3 disabled:grayscale disabled:opacity-50 mt-6"
          >
            {loading ? 'Creating Account...' : 'Sign Up Now'}
            {!loading && <ShieldCheck size={22} />}
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
