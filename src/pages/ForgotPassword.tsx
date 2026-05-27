import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowLeft, Send, AlertCircle, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError("Please enter a valid email address");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "warning");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "warning");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });
      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        showToast("Password reset successful!", "success");
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setError(data.message || "Failed to reset password");
      }
    } catch (error: any) {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500"
        >
          <CheckCircle2 size={40} />
        </motion.div>
        <h1 className="text-2xl font-black text-gray-800">Password Changed!</h1>
        <p className="text-gray-500">Your password has been successfully updated. Redirecting to login...</p>
      </div>
    );
  }

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
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/login')} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight text-center flex-1 pr-10">Forgot Password</h1>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-gray-500 font-medium px-2">
              Enter your registered email address and set a new password.
            </p>
            
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
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] focus:bg-white rounded-[20px] py-4 pl-12 pr-12 outline-none transition-all font-bold text-gray-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] focus:bg-white rounded-[20px] py-4 pl-12 pr-4 outline-none transition-all font-bold text-gray-700"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-[#ff0000] p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-100">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white py-4 rounded-[20px] font-black text-lg shadow-xl shadow-red-200 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Reset Password'}
            {!loading && <Send size={20} />}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-500 font-medium">
            Remember your password? <Link to="/login" className="text-[#ff0000] font-black hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
