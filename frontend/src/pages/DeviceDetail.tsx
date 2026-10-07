import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { devicesApi } from '../api/client';
import type { Device, Metric, LatestMetrics } from '../types';
import {
  ArrowLeft, Cpu, HardDrive, Thermometer, Network, Server, MemoryStick, CircuitBoard, Monitor
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const [latest, setLatest] = useState<LatestMetrics | null>(null);
  const [history, setHistory] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    try {
      const [devRes, latRes, histRes] = await Promise.all([
        devicesApi.get(Number(id)),
        devicesApi.latestMetrics(Number(id)),
        devicesApi.metricsHistory(Number(id), 60),
      ]);
      setDevice(devRes.data);
      setLatest(latRes.data);
      setHistory(histRes.data.reverse());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Загрузка...</div>;
  }

  if (!device) {
    return <div className="min-h-screen flex items-center justify-center text-red-400">Устройство не найдено</div>;
  }

  const m = latest?.metrics;
  const chartData = history.map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    cpu: h.cpu_percent,
    mem: h.mem_percent,
    temp: h.cpu_temp,
  }));

  const hw = device.hardware_info || {};
  const mb = hw.motherboard || {};
  const bios = hw.bios || {};
  const ramModules = hw.ram_modules || [];
  const gpus = hw.gpu || [];
  const cpuDetails = hw.cpu_details || {};
  const voltages = hw.voltages || [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-slate-700 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {device.name}
              <span className={`px-2 py-0.5 text-xs rounded-full ${device.is_online ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/50 text-slate-400'}`}>
                {device.is_online ? 'Online' : 'Offline'}
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              {device.hostname} · {device.os_name} {device.os_version}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricBox icon={Cpu} label="CPU" value={m?.cpu_percent} unit="%" color="blue" />
          <MetricBox icon={HardDrive} label="RAM" value={m?.mem_percent} unit="%" color="purple"
            sub={m ? `${m.mem_used_gb?.toFixed(1)} / ${m.mem_total_gb?.toFixed(1)} GB` : undefined} />
          <MetricBox icon={Thermometer} label="Темп. CPU" value={m?.cpu_temp} unit="°C" color="orange" />
          <MetricBox icon={Monitor} label="Темп. GPU" value={m?.gpu_temp} unit="°C" color="red"
            sub={m?.gpu_percent != null ? `Нагрузка ${m.gpu_percent.toFixed(0)}%` : undefined} />
          <MetricBox icon={HardDrive} label="Диск" value={m?.disk_percent} unit="%" color="amber"
            sub={m ? `${m.disk_used_gb?.toFixed(0)} / ${m.disk_total_gb?.toFixed(0)} GB` : undefined} />
        </div>

        {/* Charts */}
        {chartData.length > 1 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">История нагрузки</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Line type="monotone" dataKey="cpu" name="CPU %" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="mem" name="RAM %" stroke="#a78bfa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ========== Detailed Hardware (AIDA style) ========== */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-8">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            Подробная информация о железе
          </h2>

          {/* CPU */}
          <Section title="Процессор" icon={Cpu}>
            <InfoRow label="Модель" value={hw.cpu?.name || cpuDetails.name || '—'} />
            <InfoRow label="Производитель" value={cpuDetails.manufacturer} />
            <InfoRow label="Ядра / Потоки" value={
              `${hw.cpu?.cores_physical ?? cpuDetails.cores ?? '—'} физ. / ${hw.cpu?.cores_logical ?? cpuDetails.threads ?? '—'} лог.`
            } />
            <InfoRow label="Частота" value={hw.cpu?.hz || (cpuDetails.max_clock_mhz ? `${cpuDetails.max_clock_mhz} MHz` : null)} />
            <InfoRow label="Сокет" value={cpuDetails.socket} />
            <InfoRow label="Кэш L2 / L3" value={
              cpuDetails.l2_cache_kb || cpuDetails.l3_cache_kb
                ? `${cpuDetails.l2_cache_kb ?? '—'} KB / ${cpuDetails.l3_cache_kb ?? '—'} KB`
                : null
            } />
          </Section>

          {/* Motherboard */}
          {(mb.manufacturer || mb.product) && (
            <Section title="Материнская плата" icon={CircuitBoard}>
              <InfoRow label="Производитель" value={mb.manufacturer} />
              <InfoRow label="Модель" value={mb.product} />
              <InfoRow label="Версия" value={mb.version} />
              <InfoRow label="Серийный номер" value={mb.serial} />
              {bios.version && <InfoRow label="BIOS" value={`${bios.manufacturer || ''} ${bios.version}`} />}
              {bios.release_date && <InfoRow label="Дата BIOS" value={bios.release_date} />}
            </Section>
          )}

          {/* RAM Modules */}
          <Section title="Оперативная память" icon={MemoryStick}>
            <InfoRow label="Всего" value={hw.memory?.total_gb ? `${hw.memory.total_gb} GB` : null} />
            {ramModules.length > 0 ? (
              <div className="mt-3 space-y-3">
                {ramModules.map((ram: any, i: number) => (
                  <div key={i} className="bg-slate-900/50 rounded-lg p-3 text-sm">
                    <div className="font-medium text-white mb-1">
                      Модуль {i + 1} {ram.device_locator ? `(${ram.device_locator})` : ''}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
                      <span className="text-slate-500">Производитель:</span>
                      <span>{ram.manufacturer || '—'}</span>
                      <span className="text-slate-500">Part Number:</span>
                      <span>{ram.part_number || '—'}</span>
                      <span className="text-slate-500">Объём:</span>
                      <span>{ram.capacity_gb ? `${ram.capacity_gb} GB` : '—'}</span>
                      <span className="text-slate-500">Частота:</span>
                      <span>{ram.speed_mhz ? `${ram.speed_mhz} MHz` : '—'}</span>
                      <span className="text-slate-500">Банк:</span>
                      <span>{ram.bank || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm mt-1">Детальная информация о модулях недоступна</p>
            )}
          </Section>

          {/* GPU */}
          <Section title="Видеокарта" icon={Monitor}>
            {/* Live GPU metrics */}
            {(m?.gpu_temp != null || m?.gpu_percent != null) && (
              <div className="mb-3 bg-slate-900/50 rounded-lg p-3 text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                {m?.gpu_temp != null && (
                  <>
                    <span className="text-slate-500">Температура:</span>
                    <span className="text-orange-400 font-medium">{m.gpu_temp} °C</span>
                  </>
                )}
                {m?.gpu_percent != null && (
                  <>
                    <span className="text-slate-500">Нагрузка:</span>
                    <span className="text-white">{m.gpu_percent.toFixed(0)} %</span>
                  </>
                )}
                {m?.gpu_mem_percent != null && (
                  <>
                    <span className="text-slate-500">Память GPU:</span>
                    <span className="text-white">{m.gpu_mem_percent.toFixed(0)} %</span>
                  </>
                )}
              </div>
            )}
            {gpus.length > 0 ? (
              gpus.map((gpu: any, i: number) => (
                <div key={i} className="mb-3 last:mb-0">
                  <InfoRow label="Название" value={gpu.name} />
                  <InfoRow label="Память" value={gpu.adapter_ram_gb ? `${gpu.adapter_ram_gb} GB` : null} />
                  <InfoRow label="Драйвер" value={gpu.driver_version} />
                  <InfoRow label="Режим" value={gpu.video_mode} />
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">Информация о видеокарте недоступна</p>
            )}
          </Section>

          {/* Voltages */}
          {voltages.length > 0 && (
            <Section title="Напряжения" icon={CircuitBoard}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {voltages.map((v: any, i: number) => (
                  <div key={i} className="bg-slate-900/50 rounded px-3 py-2">
                    <span className="text-slate-500">{v.name}: </span>
                    <span className="text-white font-mono">{v.value} V</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Disks */}
          {hw.disks?.length > 0 && (
            <Section title="Диски" icon={HardDrive}>
              {hw.disks.map((d: any, i: number) => (
                <InfoRow
                  key={i}
                  label={d.device}
                  value={`${d.mountpoint} — ${d.total_gb} GB · ${d.fstype}`}
                />
              ))}
            </Section>
          )}

          {/* Network */}
          {hw.network_interfaces?.length > 0 && (
            <Section title="Сеть" icon={Network}>
              {hw.network_interfaces.map((n: any, i: number) => (
                <InfoRow key={i} label={n.name} value={n.ip} />
              ))}
            </Section>
          )}
        </div>
      </main>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-slate-300 font-medium mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-cyan-400" />
        {title}
      </h3>
      <div className="space-y-1.5 text-sm pl-6">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex gap-3">
      <span className="text-slate-500 min-w-[140px]">{label}:</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  unit,
  color,
  sub,
}: {
  icon: any;
  label: string;
  value: number | null | undefined;
  unit: string;
  color: string;
  sub?: string;
}) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    orange: 'text-orange-400 bg-orange-500/20',
    amber: 'text-amber-400 bg-amber-500/20',
    red: 'text-red-400 bg-red-500/20',
  };
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-slate-400 text-sm">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">
        {value != null ? value.toFixed(value < 10 ? 1 : 0) : '—'}
        <span className="text-lg text-slate-400 ml-1">{unit}</span>
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
