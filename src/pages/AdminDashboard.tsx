import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc, increment, addDoc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, TransactionStatus, TransactionType, UserProfile, SystemSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Users, ArrowUpCircle, ArrowDownCircle, CheckCircle2, XCircle, Clock, Search, Filter, ShieldAlert, ShieldCheck, Edit3, Save, Globe, Smartphone, Banknote } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    adminUpi: 'growvix@upi',
    websiteUrl: window.location.origin,
    minWithdrawal: 200,
    minRecharge: 100,
    withdrawalFee: 5,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'settings'>('requests');
  const [requestType, setRequestType] = useState<'recharge' | 'withdraw'>('recharge');
  const [processing, setProcessing] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editBalances, setEditBalances] = useState({ deposit: 0, withdrawable: 0, hasRecharged: false });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Listen to pending transactions
    const q = query(collection(db, 'transactions'), where('status', '==', TransactionStatus.PENDING));
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(transData);
      setLoading(false);
    });

    // Listen to users real-time
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
    });

    // Fetch settings
    const fetchSettings = async () => {
      const settingsDoc = await getDoc(doc(db, 'system', 'settings'));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as SystemSettings);
      } else {
        // Initialize settings if they don't exist
        await setDoc(doc(db, 'system', 'settings'), settings);
      }
    };
    fetchSettings();

    return () => {
      unsubscribeTransactions();
      unsubscribeUsers();
    };
  }, []);

  const handleApprove = async (transaction: Transaction) => {
    setProcessing(transaction.id);
    try {
      // 1. Update Transaction Status
      await updateDoc(doc(db, 'transactions', transaction.id), {
        status: TransactionStatus.APPROVED,
        approvedAt: serverTimestamp(),
      });

      // 2. If Recharge, add balance to user
      if (transaction.type === TransactionType.RECHARGE) {
        await updateDoc(doc(db, 'users', transaction.userId), {
          depositBalance: increment(transaction.amount),
          balance: increment(transaction.amount),
          hasRecharged: true,
        });

        // 3. Referral Commission Logic (3 Levels)
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', transaction.userId)));
        const userData = userDoc.docs[0].data() as UserProfile;

        const processCommission = async (referrerId: string, level: number) => {
          if (!referrerId || level > 3) return;

          const commissionRates = [0, 0.10, 0.05, 0.02]; // Rates for LV1, LV2, LV3
          const rate = commissionRates[level];
          const commission = transaction.amount * rate;

          if (commission > 0) {
            await updateDoc(doc(db, 'users', referrerId), {
              balance: increment(commission),
              withdrawableBalance: increment(commission),
              totalIncome: increment(commission),
            });
            await addDoc(collection(db, 'transactions'), {
              userId: referrerId,
              amount: commission,
              type: TransactionType.REFERRAL,
              status: TransactionStatus.COMPLETED,
              createdAt: serverTimestamp(),
              description: `LV${level} Referral commission from ${userData.phone}`,
            });

            // Find next level referrer
            const refDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', referrerId)));
            if (!refDoc.empty) {
              const refData = refDoc.docs[0].data() as UserProfile;
              if (refData.referredBy) {
                await processCommission(refData.referredBy, level + 1);
              }
            }
          }
        };

        if (userData.referredBy) {
          await processCommission(userData.referredBy, 1);
        }
      }

      alert("Transaction approved!");
    } catch (error) {
      console.error("Approval error:", error);
      alert("Failed to approve transaction.");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (transaction: Transaction) => {
    setProcessing(transaction.id);
    try {
      // 1. Update Transaction Status
      await updateDoc(doc(db, 'transactions', transaction.id), {
        status: TransactionStatus.REJECTED,
        rejectedAt: serverTimestamp(),
      });

      // 2. If Withdrawal, refund balance to user
      if (transaction.type === TransactionType.WITHDRAW) {
        await updateDoc(doc(db, 'users', transaction.userId), {
          balance: increment(transaction.amount),
          withdrawableBalance: increment(transaction.amount),
        });
      }

      alert("Transaction rejected!");
    } catch (error) {
      console.error("Rejection error:", error);
      alert("Failed to reject transaction.");
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleBan = async (u: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', u.uid), {
        isBanned: !u.isBanned
      });
      setUsers(users.map(user => user.uid === u.uid ? { ...user, isBanned: !u.isBanned } : user));
      alert(`User ${u.isBanned ? 'unbanned' : 'banned'} successfully!`);
    } catch (error) {
      alert("Failed to update user status.");
    }
  };

  const handleUpdateBalance = async () => {
    if (!editingUser) return;
    try {
      const newTotal = editBalances.deposit + editBalances.withdrawable;
      await updateDoc(doc(db, 'users', editingUser.uid), {
        depositBalance: editBalances.deposit,
        withdrawableBalance: editBalances.withdrawable,
        balance: newTotal,
        hasRecharged: editBalances.hasRecharged
      });
      setUsers(users.map(user => user.uid === editingUser.uid ? { 
        ...user, 
        depositBalance: editBalances.deposit, 
        withdrawableBalance: editBalances.withdrawable,
        balance: newTotal,
        hasRecharged: editBalances.hasRecharged
      } : user));
      setEditingUser(null);
      alert("User profile updated successfully!");
    } catch (error) {
      alert("Failed to update user profile.");
    }
  };

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'system', 'settings'), settings);
      alert("Settings saved successfully!");
    } catch (error) {
      alert("Failed to save settings.");
    }
  };

  const filteredTransactions = transactions.filter(t => 
    requestType === 'recharge' ? t.type === TransactionType.RECHARGE : t.type === TransactionType.WITHDRAW
  );

  const filteredUsers = users.filter(u => 
    u.phone.includes(searchQuery) || u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden border border-gray-100">
            <img 
              src="https://i.ibb.co/CcxW3F4/file-0000000054487208abbf2cb1db170f4e.png" 
              alt="Growvix Logo" 
              className="w-full h-full object-contain p-1"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Admin Dashboard</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Growvix Management</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-[25px] shadow-sm border border-gray-50 flex flex-col items-center gap-2">
          <Users className="text-blue-500" size={24} />
          <p className="text-lg font-black text-gray-800">{users.length}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Total Users</p>
        </div>
        <div className="bg-white p-4 rounded-[25px] shadow-sm border border-gray-50 flex flex-col items-center gap-2 text-center">
          <Clock className="text-orange-500" size={24} />
          <p className="text-lg font-black text-gray-800">{transactions.length}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Pending Requests</p>
        </div>
        <div className="bg-white p-4 rounded-[25px] shadow-sm border border-gray-50 flex flex-col items-center gap-2 text-center">
          <ArrowUpCircle className="text-green-500" size={24} />
          <p className="text-lg font-black text-gray-800">₹{users.reduce((acc, u) => acc + (u.depositBalance || 0), 0).toFixed(0)}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Total Deposit</p>
        </div>
        <div className="bg-white p-4 rounded-[25px] shadow-sm border border-gray-50 flex flex-col items-center gap-2 text-center">
          <ArrowDownCircle className="text-red-500" size={24} />
          <p className="text-lg font-black text-gray-800">₹{users.reduce((acc, u) => acc + (u.withdrawableBalance || 0), 0).toFixed(0)}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Total Withdrawable</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-[30px] shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/30 p-2 gap-2">
          {(['requests', 'users', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[11px] font-black transition-all uppercase tracking-widest rounded-2xl ${
                activeTab === tab 
                  ? 'text-white bg-[#ff0000] shadow-lg shadow-red-100' 
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4 min-h-[500px]">
          {activeTab === 'requests' && (
            <div className="space-y-6">
              {/* Request Type Toggle */}
              <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setRequestType('recharge')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    requestType === 'recharge' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'
                  }`}
                >
                  Recharges ({transactions.filter(t => t.type === TransactionType.RECHARGE).length})
                </button>
                <button
                  onClick={() => setRequestType('withdraw')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    requestType === 'withdraw' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'
                  }`}
                >
                  Withdrawals ({transactions.filter(t => t.type === TransactionType.WITHDRAW).length})
                </button>
              </div>

              <div className="space-y-4">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((t) => (
                    <div key={t.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === TransactionType.RECHARGE ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                            {t.type === TransactionType.RECHARGE ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">₹{t.amount?.toFixed(2) || '0.00'}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{t.userId.slice(0, 10)}...</p>
                            {t.type === TransactionType.RECHARGE && t.utr && (
                              <p className="text-[10px] text-[#ff0000] font-bold mt-1">UTR: {t.utr}</p>
                            )}
                            {t.type === TransactionType.WITHDRAW && t.bankDetails && (
                              <div className="mt-1 p-2 bg-white rounded-lg border border-gray-100 text-[9px] text-gray-500 font-medium space-y-0.5">
                                <p><span className="font-bold">Name:</span> {t.bankDetails.holderName}</p>
                                <p><span className="font-bold">A/C:</span> {t.bankDetails.accountNo}</p>
                                <p><span className="font-bold">IFSC:</span> {t.bankDetails.ifsc}</p>
                                {t.bankDetails.upiId && <p><span className="font-bold">UPI:</span> {t.bankDetails.upiId}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{t.paymentMethod || 'Bank'}</p>
                          <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 justify-end">
                            <Clock size={10} /> {new Date(t.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(t)}
                          disabled={processing === t.id}
                          className="flex-1 bg-green-500 text-white py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(t)}
                          disabled={processing === t.id}
                          className="flex-1 bg-red-500 text-white py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Clock size={40} className="mb-2 opacity-20" />
                    <p className="text-sm font-medium">No pending {requestType}s</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by phone or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-2xl py-3 pl-12 pr-4 outline-none font-bold text-gray-700 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUsers.map((u) => (
                  <div key={u.uid} className={`flex flex-col p-4 bg-gray-50 rounded-2xl border transition-all ${u.isBanned ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-gray-400 border border-gray-100 overflow-hidden">
                          <img 
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-gray-800">{u.phone}</p>
                            {u.isBanned && <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase">Banned</span>}
                            {u.hasRecharged && <span className="bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase">Recharged</span>}
                          </div>
                          <p className="text-[10px] text-gray-400 font-medium">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingUser(u);
                            setEditBalances({ 
                              deposit: u.depositBalance || 0, 
                              withdrawable: u.withdrawableBalance || 0,
                              hasRecharged: !!u.hasRecharged
                            });
                          }}
                          className="p-2 bg-white text-blue-500 rounded-xl shadow-sm border border-gray-100 active:scale-90 transition-transform"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleToggleBan(u)}
                          className={`p-2 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-90 transition-transform ${u.isBanned ? 'text-green-500' : 'text-red-500'}`}
                        >
                          {u.isBanned ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="bg-white p-2 rounded-xl border border-gray-100">
                        <p className="text-[8px] text-gray-400 font-bold uppercase">Deposit</p>
                        <p className="text-xs font-black text-gray-700">₹{u.depositBalance?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-gray-100">
                        <p className="text-[8px] text-gray-400 font-bold uppercase">Withdrawable</p>
                        <p className="text-xs font-black text-gray-700">₹{u.withdrawableBalance?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase flex items-center gap-2">
                    <Smartphone size={14} className="text-[#ff0000]" /> Admin UPI ID
                  </label>
                  <input 
                    type="text" 
                    value={settings.adminUpi}
                    onChange={(e) => setSettings({ ...settings, adminUpi: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase flex items-center gap-2">
                    <Globe size={14} className="text-[#ff0000]" /> Website URL
                  </label>
                  <input 
                    type="text" 
                    value={settings.websiteUrl}
                    onChange={(e) => setSettings({ ...settings, websiteUrl: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase flex items-center gap-2">
                    <ArrowUpCircle size={14} className="text-[#ff0000]" /> Min Recharge (₹)
                  </label>
                  <input 
                    type="number" 
                    value={settings.minRecharge}
                    onChange={(e) => setSettings({ ...settings, minRecharge: parseInt(e.target.value) })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase flex items-center gap-2">
                    <ArrowDownCircle size={14} className="text-[#ff0000]" /> Min Withdrawal (₹)
                  </label>
                  <input 
                    type="number" 
                    value={settings.minWithdrawal}
                    onChange={(e) => setSettings({ ...settings, minWithdrawal: parseInt(e.target.value) })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase flex items-center gap-2">
                    <Filter size={14} className="text-[#ff0000]" /> Withdrawal Fee (%)
                  </label>
                  <input 
                    type="number" 
                    value={settings.withdrawalFee}
                    onChange={(e) => setSettings({ ...settings, withdrawalFee: parseInt(e.target.value) })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                  />
                </div>
              </div>
              <button 
                onClick={handleSaveSettings}
                className="w-full bg-[#ff0000] text-white py-4 rounded-2xl font-black shadow-xl shadow-red-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Save size={20} /> Save System Settings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Balance Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[30px] p-6 w-full max-w-sm space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-800">Edit Balance</h3>
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Deposit Balance</label>
                  <input 
                    type="number" 
                    value={editBalances.deposit}
                    onChange={(e) => setEditBalances({ ...editBalances, deposit: parseFloat(e.target.value) })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Withdrawable Balance</label>
                  <input 
                    type="number" 
                    value={editBalances.withdrawable}
                    onChange={(e) => setEditBalances({ ...editBalances, withdrawable: parseFloat(e.target.value) })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={editBalances.hasRecharged}
                      onChange={(e) => setEditBalances({ ...editBalances, hasRecharged: e.target.checked })}
                      className="w-5 h-5 accent-[#ff0000] rounded" 
                    />
                    <span className="text-xs text-gray-600 font-bold">Mark as Recharged (Unlocks Investment)</span>
                  </label>
                </div>
              </div>

              <button 
                onClick={handleUpdateBalance}
                className="w-full bg-[#ff0000] text-white py-4 rounded-2xl font-black shadow-xl shadow-red-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Save size={20} /> Update User Profile
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
