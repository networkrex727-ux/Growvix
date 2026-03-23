import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, Send, AlertCircle } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      setEmail(normalizedEmail); // Update state to show normalized email in success message
      // Send reset email directly via Firebase Auth
      await sendPasswordResetEmail(auth, normalizedEmail);
      setSent(true);
    } catch (error: any) {
      console.error("Reset error:", error);
      // Provide a more user-friendly error message
      if (error.code === 'auth/user-not-found') {
        setError("This email is not registered with us.");
      } else {
        setError(error.message || "Failed to send reset email");
      }
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
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/login')} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Reset Password</h1>
        </div>

        {sent ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-green-50 p-8 rounded-[30px] text-center space-y-4 border-2 border-green-100"
          >
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto shadow-lg shadow-green-100">
              <Send size={32} />
            </div>
            <h2 className="text-xl font-black text-green-800">Email Sent!</h2>
            <p className="text-sm text-green-600 font-medium">
              We've sent a password reset link to <span className="font-bold">{email}</span>.
            </p>
            <div className="bg-white/50 p-4 rounded-2xl border border-green-100 text-xs text-green-700 font-bold">
              💡 Important: Please check your <span className="text-red-500">Spam/Junk</span> folder if you don't see the email in your inbox.
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-green-500 text-white py-4 rounded-[20px] font-black shadow-lg shadow-green-100 active:scale-95 transition-transform"
              >
                Back to Login
              </button>
              <button 
                onClick={() => setSent(false)}
                className="w-full bg-white text-green-600 border-2 border-green-500 py-4 rounded-[20px] font-black active:scale-95 transition-transform"
              >
                Try Another Email
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-500 font-medium px-2">
                Enter your email address and we'll send you a link to reset your password.
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
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 text-[#ff0000] p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-100"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white py-4 rounded-[20px] font-black text-lg shadow-xl shadow-red-200 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
              {!loading && <Send size={20} />}
            </button>
          </form>
        )}

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
