import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Download, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Smartphone, 
  Star, 
  DollarSign, 
  Award, 
  SmartphoneNfc,
  CheckCircle,
  HelpCircle,
  X
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const featuredPlans = [
    { name: 'VIP-1 Venture', price: 500, daily: 100, span: 50, rate: '20.0%' },
    { name: 'VIP-2 Premium', price: 1500, daily: 330, span: 50, rate: '22.0%' },
    { name: 'VIP-3 Elite', price: 3500, daily: 840, span: 50, rate: '24.0%' },
  ];

  const features = [
    {
      icon: ShieldCheck,
      title: 'Protected Funds',
      desc: 'Our financial system features fully secured encryptions guaranteeing prompt withdrawals and risk-mitigated asset placements.',
      color: 'bg-red-50 text-[#ff0000]'
    },
    {
      icon: TrendingUp,
      title: 'Stable High-Yield',
      desc: 'Unlock daily revenue streams through curated digital energy and financial node placements, generating stable percentages.',
      color: 'bg-blue-50 text-blue-500'
    },
    {
      icon: Users,
      title: '17% Team Commissions',
      desc: 'Leverage our multi-tier program. Earn 10% on Level 1, 5% on Level 2, and 2% on Level 3 downlines.',
      color: 'bg-orange-50 text-orange-500'
    }
  ];

  const testimonials = [
    { name: 'Rahul S.', role: 'VIP-3 Member', text: 'Prompt daily resets of profits exactly at midnight IST. Highly stable withdrawals.', rating: 5 },
    { name: 'Priya K.', role: 'Elite Ambassador', text: 'Growvix referral levels enabled me to build a secondary income stream. Exceeded expectations.', rating: 5 },
    { name: 'Amit M.', role: 'Active Investor', text: 'Cleanest interface in the market. Absolute zero performance clutter.', rating: 5 }
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-800 font-sans flex flex-col selection:bg-red-100 selection:text-[#ff0000]">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.ibb.co/CcxW3F4/file-0000000054487208abbf2cb1db170f4e.png" 
              alt="Growvix Logo" 
              className="w-10 h-10 object-cover rounded-full border border-gray-100 shadow-sm"
              referrerPolicy="no-referrer"
            />
            <span className="text-xl font-black text-gray-900 tracking-tight">Growvix</span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="bg-[#ff0000] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-md shadow-red-100 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2"
              >
                Go to App
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-sm font-bold text-gray-600 hover:text-[#ff0000] transition-colors"
                >
                  Sign In
                </Link>
                <button 
                  onClick={() => navigate('/register')}
                  className="bg-black text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-gray-800 active:scale-95 transition-all"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-[#ff0000] rounded-full border border-red-100/50">
            <Award size={14} className="animate-bounce" />
            <span className="text-[10px] font-black uppercase tracking-wider">India's Leading High-Yield Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-none">
            Secure Wealth. <br />
            Earn High-Yield <br />
            <span className="text-[#ff0000]">Daily Profits & Income</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-500 font-medium max-w-2xl leading-relaxed mx-auto lg:mx-0">
            Invest in verified, high-performance plans yielding consistent daily rewards. Enjoy instant withdrawals, multi-level promotion rewards, and seamless direct tracking.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button 
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="bg-gradient-to-r from-[#ff0000] to-[#cc0000] text-white px-8 py-4.5 rounded-[22px] font-black text-base shadow-xl shadow-red-200 hover:shadow-2xl hover:shadow-red-300 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Start Investing
              <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => setShowDownloadModal(true)}
              className="bg-white text-gray-800 border-2 border-gray-150 px-8 py-4.5 rounded-[22px] font-black text-base hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Download size={20} className="text-[#ff0000]" />
              Download App
            </button>
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-8 pt-4">
            <div>
              <p className="text-2xl font-black text-gray-900">₹5 Crore+</p>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Total Disbursed</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <p className="text-2xl font-black text-gray-900">45,000+</p>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Active Investors</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <p className="text-2xl font-black text-gray-900">100%</p>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Secure Escrow</p>
            </div>
          </div>
        </div>

        {/* Hero Image Block */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative max-w-sm w-full">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#ff0000]/10 to-blue-500/10 rounded-[40px] blur-2xl transform rotate-6 scale-105" />
            <div className="relative bg-white border-8 border-gray-900 rounded-[50px] shadow-2xl overflow-hidden aspect-[9/18]">
              {/* Internal Simulated Screen */}
              <div className="bg-gray-50 h-full p-4 flex flex-col justify-between">
                {/* Dynamic Screen Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-[10px] font-black text-gray-900 tracking-tight">Growvix Mobile App</span>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
                </div>

                {/* Simulated Balance Box */}
                <div className="bg-[#ff0000] text-white rounded-3xl p-5 shadow-lg space-y-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/80">Available Cash</p>
                  <p className="text-2xl font-black">₹48,250.00</p>
                  <div className="flex justify-between items-center text-[10px] pt-2 border-t border-white/10">
                    <span>Withdrawable: ₹48,250</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded">Active Plan</span>
                  </div>
                </div>

                {/* Simulated Plans Mini-Grid */}
                <div className="space-y-2.5">
                  <div className="bg-white p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-gray-800">VIP Option 1</p>
                      <p className="text-[10px] text-gray-400">Yield: ₹100/Day</p>
                    </div>
                    <span className="text-xs font-black text-[#ff0000]">₹500 Buy</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-gray-800">VIP Option 2</p>
                      <p className="text-[10px] text-gray-400">Yield: ₹330/Day</p>
                    </div>
                    <span className="text-xs font-black text-[#ff0000]">₹1500 Buy</span>
                  </div>
                </div>

                {/* Simulated Download button */}
                <button className="w-full bg-gray-950 text-white text-xs font-black py-4 rounded-[18px] flex items-center justify-center gap-2">
                  <Download size={14} className="text-[#ff0000]" />
                  Secure Fast Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Midnight Rules Banner */}
      <section className="bg-white border-y border-gray-100 py-6 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-[#ff0000] shrink-0">
              <SmartphoneNfc size={22} className="animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Automatic Midnight RESET & credit</h4>
              <p className="text-xs text-gray-400 font-medium">All active investment options credit earned reserves exactly at 12:00 AM Midnight IST daily.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/rules')}
            className="text-xs font-black text-[#ff0000] hover:underline shrink-0"
          >
            Review Audit Rules &rarr;
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-black text-[#ff0000] uppercase tracking-widest">Why Growvix?</span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Built For High Returns, Optimized For Security</h2>
          <p className="text-sm text-gray-500 font-medium max-w-xl mx-auto">Our automated engine ensures zero-lag interest payments, transparent transactions, and real-time capital safety.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feat) => (
            <div key={feat.title} className="bg-white p-8 rounded-[30px] border border-gray-100 shadow-sm flex flex-col gap-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${feat.color}`}>
                <feat.icon size={26} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{feat.title}</h3>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured VIP Products */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center space-y-4 mb-16">
            <span className="text-xs font-black text-[#ff0000] uppercase tracking-widest text-center">Featured Plans</span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight text-center">Most Popular VIP Plans</h2>
            <p className="text-sm text-gray-500 font-medium max-w-xl mx-auto text-center">Purchase a premium high-yield contract and earn consistent daily returns directly deposited inside your user dashboard.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredPlans.map((plan) => (
              <div key={plan.name} className="bg-gray-50 rounded-[35px] border border-gray-100 p-8 flex flex-col gap-8 relative overflow-hidden group hover:border-[#ff0000] hover:bg-white transition-all">
                <div className="absolute right-0 top-0 bg-[#ff0000] text-white text-[10px] font-black px-4 py-1.5 rounded-bl-3xl uppercase tracking-wider">
                  {plan.rate} Daily
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-gray-800">{plan.name}</h3>
                  <p className="text-3xl font-black text-gray-900">₹{plan.price}</p>
                </div>

                <div className="space-y-4 border-t border-gray-200/50 pt-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-bold">Daily Income</span>
                    <span className="text-gray-800 font-black">₹{plan.daily}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-bold">Valuation Span</span>
                    <span className="text-gray-800 font-black">{plan.span} Days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-bold">Total Capitalized Return</span>
                    <span className="text-gray-800 font-black">₹{plan.daily * plan.span}</span>
                  </div>
                </div>

                <button 
                  onClick={() => navigate('/login')}
                  className="w-full bg-black text-white py-4 rounded-[20px] font-black text-sm group-hover:bg-[#ff0000] active:scale-95 transition-all text-center"
                >
                  Acquire For ₹{plan.price}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Referral Program Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="bg-gradient-to-br from-gray-900 to-black text-white rounded-[40px] p-8 sm:p-12 relative overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="absolute right-0 top-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-black text-[#ff0000] uppercase tracking-widest">Multi-Tier Referral Network</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none">Share invitation Links & Earn Stable 17% Cash</h2>
            <p className="text-sm text-gray-300 font-medium leading-relaxed">
              Earn commissions safely for team sign ups. When downline users activate contracts, system credits commission straight to your withdrawable vault instantly.
            </p>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-[#ff0000]">10%</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Level 1</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-[#ff0000]">5%</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Level 2</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-[#ff0000]">2%</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Level 3</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <button 
              onClick={() => navigate(user ? '/team' : '/login')}
              className="bg-[#ff0000] text-white px-8 py-5 rounded-[22px] font-black text-base shadow-xl shadow-red-900/40 hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2"
            >
              Generate Referral Link
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-20 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center space-y-4 mb-16">
            <span className="text-xs font-black text-[#ff0000] uppercase tracking-widest text-center">Verified Members</span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight text-center">Success Stories</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((test) => (
              <div key={test.name} className="bg-gray-50 p-8 rounded-[30px] border border-gray-150 relative flex flex-col justify-between gap-6">
                <div className="flex gap-1 text-amber-500">
                  {Array.from({ length: test.rating }).map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="text-sm font-medium text-gray-600 italic">"{test.text}"</p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-[#ff0000] font-black text-xs uppercase">
                    {test.name.slice(0, 2)}
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm">{test.name}</h5>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{test.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer Form */}
      <section className="bg-gray-900 text-white pt-20 pb-12 px-6">
        <div className="max-w-7xl mx-auto w-full space-y-16">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
            <div className="space-y-4 max-w-md">
              <div className="flex items-center gap-3">
                <img 
                  src="https://i.ibb.co/CcxW3F4/file-0000000054487208abbf2cb1db170f4e.png" 
                  alt="Growvix Logo" 
                  className="w-10 h-10 object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xl font-black tracking-tight">Growvix</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Growvix is a secure, diversified digital asset and smart contract placement utility. We operate secure networks prioritizing punctual capital interest resets and direct UPI-based payout support.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h5 className="font-bold text-sm text-white">System</h5>
                <ul className="space-y-2 text-xs text-gray-400">
                  <li><Link to="/about" className="hover:text-white transition-colors">About Growvix</Link></li>
                  <li><Link to="/rules" className="hover:text-white transition-colors">Risk & Disclaimers</Link></li>
                  <li><Link to="/support" className="hover:text-white transition-colors">Platform Support</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h5 className="font-bold text-sm text-white">Security</h5>
                <ul className="space-y-2 text-xs text-gray-400">
                  <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-green-400" /> SSL Encrypted</li>
                  <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-green-400" /> Secure Escrow</li>
                  <li className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-green-400" /> Multi-Layer Pin</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400 text-center">
            <p>&copy; {new Date().getFullYear()} Growvix Inc. All rights reserved. Registered Asset Trustee Security.</p>
            <div className="flex gap-4">
              <Link to="/rules" className="hover:text-white transition-colors">Terms of Work</Link>
              <Link to="/rules" className="hover:text-white transition-colors">Privacy Principles</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Download App Dialog */}
      <AnimatePresence>
        {showDownloadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDownloadModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            {/* Card modal */}
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative bg-white rounded-[35px] max-w-sm w-full p-8 shadow-2xl flex flex-col gap-6"
            >
              <button 
                onClick={() => setShowDownloadModal(false)}
                className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-all"
              >
                <X size={20} />
              </button>

              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-50 text-[#ff0000] rounded-2.5xl flex items-center justify-center mx-auto mb-2">
                  <Smartphone size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-800">Secure App Download</h3>
                <p className="text-xs text-gray-400 font-medium">Download the latest official Growvix APK package directly to your Android phone.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl flex gap-3 text-xs border border-gray-100">
                  <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-800">No Play Store delays</p>
                    <p className="text-gray-400">Direct instant installation without restrictions or geographic holding.</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl flex gap-3 text-xs border border-gray-100">
                  <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-800">Prompt daily notifications</p>
                    <p className="text-gray-400">Stay up-to-date with direct alerts on midnight interest resets.</p>
                  </div>
                </div>
              </div>

              {/* True download button simulation */}
              <a 
                href="/api/auth/download-apk"
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  setTimeout(() => {
                    setShowDownloadModal(false);
                  }, 1200);
                }}
                className="w-full bg-[#ff0000] text-white font-black text-center py-4 rounded-[20px] flex items-center justify-center gap-2 hover:bg-red-700 shadow-xl shadow-red-100 active:scale-95 transition-all"
              >
                <Download size={18} />
                Download Growvix.apk (12MB)
              </a>

              <p className="text-[10px] text-gray-400 text-center font-medium">Compatible with Android 8.0 and higher.</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
