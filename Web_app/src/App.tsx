import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Pricing from './pages/Pricing';
import Support from './pages/Support';
import Downloads from './pages/Downloads';
import Features from './pages/Features';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/support" element={<Support />} />
        <Route path="/features" element={<Features />} />
        <Route path="/downloads" element={<Downloads />} />

        {/* Protected Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

