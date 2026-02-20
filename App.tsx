import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Clients from './pages/Clients';
import Budgets from './pages/Budgets';
import ProposalView from './pages/ProposalView';
import Login from './pages/Login';
import { initializeDB } from './services/dataService';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await initializeDB();

      // Check active session
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsLoading(false);

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAuthenticated(!!session);
      });

      return () => subscription.unsubscribe();
    };
    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  if (isLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Carregando...</div>;

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />

        {/* Proposal Print Route (No Layout) */}
        <Route path="/proposal/:id" element={<ProposalView />} />

        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <Layout onLogout={handleLogout}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/budgets" element={<Budgets />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </HashRouter>
  );
};

export default App;