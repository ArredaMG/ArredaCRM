import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArredaLogo } from '../constants';
import { Lock } from 'lucide-react';

interface LoginProps {
  onLogin: (role: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      onLogin('admin');
      navigate('/');
    } else {
      setError('Credenciais inválidas. Tente admin/admin');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <ArredaLogo className="w-48 text-slate-900" />
        </div>
        
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Acesso Restrito</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Usuário</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-400 bg-slate-50 text-slate-900 font-semibold focus:border-amber-600 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Senha</label>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-400 bg-slate-50 text-slate-900 font-semibold focus:border-amber-600 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••"
            />
          </div>

          {error && <p className="text-red-600 font-bold text-sm text-center bg-red-50 p-2 rounded border border-red-200">{error}</p>}

          <button
            type="submit"
            className="w-full bg-amber-600 text-white font-bold py-3 rounded-lg hover:bg-amber-700 transition-colors flex justify-center items-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
          >
            <Lock size={18} /> Entrar
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-slate-400">
          &copy; 2024 Arreda Produções. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};

export default Login;