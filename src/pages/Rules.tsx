import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, AlertCircle, CheckCircle2, Info, Scale, Lock, Users } from 'lucide-react';

const Rules: React.FC = () => {
  const navigate = useNavigate();

  const ruleSections = [
    { title: 'Investment Rules', icon: Scale, color: 'text-red-500', bg: 'bg-red-50', items: [
      'Minimum investment starts from ₹500.',
      'Daily income is credited to your wallet every 24 hours.',
      'Each plan has a specific validity period.',
      'You can have multiple active investment plans.'
    ]},
    { title: 'Withdrawal Rules', icon: Lock, color: 'text-blue-500', bg: 'bg-blue-50', items: [
      'Minimum withdrawal amount is ₹200.',
      'Withdrawal processing time is 10 AM to 6 PM.',
      'A 5% service fee is applicable on all withdrawals.',
      'Withdrawals are processed within 24 hours.'
    ]},
    { title: 'Referral Program', icon: Users, color: 'text-orange-500', bg: 'bg-orange-50', items: [
      'Earn 10% commission on Level 1 investments.',
      'Earn 5% commission on Level 2 investments.',
      'Earn 2% commission on Level 3 investments.',
      'Commissions are credited instantly to your balance.'
    ]},
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors shadow-sm">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Rules & Regulations</h1>
      </div>

      {/* Hero Card */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-[#ff0000] to-[#cc0000] rounded-[30px] p-8 text-white shadow-xl relative overflow-hidden flex flex-col items-center text-center space-y-4"
      >
        <div className="relative z-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 mx-auto">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black">Platform Guidelines</h2>
          <p className="text-white/80 text-sm font-medium">Please read and follow these rules to ensure a smooth experience.</p>
        </div>
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </motion.div>

      {/* Rule Sections */}
      <div className="space-y-6">
        {ruleSections.map((section) => (
          <div key={section.title} className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-50 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${section.bg} rounded-xl flex items-center justify-center`}>
                <section.icon className={section.color} size={20} />
              </div>
              <h3 className="font-bold text-gray-800">{section.title}</h3>
            </div>
            
            <div className="space-y-3">
              {section.items.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="text-green-500 shrink-0 mt-0.5" size={16} />
                  <p className="text-xs font-medium text-gray-600 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Warning Info */}
      <div className="bg-orange-50 p-4 rounded-2xl flex gap-3 border border-orange-100">
        <AlertCircle className="text-orange-500 shrink-0" size={20} />
        <p className="text-[10px] text-orange-700 font-medium leading-relaxed">
          Creating multiple accounts from the same device or IP address is strictly prohibited and may result in account suspension and loss of funds.
        </p>
      </div>

      <div className="text-center py-4">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Growvix Terms of Service</p>
      </div>
    </div>
  );
};

export default Rules;
