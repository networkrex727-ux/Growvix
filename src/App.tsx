import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from './types';

// Components
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Product from './pages/Product';
import Team from './pages/Team';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Recharge from './pages/Recharge';
import Withdraw from './pages/Withdraw';
import CheckIn from './pages/CheckIn';
import History from './pages/History';
import Support from './pages/Support';
import About from './pages/About';
import Rules from './pages/Rules';
import MyInvestments from './pages/MyInvestments';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import { ToastProvider } from './context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert } from 'lucide-react';

// Context
interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, profile, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex items-center justify-center h-screen bg-white">
    <div className="w-12 h-12 border-4 border-[#ff0000] border-t-transparent rounded-full animate-spin"></div>
  </div>;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile?.isBanned && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white p-6 text-center space-y-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-2xl font-black text-gray-800">Account Banned</h1>
        <p className="text-gray-500 font-medium">Your account has been suspended for violating our terms of service. Please contact support for more information.</p>
        <button 
          onClick={() => auth.signOut()}
          className="bg-[#ff0000] text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-red-100 active:scale-95 transition-transform"
        >
          Logout
        </button>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const showNav = user && !['/login', '/register', '/admin'].some(path => location.pathname.startsWith(path));

  // Redirect logged-in users away from auth pages
  if (!loading && user && ['/login', '/register', '/forgot-password'].includes(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="pb-24"
        >
          <Routes>
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/product" element={<ProtectedRoute><Product /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/recharge" element={<ProtectedRoute><Recharge /></ProtectedRoute>} />
            <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
            <Route path="/check-in" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
            <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
            <Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
            <Route path="/my-investments" element={<ProtectedRoute><MyInvestments /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {showNav && <BottomNav />}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Listen to profile changes
        const unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
          setLoading(false);
        }, (error) => {
          console.error('Profile fetch error:', {
            error: error.message,
            operationType: 'get',
            path: `users/${firebaseUser.uid}`,
            authInfo: {
              userId: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
              isAnonymous: firebaseUser.isAnonymous,
            }
          });
          setLoading(false);
        });
        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const adminEmails = ["mrkhatab112@gmail.com", "mohdkhatab@outlook.com", "admin@growvix.com"];
  const isAdmin = profile?.role === UserRole.ADMIN || (user?.email && adminEmails.includes(user.email));

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
      <ToastProvider>
        <Router>
          <AppLayout />
        </Router>
      </ToastProvider>
    </AuthContext.Provider>
  );
}
