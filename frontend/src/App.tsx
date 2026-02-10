import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import UserHome from './pages/UserHome';
import SeatSelection from './pages/SeatSelection';
import BookingHistory from './pages/BookingHistory';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import MovieDetails from './pages/MovieDetails';
import WalletPage from './pages/WalletPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useWebSocketService } from './services/websocketService';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!auth.token) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && auth.user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};



const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <WebSocketWrapper>
          <div className="min-h-screen bg-[#0a0a0b] text-white font-sans">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />

              {/* Public Routes */}
              <Route path="/" element={<UserHome />} />
              <Route path="/movie/:id" element={<MovieDetails />} />
              <Route path="/booking/:showtimeId" element={<SeatSelection />} />

              {/* Protected Routes */}
              <Route path="/history" element={<ProtectedRoute><BookingHistory /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </WebSocketWrapper>
        <ToastContainer />
      </AuthProvider>
    </Router>
  );
};

const WebSocketWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useWebSocketService({});
  return <>{children}</>;
};

export default App;
