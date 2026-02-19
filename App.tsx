import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Budgets from './pages/Budgets';
import ProposalView from './pages/ProposalView';
import Login from './pages/Login';
import { initializeDB } from './services/dataService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize "DB"
    const init = async () => {
      await initializeDB();

      // Check session
      const session = localStorage.getItem('arreda_session');
      if (session) {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const handleLogin = (role: string) => {
    localStorage.setItem('arreda_session', role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('arreda_session');
    setIsAuthenticated(false);
  };

  if (isLoading) return null;

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />

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