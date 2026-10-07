#!/usr/bin/env python3
"""
HomePulse Agent — collects detailed system metrics and hardware info (AIDA-style).
"""

import os
import time
import socket
import platform
import psutil
import httpx
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv("HOMEPULSE_API_URL", "http://localhost:8000/api/v1")
API_KEY = os.getenv("HOMEPULSE_API_KEY", "")
INTERVAL = int(os.getenv("HOMEPULSE_INTERVAL", "10"))


def _lhm_sensors():
    """Optional: yield sensors if LibreHardwareMonitor is already running (no install required for core features)."""
    if platform.system() != "Windows":
        return
    try:
        import wmi
    except Exception:
        return
    for ns in ("root\\LibreHardwareMonitor", "root\\OpenHardwareMonitor"):
        try:
            w = wmi.WMI(namespace=ns)
            for sensor in w.Sensor():
                yield sensor
        except Exception:
            continue


def get_cpu_temp():
    """
    CPU temperature without requiring extra software.
    Order: Linux sensors → optional LHM (if already running) → Windows ACPI thermal zones.
    Note: on Windows without LHM, ACPI often reports motherboard zone, not precise CPU package.
    """
    # 1. Linux — works out of the box via kernel sensors
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            for name in ("k10temp", "coretemp", "cpu_thermal", "acpitz", "zenpower"):
                if name in temps and temps[name]:
                    for entry in temps[name]:
                        label = (entry.label or "").lower()
                        if any(x in label for x in ("tctl", "package", "tdie", "cpu")):
                            return round(entry.current, 1)
                    return round(temps[name][0].current, 1)
            for entries in temps.values():
                if entries:
                    return round(entries[0].current, 1)
    except Exception:
        pass

    if platform.system() != "Windows":
        return None

    # 2. Optional: LibreHardwareMonitor if user already has it running (bonus accuracy)
    cpu_candidates = []
    for sensor in _lhm_sensors():
        try:
            if (sensor.SensorType or "") != "Temperature":
                continue
            name = (sensor.Name or "").lower()
            val = sensor.Value
            if val is None:
                continue
            temp = float(val)
            if not (0 < temp < 150):
                continue
            if any(x in name for x in ("package", "tctl", "tdie")):
                cpu_candidates.append((0, temp))
            elif any(x in name for x in ("cpu", "core", "ccd")):
                cpu_candidates.append((1, temp))
        except Exception:
            continue
    if cpu_candidates:
        cpu_candidates.sort(key=lambda x: x[0])
        return round(cpu_candidates[0][1], 1)

    # 3. Built-in Windows ACPI thermal zones (no extra software)
    # May be motherboard / thermal zone rather than CPU package — best effort
    try:
        import wmi
        w = wmi.WMI(namespace="root\\wmi")
        best = None
        for sensor in w.MSAcpi_ThermalZoneTemperature():
            raw = sensor.CurrentTemperature
            if not raw:
                continue
            celsius = (raw / 10.0) - 273.15
            if 20 < celsius < 120:
                # Prefer the highest plausible reading (CPU zone is usually warmer)
                if best is None or celsius > best:
                    best = celsius
        if best is not None:
            return round(best, 1)
    except Exception:
        pass

    # 4. Try Win32_TemperatureProbe (rarely populated)
    try:
        import wmi
        c = wmi.WMI()
        for probe in c.Win32_TemperatureProbe():
            # CurrentReading is in tenths of Kelvin when present
            reading = getattr(probe, "CurrentReading", None)
            if reading and reading > 0:
                celsius = (reading / 10.0) - 273.15
                if 20 < celsius < 120:
                    return round(celsius, 1)
    except Exception:
        pass

    return None


