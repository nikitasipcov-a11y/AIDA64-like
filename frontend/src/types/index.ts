export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  is_2fa_enabled: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Device {
  id: number;
  name: string;
  hostname: string | null;
  device_type: string;
  os_name: string | null;
  os_version: string | null;
  is_online: boolean;
  last_seen: string | null;
  hardware_info: any;
  group_name: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  api_key?: string;
}

export interface Metric {
  id: number;
  device_id: number;
  timestamp: string;
  cpu_percent: number | null;
  cpu_temp: number | null;
  cpu_freq: number | null;
  mem_percent: number | null;
  mem_used_gb: number | null;
  mem_total_gb: number | null;
  disk_percent: number | null;
  disk_used_gb: number | null;
  disk_total_gb: number | null;
  net_sent_mb: number | null;
  net_recv_mb: number | null;
  gpu_percent: number | null;
  gpu_temp: number | null;
  gpu_mem_percent: number | null;
  extra: any;
}

export interface LatestMetrics {
  device_id: number;
  device_name: string;
  is_online: boolean;
  last_seen: string | null;
  metrics: Metric | null;
  hardware_info: any;
}
