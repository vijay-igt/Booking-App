import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import UserHome from './pages/UserHome';
import SeatSelection from './pages/SeatSelection';
import BookingHistory from './pages/BookingHistory';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';

import MovieDetails from './pages/MovieDetails';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
            <Route path="/booking/:showtimeId" element={<SeatSelection />} />
            <Route path="/history" element={<BookingHistory />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={<UserHome />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
