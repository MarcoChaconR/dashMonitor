import psutil
import socket
import time
import glob
from datetime import datetime


_last_disk_io: dict | None = None
_last_disk_time: float = 0.0
_last_net_io: dict | None = None
_last_net_time: float = 0.0


def get_cpu_metrics() -> dict:
    percent_per_core = psutil.cpu_percent(percpu=True, interval=0.1)
    percent_total = sum(percent_per_core) / len(percent_per_core) if percent_per_core else 0.0
    freq = psutil.cpu_freq()
    frequency_current_mhz = round(freq.current, 2) if freq else 0.0
    frequency_max_mhz = round(freq.max, 2) if freq else 0.0
    core_count_logical = psutil.cpu_count(logical=True) or 0
    core_count_physical = psutil.cpu_count(logical=False) or 0
    load_avg = psutil.getloadavg()
    return {
        "percent_total": round(percent_total, 2),
        "percent_per_core": [round(p, 2) for p in percent_per_core],
        "frequency_current_mhz": frequency_current_mhz,
        "frequency_max_mhz": frequency_max_mhz,
        "core_count_logical": core_count_logical,
        "core_count_physical": core_count_physical,
        "load_avg_1m": round(load_avg[0], 2),
        "load_avg_5m": round(load_avg[1], 2),
        "load_avg_15m": round(load_avg[2], 2),
    }


def get_memory_metrics() -> dict:
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    return {
        "total_gb": round(mem.total / 1e9, 2),
        "used_gb": round(mem.used / 1e9, 2),
        "available_gb": round(mem.available / 1e9, 2),
        "percent": round(mem.percent, 2),
        "swap_total_gb": round(swap.total / 1e9, 2),
        "swap_used_gb": round(swap.used / 1e9, 2),
        "swap_percent": round(swap.percent, 2),
    }


def get_disk_usage() -> list[dict]:
    partitions = []
    for part in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(part.mountpoint)
            partitions.append({
                "device": part.device,
                "mountpoint": part.mountpoint,
                "fstype": part.fstype,
                "total_gb": round(usage.total / 1e9, 2),
                "used_gb": round(usage.used / 1e9, 2),
                "free_gb": round(usage.free / 1e9, 2),
                "percent": round(usage.percent, 2),
            })
        except PermissionError:
            continue
    return partitions


def get_disk_io_rates() -> dict[str, dict]:
    global _last_disk_io, _last_disk_time
    current_io = psutil.disk_io_counters(perdisk=False)
    now = time.time()
    result = {}
    if _last_disk_io is not None and _last_disk_time > 0:
        elapsed = now - _last_disk_time
        if elapsed > 0:
            read_bytes = max(0, current_io.read_bytes - _last_disk_io["read_bytes"])
            write_bytes = max(0, current_io.write_bytes - _last_disk_io["write_bytes"])
            result["read_mb_s"] = round((read_bytes / elapsed) / 1e6, 2)
            result["write_mb_s"] = round((write_bytes / elapsed) / 1e6, 2)
        else:
            result["read_mb_s"] = 0.0
            result["write_mb_s"] = 0.0
    else:
        result["read_mb_s"] = 0.0
        result["write_mb_s"] = 0.0
    _last_disk_io = {"read_bytes": current_io.read_bytes, "write_bytes": current_io.write_bytes}
    _last_disk_time = now
    return result


def get_network_metrics() -> list[dict]:
    global _last_net_io, _last_net_time
    current_net = psutil.net_io_counters(pernic=True)
    now = time.time()
    interfaces = []
    for iface, stats in current_net.items():
        if iface == "lo":
            continue
        sent_rate = 0.0
        recv_rate = 0.0
        if _last_net_io is not None and iface in _last_net_io and _last_net_time > 0:
            elapsed = now - _last_net_time
            if elapsed > 0:
                sent_rate = max(0, (stats.bytes_sent - _last_net_io[iface]["bytes_sent"]) / elapsed / 1024)
                recv_rate = max(0, (stats.bytes_recv - _last_net_io[iface]["bytes_recv"]) / elapsed / 1024)
        interfaces.append({
            "interface": iface,
            "bytes_sent_mb": round(stats.bytes_sent / 1e6, 2),
            "bytes_recv_mb": round(stats.bytes_recv / 1e6, 2),
            "sent_rate_kb_s": round(sent_rate, 2),
            "recv_rate_kb_s": round(recv_rate, 2),
        })
    if not _last_net_io:
        _last_net_io = {}
    for iface, stats in current_net.items():
        if iface == "lo":
            continue
        _last_net_io[iface] = {
            "bytes_sent": stats.bytes_sent,
            "bytes_recv": stats.bytes_recv,
        }
    _last_net_time = now
    return interfaces