def get_gpu_metrics():
    """
    GPU temp / load / mem — no LibreHardwareMonitor required.
    Primary: nvidia-smi (comes with NVIDIA drivers).
    Optional bonus: LHM if already running (helps AMD / more sensors).
    """
    result = {"gpu_temp": None, "gpu_percent": None, "gpu_mem_percent": None}

    # 1. nvidia-smi — standard with NVIDIA drivers, no extra download
    try:
        import subprocess
        out = subprocess.check_output(
            [
                "nvidia-smi",
                "--query-gpu=temperature.gpu,utilization.gpu,utilization.memory",
                "--format=csv,noheader,nounits",
            ],
            timeout=4,
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        if out:
            line = out.splitlines()[0]
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 1 and parts[0] and parts[0] != "[N/A]":
                result["gpu_temp"] = float(parts[0])
            if len(parts) >= 2 and parts[1] and parts[1] != "[N/A]":
                result["gpu_percent"] = float(parts[1])
            if len(parts) >= 3 and parts[2] and parts[2] != "[N/A]":
                result["gpu_mem_percent"] = float(parts[2])
    except Exception:
        pass

    # 2. Optional LHM only if still missing data (AMD GPUs etc.)
    if result["gpu_temp"] is None or result["gpu_percent"] is None:
        core_temps, other_temps, core_loads, mem_loads = [], [], [], []
        for sensor in _lhm_sensors():
            try:
                name = (sensor.Name or "").lower()
                stype = sensor.SensorType or ""
                val = sensor.Value
                if val is None:
                    continue
                fval = float(val)
                is_gpu = any(
                    k in name
                    for k in ("gpu", "nvidia", "radeon", "geforce", "rtx", "gtx", "rx ", "amd")
                )
                if not is_gpu:
                    continue
                if stype == "Temperature":
                    if "core" in name and "memory" not in name:
                        core_temps.append(fval)
                    else:
                        other_temps.append(fval)
                elif stype == "Load":
                    if "memory" in name or "mem" in name:
                        mem_loads.append(fval)
                    else:
                        core_loads.append(fval)
            except Exception:
                continue
        if result["gpu_temp"] is None:
            if core_temps:
                result["gpu_temp"] = round(core_temps[0], 1)
            elif other_temps:
                result["gpu_temp"] = round(other_temps[0], 1)
        if result["gpu_percent"] is None and core_loads:
            result["gpu_percent"] = round(core_loads[0], 1)
        if result["gpu_mem_percent"] is None and mem_loads:
            result["gpu_mem_percent"] = round(mem_loads[0], 1)

    return result


def get_windows_hardware():
    """Detailed hardware info via WMI (Windows only)."""
    info = {
        "motherboard": {},
        "bios": {},
        "ram_modules": [],
        "gpu": [],
        "cpu_details": {},
        "voltages": [],
    }

    try:
        import wmi
        c = wmi.WMI()

        # Motherboard
        try:
            for board in c.Win32_BaseBoard():
                info["motherboard"] = {
                    "manufacturer": board.Manufacturer,
                    "product": board.Product,
                    "serial": board.SerialNumber,
                    "version": board.Version,
                }
                break
        except Exception:
            pass

        # BIOS
        try:
            for bios in c.Win32_BIOS():
                info["bios"] = {
                    "manufacturer": bios.Manufacturer,
                    "version": bios.SMBIOSBIOSVersion,
                    "release_date": str(bios.ReleaseDate)[:8] if bios.ReleaseDate else None,
                }
                break
        except Exception:
            pass

        # RAM modules (detailed)
        try:
            for mem in c.Win32_PhysicalMemory():
                module = {
                    "manufacturer": (mem.Manufacturer or "").strip(),
                    "part_number": (mem.PartNumber or "").strip(),
                    "capacity_gb": round(int(mem.Capacity) / (1024 ** 3), 2) if mem.Capacity else None,
                    "speed_mhz": int(mem.Speed) if mem.Speed else None,
                    "bank": mem.BankLabel,
                    "device_locator": mem.DeviceLocator,
                    "form_factor": mem.FormFactor,
                    "type": mem.SMBIOSMemoryType,
                }
                info["ram_modules"].append(module)
        except Exception:
            pass

        # GPU / Video cards
        try:
            for gpu in c.Win32_VideoController():
                if gpu.Name:
                    info["gpu"].append({
                        "name": gpu.Name,
                        "adapter_ram_gb": round(int(gpu.AdapterRAM) / (1024 ** 3), 2) if gpu.AdapterRAM and int(gpu.AdapterRAM) > 0 else None,
                        "driver_version": gpu.DriverVersion,
                        "video_mode": gpu.VideoModeDescription,
                        "status": gpu.Status,
                    })
        except Exception:
            pass

        # CPU detailed
        try:
            for cpu in c.Win32_Processor():
                info["cpu_details"] = {
                    "name": cpu.Name.strip() if cpu.Name else None,
                    "manufacturer": cpu.Manufacturer,
                    "cores": cpu.NumberOfCores,
                    "threads": cpu.NumberOfLogicalProcessors,
                    "max_clock_mhz": cpu.MaxClockSpeed,
                    "socket": cpu.SocketDesignation,
                    "l2_cache_kb": cpu.L2CacheSize,
                    "l3_cache_kb": cpu.L3CacheSize,
                }
                break
        except Exception:
            pass

        # Voltages (if available via WMI sensors)
        try:
            w = wmi.WMI(namespace="root\\wmi")
            # Some boards expose voltages here, but it's rare without OEM tools
        except Exception:
            pass

        # Try LibreHardwareMonitor / OpenHardwareMonitor for voltages & better temps
        for ns in ("root\\LibreHardwareMonitor", "root\\OpenHardwareMonitor"):
            try:
                w = wmi.WMI(namespace=ns)
                for sensor in w.Sensor():
                    name = sensor.Name or ""
                    stype = sensor.SensorType or ""
                    val = sensor.Value
                    if val is None:
                        continue
                    if stype == "Voltage":
                        info["voltages"].append({
                            "name": name,
                            "value": round(float(val), 3),
                        })
            except Exception:
                continue

    except Exception as e:
        info["wmi_error"] = str(e)

    return info


def get_hardware_info():
    """Collect static hardware information (AIDA64 style)."""
    info = {
        "cpu": {
            "name": platform.processor() or "Unknown",
            "cores_physical": psutil.cpu_count(logical=False),
            "cores_logical": psutil.cpu_count(logical=True),
        },
        "memory": {
            "total_gb": round(psutil.virtual_memory().total / (1024 ** 3), 2),
        },
        "disks": [],
        "network_interfaces": [],
        "platform": platform.platform(),
        "python": platform.python_version(),
    }

    # Better CPU name
    try:
        import cpuinfo
        cpu = cpuinfo.get_cpu_info()
        info["cpu"]["name"] = cpu.get("brand_raw") or info["cpu"]["name"]
        info["cpu"]["hz"] = cpu.get("hz_advertised_friendly")
    except Exception:
        pass

    # Disks
    for part in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(part.mountpoint)
            info["disks"].append({
                "device": part.device,
                "mountpoint": part.mountpoint,
                "fstype": part.fstype,
                "total_gb": round(usage.total / (1024 ** 3), 2),
            })
        except Exception:
            continue

    # Network
    addrs = psutil.net_if_addrs()
    for name, addr_list in addrs.items():
        for addr in addr_list:
            if addr.family == socket.AF_INET:
                info["network_interfaces"].append({
                    "name": name,
                    "ip": addr.address,
                })

    # Windows detailed info
    if platform.system() == "Windows":
        win_info = get_windows_hardware()
        info.update(win_info)

        # Prefer WMI CPU name if available
        if win_info.get("cpu_details", {}).get("name"):
            info["cpu"]["name"] = win_info["cpu_details"]["name"]
            info["cpu"]["cores_physical"] = win_info["cpu_details"].get("cores") or info["cpu"]["cores_physical"]
            info["cpu"]["cores_logical"] = win_info["cpu_details"].get("threads") or info["cpu"]["cores_logical"]
            if win_info["cpu_details"].get("max_clock_mhz"):
                info["cpu"]["hz"] = f"{win_info['cpu_details']['max_clock_mhz']} MHz"

    return info


def collect_metrics():
    """Collect current metrics."""
    vm = psutil.virtual_memory()

    # Root disk (Windows uses C:\)
    disk_path = "C:\\" if platform.system() == "Windows" else "/"
    try:
        disk = psutil.disk_usage(disk_path)
    except Exception:
        disk = psutil.disk_usage("/")

    net = psutil.net_io_counters()

    freq = None
    try:
        f = psutil.cpu_freq()
        if f:
            freq = f.current
    except Exception:
        pass

    gpu = get_gpu_metrics()

    return {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "cpu_temp": get_cpu_temp(),
        "cpu_freq": freq,
        "mem_percent": vm.percent,
        "mem_used_gb": round(vm.used / (1024 ** 3), 2),
        "mem_total_gb": round(vm.total / (1024 ** 3), 2),
        "disk_percent": disk.percent,
        "disk_used_gb": round(disk.used / (1024 ** 3), 2),
        "disk_total_gb": round(disk.total / (1024 ** 3), 2),
        "net_sent_mb": round(net.bytes_sent / (1024 ** 2), 2),
        "net_recv_mb": round(net.bytes_recv / (1024 ** 2), 2),
        "gpu_temp": gpu["gpu_temp"],
        "gpu_percent": gpu["gpu_percent"],
        "gpu_mem_percent": gpu["gpu_mem_percent"],
        "hostname": socket.gethostname(),
        "os_name": platform.system(),
        "os_version": platform.release(),
        "hardware_info": get_hardware_info(),
        "extra": {
            "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
            "users": len(psutil.users()),
        },
    }


def send_metrics(metrics: dict):
    headers = {"Authorization": f"Bearer {API_KEY}"}
    url = f"{API_URL}/devices/agent/report"
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.post(url, json=metrics, headers=headers)
            if r.status_code == 204:
                cpu_t = metrics.get("cpu_temp")
                gpu_t = metrics.get("gpu_temp")
                cpu_str = f"{cpu_t}°C" if cpu_t is not None else "N/A"
                gpu_str = f"{gpu_t}°C" if gpu_t is not None else "N/A"
                print(
                    f"[{datetime.now().strftime('%H:%M:%S')}] OK | "
                    f"CPU {metrics['cpu_percent']}% ({cpu_str}) | "
                    f"GPU {gpu_str} | RAM {metrics['mem_percent']}%"
                )
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Error {r.status_code}: {r.text}")
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Connection error: {e}")


def main():
    if not API_KEY:
        print("ERROR: HOMEPULSE_API_KEY is not set.")
        print("1. Create a device in the web UI")
        print("2. Copy the API key")
        print("3. Set it in .env or environment variable HOMEPULSE_API_KEY")
        return

    print("HomePulse Agent started (detailed hardware mode)")
    print(f"API: {API_URL}")
    print(f"Interval: {INTERVAL}s")
    print("-" * 50)

    while True:
        try:
            metrics = collect_metrics()
            send_metrics(metrics)
        except KeyboardInterrupt:
            print("\nAgent stopped.")
            break
        except Exception as e:
            print(f"Unexpected error: {e}")
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
