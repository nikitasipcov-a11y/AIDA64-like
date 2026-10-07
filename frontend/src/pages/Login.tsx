import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [need2fa, setNeed2fa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, need2fa ? totpCode : undefined);
      navigate('/');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 403 || detail === '2FA code required') {
        setNeed2fa(true);
        setError('Введите код из приложения-аутентификатора');
      } else {
        setError(detail || 'Ошибка входа');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur rounded-2xl shadow-2xl border border-slate-700 p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Activity className="w-10 h-10 text-cyan-400" />
          <h1 className="text-3xl font-bold text-white">HomePulse</h1>
        </div>
        <h2 className="text-xl text-slate-300 text-center mb-6">Вход в систему</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          {need2fa && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Код 2FA</label>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
                maxLength={6}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 tracking-widest text-center text-lg"
                placeholder="000000"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-400 text-sm">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-cyan-400 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
