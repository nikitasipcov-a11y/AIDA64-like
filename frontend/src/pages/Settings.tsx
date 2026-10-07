import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { ArrowLeft, Shield, ShieldCheck, ShieldOff } from 'lucide-react';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [secret, setSecret] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const setup2fa = async () => {
    setError('');
    try {
      const { data } = await authApi.setup2fa();
      setSecret(data.secret);
      setQrUri(data.qr_code_uri);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка');
    }
  };

  const enable2fa = async () => {
    setError('');
    try {
      await authApi.enable2fa(code);
      setMessage('2FA успешно включена!');
      setSecret(null);
      setQrUri(null);
      setCode('');
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Неверный код');
    }
  };

  const disable2fa = async () => {
    setError('');
    try {
      await authApi.disable2fa({ totp_code: code, password });
      setMessage('2FA отключена');
      setCode('');
      setPassword('');
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка');
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-slate-700 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <h1 className="text-xl font-bold text-white">Настройки</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Двухфакторная аутентификация (2FA)</h2>
          </div>

          {message && (
            <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-300 text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {user?.is_2fa_enabled ? (
            <div>
              <div className="flex items-center gap-2 text-emerald-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
                <span>2FA включена</span>
              </div>
              <p className="text-sm text-slate-400 mb-4">Для отключения введите код и пароль:</p>
              <div className="space-y-3 max-w-sm">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Код 2FA"
                  maxLength={6}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                />
                <button
                  onClick={disable2fa}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg"
                >
                  <ShieldOff className="w-4 h-4" />
                  Отключить 2FA
                </button>
              </div>
            </div>
          ) : secret ? (
            <div>
              <p className="text-sm text-slate-400 mb-3">
                Отсканируйте QR-код в Google Authenticator / Authy или введите секрет вручную:
              </p>
              <code className="block bg-slate-900 p-3 rounded-lg text-cyan-300 text-sm mb-4 break-all">
                {secret}
              </code>
              {qrUri && (
                <p className="text-xs text-slate-500 mb-4">
                  URI: <span className="break-all">{qrUri}</span>
                </p>
              )}
              <div className="flex gap-3 max-w-sm">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Код из приложения"
                  maxLength={6}
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                />
                <button
                  onClick={enable2fa}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
                >
                  Подтвердить
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-400 mb-4">
                Рекомендуется включить 2FA для защиты аккаунта.
              </p>
              <button
                onClick={setup2fa}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
              >
                Настроить 2FA
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
