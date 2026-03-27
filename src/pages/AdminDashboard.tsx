import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc, increment, addDoc, serverTimestamp, setDoc, getDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, TransactionStatus, TransactionType, UserProfile, SystemSettings, Notification, Plan, InvestmentStatus, DatabaseMode } from '../types';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Users, ArrowUpCircle, ArrowDownCircle, CheckCircle2, XCircle, Clock, Search, Filter, ShieldAlert, ShieldCheck, Edit3, Save, Globe, Smartphone, Banknote, Bell, MoreVertical, LayoutDashboard, MessageSquare, Send, Mail, Phone, Headset, Database, Camera, ShoppingBag, Server } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    adminUpi: 'growvix@upi',
    websiteUrl: window.location.origin,
    minWithdrawal: 200,
    minRecharge: 100,
    withdrawalFee: 5,
    supportTelegram: '@GrowvixSupport',
    supportWhatsApp: '+91 98765 43210',
    supportEmail: 'support@growvix.com',
    supportChannel: '@GrowvixOfficial',
    customFirebase: JSON.parse(localStorage.getItem('GROWVIX_CUSTOM_FIREBASE') || 'null'),
    databaseMode: DatabaseMode.FIREBASE,
    sqlConfig: { host: '', user: '', database: '', password: '', port: 3306 }
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'settings' | 'overview' | 'database' | 'plans'>('overview');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editPlanData, setEditPlanData] = useState<Partial<Plan>>({});
  const [requestType, setRequestType] = useState<'recharge' | 'withdraw'>('recharge');
  const [processing, setProcessing] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editBalances, setEditBalances] = useState({ deposit: 0, withdrawable: 0, hasRecharged: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);

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

    // Listen to plans real-time
    const unsubscribePlans = onSnapshot(collection(db, 'plans'), (snapshot) => {
      const plansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
      setPlans(plansData);
    });

    // Fetch settings
    const fetchSettings = async () => {
      const settingsDoc = await getDoc(doc(db, 'system', 'settings'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data() as SystemSettings;
        setSettings(prev => ({ ...prev, ...data }));
        
        // Automatically update domain if it's different from current origin
        if (data.websiteUrl !== window.location.origin) {
          await updateDoc(doc(db, 'system', 'settings'), {
            websiteUrl: window.location.origin
          });
          setSettings(prev => ({ ...prev, websiteUrl: window.location.origin }));
        }
      } else {
        // Initialize settings if they don't exist
        const initialSettings = {
          adminUpi: settings.adminUpi || 'growvix@upi',
          websiteUrl: settings.websiteUrl || window.location.origin,
          minWithdrawal: settings.minWithdrawal || 200,
          minRecharge: settings.minRecharge || 100,
          withdrawalFee: settings.withdrawalFee || 5,
          supportTelegram: settings.supportTelegram || '@GrowvixSupport',
          supportWhatsApp: settings.supportWhatsApp || '+91 98765 43210',
          supportEmail: settings.supportEmail || 'support@growvix.com',
          supportChannel: settings.supportChannel || '@GrowvixOfficial',
          databaseMode: DatabaseMode.FIREBASE,
          sqlConfig: { host: '', user: '', database: '', password: '', port: 3306 }
        };
        await setDoc(doc(db, 'system', 'settings'), initialSettings);
      }
    };
    fetchSettings();

    return () => {
      unsubscribeTransactions();
      unsubscribeUsers();
      unsubscribePlans();
    };
  }, []);

  const sendNotification = async (userId: string, email: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    try {
      // 1. Create Firestore Notification
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp(),
      });

      // 2. Send Email via API
      await fetch('/api/send-notification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, subject: title, message }),
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };

  const handleApprove = async (transaction: Transaction) => {
    setProcessing(transaction.id);
    try {
      const amount = Number(transaction.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid transaction amount");
      }

      // 1. Get User Profile first to ensure it exists
      const userRef = doc(db, 'users', transaction.userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        throw new Error("User not found");
      }
      
      const userData = userSnap.data() as UserProfile;

      // 2. If Recharge, add balance to user
      if (transaction.type === TransactionType.RECHARGE) {
        await updateDoc(userRef, {
          depositBalance: increment(amount),
          balance: increment(amount),
          hasRecharged: true,
        });

        // 3. Referral Commission Logic (3 Levels)
        const processCommission = async (referrerId: string, level: number) => {
          if (!referrerId || level > 3) return;

          const commissionRates = [0, 0.10, 0.05, 0.02]; // Rates for LV1, LV2, LV3
          const rate = commissionRates[level];
          const commission = amount * rate;

          if (commission > 0) {
            const referrerRef = doc(db, 'users', referrerId);
            const referrerSnap = await getDoc(referrerRef);
            
            if (referrerSnap.exists()) {
              const referrerData = referrerSnap.data() as UserProfile;
              
              await updateDoc(referrerRef, {
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
                description: `LV${level} Referral commission from ${userData.phone || 'User'}`,
              });

              // Find next level referrer
              if (referrerData.referredBy) {
                await processCommission(referrerData.referredBy, level + 1);
              }
            }
          }
        };

        if (userData.referredBy) {
          await processCommission(userData.referredBy, 1);
        }
      }

      // 4. Update Transaction Status LAST
      await updateDoc(doc(db, 'transactions', transaction.id), {
        status: TransactionStatus.APPROVED,
        approvedAt: serverTimestamp(),
      });

      // 5. Send Notification
      const title = transaction.type === TransactionType.RECHARGE ? "Recharge Approved" : "Withdrawal Approved";
      const message = `Your ${transaction.type} of ₹${amount} has been approved. ${transaction.type === TransactionType.RECHARGE ? 'Balance added to your wallet.' : 'Funds will reach your bank account soon.'}`;
      await sendNotification(transaction.userId, userData.email, title, message, 'success');

      showToast("Transaction approved successfully!", "success");
    } catch (error) {
      console.error("Approval error:", error);
      showToast("Failed to approve transaction: " + (error instanceof Error ? error.message : "Unknown error"), "error");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (transaction: Transaction) => {
    setProcessing(transaction.id);
    try {
      const amount = Number(transaction.amount);
      
      // Get User Profile for notification
      const userRef = doc(db, 'users', transaction.userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() as UserProfile;

      // 1. Update Transaction Status
      await updateDoc(doc(db, 'transactions', transaction.id), {
        status: TransactionStatus.REJECTED,
        rejectedAt: serverTimestamp(),
      });

      // 2. If Withdrawal, refund balance to user
      if (transaction.type === TransactionType.WITHDRAW) {
        await updateDoc(doc(db, 'users', transaction.userId), {
          balance: increment(amount),
          withdrawableBalance: increment(amount),
        });
      }

      // 3. Send Notification
      const title = transaction.type === TransactionType.RECHARGE ? "Recharge Rejected" : "Withdrawal Rejected";
      const message = `Your ${transaction.type} of ₹${amount} has been rejected. ${transaction.type === TransactionType.WITHDRAW ? 'Amount has been refunded to your wallet.' : 'Please contact support for details.'}`;
      if (userData) {
        await sendNotification(transaction.userId, userData.email, title, message, 'error');
      }

      showToast("Transaction rejected and balance refunded (if applicable).", "info");
    } catch (error) {
      console.error("Rejection error:", error);
      showToast("Failed to reject transaction.", "error");
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
      showToast(`User ${u.isBanned ? 'unbanned' : 'banned'} successfully!`, "success");
    } catch (error) {
      showToast("Failed to update user status.", "error");
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
      showToast("User profile updated successfully!", "success");
    } catch (error) {
      showToast("Failed to update user profile.", "error");
    }
  };

  const handleResetData = async () => {
    const confirmText = "CRITICAL WARNING: This will delete ALL users (except admins), ALL transactions, and ALL investments. This action CANNOT be undone. Type 'RESET' to confirm:";
    const confirmation = window.prompt(confirmText);
    
    if (confirmation !== 'RESET') {
      showToast("Reset cancelled.", "info");
      return;
    }

    setProcessing('reset');
    try {
      // 1. Delete Transactions
      const transSnap = await getDocs(collection(db, 'transactions'));
      for (const d of transSnap.docs) {
        await deleteDoc(doc(db, 'transactions', d.id));
      }

      // 2. Delete Investments
      const investSnap = await getDocs(collection(db, 'investments'));
      for (const d of investSnap.docs) {
        await deleteDoc(doc(db, 'investments', d.id));
      }

      // 3. Delete Users (except admins)
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const d of usersSnap.docs) {
        const data = d.data() as UserProfile;
        if (data.role === 'admin') continue;
        
        // We can't delete Auth users from here, but we can delete their Firestore profile
        await deleteDoc(doc(db, 'users', d.id));
      }

      showToast("System data reset successfully! Note: User authentication accounts still exist in Firebase Auth and must be deleted manually if needed.", "success");
    } catch (error) {
      console.error("Reset error:", error);
      showToast("Reset failed: " + (error instanceof Error ? error.message : "Unknown error"), "error");
    } finally {
      setProcessing(null);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const settingsToSave = {
        adminUpi: settings.adminUpi || '',
        websiteUrl: settings.websiteUrl || window.location.origin,
        minWithdrawal: settings.minWithdrawal || 0,
        minRecharge: settings.minRecharge || 0,
        withdrawalFee: settings.withdrawalFee || 0,
        supportTelegram: settings.supportTelegram || '',
        supportWhatsApp: settings.supportWhatsApp || '',
        supportEmail: settings.supportEmail || '',
        supportChannel: settings.supportChannel || '',
        databaseMode: settings.databaseMode || DatabaseMode.FIREBASE,
        sqlConfig: settings.sqlConfig || { host: '', user: '', database: '', password: '', port: 3306 },
      };

      await setDoc(doc(db, 'system', 'settings'), settingsToSave, { merge: true });
      showToast('Settings saved successfully!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system/settings');
      showToast('Failed to save settings', 'error');
    }
  };

  const handleSaveDatabase = async () => {
    try {
      // Save to Firestore first
      const settingsToSave = {
        databaseMode: settings.databaseMode,
        sqlConfig: settings.sqlConfig,
        customFirebase: settings.customFirebase
      };
      await setDoc(doc(db, 'system', 'settings'), settingsToSave, { merge: true });

      if (settings.databaseMode === DatabaseMode.SQL) {
        if (!settings.sqlConfig?.host || !settings.sqlConfig?.database || !settings.sqlConfig?.user) {
          showToast('Please fill in all required SQL fields', 'error');
          return;
        }

        const response = await fetch('/api/admin/config-database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'sql', config: settings.sqlConfig })
        });

        const result = await response.json();
        if (result.success) {
          showToast('SQL Database connected and settings saved!', 'success');
        } else {
          showToast(result.message || 'Failed to connect to SQL', 'error');
        }
      } else {
        // Firebase Mode
        if (settings.customFirebase && settings.customFirebase.apiKey && settings.customFirebase.projectId) {
          localStorage.setItem('GROWVIX_CUSTOM_FIREBASE', JSON.stringify(settings.customFirebase));
          showToast('Firebase configuration saved! Reloading...', 'success');
          setTimeout(() => window.location.reload(), 2000);
        } else {
          // If using default firebase, just notify
          showToast('Switched to Default Firebase Mode', 'success');
          localStorage.removeItem('GROWVIX_CUSTOM_FIREBASE');
          setTimeout(() => window.location.reload(), 1500);
        }
      }
    } catch (error) {
      console.error("Save database error:", error);
      showToast('Failed to save database configuration', 'error');
    }
  };

  const handleResetFirebase = () => {
    localStorage.removeItem('GROWVIX_CUSTOM_FIREBASE');
    showToast('Firebase reset to default! Reloading...', 'success');
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    try {
      await deleteDoc(doc(db, 'plans', planId));
      showToast("Plan deleted successfully!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `plans/${planId}`);
      showToast("Failed to delete plan", "error");
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    try {
      await updateDoc(doc(db, 'plans', editingPlan.id), {
        name: editPlanData.name || '',
        price: Number(editPlanData.price) || 0,
        dailyIncome: Number(editPlanData.dailyIncome) || 0,
        validityDays: Number(editPlanData.validityDays) || 0,
        imageUrl: editPlanData.imageUrl || ''
      });
      setEditingPlan(null);
      showToast("Plan updated successfully!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `plans/${editingPlan.id}`);
      showToast("Failed to update plan", "error");
    }
  };

  const handleRestoreDefaultPlans = async () => {
    const defaultPlans = [
      { name: 'VIP 1', price: 500, dailyIncome: 50, validityDays: 30, imageUrl: 'https://picsum.photos/seed/vip1/400/300' },
      { name: 'VIP 2', price: 1000, dailyIncome: 110, validityDays: 30, imageUrl: 'https://picsum.photos/seed/vip2/400/300' },
      { name: 'VIP 3', price: 5000, dailyIncome: 600, validityDays: 30, imageUrl: 'https://picsum.photos/seed/vip3/400/300' },
      { name: 'VIP 4', price: 10000, dailyIncome: 1300, validityDays: 30, imageUrl: 'https://picsum.photos/seed/vip4/400/300' },
    ];

    setProcessing('restore');
    try {
      for (const plan of defaultPlans) {
        // Check if plan already exists by name
        const exists = plans.some(p => p.name === plan.name);
        if (!exists) {
          await addDoc(collection(db, 'plans'), {
            ...plan,
            createdAt: serverTimestamp()
          });
        }
      }
      showToast("Default plans restored!", "success");
    } catch (error) {
      showToast("Failed to restore default plans", "error");
    } finally {
      setProcessing(null);
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
      <div className="flex items-center justify-between sticky top-0 bg-gray-50/80 backdrop-blur-md z-40 py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden border border-gray-100">
            <img 
              src="https://i.ibb.co/CcxW3F4/file-0000000054487208abbf2cb1db170f4e.png" 
              alt="Growvix Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-800 tracking-tight">Admin</h1>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Growvix Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/notifications')}
            className="p-2.5 bg-white rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors shadow-sm border border-gray-50"
          >
            <Bell size={20} />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className={`p-2.5 bg-white rounded-xl transition-all shadow-sm border border-gray-50 ${showMenu ? 'text-[#ff0000] border-red-100' : 'text-gray-400'}`}
            >
              <MoreVertical size={20} />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                  >
                    <div className="p-2 space-y-1">
                      {[
                        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                        { id: 'requests', label: 'Requests', icon: Clock },
                        { id: 'users', label: 'Users', icon: Users },
                        { id: 'plans', label: 'Manage Plans', icon: ShoppingBag },
                        { id: 'add-plan', label: 'Add Plan', icon: Camera, action: () => navigate('/admin/add-plan') },
                        { id: 'settings', label: 'Settings', icon: Settings },
                        { id: 'database', label: 'Database', icon: Database },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.action) {
                              item.action();
                            } else {
                              setActiveTab(item.id as any);
                            }
                            setShowMenu(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${
                            activeTab === item.id ? 'bg-red-50 text-[#ff0000]' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <item.icon size={16} />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
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

          <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-50 space-y-4">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setActiveTab('requests'); setRequestType('recharge'); }}
                className="p-4 bg-green-50 text-green-600 rounded-2xl border border-green-100 flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <ArrowUpCircle size={24} />
                <span className="text-[10px] font-black uppercase">Recharges</span>
              </button>
              <button 
                onClick={() => { setActiveTab('requests'); setRequestType('withdraw'); }}
                className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <ArrowDownCircle size={24} />
                <span className="text-[10px] font-black uppercase">Withdrawals</span>
              </button>
              <button 
                onClick={() => navigate('/admin/add-plan')}
                className="p-4 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <Camera size={24} />
                <span className="text-[10px] font-black uppercase">Add New Plan</span>
              </button>
              <button 
                onClick={() => setActiveTab('plans')}
                className="p-4 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100 flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <ShoppingBag size={24} />
                <span className="text-[10px] font-black uppercase">Manage Plans</span>
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className="p-4 bg-gray-50 text-gray-600 rounded-2xl border border-gray-100 flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <Settings size={24} />
                <span className="text-[10px] font-black uppercase">Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-white rounded-[30px] shadow-xl border border-gray-100 overflow-hidden">
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

              <div className="pt-6 border-t border-gray-100 space-y-4">
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                  <Headset size={14} className="text-[#ff0000]" /> Support Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                      <MessageSquare size={12} className="text-blue-500" /> Telegram ID
                    </label>
                    <input 
                      type="text" 
                      value={settings.supportTelegram}
                      onChange={(e) => setSettings({ ...settings, supportTelegram: e.target.value })}
                      placeholder="@GrowvixSupport"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                      <Phone size={12} className="text-green-500" /> WhatsApp Number
                    </label>
                    <input 
                      type="text" 
                      value={settings.supportWhatsApp}
                      onChange={(e) => setSettings({ ...settings, supportWhatsApp: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                      <Mail size={12} className="text-[#ff0000]" /> Support Email
                    </label>
                    <input 
                      type="text" 
                      value={settings.supportEmail}
                      onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                      placeholder="support@growvix.com"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2">
                      <Send size={12} className="text-sky-500" /> Official Channel
                    </label>
                    <input 
                      type="text" 
                      value={settings.supportChannel}
                      onChange={(e) => setSettings({ ...settings, supportChannel: e.target.value })}
                      placeholder="@GrowvixOfficial"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveSettings}
                className="w-full bg-[#ff0000] text-white py-4 rounded-2xl font-black shadow-xl shadow-red-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Save size={20} /> Save System Settings
              </button>

              <div className="pt-10 border-t border-red-100">
                <div className="bg-red-50 p-6 rounded-[30px] border border-red-100 space-y-4">
                  <div className="flex items-center gap-3 text-red-600">
                    <ShieldAlert size={24} />
                    <h3 className="font-black uppercase tracking-wider text-sm">Danger Zone</h3>
                  </div>
                  <p className="text-xs text-red-400 font-medium">
                    Resetting system data will permanently delete all user profiles (except admins), transactions, and investments. Use this only when you want to start fresh.
                  </p>
                  <button 
                    onClick={handleResetData}
                    disabled={processing === 'reset'}
                    className="w-full bg-white text-red-600 border-2 border-red-100 py-4 rounded-2xl font-black text-sm active:bg-red-600 active:text-white transition-all disabled:opacity-50"
                  >
                    {processing === 'reset' ? 'Resetting Data...' : 'Reset System Data'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-6 p-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-800 tracking-tight">Database Configuration</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Switch between Firebase and Remote SQL</p>
                </div>
              </div>

              {/* Database Mode Toggle */}
              <div className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-gray-800">
                  <Database size={20} />
                  <h3 className="font-black uppercase tracking-wider text-xs">Active Database Mode</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setSettings({ ...settings, databaseMode: DatabaseMode.FIREBASE })}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${settings.databaseMode === DatabaseMode.FIREBASE ? 'border-[#ff0000] bg-red-50' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${settings.databaseMode === DatabaseMode.FIREBASE ? 'bg-[#ff0000] text-white' : 'bg-gray-200 text-gray-400'}`}>
                      <Database size={20} />
                    </div>
                    <span className={`text-xs font-black uppercase ${settings.databaseMode === DatabaseMode.FIREBASE ? 'text-[#ff0000]' : 'text-gray-400'}`}>Firebase</span>
                  </button>
                  <button 
                    onClick={() => setSettings({ ...settings, databaseMode: DatabaseMode.SQL })}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${settings.databaseMode === DatabaseMode.SQL ? 'border-[#ff0000] bg-red-50' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${settings.databaseMode === DatabaseMode.SQL ? 'bg-[#ff0000] text-white' : 'bg-gray-200 text-gray-400'}`}>
                      <Server size={20} />
                    </div>
                    <span className={`text-xs font-black uppercase ${settings.databaseMode === DatabaseMode.SQL ? 'text-[#ff0000]' : 'text-gray-400'}`}>Remote SQL</span>
                  </button>
                </div>
              </div>

              {settings.databaseMode === DatabaseMode.FIREBASE ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Firebase Settings</h3>
                    </div>
                    <button 
                      onClick={handleResetFirebase}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all"
                    >
                      Reset to Default
                    </button>
                  </div>

                  <div className="bg-orange-50 p-6 rounded-[30px] border border-orange-100 space-y-3">
                    <div className="flex items-center gap-3 text-orange-600">
                      <ShieldAlert size={20} />
                      <h3 className="font-black uppercase tracking-wider text-xs">Important Instructions</h3>
                    </div>
                    <p className="text-[11px] text-orange-700 font-medium leading-relaxed">
                      To use your own database, follow these steps:
                      <br />1. Create a project on <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline font-bold">Firebase Console</a>.
                      <br />2. Enable <span className="font-bold">Authentication</span> (Google Login) and <span className="font-bold">Firestore Database</span>.
                      <br />3. Create a Web App and copy the configuration details below.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">API Key</label>
                      <input 
                        type="text" 
                        value={settings.customFirebase?.apiKey || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          customFirebase: { ...(settings.customFirebase || { authDomain: '', projectId: '', appId: '', apiKey: '' }), apiKey: e.target.value } 
                        })}
                        placeholder="AIzaSy..."
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Project ID</label>
                      <input 
                        type="text" 
                        value={settings.customFirebase?.projectId || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          customFirebase: { ...(settings.customFirebase || { authDomain: '', projectId: '', appId: '', apiKey: '' }), projectId: e.target.value } 
                        })}
                        placeholder="my-project-id"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Auth Domain</label>
                      <input 
                        type="text" 
                        value={settings.customFirebase?.authDomain || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          customFirebase: { ...(settings.customFirebase || { authDomain: '', projectId: '', appId: '', apiKey: '' }), authDomain: e.target.value } 
                        })}
                        placeholder="my-project.firebaseapp.com"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">App ID</label>
                      <input 
                        type="text" 
                        value={settings.customFirebase?.appId || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          customFirebase: { ...(settings.customFirebase || { authDomain: '', projectId: '', appId: '', apiKey: '' }), appId: e.target.value } 
                        })}
                        placeholder="1:123456789:web:abc123"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Database ID (Optional)</label>
                      <input 
                        type="text" 
                        value={settings.customFirebase?.firestoreDatabaseId || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          customFirebase: { ...(settings.customFirebase || { authDomain: '', projectId: '', appId: '', apiKey: '' }), firestoreDatabaseId: e.target.value } 
                        })}
                        placeholder="(default)"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Remote SQL Settings</h3>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-[30px] border border-blue-100 space-y-3">
                    <div className="flex items-center gap-3 text-blue-600">
                      <Server size={20} />
                      <h3 className="font-black uppercase tracking-wider text-xs">SQL Configuration</h3>
                    </div>
                    <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                      Enter your remote MySQL/PostgreSQL details. The backend will use these to connect.
                      <br /><span className="font-bold">Note:</span> Ensure your database allows connections from this server's IP.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Host</label>
                      <input 
                        type="text" 
                        value={settings.sqlConfig?.host || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          sqlConfig: { ...(settings.sqlConfig || { host: '', user: '', database: '', password: '', port: 3306 }), host: e.target.value } 
                        })}
                        placeholder="localhost or IP"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Database Name</label>
                      <input 
                        type="text" 
                        value={settings.sqlConfig?.database || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          sqlConfig: { ...(settings.sqlConfig || { host: '', user: '', database: '', password: '', port: 3306 }), database: e.target.value } 
                        })}
                        placeholder="my_database"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Username</label>
                      <input 
                        type="text" 
                        value={settings.sqlConfig?.user || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          sqlConfig: { ...(settings.sqlConfig || { host: '', user: '', database: '', password: '', port: 3306 }), user: e.target.value } 
                        })}
                        placeholder="root"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Password</label>
                      <input 
                        type="password" 
                        value={settings.sqlConfig?.password || ''}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          sqlConfig: { ...(settings.sqlConfig || { host: '', user: '', database: '', password: '', port: 3306 }), password: e.target.value } 
                        })}
                        placeholder="********"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Port</label>
                      <input 
                        type="number" 
                        value={settings.sqlConfig?.port || 3306}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          sqlConfig: { ...(settings.sqlConfig || { host: '', user: '', database: '', password: '', port: 3306 }), port: parseInt(e.target.value) } 
                        })}
                        placeholder="3306"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={handleSaveDatabase}
                className="w-full bg-[#ff0000] text-white py-4 rounded-2xl font-black shadow-xl shadow-red-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Save size={20} /> Save Database Configuration
              </button>
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-800 tracking-tight">Manage Plans</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Edit or Delete Investment Plans</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleRestoreDefaultPlans}
                    disabled={processing === 'restore'}
                    className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase border border-orange-100 hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50"
                  >
                    {processing === 'restore' ? 'Restoring...' : 'Restore Defaults'}
                  </button>
                  <button 
                    onClick={() => navigate('/admin/add-plan')}
                    className="px-4 py-2 bg-[#ff0000] text-white rounded-xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-transform"
                  >
                    Add New
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.length > 0 ? (
                  plans.map((plan) => (
                    <div key={plan.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-200">
                          <img src={plan.imageUrl} alt={plan.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800">{plan.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold">₹{plan.price} • ₹{plan.dailyIncome}/day</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingPlan(plan);
                            setEditPlanData(plan);
                          }}
                          className="p-2 bg-white text-blue-500 rounded-xl shadow-sm border border-gray-100 active:scale-90 transition-transform"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeletePlan(plan.id)}
                          className="p-2 bg-white text-red-500 rounded-xl shadow-sm border border-gray-100 active:scale-90 transition-transform"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center text-gray-400">
                    <ShoppingBag size={40} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-medium">No plans found. Click Restore Defaults to get started.</p>
                  </div>
                )}
              </div>
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

      {/* Edit Plan Modal */}
      <AnimatePresence>
        {editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[30px] p-6 w-full max-w-sm space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-800">Edit Plan</h3>
                <button onClick={() => setEditingPlan(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Plan Name</label>
                  <input 
                    type="text" 
                    value={editPlanData.name || ''}
                    onChange={(e) => setEditPlanData({ ...editPlanData, name: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Price (₹)</label>
                    <input 
                      type="number" 
                      value={editPlanData.price || ''}
                      onChange={(e) => setEditPlanData({ ...editPlanData, price: parseFloat(e.target.value) })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Daily Income (₹)</label>
                    <input 
                      type="number" 
                      value={editPlanData.dailyIncome || ''}
                      onChange={(e) => setEditPlanData({ ...editPlanData, dailyIncome: parseFloat(e.target.value) })}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Validity (Days)</label>
                  <input 
                    type="number" 
                    value={editPlanData.validityDays || ''}
                    onChange={(e) => setEditPlanData({ ...editPlanData, validityDays: parseInt(e.target.value) })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Image URL</label>
                  <input 
                    type="text" 
                    value={editPlanData.imageUrl || ''}
                    onChange={(e) => setEditPlanData({ ...editPlanData, imageUrl: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#ff0000] rounded-xl py-3 px-4 outline-none font-bold text-gray-700"
                  />
                </div>
              </div>

              <button 
                onClick={handleUpdatePlan}
                className="w-full bg-[#ff0000] text-white py-4 rounded-2xl font-black shadow-xl shadow-red-100 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Save size={20} /> Update Plan
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
