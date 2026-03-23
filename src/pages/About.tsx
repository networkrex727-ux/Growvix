import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Info, ShieldCheck, TrendingUp, Users, Globe, Award, CheckCircle2 } from 'lucide-react';

const About: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    { label: 'Secure Platform', icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'High Returns', icon: TrendingUp, color: 'text-[#ff0000]', bg: 'bg-red-50' },
    { label: 'Global Community', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Certified Assets', icon: Award, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors shadow-sm">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">About Us</h1>
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-[30px] p-8 shadow-sm border border-gray-50 flex flex-col items-center text-center space-y-6">
        <motion.div 
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 12, scale: 1 }}
          className="w-24 h-24 bg-[#ff0000] rounded-[30px] flex items-center justify-center text-white font-black text-5xl shadow-2xl"
        >
          G
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Growvix</h2>
          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Future of Wealth Management</p>
        </div>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">
          Growvix is a leading global investment platform dedicated to helping individuals grow their wealth through diversified and secure investment plans. Our mission is to democratize high-yield investment opportunities for everyone.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 gap-4">
        {features.map((feature) => (
          <div key={feature.label} className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-50 flex flex-col items-center gap-3 text-center">
            <div className={`w-12 h-12 ${feature.bg} rounded-2xl flex items-center justify-center`}>
              <feature.icon className={feature.color} size={24} />
            </div>
            <span className="text-xs font-bold text-gray-700">{feature.label}</span>
          </div>
        ))}
      </div>

      {/* Our Mission */}
      <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-50 space-y-6">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Globe size={18} className="text-[#ff0000]" />
          Our Vision
        </h3>
        
        <div className="space-y-4">
          {[
            'Empowering 1 Million+ users globally.',
            'Providing 100% transparent investment logs.',
            'Ensuring 24-hour withdrawal processing.',
            'Building a sustainable financial ecosystem.'
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <CheckCircle2 className="text-green-500 shrink-0" size={18} />
              <p className="text-sm font-medium text-gray-600">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-4">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Growvix © 2026 All Rights Reserved</p>
      </div>
    </div>
  );
};

export default About;
