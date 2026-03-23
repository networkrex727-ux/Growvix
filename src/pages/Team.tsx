import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { UserProfile, TeamStats, SystemSettings } from '../types';
import { motion } from 'motion/react';
import { Users, Copy, Share2, Award, TrendingUp, UserPlus } from 'lucide-react';

const Team: React.FC = () => {
  const { profile, user } = useAuth();
  const [teamStats, setTeamStats] = useState<TeamStats>({
    teamSize: 0,
    totalTeamIncome: 0,
    lv1Count: 0,
    lv2Count: 0,
    lv3Count: 0,
  });
  const [referrals, setReferrals] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'LV1' | 'LV2' | 'LV3'>('LV1');
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

  const websiteUrl = settings?.websiteUrl || window.location.origin;

  useEffect(() => {
    if (!user) return;

    const fetchTeam = async () => {
      try {
        // Fetch LV1
        const q1 = query(collection(db, 'users'), where('referredBy', '==', user.uid));
        const snap1 = await getDocs(q1);
        const lv1 = snap1.docs.map(doc => doc.data() as UserProfile);
        
        // Fetch LV2
        let lv2: UserProfile[] = [];
        if (lv1.length > 0) {
          const lv1Ids = lv1.map(u => u.uid);
          // Firestore 'in' query limit is 10, but let's just fetch all for now or loop
          // For simplicity in this demo, we'll just fetch those referred by any lv1
          const q2 = query(collection(db, 'users'), where('referredBy', 'in', lv1Ids.slice(0, 10)));
          const snap2 = await getDocs(q2);
          lv2 = snap2.docs.map(doc => doc.data() as UserProfile);
        }

        // Fetch LV3
        let lv3: UserProfile[] = [];
        if (lv2.length > 0) {
          const lv2Ids = lv2.map(u => u.uid);
          const q3 = query(collection(db, 'users'), where('referredBy', 'in', lv2Ids.slice(0, 10)));
          const snap3 = await getDocs(q3);
          lv3 = snap3.docs.map(doc => doc.data() as UserProfile);
        }

        setTeamStats({
          lv1Count: lv1.length,
          lv2Count: lv2.length,
          lv3Count: lv3.length,
          teamSize: lv1.length + lv2.length + lv3.length,
          totalTeamIncome: profile?.totalIncome || 0, // Using user's total income as a proxy for team earnings for now
        });

        if (activeTab === 'LV1') setReferrals(lv1);
        else if (activeTab === 'LV2') setReferrals(lv2);
        else setReferrals(lv3);

      } catch (error) {
        console.error("Error fetching team:", error);
      }
    };

    fetchTeam();
  }, [user, activeTab, profile]);

  const copyReferralLink = () => {
    const link = `${websiteUrl}/register?ref=${profile?.referralCode}`;
    navigator.clipboard.writeText(link);
    alert("Referral link copied!");
  };

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#ff0000] rounded-full flex items-center justify-center text-white">
          <Share2 size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">My Team</h1>
      </div>

      {/* Referral Link Card */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[25px] p-6 shadow-md border border-gray-50 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="text-[#ff0000]" size={20} />
            <h3 className="font-bold text-gray-800">Referral Link</h3>
          </div>
          <div className="bg-red-50 text-[#ff0000] px-3 py-1 rounded-full text-xs font-bold">
            Code: {profile?.referralCode}
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between gap-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium truncate flex-1">
            {websiteUrl}/register?ref={profile?.referralCode}
          </p>
          <button 
            onClick={copyReferralLink}
            className="bg-[#ff0000] text-white p-2 rounded-xl shadow-md active:scale-90 transition-transform"
          >
            <Copy size={18} />
          </button>
        </div>
        
        <p className="text-[10px] text-gray-400 font-medium text-center">
          Share your link and earn up to 17% commission from your team's investment.
        </p>
      </motion.div>

      {/* Team Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-50 flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <Users className="text-blue-500" size={20} />
          </div>
          <p className="text-xs text-gray-500 font-medium">Team Size</p>
          <p className="text-lg font-bold text-gray-800">{teamStats.teamSize}</p>
        </div>
        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-50 flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
            <TrendingUp className="text-green-500" size={20} />
          </div>
          <p className="text-xs text-gray-500 font-medium">Team Income</p>
          <p className="text-lg font-bold text-gray-800">₹{teamStats.totalTeamIncome?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      {/* Referral List Tabs */}
      <div className="bg-white rounded-[25px] shadow-md border border-gray-50 overflow-hidden">
        <div className="flex border-b border-gray-50">
          {(['LV1', 'LV2', 'LV3'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${
                activeTab === tab ? 'text-[#ff0000] border-b-2 border-[#ff0000]' : 'text-gray-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4 min-h-[200px]">
          {referrals.length > 0 ? (
            referrals.map((ref) => (
              <div key={ref.uid} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-100 overflow-hidden shadow-sm">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${ref.uid}`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{ref.phone.slice(0, 3)}****{ref.phone.slice(-3)}</p>
                    <p className="text-[10px] text-gray-400 font-medium">Joined: {new Date(ref.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-500">₹{ref.totalIncome?.toFixed(2) || '0.00'}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Income</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Users size={40} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">No referrals yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Team;
