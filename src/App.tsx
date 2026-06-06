import React, { useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Background } from './components/UI/Background';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReportForm from './pages/ReportForm';

function MainLayout({ children }: { children: React.ReactNode }) {
  const { isRTL } = useStore();
  
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = isRTL ? 'ar' : 'en';
  }, [isRTL]);

  return (
    <div className="min-h-screen relative">
      <Background />
      {children}
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  const isBrowserDirectMode = 
    window.location.hostname.includes("github.io") ||
    window.location.hostname.includes("gitlab.io") ||
    window.location.hostname.includes("netlify.app") ||
    window.location.hostname.includes("vercel.app") ||
    !(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname.includes("run.app"));

  const Router = isBrowserDirectMode ? HashRouter : BrowserRouter;

  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element = {
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/report" 
            element = {
              <ProtectedRoute>
                <ReportForm />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
