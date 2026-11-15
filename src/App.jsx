import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardHub from './pages/DashboardHub';
import FleetPage from './pages/FleetPage';
import StaffPage from './pages/StaffPage';
import AdminPage from './pages/AdminPage';

function Navbar() {
  const auth = useAuth();
  const user = auth?.user || auth?.session?.user;
  const signOut = auth?.signOut;
  const location = useLocation();

  if (location.pathname === '/login') return null;

  const navItems = [
    { path: '/', label: 'Hub' },
    { path: '/fleet', label: 'Fleet & Routes' },
    { path: '/staff', label: 'Staff & Stipends' },
    { path: '/admin', label: 'Admin' },
  ];

  return (
    <header className="h-16 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40 no-print">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center">
            <img
              src="/jmcsslogo.png"
              alt="JMCSS Transportation"
              className="h-8 w-auto object-contain"
            />
          </div>
          <span className="font-bold text-white tracking-tight hidden sm:inline">
            JMCSS Transportation
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {user?.email && (
          <span className="text-xs text-slate-400 hidden md:inline">
            {user.email}
          </span>
        )}
        {signOut && (
          <button
            onClick={signOut}
            className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0f172a] text-slate-100">
          <Navbar />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardHub />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fleet"
              element={
                <ProtectedRoute>
                  <FleetPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute>
                  <StaffPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}