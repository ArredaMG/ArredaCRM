import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArredaLogo } from '../constants';
import { Lock } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Credenciais inválidas ou erro no login.');
      setLoading(false);
    } else {
      navigate('/');
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
            <label className="block text-sm font-bold text-slate-800 mb-2">E-mail</label>
            <input
              type="email"
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-400 bg-slate-50 text-slate-900 font-semibold focus:border-amber-600 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
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
              required
            />
          </div>

          {error && <p className="text-red-600 font-bold text-sm text-center bg-red-50 p-2 rounded border border-red-200">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white font-bold py-3 rounded-lg hover:bg-amber-700 transition-colors flex justify-center items-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : <><Lock size={18} /> Entrar</>}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400">
          &copy; 2026 Arreda Produções. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};

export default Login;