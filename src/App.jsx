import React from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import { supabase } from './supabaseClient';

// Import your core transportation dashboard components
import ArrivalPerformanceHeatMap from './components/ArrivalPerformanceHeatMap';
import AbsenceReport from './components/AbsenceReport';
import ArrivalPerformanceUploader from './components/ArrivalPerformanceUploader';
import ArrivalPerformanceManager from './components/ArrivalPerformanceManager';

function NavigationHeader() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-md">
      <div className="flex items-center space-x-3">
        <img
          src="/jmcsslogo.png"
          alt="JMCSS Logo"
          className="h-10 w-auto object-contain"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <h1 className="text-xl font-bold text-slate-100">JMCSS Transportation Operations</h1>
      </div>

      <div className="flex items-center space-x-6">
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link to="/" className="text-slate-300 hover:text-white transition-colors">Heatmap</Link>
          <Link to="/absences" className="text-slate-300 hover:text-white transition-colors">Absence Logs</Link>
          <Link to="/uploader" className="text-slate-300 hover:text-white transition-colors">Data Uploader</Link>
          <Link to="/manager" className="text-slate-300 hover:text-white transition-colors">Run Manager</Link>
        </nav>

        {/* Secure Sign Out Button */}
        <button
          onClick={handleLogout}
          className="bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
                  <NavigationHeader />
                  <main className="flex-1 p-6">
                    <Routes>
                      <Route path="/" element={<ArrivalPerformanceHeatMap />} />
                      <Route path="/absences" element={<AbsenceReport />} />
                      <Route path="/uploader" element={<ArrivalPerformanceUploader />} />
                      <Route path="/manager" element={<ArrivalPerformanceManager />} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}