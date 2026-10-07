import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, fullName || undefined);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка регистрации');
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
        <h2 className="text-xl text-slate-300 text-center mb-6">Регистрация</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Имя</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="Иван Иванов"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Пароль (мин. 8 символов)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Регистрация...' : 'Создать аккаунт'}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-400 text-sm">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-cyan-400 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
