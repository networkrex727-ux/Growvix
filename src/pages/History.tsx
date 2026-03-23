import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Transaction, TransactionStatus, TransactionType } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const History: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('type') === 'withdraw' ? 'withdraw' : 'recharge';
  
  const [activeTab, setActiveTab] = useState<'recharge' | 'withdraw'>(initialTab);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const type = activeTab === 'recharge' ? TransactionType.RECHARGE : TransactionType.WITHDRAW;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      where('type', '==', type),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(transData);
      setLoading(false);
    }, (error) => {
      console.error("History fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, activeTab]);

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.APPROVED:
      case TransactionStatus.COMPLETED:
        return 'text-green-500 bg-green-50';
      case TransactionStatus.REJECTED:
        return 'text-red-500 bg-red-50';
      case TransactionStatus.PENDING:
        return 'text-orange-500 bg-orange-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.APPROVED:
      case TransactionStatus.COMPLETED:
        return <CheckCircle2 size={14} />;
      case TransactionStatus.REJECTED:
        return <XCircle size={14} />;
      case TransactionStatus.PENDING:
        return <Clock size={14} />;
      default:
        return <AlertCircle size={14} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors shadow-sm">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Transaction History</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-[25px] shadow-md border border-gray-50 overflow-hidden">
        <div className="flex border-b border-gray-50">
          {(['recharge', 'withdraw'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-sm font-bold transition-colors uppercase tracking-widest ${
                activeTab === tab ? 'text-[#ff0000] border-b-2 border-[#ff0000]' : 'text-gray-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4 min-h-[400px]">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#ff0000] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : transactions.length > 0 ? (
            transactions.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'recharge' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                    {activeTab === 'recharge' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">₹{t.amount?.toFixed(2) || '0.00'}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(t.status)}`}>
                  {getStatusIcon(t.status)}
                  {t.status}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Clock size={40} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">No {activeTab} history found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