def get_cpu_temperature() -> dict:
    thresholds = {"normal": 70, "warning": 85, "critical": 85}
    try:
        zones = glob.glob("/sys/class/thermal/thermal_zone*/temp")
        if zones:
            temps = []
            for z in zones:
                with open(z) as f:
                    raw = f.read().strip()
                    temps.append(float(raw) / 1000.0)
            if temps:
                cpu_celsius = round(max(temps), 1)
                status = "normal" if cpu_celsius < 70 else ("warning" if cpu_celsius < 85 else "critical")
                return {"cpu_celsius": cpu_celsius, "status": status, "thresholds": thresholds}
    except Exception:
        pass
    try:
        sensors = psutil.sensors_temperatures()
        if sensors:
            for name, entries in sensors.items():
                if entries:
                    cpu_celsius = round(max(e.current for e in entries), 1)
                    status = "normal" if cpu_celsius < 70 else ("warning" if cpu_celsius < 85 else "critical")
                    return {"cpu_celsius": cpu_celsius, "status": status, "thresholds": thresholds}
    except Exception:
        pass
    return {"cpu_celsius": None, "status": "unavailable", "thresholds": thresholds}


def get_processes(sort_by: str = "cpu", order: str = "desc") -> dict:
    proc_list = []
    for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent', 'memory_info', 'status', 'cmdline']):
        try:
            info = proc.info
            cmdline = info.get('cmdline') or []
            command = " ".join(cmdline[:3]) if cmdline else (info.get('name') or "")
            mem_mb = (info['memory_info'].rss / 1e6) if info.get('memory_info') else 0.0
            proc_list.append({
                "pid": info['pid'],
                "name": info['name'] or "",
                "username": info['username'] or "",
                "cpu_percent": info['cpu_percent'] or 0.0,
                "memory_percent": round(info['memory_percent'] or 0.0, 2),
                "memory_mb": round(mem_mb, 2),
                "status": info['status'] or "",
                "command": command,
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    reverse = order == "desc"
    if sort_by == "cpu":
        proc_list.sort(key=lambda p: p["cpu_percent"], reverse=reverse)
    elif sort_by == "memory":
        proc_list.sort(key=lambda p: p["memory_percent"], reverse=reverse)
    elif sort_by == "pid":
        proc_list.sort(key=lambda p: p["pid"], reverse=reverse)
    elif sort_by == "name":
        proc_list.sort(key=lambda p: p["name"].lower(), reverse=reverse)
    return {"count": len(proc_list), "processes": proc_list}


def get_full_metrics() -> dict:
    boot_time = psutil.boot_time()
    uptime = int(time.time() - boot_time)
    hostname = socket.gethostname()
    timestamp = datetime.utcnow().isoformat() + "Z"
    disk_usage = get_disk_usage()
    disk_io = get_disk_io_rates()
    disk = []
    for du in disk_usage:
        du["read_mb_s"] = disk_io.get("read_mb_s", 0.0)
        du["write_mb_s"] = disk_io.get("write_mb_s", 0.0)
        disk.append(du)
    return {
        "timestamp": timestamp,
        "hostname": hostname,
        "uptime_seconds": uptime,
        "cpu": get_cpu_metrics(),
        "memory": get_memory_metrics(),
        "disk": disk,
        "network": get_network_metrics(),
        "temperature": get_cpu_temperature(),
    }
