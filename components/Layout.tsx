import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArredaLogo } from '../constants';
import { LayoutDashboard, Users, FileText, LogOut, Menu, X, DollarSign, BookUser } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Leads', path: '/leads' },
    { icon: BookUser, label: 'Clientes', path: '/clients' },
    { icon: FileText, label: 'Orçamentos', path: '/budgets' },
    { icon: DollarSign, label: 'Tabela de Preços', path: '/pricetable' },
  ];

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl">
        <div className="p-6 border-b border-slate-700 flex justify-center">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <ArredaLogo className="w-40 text-white fill-white" />
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-amber-600 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Sidebar Overlay */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-20">
          <Link to="/">
            <ArredaLogo className="w-32 text-white" />
          </Link>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900 z-10 pt-20 px-4 md:hidden">
            <nav className="space-y-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-lg text-lg ${isActive ? 'bg-amber-600 text-white' : 'text-slate-300'
                    }`
                  }
                >
                  <item.icon size={24} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full px-4 py-3 text-red-400 text-lg"
              >
                <LogOut size={24} />
                <span>Sair</span>
              </button>
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;