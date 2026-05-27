import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, UserRole } from './types';
import { handleFirestoreError, OperationType } from './lib/error-handler';

// Components
import BottomNav from './components/BottomNav';
import LandingPage from './pages/LandingPage';
import Home from './pages/Home';
import Product from './pages/Product';
import Team from './pages/Team';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Recharge from './pages/Recharge';
import Withdraw from './pages/Withdraw';
import CheckIn from './pages/CheckIn';
import RedeemCode from './pages/RedeemCode';
import History from './pages/History';
import Support from './pages/Support';
import About from './pages/About';
import Rules from './pages/Rules';
import MyInvestments from './pages/MyInvestments';
import AdminDashboard from './pages/AdminDashboard';
import AdminAddPlan from './pages/AdminAddPlan';
import Checkout from './pages/Checkout';
import ForgotPassword from './pages/ForgotPassword';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert } from 'lucide-react';

// Context
interface AuthContextType {
  user: { uid: string; email: string; name?: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (token: string, userData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  login: () => {},
  logout: () => {},
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
          onClick={() => {
            localStorage.removeItem('GROWVIX_TOKEN');
            window.location.href = '/login';
          }}
          className="bg-[#ff0000] text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-red-100 active:scale-95 transition-transform"
        >
          Logout
        </button>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const showNav = user && !['/login', '/register', '/admin', '/checkout', '/website'].some(path => location.pathname.startsWith(path)) && location.pathname !== '/';

  // Redirect logged-in users away from auth pages
  if (!loading && user && ['/login', '/register', '/forgot-password'].includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="pb-20">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/website" element={<LandingPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/product" element={<ProtectedRoute><Product /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/recharge" element={<ProtectedRoute><Recharge /></ProtectedRoute>} />
          <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
          <Route path="/check-in" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
          <Route path="/redeem-code" element={<ProtectedRoute><RedeemCode /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
          <Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
          <Route path="/my-investments" element={<ProtectedRoute><MyInvestments /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/add-plan" element={<ProtectedRoute adminOnly><AdminAddPlan /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </div>
      {showNav && <BottomNav />}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<{ uid: string; email: string; name?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [unsub, setUnsub] = useState<(() => void) | null>(null);

  const startSnapshot = (uid: string) => {
    if (unsub) unsub();
    const u = onSnapshot(doc(db, 'users', uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    });
    setUnsub(() => u);
  };

  useEffect(() => {
    const token = localStorage.getItem('GROWVIX_TOKEN');

    const init = async () => {
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (data.success) {
            setUser({ uid: data.user.uid, email: data.user.email, name: data.user.name });
            setProfile(data.user);
            startSnapshot(data.user.uid);
          } else {
            localStorage.removeItem('GROWVIX_TOKEN');
          }
        } catch (error) {
          console.error("Auth init error:", error);
        }
      }
      setLoading(false);
    };

    init();
    return () => { if (unsub) unsub(); };
  }, []);

  const login = (token: string, userData: any) => {
    localStorage.setItem('GROWVIX_TOKEN', token);
    setUser({ uid: userData.uid, email: userData.email, name: userData.name });
    setProfile(userData);
    startSnapshot(userData.uid);
  };

  const logout = () => {
    localStorage.removeItem('GROWVIX_TOKEN');
    if (unsub) unsub();
    setUnsub(null);
    setUser(null);
    setProfile(null);
  };

  const isAdmin = profile?.role === UserRole.ADMIN;

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, profile, loading, isAdmin, login, logout }}>
        <ToastProvider>
          <Router>
            <AppLayout />
          </Router>
        </ToastProvider>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}
