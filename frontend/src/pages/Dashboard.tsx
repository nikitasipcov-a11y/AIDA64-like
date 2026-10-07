import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { devicesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import DeviceCard from '../components/DeviceCard';
import type { Device, LatestMetrics } from '../types';
import { Plus, Activity, LogOut, Settings } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<number, LatestMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('pc');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const load = async () => {
    try {
      const { data } = await devicesApi.list();
      setDevices(data);
      // load latest metrics for each
      const map: Record<number, LatestMetrics> = {};
      await Promise.all(
        data.map(async (d: Device) => {
          try {
            const res = await devicesApi.latestMetrics(d.id);
            map[d.id] = res.data;
          } catch {}
        })
      );
      setMetricsMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await devicesApi.create({ name: newName, device_type: newType });
      setCreatedKey(data.api_key || null);
      setNewName('');
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-cyan-400" />
            <span className="text-xl font-bold text-white">HomePulse</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">{user?.email}</span>
            <Link to="/settings" className="p-2 hover:bg-slate-700 rounded-lg transition">
              <Settings className="w-5 h-5 text-slate-400" />
            </Link>
            <button onClick={logout} className="p-2 hover:bg-slate-700 rounded-lg transition">
              <LogOut className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Устройства</h1>
            <p className="text-slate-400 text-sm mt-1">
              {devices.filter((d) => d.is_online).length} online / {devices.length} всего
            </p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setCreatedKey(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            Добавить
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-20">Загрузка...</div>
        ) : devices.length === 0 ? (
          <div className="text-center py-20">
            <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">Пока нет устройств</p>
            <button
              onClick={() => setShowAdd(true)}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
            >
              Добавить первое устройство
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((d) => (
              <DeviceCard key={d.id} device={d} metrics={metricsMap[d.id]} />
            ))}
          </div>
        )}
      </main>

      {/* Add Device Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Новое устройство</h2>

            {createdKey ? (
              <div>
                <p className="text-emerald-400 mb-3">Устройство создано!</p>
                <p className="text-sm text-slate-400 mb-2">
                  Скопируйте API-ключ и вставьте его в агент:
                </p>
                <code className="block bg-slate-900 p-3 rounded-lg text-cyan-300 text-sm break-all mb-4">
                  {createdKey}
                </code>
                <p className="text-xs text-slate-500 mb-4">
                  Этот ключ показывается только один раз.
                </p>
                <button
                  onClick={() => setShowAdd(false)}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
                >
                  Готово
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Название</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Мой ПК"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Тип</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="pc">ПК</option>
                    <option value="server">Сервер</option>
                    <option value="laptop">Ноутбук</option>
                    <option value="iot">IoT</option>
                    <option value="network">Сеть</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
                  >
                    Создать
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
