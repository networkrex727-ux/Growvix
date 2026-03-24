import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Notification } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ArrowLeft, CheckCircle2, Info, AlertTriangle, XCircle, Trash2, Check } from 'lucide-react';

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-green-500" size={20} />;
      case 'warning': return <AlertTriangle className="text-orange-500" size={20} />;
      case 'error': return <XCircle className="text-red-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-20 border-b border-gray-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-[#ff0000] transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">Notifications</h1>
        </div>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            className="text-[10px] font-black text-[#ff0000] uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-full"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#ff0000] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => !n.read && markAsRead(n.id)}
                className={`p-4 rounded-[25px] border transition-all cursor-pointer relative overflow-hidden ${
                  n.read ? 'bg-white border-gray-100 opacity-60' : 'bg-gray-50 border-[#ff0000]/10 shadow-sm'
                }`}
              >
                {!n.read && <div className="absolute top-0 left-0 w-1 h-full bg-[#ff0000]" />}
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    n.type === 'success' ? 'bg-green-50' : 
                    n.type === 'warning' ? 'bg-orange-50' : 
                    n.type === 'error' ? 'bg-red-50' : 'bg-blue-50'
                  }`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-black ${n.read ? 'text-gray-600' : 'text-gray-800'}`}>{n.title}</h3>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">{n.message}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
              <Bell size={40} className="opacity-20" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
