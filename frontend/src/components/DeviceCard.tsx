import { Link } from 'react-router-dom';
import { Server, Laptop, Cpu, HardDrive, Wifi, Thermometer } from 'lucide-react';
import type { Device, LatestMetrics } from '../types';

interface Props {
  device: Device;
  metrics?: LatestMetrics | null;
}

const typeIcons: Record<string, any> = {
  pc: Cpu,
  server: Server,
  laptop: Laptop,
  iot: Wifi,
  network: Wifi,
};

export default function DeviceCard({ device, metrics }: Props) {
  const Icon = typeIcons[device.device_type] || Server;
  const m = metrics?.metrics;

  return (
    <Link
      to={`/devices/${device.id}`}
      className="block bg-slate-800/70 hover:bg-slate-750 border border-slate-700 hover:border-cyan-500/50 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-cyan-500/10"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${device.is_online ? 'bg-cyan-500/20' : 'bg-slate-700'}`}>
            <Icon className={`w-6 h-6 ${device.is_online ? 'text-cyan-400' : 'text-slate-500'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{device.name}</h3>
            <p className="text-xs text-slate-400">{device.hostname || device.device_type}</p>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 text-xs rounded-full ${
            device.is_online
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-slate-600/50 text-slate-400'
          }`}
        >
          {device.is_online ? 'Online' : 'Offline'}
        </span>
      </div>

      {m ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span className="text-slate-300">CPU</span>
            <span className="ml-auto font-mono text-white">{m.cpu_percent?.toFixed(0) ?? '—'}%</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-purple-400" />
            <span className="text-slate-300">RAM</span>
            <span className="ml-auto font-mono text-white">{m.mem_percent?.toFixed(0) ?? '—'}%</span>
          </div>
          {m.cpu_temp != null && (
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <span className="text-slate-300">CPU</span>
              <span className="ml-auto font-mono text-white">{m.cpu_temp.toFixed(0)}°</span>
            </div>
          )}
          {m.gpu_temp != null && (
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-400" />
              <span className="text-slate-300">GPU</span>
              <span className="ml-auto font-mono text-white">{m.gpu_temp.toFixed(0)}°</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300">Disk</span>
            <span className="ml-auto font-mono text-white">{m.disk_percent?.toFixed(0) ?? '—'}%</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Нет данных</p>
      )}
    </Link>
  );
}
