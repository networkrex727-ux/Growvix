import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { motion } from 'motion/react';
import { Phone, Lock, Eye, EyeOff, ArrowRight, Mail } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
      navigate('/');
    } catch (error: any) {
      console.error("Login error:", error);
      alert(error.message || "Invalid email or password");
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

      <div className="flex-1 flex flex-col justify-center space-y-10 relative z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-4">
          <motion.img 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src="https://i.ibb.co/CcxW3F4/file-0000000054487208abbf2cb1db170f4e.png"
            alt="Growvix Logo"
            className="w-32 h-32 object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="text-center">
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">Growvix</h1>
            <p className="text-sm text-gray-400 font-medium mt-1">Grow your wealth with us</p>
          </div>
        </div>

        {/* Form Section */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
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
          </div>

          <div className="flex items-center justify-between px-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 accent-[#ff0000] rounded" />
              <span className="text-xs text-gray-500 font-bold group-hover:text-gray-700 transition-colors">Remember me</span>
            </label>
            <Link to="/forgot-password" title="Forgot Password" className="text-xs text-[#ff0000] font-bold hover:underline">Forgot Password?</Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white py-4 rounded-[20px] font-black text-lg shadow-xl shadow-red-200 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-500 font-medium">
            Don't have an account? <Link to="/register" className="text-[#ff0000] font-black hover:underline">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
