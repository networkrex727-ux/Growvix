import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { SystemSettings } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, Headset, MessageSquare, Phone, Mail, Clock, ShieldCheck, ExternalLink, Send } from 'lucide-react';

const Support: React.FC = () => {
  const navigate = useNavigate();
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

  const supportChannels = [
    { label: 'Telegram Support', icon: MessageSquare, value: settings?.supportTelegram || '@GrowvixSupport', color: 'text-blue-500', bg: 'bg-blue-50', link: `https://t.me/${(settings?.supportTelegram || '@GrowvixSupport').replace('@', '')}` },
    { label: 'WhatsApp Support', icon: Phone, value: settings?.supportWhatsApp || '+91 98765 43210', color: 'text-green-500', bg: 'bg-green-50', link: `https://wa.me/${(settings?.supportWhatsApp || '919876543210').replace(/\D/g, '')}` },
    { label: 'Email Support', icon: Mail, value: settings?.supportEmail || 'support@growvix.com', color: 'text-[#ff0000]', bg: 'bg-red-50', link: `mailto:${settings?.supportEmail || 'support@growvix.com'}` },
    { label: 'Official Channel', icon: Send, value: settings?.supportChannel || 'Growvix Official', color: 'text-sky-500', bg: 'bg-sky-50', link: settings?.supportChannel?.startsWith('http') ? settings.supportChannel : `https://t.me/${(settings?.supportChannel || 'GrowvixOfficial').replace('@', '')}` },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors shadow-sm">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Customer Support</h1>
      </div>

      {/* Hero Card */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-[#ff0000] to-[#cc0000] rounded-[30px] p-8 text-white shadow-xl relative overflow-hidden flex flex-col items-center text-center space-y-4"
      >
        <div className="relative z-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 mx-auto">
            <Headset size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black">How can we help?</h2>
          <p className="text-white/80 text-sm font-medium">Our support team is available 24/7 to assist you with any issues.</p>
        </div>
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </motion.div>

      <div className="space-y-4">
        {supportChannels.map((channel) => (
          <motion.div
            key={channel.label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.open(channel.link, '_blank')}
            className="bg-white p-5 rounded-[25px] shadow-sm border border-gray-50 flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${channel.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <channel.icon className={channel.color} size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{channel.label}</p>
                <p className="text-sm font-bold text-gray-800">{channel.value}</p>
              </div>
            </div>
            <ExternalLink className="text-gray-300" size={20} />
          </motion.div>
        ))}
      </div>

      {/* FAQ Info */}
      <div className="bg-white rounded-[25px] p-6 shadow-sm border border-gray-50 space-y-6">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <ShieldCheck size={18} className="text-[#ff0000]" />
          Quick Assistance
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center shrink-0">
              <Clock size={16} className="text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">Response Time</p>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">Most queries are resolved within 30 minutes during business hours (9 AM - 9 PM).</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center shrink-0">
              <MessageSquare size={16} className="text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">Withdrawal Issues</p>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">If your withdrawal is pending for more than 24 hours, please contact us with your User ID.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center py-4">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Growvix Support Center</p>
      </div>
    </div>
  );
};

export default Support;
